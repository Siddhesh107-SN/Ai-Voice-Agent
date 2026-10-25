"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthBots from "@/components/AuthBots";
import { ArrowIcon, Frame, GuardMessage, Logo, StepIndicator, FLOW_STEPS } from "./FlowParts";
import { FLOW_ROUTES, readDraft, writeDraft, type BillingCycle } from "@/lib/talkaor-flow/flow-state";
import { PACKAGES, formatPrice, type TalkaorPackage } from "@/lib/talkaor-flow/packages";
import { paymentConfig } from "@/config/payment";
import { calculateSubscriptionPeriod } from "@/lib/billing";
import { submitPayment, type PaymentSubmissionResponse } from "@/lib/api/payment";
import "./talkaor-flow.css";

type GateState =
  | { state: "checking" }
  | { state: "no-auth" }
  | { state: "no-email-verified" }
  | { state: "invalid-package" }
  | {
      state: "ready";
      pkg: TalkaorPackage;
      initialCycle: BillingCycle;
      userEmail?: string;
    };

export default function PaymentView() {
  const router = useRouter();
  const [gate, setGate] = useState<GateState>({ state: "checking" });

  // Payment form state
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [transactionId, setTransactionId] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => {
    // Default to today in YYYY-MM-DD
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [payerName, setPayerName] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  // Validation & Submission
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<PaymentSubmissionResponse | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Enforce route access guards (auth check temporarily commented out for testing)
  useEffect(() => {
    const draft = readDraft();

    /* Commented out for testing so the payment page can be viewed directly:
    // 1. Must be logged in / registered
    if (!draft.signupCompleted && !draft.email) {
      setGate({ state: "no-auth" });
      router.replace("/login");
      return;
    }

    // 2. Email must be verified
    if (!draft.emailVerified) {
      setGate({ state: "no-email-verified" });
      router.replace(FLOW_ROUTES.verifyEmail);
      return;
    }
    */

    // Resolve package (fallback to Growth plan if not yet picked in session)
    const packageId = draft.selectedPackageId || "growth";
    const pkg = PACKAGES.find((p) => p.id === packageId) || PACKAGES[1];
    const cycle = draft.billingCycle === "yearly" ? "yearly" : "monthly";

    setBillingCycle(cycle);
    setGate({
      state: "ready",
      pkg,
      initialCycle: cycle,
      userEmail: draft.email || "test@talkaor.com",
    });
  }, [router]);

  // Clean up screenshot preview object URL
  useEffect(() => {
    return () => {
      if (screenshotPreview) {
        URL.revokeObjectURL(screenshotPreview);
      }
    };
  }, [screenshotPreview]);

  if (gate.state === "checking") {
    return (
      <Frame>
        <p className="m-auto text-sm text-[var(--c-auth-muted)]" role="status">
          Loading payment details&hellip;
        </p>
      </Frame>
    );
  }

  if (gate.state === "no-auth") {
    return (
      <Frame>
        <GuardMessage
          title="Account required"
          body="Please log in to your Talkaor account before reviewing payment details."
          href="/login"
          label="Go to login"
        />
      </Frame>
    );
  }

  if (gate.state === "no-email-verified") {
    return (
      <Frame>
        <GuardMessage
          title="Verify your email first"
          body="Please verify your email address before proceeding to package payment."
          href={FLOW_ROUTES.verifyEmail}
          label="Verify email"
        />
      </Frame>
    );
  }

  if (gate.state === "invalid-package") {
    return (
      <Frame>
        <GuardMessage
          title="Choose a valid package"
          body="Please select a Talkaor subscription package to review pricing and payment details."
          href={FLOW_ROUTES.package}
          label="Choose package"
        />
      </Frame>
    );
  }

  const pkg = gate.pkg;
  const isYearly = billingCycle === "yearly";
  const payableAmount = isYearly ? pkg.priceYearly : pkg.priceMonthly;

  // Calculate subscription period and renewal rules using the centralized billing helper
  const billingInfo = calculateSubscriptionPeriod(billingCycle);

  // Placeholder status from config (disabled for testing so payment submission is active)
  const isPlaceholderActive = false;

  // Cycle toggle handler
  const handleCycleChange = (newCycle: BillingCycle) => {
    setBillingCycle(newCycle);
    writeDraft({ billingCycle: newCycle });
    // Reset submission errors if any
    setSubmitError(null);
  };

  // Copy UPI ID handler
  const handleCopyUpi = async () => {
    if (!paymentConfig.upiId) return;
    try {
      await navigator.clipboard.writeText(paymentConfig.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    } catch {
      // Clipboard fallback
    }
  };

  // Screenshot file handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        screenshot: "Only JPG, PNG, or WebP screenshot files are accepted.",
      }));
      return;
    }

    const maxBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxBytes) {
      setErrors((prev) => ({
        ...prev,
        screenshot: "Screenshot size must be under 5 MB.",
      }));
      return;
    }

    // Clear screenshot error
    setErrors((prev) => {
      const next = { ...prev };
      delete next.screenshot;
      return next;
    });

    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }

    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleRemoveScreenshot = () => {
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Form validation
  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};

    // 1. Transaction ID
    const trimmedTx = transactionId.trim();
    if (!trimmedTx) {
      errs.transactionId = "Transaction ID / UPI reference is required.";
    } else if (trimmedTx.length < 8 || trimmedTx.length > 35) {
      errs.transactionId = "Transaction ID should be between 8 and 35 characters.";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(trimmedTx)) {
      errs.transactionId = "Transaction ID must contain only letters, numbers, hyphens, or underscores.";
    }

    // 2. Amount paid check
    if (payableAmount == null || payableAmount <= 0) {
      errs.amount = "Invalid package payable amount.";
    }

    // 3. Payment date
    if (!paymentDate) {
      errs.paymentDate = "Payment date is required.";
    } else {
      const selected = new Date(paymentDate + "T00:00:00");
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      if (selected > today) {
        errs.paymentDate = "Payment date cannot be in the future.";
      } else if (selected < sevenDaysAgo) {
        errs.paymentDate = "Payment date cannot be older than 7 days.";
      }
    }

    return errs;
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitPayment({
        packageId: pkg.id,
        billingCycle,
        amountPaid: payableAmount ?? 0,
        transactionId: transactionId.trim(),
        paymentDate,
        payerName: payerName.trim() || undefined,
        screenshotFile,
      });

      setSubmitResult(res);
      if (res.success === true) {
        router.push("/onboarding-status");
      }
    } catch (err: any) {
      const msg =
        err.message ||
        "Payment submission is not connected yet. Backend payment verification service is pending deployment.";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute 7 days range string for date input min/max
  const todayStr = new Date().toISOString().split("T")[0];
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 7);
  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <Frame maxWidth="max-w-[1140px]">
      <div className="tkf-package">
        {/* Header with Logo and Step Indicator */}
        <header className="tkf-topbar">
          <Logo />
          <StepIndicator current={4} steps={FLOW_STEPS} />
          <div className="w-16 hidden sm:block" aria-hidden="true" />
        </header>

        {/* Mascot Bot */}
        <div className="tkf-package-bot">
          <AuthBots state="watching" singleBot hidePill />
        </div>

        {/* Heading */}
        <div className="tkf-heading">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--c-auth-ink)]">
            Review Package &amp; Pay by UPI
          </h1>
          <p className="mt-1.5 text-sm text-[var(--c-auth-muted)]">
            Review your subscription, scan the UPI QR code to transfer payment, and submit transaction details for manual verification.
          </p>
        </div>

        {/* TOP SECTION: Payment Summary Card */}
        <section
          aria-labelledby="summary-heading"
          className="rounded-[18px] border border-[var(--c-auth-line)] bg-[var(--c-auth-field-bg)] p-5 sm:p-6 mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--c-auth-line)] pb-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(232,100,31,0.15)] border border-[rgba(232,100,31,0.35)] text-[var(--c-orange)] text-xs font-semibold mb-1.5">
                <span>Selected Package</span>
              </div>
              <h2 id="summary-heading" className="text-xl sm:text-2xl font-bold text-[var(--c-auth-ink)]">
                {pkg.name} Subscription
              </h2>
              <p className="text-xs text-[var(--c-auth-muted)] mt-0.5">
                Payment is for the selected Talkaor subscription package.
              </p>
            </div>

            {/* Billing cycle selector */}
            <div className="flex items-center gap-1.5 bg-[rgba(255,255,255,0.06)] p-1 rounded-full border border-[var(--c-auth-line)] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleCycleChange("monthly")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  !isYearly
                    ? "bg-[var(--c-orange)] text-white shadow-sm"
                    : "text-[var(--c-auth-muted)] hover:text-[var(--c-auth-ink)]"
                }`}
                aria-pressed={!isYearly}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => handleCycleChange("yearly")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isYearly
                    ? "bg-[var(--c-orange)] text-white shadow-sm"
                    : "text-[var(--c-auth-muted)] hover:text-[var(--c-auth-ink)]"
                }`}
                aria-pressed={isYearly}
              >
                Yearly
              </button>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-4 text-xs">
            <div>
              <span className="text-[var(--c-auth-muted)] block mb-1">Billing Cycle</span>
              <span className="font-semibold text-[var(--c-auth-ink)] text-sm capitalize">
                {billingCycle} ({billingInfo.estimatedDuration})
              </span>
            </div>
            <div>
              <span className="text-[var(--c-auth-muted)] block mb-1">Included Minutes</span>
              <span className="font-semibold text-[var(--c-auth-ink)] text-sm">
                {pkg.includedMinutes !== null ? `${pkg.includedMinutes.toLocaleString("en-IN")} min/mo` : "Custom"}
              </span>
            </div>
            <div>
              <span className="text-[var(--c-auth-muted)] block mb-1">Platform / Service Fee</span>
              <span className="font-semibold text-[var(--c-auth-ink)] text-sm">
                None defined
              </span>
            </div>
            <div>
              <span className="text-[var(--c-auth-muted)] block mb-1">Subscription Ending / Renewal</span>
              <span className="font-semibold text-[#FFB088] text-sm block">
                {billingInfo.endingDate}
              </span>
              <span className="text-[10px] text-[var(--c-auth-muted)]">Renewal Year: {billingInfo.nextRenewalYear}</span>
            </div>
            <div>
              <span className="text-[var(--c-auth-muted)] block mb-1">Final Amount Payable</span>
              <span className="font-bold text-[var(--c-orange)] text-base sm:text-lg">
                {formatPrice(pkg, billingCycle)}
              </span>
            </div>
          </div>
        </section>

        {/* TWO-COLUMN LAYOUT: Mobile = Stacked (QR first, then form); Desktop = Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-[48%_52%] gap-6 items-start">
          {/* LEFT COLUMN: UPI QR & Subscription Period */}
          <div className="space-y-6">
            {/* UPI QR Box */}
            <section
              aria-label="UPI QR Code Payment"
              className="rounded-[18px] border border-[var(--c-auth-line)] bg-[var(--c-auth-field-bg)] p-5 sm:p-6 flex flex-col items-center text-center"
            >
              <h3 className="text-base font-semibold text-[var(--c-auth-ink)] mb-1">
                Scan UPI QR to Pay
              </h3>
              <p className="text-xs text-[var(--c-auth-muted)] mb-4 max-w-sm">
                Open Google Pay, PhonePe, Paytm, or any UPI app, scan the code, pay the exact amount, then submit your transaction ID.
              </p>

              {/* QR Image Container with Badge */}
              <div className="relative p-3 bg-white rounded-2xl shadow-lg border-2 border-[var(--c-orange)] flex flex-col items-center max-w-[260px] w-full">
                {/* Visual badge overlay */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--c-orange)] text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow whitespace-nowrap z-10"
                  role="note"
                >
                  Placeholder, not for real payments
                </div>

                {/* QR Image */}
                <div className="w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] relative flex items-center justify-center overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={paymentConfig.qrImagePath}
                    alt="Decorative QR placeholder graphic with friendly smiley face"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="mt-2 text-[11px] font-semibold text-[#0F1F4A]">
                  Amount: {formatPrice(pkg, billingCycle)}
                </div>
              </div>

              {/* Funny Caption */}
              <p className="text-xs text-[var(--c-auth-muted)] mt-3 italic max-w-xs">
                &ldquo;Real QR coming soon. Please don&rsquo;t try paying this one, it&rsquo;s just here for the vibes.&rdquo;
              </p>

              {/* UPI ID Details */}
              <div className="mt-4 w-full pt-4 border-t border-[var(--c-auth-line)]">
                {paymentConfig.upiId ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--c-auth-line)] text-xs">
                    <div className="text-left">
                      <span className="text-[var(--c-auth-muted)] block text-[10px] uppercase tracking-wider">
                        UPI ID ({paymentConfig.merchantName ?? "Talkaor"})
                      </span>
                      <span className="font-mono font-semibold text-[var(--c-auth-ink)]">
                        {paymentConfig.upiId}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="px-3 py-1.5 rounded-full bg-[var(--c-orange)] text-white text-xs font-semibold cursor-pointer hover:brightness-110 transition"
                      aria-label="Copy UPI ID to clipboard"
                    >
                      {copiedUpi ? "Copied ✓" : "Copy UPI ID"}
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[var(--c-auth-line)] text-xs text-[var(--c-auth-muted)]">
                    Payment details will be available soon
                  </div>
                )}
              </div>
            </section>

            {/* Subscription Period and Renewal */}
            <section
              aria-label="Subscription Period and Renewal Policy"
              className="rounded-[18px] border border-[var(--c-auth-line)] bg-[var(--c-auth-field-bg)] p-5 text-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--c-auth-ink)]">
                  Subscription Period &amp; Renewal
                </h3>
                <span className="text-[11px] font-semibold text-[var(--c-orange)] capitalize px-2.5 py-0.5 rounded-full bg-[rgba(232,100,31,0.12)] border border-[rgba(232,100,31,0.3)]">
                  {billingCycle} plan
                </span>
              </div>

              {/* Prominent Dates Callout Card */}
              <div className="p-3.5 rounded-xl bg-[rgba(40,92,204,0.12)] border border-[rgba(40,92,204,0.35)] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--c-auth-muted)] font-medium">Subscription Ending Date:</span>
                  <span className="font-bold text-[var(--c-auth-ink)] text-sm font-mono text-right">
                    {billingInfo.endingDate}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-[rgba(255,255,255,0.08)]">
                  <span className="text-[var(--c-auth-muted)] font-medium">Next Payment / Renewal Date:</span>
                  <span className="font-bold text-[#FFB088] text-sm font-mono text-right">
                    {billingInfo.nextRenewalDate}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-[rgba(255,255,255,0.08)]">
                  <span className="text-[var(--c-auth-muted)]">Next Renewal Year:</span>
                  <span className="font-bold text-[var(--c-orange)] font-mono text-right">
                    {billingInfo.nextRenewalYear}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1.5 border-t border-[rgba(255,255,255,0.08)]">
                  <span className="text-[var(--c-auth-muted)]">Subscription Duration:</span>
                  <span className="font-semibold text-[var(--c-auth-ink)] text-right">
                    {billingInfo.estimatedDuration}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[var(--c-auth-muted)] block font-medium">
                  Subscription starts:
                </span>
                <p className="text-[var(--c-auth-ink)] font-semibold">
                  After payment is verified and agent is activated
                </p>
                <p className="text-[var(--c-auth-muted)] leading-relaxed">
                  The subscription starts at activation (when our team verifies payment and activates the voice agent), <strong>NOT</strong> when this form is submitted.
                </p>
              </div>

              <div className="pt-2 border-t border-[var(--c-auth-line)] space-y-1.5">
                <span className="text-[var(--c-auth-muted)] block font-medium">
                  Renewal rule:
                </span>
                <p className="text-[var(--c-auth-ink)] leading-relaxed">
                  {billingInfo.ruleExplanation}
                </p>

                {/* Illustrative Example */}
                <div className="mt-2 p-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[var(--c-auth-line)] text-[11px] space-y-1 text-[var(--c-offwhite)]">
                  <span className="font-semibold text-[var(--c-orange)] block">
                    Illustrative Example (Based on Today):
                  </span>
                  <p>
                    If activated on <strong>{billingInfo.illustrativeExample.sampleStart}</strong>, the subscription ends and renewal is due on <strong>{billingInfo.illustrativeExample.sampleEnd}</strong> (Year {billingInfo.illustrativeExample.renewalYear}).
                  </p>
                  <p className="text-[rgba(232,236,255,0.7)] text-[10px]">
                    {billingInfo.illustrativeExample.note}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Payment Submission Form & Status Messaging */}
          <div className="space-y-6">
            <section
              aria-label="Submit Payment Details"
              className="rounded-[18px] border border-[var(--c-auth-line)] bg-[var(--c-auth-field-bg)] p-5 sm:p-6"
            >
              <h3 className="text-lg font-semibold text-[var(--c-auth-ink)] mb-1">
                Submit Payment Details
              </h3>
              <p className="text-xs text-[var(--c-auth-muted)] mb-5">
                Enter your transaction reference for manual verification by the Talkaor team.
              </p>

              {/* Dev Mock Result State */}
              {submitResult ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="p-4 rounded-xl bg-[rgba(40,92,204,0.18)] border border-[rgba(40,92,204,0.4)] text-xs text-[var(--c-auth-ink)] space-y-2 mb-4"
                >
                  <div className="font-semibold text-[var(--c-orange)] text-sm flex items-center gap-1.5">
                    <span>✓</span> Payment Details Submitted
                  </div>
                  <p className="text-[var(--c-auth-muted)] leading-relaxed">
                    Reference ID: <strong className="text-white">{submitResult.submissionId}</strong>
                  </p>
                  <p className="text-[var(--c-auth-muted)] leading-relaxed">
                    {submitResult.message}
                  </p>
                  <p className="text-[11px] text-[rgba(232,236,255,0.75)]">
                    Please note: Submission is pending manual verification. Our team will review your transaction and reach out within 24 hours.
                  </p>
                </div>
              ) : null}

              {/* Error Banner */}
              {submitError ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="p-3.5 rounded-xl bg-[rgba(255,154,139,0.12)] border border-[rgba(255,154,139,0.3)] text-xs text-[var(--c-auth-error)] mb-5 leading-relaxed"
                >
                  {submitError}
                </div>
              ) : null}

              {/* Disabled Submit Note while Placeholder is Active */}
              {isPlaceholderActive && (
                <div
                  role="note"
                  className="p-3.5 rounded-xl bg-[rgba(232,100,31,0.12)] border border-[rgba(232,100,31,0.35)] text-xs text-[#FFB088] mb-5 leading-relaxed"
                >
                  <strong>Notice:</strong> Payment submission is disabled because genuine UPI payment details are not yet active. You cannot submit payment for a placeholder QR code.
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* 1. Transaction ID */}
                <div className="flex flex-col">
                  <label htmlFor="txId" className="text-xs font-medium text-[rgba(232,236,255,0.8)] mb-1">
                    Transaction ID / UPI Reference <span className="text-[var(--c-orange)]">*</span>
                  </label>
                  <input
                    id="txId"
                    type="text"
                    required
                    placeholder="e.g. 428910284752"
                    value={transactionId}
                    onChange={(e) => {
                      setTransactionId(e.target.value);
                      if (errors.transactionId) {
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.transactionId;
                          return n;
                        });
                      }
                      setSubmitError(null);
                    }}
                    aria-invalid={errors.transactionId ? true : undefined}
                    aria-describedby={errors.transactionId ? "err-txId" : "help-txId"}
                    className="w-full rounded-[10px] px-3 py-2 text-[13px] text-[var(--c-auth-ink)] placeholder-[rgba(232,236,255,0.36)] transition-all outline-none"
                    style={{
                      background: "var(--c-auth-field-bg)",
                      border: `1px solid ${errors.transactionId ? "var(--c-auth-error)" : "var(--c-auth-line)"}`,
                    }}
                  />
                  {errors.transactionId ? (
                    <span id="err-txId" role="alert" aria-live="assertive" className="text-xs mt-1 text-[var(--c-auth-error)]">
                      {errors.transactionId}
                    </span>
                  ) : (
                    <span id="help-txId" className="text-[11px] mt-1 text-[var(--c-auth-muted)]">
                      12-digit UTR number or UPI reference code from your payment app.
                    </span>
                  )}
                </div>

                {/* 2. Amount Paid (Prefilled & Read-only) */}
                <div className="flex flex-col">
                  <label htmlFor="amountPaid" className="text-xs font-medium text-[rgba(232,236,255,0.8)] mb-1">
                    Amount Paid (INR) <span className="text-[var(--c-orange)]">*</span>
                  </label>
                  <input
                    id="amountPaid"
                    type="text"
                    readOnly
                    value={formatPrice(pkg, billingCycle)}
                    aria-readonly="true"
                    aria-describedby="help-amount"
                    className="w-full rounded-[10px] px-3 py-2 text-[13px] text-[var(--c-auth-ink)] opacity-90 cursor-not-allowed outline-none font-semibold"
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid var(--c-auth-line)",
                    }}
                  />
                  <span id="help-amount" className="text-[11px] mt-1 text-[var(--c-auth-muted)] flex items-center justify-between flex-wrap gap-1">
                    <span>Prefilled for {pkg.name} ({billingCycle} pack).</span>
                    <span className="text-[var(--c-orange)] font-medium">Renewal: {billingInfo.nextRenewalDate} (Year {billingInfo.nextRenewalYear})</span>
                  </span>
                </div>

                {/* 3. Payment Date */}
                <div className="flex flex-col">
                  <label htmlFor="pDate" className="text-xs font-medium text-[rgba(232,236,255,0.8)] mb-1">
                    Payment Date <span className="text-[var(--c-orange)]">*</span>
                  </label>
                  <input
                    id="pDate"
                    type="date"
                    required
                    min={minDateStr}
                    max={todayStr}
                    value={paymentDate}
                    onChange={(e) => {
                      setPaymentDate(e.target.value);
                      if (errors.paymentDate) {
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.paymentDate;
                          return n;
                        });
                      }
                      setSubmitError(null);
                    }}
                    aria-invalid={errors.paymentDate ? true : undefined}
                    aria-describedby={errors.paymentDate ? "err-pDate" : "help-pDate"}
                    className="w-full rounded-[10px] px-3 py-2 text-[13px] text-[var(--c-auth-ink)] transition-all outline-none"
                    style={{
                      background: "var(--c-auth-field-bg)",
                      border: `1px solid ${errors.paymentDate ? "var(--c-auth-error)" : "var(--c-auth-line)"}`,
                      colorScheme: "dark",
                    }}
                  />
                  {errors.paymentDate ? (
                    <span id="err-pDate" role="alert" aria-live="assertive" className="text-xs mt-1 text-[var(--c-auth-error)]">
                      {errors.paymentDate}
                    </span>
                  ) : (
                    <span id="help-pDate" className="text-[11px] mt-1 text-[var(--c-auth-muted)]">
                      Date when transaction was made (not in future, within last 7 days).
                    </span>
                  )}
                </div>

                {/* 4. Payer Name (Optional) */}
                <div className="flex flex-col">
                  <label htmlFor="pName" className="text-xs font-medium text-[rgba(232,236,255,0.8)] mb-1">
                    Payer Name <span className="text-[var(--c-auth-muted)] text-[11px]">(Optional)</span>
                  </label>
                  <input
                    id="pName"
                    type="text"
                    placeholder="Name as registered on UPI account"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full rounded-[10px] px-3 py-2 text-[13px] text-[var(--c-auth-ink)] placeholder-[rgba(232,236,255,0.36)] transition-all outline-none"
                    style={{
                      background: "var(--c-auth-field-bg)",
                      border: "1px solid var(--c-auth-line)",
                    }}
                  />
                </div>

                {/* 5. Screenshot Upload (Optional) */}
                <div className="flex flex-col">
                  <label htmlFor="pProof" className="text-xs font-medium text-[rgba(232,236,255,0.8)] mb-1">
                    Payment Screenshot <span className="text-[var(--c-auth-muted)] text-[11px]">(Optional, JPG/PNG/WebP, max 5 MB)</span>
                  </label>
                  <input
                    id="pProof"
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    aria-invalid={errors.screenshot ? true : undefined}
                    aria-describedby={errors.screenshot ? "err-screenshot" : undefined}
                    className="text-xs text-[var(--c-auth-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[rgba(255,255,255,0.1)] file:text-[var(--c-auth-ink)] hover:file:bg-[rgba(255,255,255,0.15)] cursor-pointer"
                  />
                  {errors.screenshot && (
                    <span id="err-screenshot" role="alert" aria-live="assertive" className="text-xs mt-1 text-[var(--c-auth-error)]">
                      {errors.screenshot}
                    </span>
                  )}

                  {/* Screenshot Preview */}
                  {screenshotPreview && (
                    <div className="mt-3 p-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[var(--c-auth-line)] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={screenshotPreview}
                          alt="Uploaded payment screenshot preview"
                          className="w-12 h-12 object-cover rounded-lg border border-[var(--c-auth-line)] flex-shrink-0"
                        />
                        <span className="text-xs text-[var(--c-auth-ink)] truncate font-mono">
                          {screenshotFile?.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveScreenshot}
                        className="text-xs text-[var(--c-auth-error)] hover:underline flex-shrink-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-[46px] rounded-full flex items-center justify-between px-5 text-sm font-semibold text-white transition-all duration-200 cursor-pointer hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "var(--c-orange)" }}
                  >
                    <span>
                      {isSubmitting
                        ? "Submitting Payment Details…"
                        : "Submit Payment Details"}
                    </span>
                    <ArrowIcon />
                  </button>
                </div>
              </form>
            </section>

            {/* STATUS & ONBOARDING MESSAGING */}
            <section
              aria-label="Verification and Onboarding Process"
              className="rounded-[18px] border border-[var(--c-auth-line)] bg-[var(--c-auth-field-bg)] p-5 text-xs space-y-3"
            >
              <h4 className="text-sm font-semibold text-[var(--c-auth-ink)]">
                Manual Verification &amp; Setup Process
              </h4>

              <p className="text-[var(--c-auth-muted)] leading-relaxed">
                After submitting your payment details, our team will review your transaction manually. Your payment is not considered verified until our team confirms it. Once your payment is verified, our onboarding process will commence within 24 hours. We will contact you to understand your business requirements and configure your AI voice agent.
              </p>

              <ul className="space-y-1.5 text-[var(--c-auth-muted)] pt-2 border-t border-[var(--c-auth-line)]">
                <li className="flex items-start gap-1.5">
                  <span className="text-[var(--c-orange)]">•</span>
                  <span>Submitting payment details does not mean immediate approval.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[var(--c-orange)]">•</span>
                  <span>Please keep your transaction reference for your records.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[var(--c-orange)]">•</span>
                  <span>Agent setup and dashboard access are not immediate and come after your custom voice agent is configured and thoroughly tested.</span>
                </li>
              </ul>

              <div className="pt-2 text-center border-t border-[var(--c-auth-line)]">
                <Link
                  href="/contact"
                  className="text-xs text-[var(--c-orange)] hover:underline inline-flex items-center gap-1"
                >
                  <span>I need help with payment &rarr;</span>
                </Link>
              </div>
            </section>
          </div>
        </div>

        {/* Back Link */}
        <p className="tkf-back-row mt-8">
          <Link href={FLOW_ROUTES.package} className="tkf-back">
            &larr; Back to package selection
          </Link>
        </p>
      </div>
    </Frame>
  );
}
