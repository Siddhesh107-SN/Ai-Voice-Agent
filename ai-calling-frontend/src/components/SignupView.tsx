"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { BotState } from "@/components/AuthBots";
import { authConfig } from "@/config/auth";
import { signupUser } from "@/services/auth";
import { writeDraft, FLOW_ROUTES } from "@/lib/talkaor-flow/flow-state";

export default function SignupView() {
  const router = useRouter();
  const [botState, setBotState] = useState<BotState>("idle");
  const [lineLengths, setLineLengths] = useState<number[]>([0, 0, 0, 0]);

  // Form values
  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Errors and submission state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const typingTimer = useRef<number>();
  const errorResetTimer = useRef<number>();

  // Update notebook lines based on field values
  const updateNotebookLines = (bn: string, fn: string, em: string, ph: string) => {
    setLineLengths([
      bn ? Math.min(28, 5 + bn.length * 1.6) : 0,
      fn ? Math.min(28, 5 + fn.length * 1.6) : 0,
      em ? Math.min(28, 5 + em.length * 1.6) : 0,
      ph ? Math.min(28, 5 + ph.length * 1.6) : 0,
    ]);
  };

  const handleNormalFocus = () => {
    if (botState !== "error") {
      setBotState("watching");
    }
  };

  const handlePasswordFocus = () => {
    setBotState("password");
  };

  const handleBlur = (e: React.FocusEvent) => {
    setTimeout(() => {
      const active = document.activeElement;
      if (!active || (active.tagName !== "INPUT" && active.tagName !== "SELECT")) {
        setBotState("idle");
      }
    }, 60);
  };

  const handleNormalInput = (field: string) => {
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    setSubmitError("");

    setBotState("typing");
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "SELECT")) {
        const isPw = active.getAttribute("type") === "password" || active.id === "pw" || active.id === "cp";
        setBotState(isPw ? "password" : "watching");
      } else {
        setBotState("idle");
      }
    }, 700);
  };

  const triggerErrorState = (msg?: string) => {
    setBotState("error");
    window.clearTimeout(errorResetTimer.current);
    errorResetTimer.current = window.setTimeout(() => {
      setBotState("idle");
    }, 2400);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const phoneDigits = phone.replace(/\D/g, "");

    if (!businessName.trim()) {
      errs.businessName = "Enter your business name";
    }
    if (!fullName.trim()) {
      errs.fullName = "Enter your full name";
    }
    if (!emailRegex.test(email.trim())) {
      errs.email = "Enter a valid email";
    }
    if (countryCode === "+91") {
      if (phoneDigits.length !== 10) {
        errs.phone = "Enter a valid 10-digit phone number";
      }
    } else {
      if (phoneDigits.length < 7 || phoneDigits.length > 14) {
        errs.phone = "Enter a valid phone number";
      }
    }

    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    if (password.length < 8 || !hasLetter || !hasNumber) {
      errs.password = "Use 8+ characters with a letter and a number";
    }

    if (!confirmPassword) {
      errs.confirmPassword = "Confirm your password";
    } else if (confirmPassword !== password) {
      errs.confirmPassword = "Passwords don't match";
    }

    if (!agreeTerms) {
      errs.agreeTerms = "Accept the terms to continue";
    }

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError("");
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      triggerErrorState();
      // Focus first error field
      const firstKey = Object.keys(validationErrors)[0];
      const el = document.getElementById(firstKey);
      el?.focus();
      return;
    }

    setIsSubmitting(true);
    setBotState("typing");

    try {
      await signupUser({
        businessName: businessName.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        countryCode,
        phone: phone.trim(),
        password,
      });
      writeDraft({ signupCompleted: true, email: email.trim(), emailVerified: false });
      setBotState("idle");
      router.push(FLOW_ROUTES.package);
    } catch (err: any) {
      const msg = err.message || "Failed to create account. Please try again.";
      setSubmitError(msg);
      triggerErrorState(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const eyeIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );

  const eyeOffIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 2l12 12M6.5 4a6 6 0 0 1 1.5-.5c4.500 0 7 4.500 7 4.500a11 11 0 0 1-2 2.500M4 5.500C2.500 6.800 1 8 1 8s2.500 4.500 7 4.500c1 0 1.900-.2 2.700-.6" />
    </svg>
  );

  return (
    <AuthShell
      title="Create your account"
      subtitle="Enter your business details to get started."
      botState={botState}
      botLineLengths={lineLengths}
      compact={true}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-2">
        {/* Row 1: Business name & Full name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex flex-col">
            <label htmlFor="businessName" className="text-[11px] font-medium text-[rgba(232,236,255,0.8)] mb-0.5">
              Business name
            </label>
            <input
              id="businessName"
              type="text"
              placeholder="Acme Clinic"
              autoComplete="organization"
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value);
                updateNotebookLines(e.target.value, fullName, email, phone);
                handleNormalInput("businessName");
              }}
              onFocus={handleNormalFocus}
              onBlur={handleBlur}
              aria-invalid={errors.businessName ? true : undefined}
              aria-describedby={errors.businessName ? "err-businessName" : undefined}
              className="w-full rounded-[8px] px-2.5 py-1.5 text-[13px] text-[var(--c-auth-ink)] placeholder-[rgba(232,236,255,0.36)] transition-all outline-none"
              style={{
                background: "var(--c-auth-field-bg)",
                border: `1px solid ${errors.businessName ? "var(--c-auth-error)" : "var(--c-auth-line)"}`,
              }}
            />
            {errors.businessName && (
              <span id="err-businessName" role="alert" className="text-[11px] mt-0.5 text-[var(--c-auth-error)]">
                {errors.businessName}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <label htmlFor="fullName" className="text-[11px] font-medium text-[rgba(232,236,255,0.8)] mb-0.5">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="Priya Sharma"
              autoComplete="name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                updateNotebookLines(businessName, e.target.value, email, phone);
                handleNormalInput("fullName");
              }}
              onFocus={handleNormalFocus}
              onBlur={handleBlur}
              aria-invalid={errors.fullName ? true : undefined}
              aria-describedby={errors.fullName ? "err-fullName" : undefined}
              className="w-full rounded-[8px] px-2.5 py-1.5 text-[13px] text-[var(--c-auth-ink)] placeholder-[rgba(232,236,255,0.36)] transition-all outline-none"
              style={{
                background: "var(--c-auth-field-bg)",
                border: `1px solid ${errors.fullName ? "var(--c-auth-error)" : "var(--c-auth-line)"}`,
              }}
            />
            {errors.fullName && (
              <span id="err-fullName" role="alert" className="text-[11px] mt-0.5 text-[var(--c-auth-error)]">
                {errors.fullName}
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Business email & Phone number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex flex-col">
            <label htmlFor="email" className="text-[11px] font-medium text-[rgba(232,236,255,0.8)] mb-0.5">
              Business email
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                updateNotebookLines(businessName, fullName, e.target.value, phone);
                handleNormalInput("email");
              }}
              onFocus={handleNormalFocus}
              onBlur={handleBlur}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "err-email" : undefined}
              className="w-full rounded-[8px] px-2.5 py-1.5 text-[13px] text-[var(--c-auth-ink)] placeholder-[rgba(232,236,255,0.36)] transition-all outline-none"
              style={{
                background: "var(--c-auth-field-bg)",
                border: `1px solid ${errors.email ? "var(--c-auth-error)" : "var(--c-auth-line)"}`,
              }}
            />
            {errors.email && (
              <span id="err-email" role="alert" className="text-[11px] mt-0.5 text-[var(--c-auth-error)]">
                {errors.email}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <label htmlFor="phone" className="text-[11px] font-medium text-[rgba(232,236,255,0.8)] mb-0.5">
              Phone number
            </label>
            <div className="flex gap-1.5">
              <select
                id="countryCode"
                aria-label="Country code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                onFocus={handleNormalFocus}
                onBlur={handleBlur}
                className="w-[72px] flex-none rounded-[8px] px-2 py-1.5 text-[13px] text-[var(--c-auth-ink)] transition-all outline-none"
                style={{
                  background: "var(--c-auth-field-bg)",
                  border: "1px solid var(--c-auth-line)",
                }}
              >
                <option value="+91">+91</option>
                <option value="+1">+1</option>
                <option value="+44">+44</option>
                <option value="+971">+971</option>
              </select>
              <input
                id="phone"
                type="tel"
                placeholder="98765 43210"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  updateNotebookLines(businessName, fullName, email, e.target.value);
                  handleNormalInput("phone");
                }}
                onFocus={handleNormalFocus}
                onBlur={handleBlur}
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? "err-phone" : undefined}
                className="flex-1 min-w-0 rounded-[8px] px-2.5 py-1.5 text-[13px] text-[var(--c-auth-ink)] placeholder-[rgba(232,236,255,0.36)] transition-all outline-none"
                style={{
                  background: "var(--c-auth-field-bg)",
                  border: `1px solid ${errors.phone ? "var(--c-auth-error)" : "var(--c-auth-line)"}`,
                }}
              />
            </div>
            {errors.phone && (
              <span id="err-phone" role="alert" className="text-[11px] mt-0.5 text-[var(--c-auth-error)]">
                {errors.phone}
              </span>
            )}
          </div>
        </div>

        {/* Row 3: Password & Confirm password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex flex-col">
            <label htmlFor="pw" className="text-[11px] font-medium text-[rgba(232,236,255,0.8)] mb-0.5">
              Password
            </label>
            <div className="relative">
              <input
                id="pw"
                type={showPassword ? "text" : "password"}
                placeholder="Create password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  handleNormalInput("password");
                }}
                onFocus={handlePasswordFocus}
                onBlur={handleBlur}
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? "err-password" : "hint-password"}
                className="w-full rounded-[8px] pl-2.5 pr-8 py-1.5 text-[13px] text-[var(--c-auth-ink)] placeholder-[rgba(232,236,255,0.36)] transition-all outline-none"
                style={{
                  background: "var(--c-auth-field-bg)",
                  border: `1px solid ${errors.password ? "var(--c-auth-error)" : "var(--c-auth-line)"}`,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--c-auth-muted)] hover:text-[var(--c-auth-ink)] p-1 rounded transition-colors"
              >
                {showPassword ? eyeOffIcon : eyeIcon}
              </button>
            </div>
            {errors.password && (
              <span id="err-password" role="alert" className="text-[11px] mt-0.5 text-[var(--c-auth-error)]">
                {errors.password}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <label htmlFor="cp" className="text-[11px] font-medium text-[rgba(232,236,255,0.8)] mb-0.5">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="cp"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  handleNormalInput("confirmPassword");
                }}
                onFocus={handlePasswordFocus}
                onBlur={handleBlur}
                aria-invalid={errors.confirmPassword ? true : undefined}
                aria-describedby={errors.confirmPassword ? "err-confirmPassword" : undefined}
                className="w-full rounded-[8px] pl-2.5 pr-8 py-1.5 text-[13px] text-[var(--c-auth-ink)] placeholder-[rgba(232,236,255,0.36)] transition-all outline-none"
                style={{
                  background: "var(--c-auth-field-bg)",
                  border: `1px solid ${errors.confirmPassword ? "var(--c-auth-error)" : "var(--c-auth-line)"}`,
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--c-auth-muted)] hover:text-[var(--c-auth-ink)] p-1 rounded transition-colors"
              >
                {showConfirmPassword ? eyeOffIcon : eyeIcon}
              </button>
            </div>
            {errors.confirmPassword && (
              <span id="err-confirmPassword" role="alert" className="text-[11px] mt-0.5 text-[var(--c-auth-error)]">
                {errors.confirmPassword}
              </span>
            )}
          </div>
        </div>

        <p id="hint-password" className="text-[11px] text-[rgba(232,236,255,0.5)] !mt-0.5">
          At least 8 characters, with a letter and a number.
        </p>

        {/* Row 4: Terms checkbox */}
        <div className="flex flex-col pt-0.5">
          <label className="flex gap-2 items-start text-[11px] text-[rgba(232,236,255,0.78)] leading-snug cursor-pointer select-none">
            <input
              id="agreeTerms"
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked);
                if (errors.agreeTerms) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.agreeTerms;
                    return next;
                  });
                }
              }}
              onFocus={handleNormalFocus}
              onBlur={handleBlur}
              className="w-3.5 h-3.5 mt-0.5 rounded cursor-pointer accent-[var(--c-orange)]"
            />
            <span>
              I agree to the{" "}
              <Link
                href={authConfig.termsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-[var(--c-auth-ink)] hover:text-[var(--c-orange)] transition-colors"
              >
                {authConfig.termsText}
              </Link>{" "}
              and{" "}
              <Link
                href={authConfig.privacyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-[var(--c-auth-ink)] hover:text-[var(--c-orange)] transition-colors"
              >
                {authConfig.privacyText}
              </Link>
            </span>
          </label>
          {errors.agreeTerms && (
            <span role="alert" className="text-[11px] mt-0.5 text-[var(--c-auth-error)]">
              {errors.agreeTerms}
            </span>
          )}
        </div>

        {/* Status / Submit feedback */}
        {submitError && (
          <div role="alert" aria-live="assertive" className="text-xs p-2 rounded-lg bg-[rgba(255,154,139,0.12)] border border-[rgba(255,154,139,0.3)] text-[var(--c-auth-error)] mt-1.5">
            {submitError}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-[42px] rounded-full flex items-center justify-between px-5 text-sm font-semibold text-white transition-all duration-200 mt-2.5 cursor-pointer hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "var(--c-orange)" }}
        >
          <span>{isSubmitting ? "Creating Account…" : "Create Account"}</span>
          <i
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center -mr-2"
            style={{ background: "rgba(255,255,255,0.2)" }}
            aria-hidden="true"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </i>
        </button>

        {/* Alternate link */}
        <p className="text-center text-xs text-[rgba(232,236,255,0.7)] pt-1.5">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#FF9A5C] hover:underline transition-all"
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
