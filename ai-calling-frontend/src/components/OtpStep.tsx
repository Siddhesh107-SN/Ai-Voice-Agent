"use client";

import React, { useEffect, useState } from "react";
import { authConfig } from "@/config/auth";

const API = authConfig.apiBaseUrl.replace(/\/$/, "");

type Props = {
  email: string;
  onVerified: () => Promise<void>;
  onBack: () => void;
};

export default function OtpStep({ email, onVerified, onBack }: Props) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Invalid or expired code");
      }
      await onVerified();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      const res = await fetch(`${API}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Could not resend code");
      }
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || "Could not resend code");
    }
  };

  return (
    <form onSubmit={handleVerify} noValidate className="space-y-3">
      <div className="flex flex-col">
        <label htmlFor="otp" className="text-[11px] font-medium text-[rgba(232,236,255,0.8)] mb-0.5">
          Verification code
        </label>
        <input
          id="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          placeholder="123456"
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
            setError("");
          }}
          className="w-full rounded-[8px] px-2.5 py-2 text-[18px] tracking-[0.5em] text-center text-[var(--c-auth-ink)] placeholder-[rgba(232,236,255,0.36)] transition-all outline-none"
          style={{
            background: "var(--c-auth-field-bg)",
            border: `1px solid ${error ? "var(--c-auth-error)" : "var(--c-auth-line)"}`,
          }}
        />
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="text-xs p-2 rounded-lg bg-[rgba(255,154,139,0.12)] border border-[rgba(255,154,139,0.3)] text-[var(--c-auth-error)]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || otp.length !== 6}
        className="w-full h-[42px] rounded-full flex items-center justify-center text-sm font-semibold text-white transition-all duration-200 cursor-pointer hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: "var(--c-orange)" }}
      >
        {loading ? "Verifying…" : "Verify & Create Account"}
      </button>

      <div className="flex items-center justify-between text-xs text-[rgba(232,236,255,0.7)]">
        <button type="button" onClick={onBack} className="hover:underline">
          ← Change email
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="font-semibold text-[#FF9A5C] hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}