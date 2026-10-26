"use client";

import { notFound } from "next/navigation";
import { useState } from "react";
import StatusView from "@/components/onboarding-status/StatusView";
import type { OnboardingStatus, StatusViewState } from "@/lib/onboardingStatusTypes";

const base: OnboardingStatus = {
  paymentStatus: "pending_verification",
  onboardingStage: "awaiting_payment_verification",
  businessName: "Sample Business",
  packageName: "Growth",
  amount: 3499,
  currency: "INR",
  submittedAt: "2026-01-01T10:30:00+05:30",
  transactionRef: "SAMPLE1234567890",
  dashboardAccessGranted: false,
};
const scenarios: Record<string, StatusViewState> = {
  loading: { kind: "loading" },
  error: { kind: "error", message: "We could not load your current status." },
  "not submitted": {
    kind: "ready",
    isPreview: true,
    data: {
      ...base,
      paymentStatus: "awaiting_submission",
      onboardingStage: null,
      submittedAt: undefined,
      transactionRef: undefined,
      amount: undefined,
    },
  },
  pending: { kind: "ready", isPreview: true, data: base },
  rejected: {
    kind: "ready",
    isPreview: true,
    data: {
      ...base,
      paymentStatus: "rejected",
      onboardingStage: null,
      rejectionReason: "Sample reason: amount did not match.",
    },
  },
  "verified: step 2": {
    kind: "ready",
    isPreview: true,
    data: { ...base, paymentStatus: "verified", onboardingStage: "awaiting_business_requirements" },
  },
  "step 3": {
    kind: "ready",
    isPreview: true,
    data: { ...base, paymentStatus: "verified", onboardingStage: "agent_configuration" },
  },
  "step 4": {
    kind: "ready",
    isPreview: true,
    data: { ...base, paymentStatus: "verified", onboardingStage: "testing_review" },
  },
  "complete, no access": {
    kind: "ready",
    isPreview: true,
    data: { ...base, paymentStatus: "verified", onboardingStage: "setup_complete" },
  },
  "complete, access granted": {
    kind: "ready",
    isPreview: true,
    data: {
      ...base,
      paymentStatus: "verified",
      onboardingStage: "setup_complete",
      dashboardAccessGranted: true,
    },
  },
};

export default function PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const [key, setKey] = useState("pending");
  return (
    <>
      <div
        style={{
          background: "var(--c-auth-panel)",
          color: "var(--c-auth-ink)",
          padding: 10,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          fontSize: 13,
        }}
      >
        <strong>DEV PREVIEW (sample data):</strong>
        {Object.keys(scenarios).map((k) => (
          <button
            key={k}
            onClick={() => setKey(k)}
            aria-pressed={k === key}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid var(--c-auth-line)",
              background: k === key ? "var(--c-orange)" : "transparent",
              color: "var(--c-auth-ink)",
              cursor: "pointer",
            }}
          >
            {k}
          </button>
        ))}
      </div>
      <StatusView state={scenarios[key]} onRetry={() => {}} />
    </>
  );
}
