// Set only when the backend confirms a real authenticated status endpoint.
export const STATUS_ENDPOINT = process.env.NEXT_PUBLIC_ONBOARDING_STATUS_URL || "/api/v1/onboarding/status";

export const PAYMENT_PAGE_PATH = "/payment";
// No dashboard route exists in the current project; keep this empty until one is added.
export const DASHBOARD_PATH = "/dashboard";
// This address is already configured for payment support in config/payment.ts.
export const SUPPORT_HREF = "mailto:support@talkaor.com";
export const ONBOARDING_STATUS_PATH = "/onboarding-status";
export const HOME_PATH = "/";
