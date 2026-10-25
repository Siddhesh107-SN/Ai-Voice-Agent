import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import PricingView from "@/components/PricingView";
import { pricingHeader } from "@/data/plans";

export const metadata: Metadata = { title: "Pricing | talkaor" };

export default function PricingPage() {
  return (
    <PageShell title={pricingHeader.title} intro={pricingHeader.body}>
      <PricingView />
    </PageShell>
  );
}
