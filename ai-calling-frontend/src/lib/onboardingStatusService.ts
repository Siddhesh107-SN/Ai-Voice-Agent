import { STATUS_ENDPOINT } from "@/config/onboardingStatus";
import { http } from "@/lib/http";
import type { OnboardingStage, OnboardingStatus, PaymentStatus } from "./onboardingStatusTypes";

const PAYMENT: PaymentStatus[] = [
  "awaiting_submission",
  "pending_verification",
  "verified",
  "rejected",
];
const STAGE: OnboardingStage[] = [
  "awaiting_payment_verification",
  "awaiting_business_requirements",
  "agent_configuration",
  "testing_review",
  "setup_complete",
];

export class StatusUnavailableError extends Error {}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export function normalizeStatus(raw: unknown): OnboardingStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const payment = PAYMENT.find((p) => p === r.paymentStatus);
  if (!payment || typeof r.dashboardAccessGranted !== "boolean") return null;

  const stage =
    r.onboardingStage == null
      ? null
      : STAGE.find((s) => s === r.onboardingStage) ?? undefined;
  if (stage === undefined) return null;

  if (
    (payment === "awaiting_submission" || payment === "rejected") &&
    stage !== null
  ) {
    return null;
  }
  if (payment === "pending_verification" && stage !== "awaiting_payment_verification") {
    return null;
  }
  if (payment === "verified" && (!stage || stage === "awaiting_payment_verification")) {
    return null;
  }

  return {
    paymentStatus: payment,
    onboardingStage: stage,
    businessName: str(r.businessName),
    packageName: str(r.packageName),
    amount: typeof r.amount === "number" && isFinite(r.amount) ? r.amount : undefined,
    currency: str(r.currency),
    submittedAt: str(r.submittedAt),
    transactionRef: str(r.transactionRef),
    rejectionReason: str(r.rejectionReason),
    dashboardAccessGranted: r.dashboardAccessGranted,
  };
}

export async function fetchOnboardingStatus(signal?: AbortSignal): Promise<OnboardingStatus> {
  if (!STATUS_ENDPOINT) {
    throw new StatusUnavailableError("Status endpoint is not configured.");
  }

  let json: unknown;
  try {
    json = await http(STATUS_ENDPOINT, {
      method: "GET",
      signal,
    });
  } catch (err: any) {
    throw new StatusUnavailableError(err?.message || "Failed to fetch onboarding status.");
  }

  const status = normalizeStatus(json);
  if (!status) throw new StatusUnavailableError("Unexpected response.");
  return status;
}

export function maskReference(ref?: string): string | undefined {
  if (!ref) return undefined;
  const clean = ref.replace(/\s/g, "");
  if (clean.length <= 6) return "••••";
  return "••••••" + clean.slice(-4);
}
