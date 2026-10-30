"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AuthBots from "@/components/AuthBots";
import { ArrowIcon, Frame, GuardMessage, Logo, StepIndicator } from "./FlowParts";
import { FLOW_ROUTES, maskEmail, readDraft, writeDraft } from "@/lib/talkaor-flow/flow-state";
import { PACKAGES, formatPrice, type TalkaorPackage } from "@/lib/talkaor-flow/packages";
import { http } from "@/lib/http";
import "./talkaor-flow.css";

type Gate =
  | { state: "checking" }
  | { state: "no-signup" }
  | { state: "no-package" }
  | { state: "ready"; masked: string | null; pkg: TalkaorPackage };

export default function VerifyEmail() {
  const [gate, setGate] = useState<Gate>({ state: "checking" });
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resendNotice, setResendNotice] = useState("");
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasSentInitialCode = useRef(false);

  useEffect(() => {
    const d = readDraft();
    const pkg = PACKAGES.find((p) => p.id === d.selectedPackageId) || PACKAGES[1];
    setGate({ state: "ready", masked: maskEmail(d.email || "your email"), pkg });

    // React Strict Mode mounts effects twice in development; send only once.
    if (hasSentInitialCode.current) return;
    hasSentInitialCode.current = true;

    http<{ message: string }>("/api/v1/auth/verify-email/send", { method: "POST" })
      .catch((err) => {
        setErrorMsg(err?.message || "Failed to send verification code. Please try again.");
      });
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    setErrorMsg("");
    // Only accept numeric inputs or empty
    const sanitized = value.replace(/\D/g, "");
    if (!sanitized) {
      setOtp((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }

    // If pasted multi-digit string
    if (sanitized.length > 1) {
      const digits = sanitized.slice(0, 6).split("");
      setOtp((prev) => {
        const next = [...prev];
        digits.forEach((d, i) => {
          if (index + i < 6) next[index + i] = d;
        });
        return next;
      });
      const nextFocus = Math.min(index + digits.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    // Single digit input
    setOtp((prev) => {
      const next = [...prev];
      next[index] = sanitized[0];
      return next;
    });

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("").trim();
    if (code.length !== 6) {
      setErrorMsg("Please enter all 6 digits of the verification code.");
      return;
    }

    setIsVerifying(true);
    setErrorMsg("");
    setResendNotice("");

    try {
      await http<{ message: string }>("/api/v1/auth/verify-email/confirm", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setIsVerified(true);
      writeDraft({ signupCompleted: true, emailVerified: true });
    } catch (err: any) {
      setErrorMsg(err?.message || "Invalid or expired verification code.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (isResending) return;
    setIsResending(true);
    setErrorMsg("");
    setResendNotice("");

    try {
      const res = await http<{ message: string }>("/api/v1/auth/verify-email/send", {
        method: "POST",
      });
      setResendNotice(res?.message || "A new 6-digit verification code has been sent to your email.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to resend code. Please wait before trying again.");
    } finally {
      setIsResending(false);
    }
  };

  if (gate.state === "checking") {
    return (
      <Frame>
        <p className="m-auto text-sm text-[var(--c-auth-muted)]" role="status">
          Loading&hellip;
        </p>
      </Frame>
    );
  }

  if (gate.state === "no-signup") {
    return (
      <Frame>
        <GuardMessage
          title="Create your account first"
          body="Please complete signup before verifying your email."
          href={FLOW_ROUTES.signup}
          label="Go to signup"
        />
      </Frame>
    );
  }

  if (gate.state === "no-package") {
    return (
      <Frame>
        <GuardMessage
          title="Choose a package first"
          body="Please select a package before continuing."
          href={FLOW_ROUTES.package}
          label="Choose a package"
        />
      </Frame>
    );
  }

  return (
    <main
      className="min-h-[100svh] flex items-center justify-center p-3 sm:p-4 text-[var(--c-auth-ink)]"
      style={{ background: "var(--c-auth-bg)" }}
    >
      <div
        className="w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-[56%_44%] rounded-[20px] overflow-hidden min-h-[640px] shadow-2xl"
        style={{
          background: "var(--c-auth-panel)",
          border: "1px solid var(--c-auth-line)",
        }}
      >
        {/* Left panel: Form view */}
        <section
          aria-label="Email verification form"
          className="p-5 sm:p-7 md:p-8 flex flex-col justify-between"
        >
          <div>
            <div className="flex justify-between items-center mb-4">
              <Logo />
              <Link
                href={FLOW_ROUTES.package}
                className="text-xs transition-colors hover:text-[var(--c-auth-ink)]"
                style={{ color: "var(--c-auth-muted)" }}
              >
                &larr; Back to packages
              </Link>
            </div>

            {isVerified ? (
              /* Success / Step Complete view */
              <div className="mt-4 animate-fadeIn">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(40,92,204,0.18)] border border-[rgba(40,92,204,0.4)] text-[var(--c-orange)] text-xs font-semibold mb-3">
                  <span>✓</span> Email Verified
                </div>
                <h1 className="text-2xl sm:text-[26px] font-semibold tracking-tight text-[var(--c-auth-ink)]">
                  Account Verification Complete!
                </h1>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--c-auth-muted)]">
                  Your email has been verified. Your chosen plan has been linked to your account.
                </p>

                <div className="mt-5 p-4 rounded-xl border border-[var(--c-auth-line)] bg-[var(--c-auth-field-bg)] space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--c-auth-muted)]">Account Email:</span>
                    <span className="font-semibold text-[var(--c-auth-ink)]">{gate.masked}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--c-auth-muted)]">Selected Package:</span>
                    <span className="font-semibold text-[var(--c-orange)]">{gate.pkg.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--c-auth-muted)]">Pricing:</span>
                    <span className="font-semibold text-[var(--c-auth-ink)]">
                      {formatPrice(gate.pkg)}{gate.pkg.priceMonthly !== null && "/month"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3 items-center">
                  <Link
                    href={FLOW_ROUTES.payment}
                    className="h-[46px] w-full max-w-[240px] rounded-full inline-flex items-center justify-between px-5 text-sm font-semibold text-white transition-all duration-200 cursor-pointer hover:brightness-110 active:scale-[0.99]"
                    style={{ background: "var(--c-orange)" }}
                  >
                    <span>Proceed to Payment</span>
                    <ArrowIcon />
                  </Link>
                  <Link
                    href="/"
                    className="text-xs text-[var(--c-auth-muted)] hover:text-[var(--c-auth-ink)] hover:underline px-3"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            ) : (
              /* Active OTP verification form */
              <>
                <h1 className="text-2xl sm:text-[26px] font-semibold tracking-tight text-[var(--c-auth-ink)] mt-3">
                  Verify Your Email
                </h1>
                <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "var(--c-auth-muted)" }}>
                  An OTP has been dispatched to your registered business email.
                </p>

                <div className="tkf-mask">
                  {gate.masked ?? "Your registered email address"}
                </div>

                {resendNotice && (
                  <div className="mt-3 p-2.5 rounded-lg bg-[rgba(40,92,204,0.16)] border border-[rgba(40,92,204,0.4)] text-xs text-[var(--c-offwhite)]">
                    {resendNotice}
                  </div>
                )}

                {errorMsg && (
                  <div className="mt-3 p-2.5 rounded-lg bg-[rgba(239,68,68,0.16)] border border-[rgba(239,68,68,0.4)] text-xs text-[#fca5a5]">
                    {errorMsg}
                  </div>
                )}

                <fieldset className="tkf-otp-set" aria-describedby="tkf-otp-help">
                  <legend>Enter 6-digit code</legend>
                  <div className="tkf-otp">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        aria-label={`Digit ${idx + 1} of 6`}
                      />
                    ))}
                  </div>
                  <p id="tkf-otp-help" className="tkf-help">
                    Enter the 6-digit verification code sent to your email.
                  </p>
                </fieldset>

                <div className="tkf-actions">
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="h-[46px] min-w-[180px] rounded-full flex items-center justify-between px-5 text-sm font-semibold text-white transition-all duration-200 cursor-pointer hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
                    style={{ background: "var(--c-orange)" }}
                  >
                    <span>{isVerifying ? "Verifying..." : "Verify Email"}</span>
                    <ArrowIcon />
                  </button>

                  <button
                    type="button"
                    onClick={handleResend}
                    className="tkf-btn-link-action"
                  >
                    Resend OTP
                  </button>
                </div>

                <p className="tkf-picked">
                  Selected package: <strong>{gate.pkg.name}</strong> &middot; {formatPrice(gate.pkg)}
                  {gate.pkg.priceMonthly !== null && "/month"}
                </p>
              </>
            )}
          </div>

          <div className="pt-6 mt-4 border-t border-[var(--c-auth-line)]">
            <StepIndicator current={isVerified ? 3 : 3} />
          </div>
        </section>

        {/* Right panel: Art panel (two bots only) */}
        <section
          aria-label="Talkaor bot animation"
          className="relative m-2 p-5 sm:p-6 flex-col rounded-[14px] overflow-hidden hidden md:flex"
          style={{
            background:
              "radial-gradient(130% 62% at 50% 0%, var(--c-blue) 0%, var(--c-royal) 38%, var(--c-navy) 70%, var(--c-auth-bg) 100%)",
          }}
        >
          {/* Faint Orange glow at the bottom */}
          <div
            className="absolute inset-x-0 bottom-0 h-[45%] pointer-events-none"
            style={{
              background:
                "radial-gradient(70% 60% at 50% 100%, var(--c-auth-glow), transparent)",
            }}
            aria-hidden="true"
          />

          {/* Animated Dancing Bots */}
          <AuthBots
            state="dancing"
            statusText={isVerified ? "Setup complete! Welcome aboard." : "Almost there! Let’s dance."}
          />

          {/* Bottom punchline */}
          <div className="relative z-[2] mt-auto pt-4 md:pt-5">
            <h3 className="text-xl sm:text-2xl font-semibold leading-tight tracking-tight">
              Smarter conversations.
              <br />
              Better business.
            </h3>
            <p
              className="mt-2 text-[13px] leading-relaxed hidden md:block"
              style={{ color: "var(--c-auth-muted)" }}
            >
              Verify your details and Talkaor will be ready to handle your calls and appointments.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
