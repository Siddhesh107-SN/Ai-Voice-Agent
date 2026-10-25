import type { Metadata } from "next";
import PackageSelection from "@/components/talkaor-flow/PackageSelection";

export const metadata: Metadata = {
  title: "Choose your package | Talkaor",
  description: "Select an AI voice automation package for your Talkaor account.",
};

export default function PackagePage() {
  return <PackageSelection />;
}
