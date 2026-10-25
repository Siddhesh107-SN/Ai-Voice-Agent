import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ContactForm from "@/components/ContactForm";
import { contact } from "@/data/content";

export const metadata: Metadata = { title: "Contact | talkaor" };

export default function ContactPage() {
  return (
    <PageShell title={contact.title} intro={contact.body}>
      <div className="max-w-[560px]">
        <ContactForm />
        <p className="muted mt-4 text-sm">{contact.responseTime}</p>
      </div>
    </PageShell>
  );
}
