// All pricing data lives in this single editable file.

export const formatINR = (amount: number): string =>
  `₹${new Intl.NumberFormat("en-IN").format(amount)}`;

export type Plan = {
  id: "starter" | "growth" | "business";
  name: string;
  blurb: string;
  featured?: boolean;
  monthly: {
    price: number;
    priceLabel: string;
    minutes: number;
    minutesLabel: string;
    perCall: string;
    estimatedCalls: string;
  };
  yearly: {
    price: number;
    priceLabel: string;
    standardPrice: number;
    standardPriceLabel: string;
    savings: number;
    savingsLabel: string;
    minutesPerMonth: number;
    minutesLabel: string;
    perCall: string;
    estimatedCalls: string;
  };
  features: string[];
  ideal: string;
};

export const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    blurb: "For small businesses beginning their AI voice automation journey.",
    monthly: {
      price: 2250,
      priceLabel: "₹2,250/month",
      minutes: 300,
      minutesLabel: "300 included minutes/month",
      perCall: "5 min",
      estimatedCalls: "100 to 150 calls/month (2 to 3 min average)",
    },
    yearly: {
      price: 25200,
      priceLabel: "₹25,200/year",
      standardPrice: 27000,
      standardPriceLabel: "₹27,000",
      savings: 1800,
      savingsLabel: "Save ₹1,800",
      minutesPerMonth: 300,
      minutesLabel: "300 minutes each month",
      perCall: "5 min",
      estimatedCalls: "100 to 150 calls/month (2 to 3 min average)",
    },
    features: [
      "300 minutes each month",
      "Maximum 5 minutes per call",
      "Enquiries, appointments, call history",
      "Business information configuration",
      "Option to purchase additional minutes",
    ],
    ideal: "Small businesses and low-volume enquiry handling.",
  },
  {
    id: "growth",
    name: "Growth",
    blurb: "For businesses managing regular customer interactions.",
    featured: true,
    monthly: {
      price: 5700,
      priceLabel: "₹5,700/month",
      minutes: 1000,
      minutesLabel: "1,000 included minutes/month",
      perCall: "5 min",
      estimatedCalls: "333 to 500 calls/month",
    },
    yearly: {
      price: 66000,
      priceLabel: "₹66,000/year",
      standardPrice: 68400,
      standardPriceLabel: "₹68,400",
      savings: 2400,
      savingsLabel: "Save ₹2,400",
      minutesPerMonth: 1000,
      minutesLabel: "1,000 minutes each month",
      perCall: "5 min",
      estimatedCalls: "333 to 500 calls/month",
    },
    features: [
      "1,000 minutes each month",
      "Maximum 5 minutes per call",
      "Starter + rescheduling, analytics, summaries",
      "Business-specific voice agent configuration",
      "Option to purchase additional minutes",
    ],
    ideal: "Clinics, service providers, and growing businesses.",
  },
  {
    id: "business",
    name: "Business",
    blurb: "For businesses with higher communication requirements.",
    monthly: {
      price: 14250,
      priceLabel: "₹14,250/month",
      minutes: 2500,
      minutesLabel: "2,500 included minutes/month",
      perCall: "5 min",
      estimatedCalls: "833 to 1,250 calls/month",
    },
    yearly: {
      price: 165000,
      priceLabel: "₹1,65,000/year",
      standardPrice: 171000,
      standardPriceLabel: "₹1,71,000",
      savings: 6000,
      savingsLabel: "Save ₹6,000",
      minutesPerMonth: 2500,
      minutesLabel: "2,500 minutes each month",
      perCall: "5 min",
      estimatedCalls: "833 to 1,250 calls/month",
    },
    features: [
      "2,500 minutes each month",
      "Maximum 5 minutes per call",
      "Growth + advanced reporting, higher capacity, priority support",
      "Dedicated onboarding assistance",
      "Option to purchase additional minutes",
    ],
    ideal: "Organizations handling frequent customer enquiries and high call volume.",
  },
];

