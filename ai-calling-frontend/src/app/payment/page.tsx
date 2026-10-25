import type { Metadata } from "next";
import PaymentView from "@/components/talkaor-flow/PaymentView";

export const metadata: Metadata = {
  title: "Review & Pay | Talkaor",
  description: "Review your Talkaor package, scan the UPI QR code, and submit payment details for verification.",
};

export default function PaymentPage() {
  return <PaymentView />;
}
