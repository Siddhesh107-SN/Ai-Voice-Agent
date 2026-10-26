import type { Metadata } from "next";
import LoginView from "@/components/LoginView";

export const metadata: Metadata = {
  title: "Log in | talkaor",
  description: "Log in to your Talkaor dashboard to manage calls and appointments.",
};

export default function LoginPage() {
  return <LoginView />;
}
