"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { BotState } from "@/components/AuthBots";
import { authConfig } from "@/config/auth";
import { DASHBOARD_PATH, ONBOARDING_STATUS_PATH } from "@/config/onboardingStatus";
import { loginUser } from "@/services/auth";

export default function LoginView() {
  const router = useRouter();
  const [botState, setBotState] = useState<BotState>("idle");
  const [lineLengths, setLineLengths] = useState<number[]>([0, 0, 0, 0]);

  // Form values
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Errors and submission state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const typingTimer = useRef<number>();
  const errorResetTimer = useRef<number>();

  const handleNormalFocus = () => {
    if (botState !== "error") {
      setBotState("watching");
    }
  };

  const handlePasswordFocus = () => {
    setBotState("password");
  };

  const handleBlur = () => {
    setTimeout(() => {
      const active = document.activeElement;
      if (!active || (active.tagName !== "INPUT" && active.tagName !== "SELECT")) {
        setBotState("idle");
      }
    }, 60);
  };

  const handleEmailInput = (val: string) => {
    setEmail(val);
    setLineLengths([val ? Math.min(28, 5 + val.length * 1.6) : 0, 0, 0, 0]);

    if (errors.email) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.email;
        return next;
      });
    }
    setSubmitError("");

    setBotState("typing");
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => {
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "SELECT")) {
        const isPw = active.getAttribute("type") === "password" || active.id === "lp";
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

    if (!emailRegex.test(email.trim())) {
      errs.email = "Enter a valid email";
    }
    if (!password) {
      errs.password = "Enter your password";
    }

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError("");
    setSubmitSuccess("");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      triggerErrorState();
      const firstKey = Object.keys(validationErrors)[0];
      const el = document.getElementById(firstKey === "email" ? "le" : "lp");
      el?.focus();
      return;
    }

    setIsSubmitting(true);
    setBotState("typing");

    try {
      const response = await loginUser({
        email: email.trim(),
        password,
      });
      if (response.success !== true) {
        throw new Error(response.message || "Login was not confirmed by the server.");
      }

      const canOpenDashboard =
        response.dashboardAccessGranted === true && Boolean(DASHBOARD_PATH);
      setSubmitSuccess(
        canOpenDashboard
          ? "Welcome back! Redirecting…"
          : "Welcome back! Redirecting to your onboarding status…"
      );
      setBotState("idle");
      router.replace(canOpenDashboard ? DASHBOARD_PATH : ONBOARDING_STATUS_PATH);
    } catch (err: any) {
      const msg = err.message || "Invalid credentials or network issue. Please try again.";
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
      title="Welcome back"
      subtitle="Log in to manage your calls and appointments."
      botState={botState}
      botLineLengths={lineLengths}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email */}
        <div className="flex flex-col">
          <label htmlFor="le" className="text-xs font-medium text-[rgba(232,236,255,0.8)] mb-1">
            Business email
          </label>
          <input
            id="le"
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            value={email}
            onChange={(e) => handleEmailInput(e.target.value)}
            onFocus={handleNormalFocus}
            onBlur={handleBlur}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "err-email" : undefined}
            className="w-full rounded-[10px] px-3 py-2 text-[13px] text-[var(--c-auth-ink)] placeholder-[rgba(232,236,255,0.36)] transition-all outline-none"
            style={{
              background: "var(--c-auth-field-bg)",
              border: `1px solid ${errors.email ? "var(--c-auth-error)" : "var(--c-auth-line)"}`,
            }}
          />
          {errors.email && (
            <span id="err-email" role="alert" className="text-xs mt-1 text-[var(--c-auth-error)]">
              {errors.email}
            </span>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col">
          <label htmlFor="lp" className="text-xs font-medium text-[rgba(232,236,255,0.8)] mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="lp"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.password;
                    return next;
                  });
                }
                setSubmitError("");
              }}
              onFocus={handlePasswordFocus}
              onBlur={handleBlur}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "err-password" : undefined}
              className="w-full rounded-[10px] pl-3 pr-9 py-2 text-[13px] text-[var(--c-auth-ink)] placeholder-[rgba(232,236,255,0.36)] transition-all outline-none"
              style={{
                background: "var(--c-auth-field-bg)",
                border: `1px solid ${errors.password ? "var(--c-auth-error)" : "var(--c-auth-line)"}`,
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--c-auth-muted)] hover:text-[var(--c-auth-ink)] p-1 rounded transition-colors"
            >
              {showPassword ? eyeOffIcon : eyeIcon}
            </button>
          </div>
          {errors.password && (
            <span id="err-password" role="alert" className="text-xs mt-1 text-[var(--c-auth-error)]">
              {errors.password}
            </span>
          )}
        </div>

        {/* Forgot password */}
        <div className="flex justify-end -mt-2">
          <Link
            href={authConfig.forgotPasswordUrl}
            className="text-xs text-[var(--c-auth-muted)] hover:text-[var(--c-auth-ink)] hover:underline transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Status / Submit feedback */}
        {submitError && (
          <div role="alert" aria-live="assertive" className="text-xs p-2.5 rounded-lg bg-[rgba(255,154,139,0.12)] border border-[rgba(255,154,139,0.3)] text-[var(--c-auth-error)] mt-2">
            {submitError}
          </div>
        )}

        {submitSuccess && (
          <div role="status" aria-live="polite" className="text-xs p-2.5 rounded-lg bg-[rgba(40,92,204,0.16)] border border-[rgba(40,92,204,0.4)] text-[var(--c-offwhite)] mt-2">
            {submitSuccess}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-[46px] rounded-full flex items-center justify-between px-5 text-sm font-semibold text-white transition-all duration-200 mt-5 cursor-pointer hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "var(--c-orange)" }}
        >
          <span>{isSubmitting ? "Logging in…" : "Log in"}</span>
          <i
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center -mr-2"
            style={{ background: "rgba(255,255,255,0.2)" }}
            aria-hidden="true"
          >
            <svg
              width="16"
              height="16"
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
        <p className="text-center text-xs text-[rgba(232,236,255,0.7)] pt-3">
          New to Talkaor?{" "}
          <Link
            href="/signup"
            className="font-semibold text-[#FF9A5C] hover:underline transition-all"
          >
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
