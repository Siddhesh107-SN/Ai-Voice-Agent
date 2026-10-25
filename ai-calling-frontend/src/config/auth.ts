export const authConfig = {
  termsUrl: "/terms", // Placeholder until final legal documents are published
  privacyUrl: "/privacy",
  termsText: "Terms",
  privacyText: "Privacy Policy",
  forgotPasswordUrl: "/forgot-password", // Config-driven URL for password recovery
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
};