/**
 * INTERNAL ONLY: NEVER RENDER.
 * Reference economics and margin assumptions for internal tracking only.
 * Must NOT be displayed anywhere in customer-facing UI or DOM.
 */
export const internal = {
  assumedVoiceCostPerMinute: 4.5,
  plans: {
    starter: {
      platformFee: 900,
      includedVoiceCost: 1350,
    },
    growth: {
      platformFee: 1200,
      includedVoiceCost: 4500,
    },
    business: {
      platformFee: 3000,
      includedVoiceCost: 11250,
    },
  },
  additionalPacks: [
    { minutes: 100, voiceCost: 450, talkaorFee: 200 },
    { minutes: 500, voiceCost: 2250, talkaorFee: 600 },
    { minutes: 1000, voiceCost: 4500, talkaorFee: 1000 },
  ],
};

export type MinutePack = {
  minutes: number;
  price: number;
  priceLabel: string;
};

export const minutePacks: {
  title: string;
  heading: string;
  body: string;
  packs: MinutePack[];
  note: string;
} = {
  title: "Keep Your Conversations Going",
  heading: "Need More Minutes?",
  body: "Need more voice minutes before your next billing cycle? Purchase an additional calling pack to extend your available usage without upgrading your subscription.",
  packs: [
    { minutes: 100, price: 650, priceLabel: "₹650" },
    { minutes: 500, price: 2850, priceLabel: "₹2,850" },
    { minutes: 1000, price: 5500, priceLabel: "₹5,500" },
  ],
  note: "Additional calling packs are credited after confirmed payment and used after your monthly plan allowance.",
};

/**
 * PLACEHOLDER: Define the top-up expiry period (e.g., "90 days", "365 days").
 * Until set, the UI renders "Top-up validity is shown at purchase".
 */
export const TOP_UP_EXPIRY_PERIOD: string | null = null; // TODO: define the expiry period

export const billingRules = [
  { k: "Call counting", v: "Only answered, successfully connected calls count." },
  { k: "Maximum call duration", v: "5 minutes per call." },
  { k: "Unanswered or failed calls", v: "No deduction." },
  { k: "Monthly allowance", v: "Resets at each billing cycle." },
  { k: "Extra minutes", v: "Purchased separately as top-ups." },
  { k: "Usage deduction", v: "Monthly allowance first, then purchased minutes." },
  { k: "When allowance reaches zero", v: "New calls pause until a top-up or renewal." },
  {
    k: "Top-up expiry",
    v: TOP_UP_EXPIRY_PERIOD ? `Valid for ${TOP_UP_EXPIRY_PERIOD}.` : "Top-up validity is shown at purchase",
  },
  { k: "Payment verification", v: "Top-ups are credited only after confirmed payment." },
  { k: "Taxes and other costs", v: "Calculated separately as applicable." },
];

export const pricingHeader = {
  title: "Simple, Flexible, Minute-Based Pricing",
  body: "Choose a plan based on how many minutes your business needs each month. Every plan includes a defined monthly voice-minute allowance and a 5-minute maximum duration per call.",
  footnote: "All prices are in Indian rupees (INR). Taxes are calculated separately as applicable.",
  yearlyNote: "Unused monthly minutes do not roll over. Yearly subscriptions receive their allowance monthly, not as one large annual balance.",
};

export const comparison = {
  columns: ["Starter", "Growth", "Business"],
  rows: [
    {
      label: "Price",
      monthly: ["₹2,250/mo", "₹5,700/mo", "₹14,250/mo"],
      yearly: ["₹25,200/yr", "₹66,000/yr", "₹1,65,000/yr"],
    },
    { label: "Included minutes", values: ["300 min/mo", "1,000 min/mo", "2,500 min/mo"] },
    { label: "Max per call", values: ["5 min", "5 min", "5 min"] },
    { label: "Estimated calls / month", values: ["100 to 150", "333 to 500", "833 to 1,250"] },
    {
      label: "Main features",
      values: [
        "Enquiries, appointments, call history",
        "Starter + rescheduling, analytics, summaries",
        "Growth + advanced reporting, higher capacity, priority support",
      ],
    },
  ],
};
