export type PaymentStatus =
  | "awaiting_submission"
  | "pending_verification"
  | "verified"
  | "rejected";

export type OnboardingStage =
  | "awaiting_payment_verification"
  | "awaiting_business_requirements"
  | "agent_configuration"
  | "testing_review"
  | "setup_complete";

export interface OnboardingStatus {
  paymentStatus: PaymentStatus;
  onboardingStage: OnboardingStage | null;
  businessName?: string;
  packageName?: string;
  amount?: number;
  currency?: string;
  submittedAt?: string;
  transactionRef?: string;
  rejectionReason?: string;
  dashboardAccessGranted: boolean;
}

export type StatusViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: OnboardingStatus; isPreview?: boolean };

export const STAGES: { id: OnboardingStage; title: string; description: string }[] = [
  {
    id: "awaiting_payment_verification",
    title: "Awaiting payment verification",
    description: "Our team is reviewing your payment.",
  },
  {
    id: "awaiting_business_requirements",
    title: "Awaiting business requirements",
    description: "Payment verified. Talkaor will contact you.",
  },
  {
    id: "agent_configuration",
    title: "Agent configuration in progress",
    description: "We are configuring your AI voice agent.",
  },
  {
    id: "testing_review",
    title: "Testing and review",
    description: "Your agent is tested before you get access.",
  },
  {
    id: "setup_complete",
    title: "Setup complete",
    description: "Your agent is ready. Dashboard access is enabled by Talkaor.",
  },
];
