/**
 * Payment API client.
 * Sends multipart form data to POST /api/v1/payments/manual-submit.
 */

import { http } from '@/lib/http';

export interface PaymentSubmissionPayload {
  packageId: string;
  billingCycle: "monthly" | "yearly";
  amountPaid: number;
  transactionId: string;
  paymentDate: string; // YYYY-MM-DD format
  payerName?: string;
  screenshotFile?: File | null;
}

export interface PaymentSubmissionResponse {
  success: boolean;
  submissionId?: string;
  message: string;
  status: "pending_manual_verification";
  source: "backend";
}

export async function submitPayment(
  payload: PaymentSubmissionPayload
): Promise<PaymentSubmissionResponse> {
  const formData = new FormData();
  formData.append("package_id", payload.packageId);
  formData.append("billing_cycle", payload.billingCycle);
  formData.append("amount_paid", payload.amountPaid.toString());
  formData.append("transaction_id", payload.transactionId);
  formData.append("payment_date", payload.paymentDate);
  if (payload.payerName) {
    formData.append("payer_name", payload.payerName);
  }
  if (payload.screenshotFile) {
    formData.append("screenshot", payload.screenshotFile);
  }

  const res = await http<PaymentSubmissionResponse>("/api/v1/payments/manual-submit", {
    method: "POST",
    body: formData,
  });

  return res;
}
