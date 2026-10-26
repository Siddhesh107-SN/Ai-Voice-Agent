import type { Metadata } from "next";
import SignupView from "@/components/SignupView";

export const metadata: Metadata = {
  title: "Sign up | talkaor",
  description: "Create your Talkaor account to automate customer calls and appointments.",
};

export default function SignupPage() {
  return <SignupView />;
}
