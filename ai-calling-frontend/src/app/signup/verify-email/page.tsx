import type { Metadata } from "next";
import VerifyEmail from "@/components/talkaor-flow/VerifyEmail";

export const metadata: Metadata = {
  title: "Verify your email | Talkaor",
  description: "Verify your email address for your Talkaor account.",
};

export default function VerifyEmailPage() {
  return <VerifyEmail />;
}
