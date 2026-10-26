import { ReactNode } from "react";

/** Shared header block for the supporting pages (pricing, faq, contact, login, signup). */
export default function PageShell({ title, intro, children, narrow }: { title: string; intro?: string; children: ReactNode; narrow?: boolean }) {
  return (
    <div className="bg-page" data-nav-theme="light">
      <div className={`wrap ${narrow ? "max-w-[760px]" : ""}`} style={{ paddingTop: "calc(var(--nav-h) + clamp(48px, 8vw, 96px))", paddingBottom: "clamp(64px, 9vw, 120px)" }}>
        <h1 className="h-xl max-w-[18ch]" data-reveal>{title}</h1>
        {intro && <p className="lead muted mt-5" data-reveal style={{ ["--d" as string]: "80ms" }}>{intro}</p>}
        <div className="mt-12 md:mt-16">{children}</div>
      </div>
    </div>
  );
}
