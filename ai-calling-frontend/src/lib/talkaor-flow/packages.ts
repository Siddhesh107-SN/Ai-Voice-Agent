/**
 * Centralized Talkaor package data.
 * Pricing and limits sourced directly from existing project plans (src/data/plans.ts).
 * `null` / empty means "not provided yet" - the UI simply hides that row.
 * Nothing here is processed as a payment.
 */
export type TalkaorPackage = {
  id: string;
  name: string;
  priceMonthly: number | null; // INR per month, null = custom / not provided
  priceYearly: number | null; // INR per year, null = custom / not provided
  priceNote?: string; // shown when price is null
  includedMinutes: number | null;
  maxCallMinutes: number | null;
  extraMinutePacks: string | null; // e.g. "Available" - not provided yet
  features: string[];
  limitations: string[];
};

export const PACKAGES: TalkaorPackage[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 2250,
    priceYearly: 25200,
    includedMinutes: 300,
    maxCallMinutes: 5,
    extraMinutePacks: null,
    features: [
      "300 minutes each month",
      "Maximum 5 minutes per call",
      "Enquiries, appointments, call history",
      "Business information configuration",
      "Option to purchase additional minutes",
    ],
    limitations: [],
  },
  {
    id: "growth",
    name: "Growth",
    priceMonthly: 5700,
    priceYearly: 66000,
    includedMinutes: 1000,
    maxCallMinutes: 5,
    extraMinutePacks: null,
    features: [
      "1,000 minutes each month",
      "Maximum 5 minutes per call",
      "Starter + rescheduling, analytics, summaries",
      "Business-specific voice agent configuration",
      "Option to purchase additional minutes",
    ],
    limitations: [],
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: 14250,
    priceYearly: 165000,
    includedMinutes: 2500,
    maxCallMinutes: 5,
    extraMinutePacks: null,
    features: [
      "2,500 minutes each month",
      "Maximum 5 minutes per call",
      "Growth + advanced reporting, higher capacity, priority support",
      "Dedicated onboarding assistance",
      "Option to purchase additional minutes",
    ],
    limitations: [],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: null,
    priceYearly: null,
    priceNote: "Custom pricing",
    includedMinutes: null,
    maxCallMinutes: null,
    extraMinutePacks: null,
    features: [],
    limitations: [],
  },
];

export function formatPrice(p: TalkaorPackage, cycle: "monthly" | "yearly" = "monthly"): string {
  const price = cycle === "yearly" ? p.priceYearly : p.priceMonthly;
  return price !== null
    ? "\u20B9" + price.toLocaleString("en-IN")
    : p.priceNote ?? "Pricing to be confirmed";
}
