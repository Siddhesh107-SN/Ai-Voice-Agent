/**
 * Centralized billing and subscription period calculation helper.
 *
 * Rules:
 * - Subscriptions start at ACTIVATION (when our team verifies payment and
 *   configures/activates the voice agent), NOT when payment details are submitted.
 * - Monthly cycle: ends / renews exactly 1 month after the confirmed start date.
 * - Yearly cycle: ends / renews exactly 12 months after the confirmed start date.
 * - If backend confirmed dates are unavailable, display the rule and a clearly
 *   marked illustrative example. Never display an unconfirmed date as real.
 */

export type BillingCycle = "monthly" | "yearly";

export interface BackendSubscriptionDates {
  startDate?: string;
  endDate?: string;
  nextPaymentDue?: string;
}

export interface SubscriptionPeriodInfo {
  billingCycle: BillingCycle;
  billingCycleLabel: string;
  startsAtText: string;
  startsAtExplanation: string;
  ruleExplanation: string;
  nextRenewalDate: string;
  nextRenewalYear: number;
  endingDate: string;
  estimatedDuration: string;
  confirmedDates: {
    startDate?: string;
    endDate?: string;
    nextPaymentDue?: string;
  } | null;
  illustrativeExample: {
    sampleStart: string;
    sampleEnd: string;
    renewalYear: number;
    note: string;
  };
}

/**
 * Formats a Date object to e.g. "24 Oct 2026".
 */
export function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Adds months to a date safely.
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  result.setMonth(targetMonth);
  return result;
}

/**
 * Returns comprehensive period and renewal information for a given billing cycle.
 */
export function calculateSubscriptionPeriod(
  cycle: BillingCycle,
  backendDates?: BackendSubscriptionDates
): SubscriptionPeriodInfo {
  const isYearly = cycle === "yearly";

  // Check if real dates were provided by backend
  const hasConfirmed = Boolean(backendDates?.startDate && backendDates?.endDate);
  const confirmedDates = hasConfirmed
    ? {
        startDate: backendDates?.startDate,
        endDate: backendDates?.endDate,
        nextPaymentDue: backendDates?.nextPaymentDue ?? backendDates?.endDate,
      }
    : null;

  // Compute illustrative example (hypothetical today -> +1 month or +12 months)
  const sampleNow = new Date();
  const sampleEnd = isYearly ? addMonths(sampleNow, 12) : addMonths(sampleNow, 1);

  return {
    billingCycle: cycle,
    billingCycleLabel: isYearly ? "Yearly billing" : "Monthly billing",
    startsAtText: "After payment is verified and agent is activated",
    startsAtExplanation:
      "Your subscription starts when our team manually verifies your payment and activates your AI voice agent — not when you submit this form.",
    ruleExplanation: isYearly
      ? "Renews annually: 12 months after your confirmed activation date."
      : "Renews monthly: 1 month after your confirmed activation date.",
    nextRenewalDate: confirmedDates?.nextPaymentDue ?? formatDisplayDate(sampleEnd),
    nextRenewalYear: sampleEnd.getFullYear(),
    endingDate: confirmedDates?.endDate ?? formatDisplayDate(sampleEnd),
    estimatedDuration: isYearly ? "1 Year (12 months)" : "1 Month (30 days)",
    confirmedDates,
    illustrativeExample: {
      sampleStart: formatDisplayDate(sampleNow),
      sampleEnd: formatDisplayDate(sampleEnd),
      renewalYear: sampleEnd.getFullYear(),
      note: "Illustrative example based on today's activation. Your exact renewal date will be confirmed by email once your agent is activated.",
    },
  };
}
