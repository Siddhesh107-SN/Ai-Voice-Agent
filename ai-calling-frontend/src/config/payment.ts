/**
 * Payment configuration for Talkaor.
 *
 * To swap from the decorative placeholder to a genuine UPI QR:
 * 1. Replace the image file in /public/payment (e.g. /payment/upi-qr.png).
 * 2. Set `isPlaceholder: false`.
 * 3. Fill in `upiId` and `merchantName`.
 * No UI or layout changes are required.
 */
export interface PaymentConfig {
  qrImagePath: string;
  upiId: string | null;
  merchantName: string | null;
  isPlaceholder: boolean;
  supportEmail: string;
}

export const paymentConfig: PaymentConfig = {
  // Path to QR image relative to /public
  qrImagePath: "/payment/qr-placeholder.svg",

  // UPI VPA identifier (e.g., "talkaor@okhdfcbank"). Active for testing.
  upiId: "talkaor@okhdfcbank",

  // Merchant display name for UPI.
  merchantName: "Talkaor AI",

  // Set to false for testing so payment submission is enabled.
  isPlaceholder: false,

  // Contact email for payment assistance
  supportEmail: "support@talkaor.com",
};
