import Link from "next/link";
import { cta } from "@/data/content";

export default function FinalCta() {
  return (
    <section data-nav-theme="dark" className="section bg-dark" aria-labelledby="cta-h">
      <div className="wrap max-w-[860px] text-center">
        <h2 id="cta-h" className="h-lg" data-reveal>{cta.title}</h2>
        <p className="mt-6 text-[clamp(1.25rem,2.2vw,1.8rem)] font-medium" data-reveal style={{ ["--d" as string]: "100ms" }}>{cta.sub}</p>
        <p className="muted mx-auto mt-5 max-w-[56ch]" data-reveal style={{ ["--d" as string]: "180ms" }}>{cta.body}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-4" data-reveal style={{ ["--d" as string]: "260ms" }}>
          <Link href={cta.primary.href} className="btn btn-light">{cta.primary.label}</Link>
          <Link href={cta.secondary.href} className="btn btn-ghost">{cta.secondary.label}</Link>
        </div>
      </div>
    </section>
  );
}
