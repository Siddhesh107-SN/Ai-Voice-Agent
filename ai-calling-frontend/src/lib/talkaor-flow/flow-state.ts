/**
 * Client-side registration-flow state (sessionStorage).
 * This only improves UX (step guarding, remembering the choice). It is NOT security:
 * the backend must validate the account, package and verification status itself.
 * Nothing here ever records "email verified" or "payment made".
 */
export const FLOW_ROUTES = {
  signup: "/signup",
  package: "/signup/package",
  verifyEmail: "/signup/verify-email",
  payment: "/payment",
} as const;

const KEY = "talkaor.signupFlow.v1";

export type BillingCycle = "monthly" | "yearly";

export type FlowDraft = {
  signupCompleted: boolean;
  email?: string;
  emailVerified?: boolean;
  selectedPackageId?: string;
  billingCycle?: BillingCycle;
};

export function readDraft(): FlowDraft {
  if (typeof window === "undefined") return { signupCompleted: false };
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return { signupCompleted: false };
    const parsed = JSON.parse(raw) as Partial<FlowDraft>;
    return {
      signupCompleted: parsed.signupCompleted === true,
      email: typeof parsed.email === "string" ? parsed.email : undefined,
      emailVerified: parsed.emailVerified === true,
      selectedPackageId: typeof parsed.selectedPackageId === "string" ? parsed.selectedPackageId : undefined,
      billingCycle: parsed.billingCycle === "yearly" ? "yearly" : "monthly",
    };
  } catch {
    return { signupCompleted: false };
  }
}

export function writeDraft(patch: Partial<FlowDraft>): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...readDraft(), ...patch }));
  } catch {
    /* storage unavailable - flow still works within the page */
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** "priya@company.com" -> "p•••••@company.com" */
export function maskEmail(email?: string): string | null {
  if (!email || !email.includes("@")) return null;
  const [local, domain] = email.split("@");
  if (!local || !domain) return null;
  return local[0] + "\u2022".repeat(Math.min(Math.max(local.length - 1, 1), 6)) + "@" + domain;
}
