import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import FaqAccordion from "@/components/FaqAccordion";

export const metadata: Metadata = { title: "FAQs | talkaor" };

export default function FaqPage() {
  return (
    <PageShell title="Frequently Asked Questions">
      <FaqAccordion />
    </PageShell>
  );
}
