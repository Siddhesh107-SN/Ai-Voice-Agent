import Link from "next/link";
import { why } from "@/data/content";

const icon = { width: 28, height: 28, viewBox: "0 0 28 28", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
const icons = [
  <svg key="a" {...icon}><path d="M15 3L6 16h7l-1 9 9-13h-7l1-9z" /></svg>, // faster
  <svg key="b" {...icon}><circle cx="14" cy="14" r="10" /><path d="M9 14.5l3.5 3.5L19 11" /></svg>, // consistent
  <svg key="c" {...icon}><path d="M4 8h20M4 14h14M4 20h9" /></svg>, // less manual work
  <svg key="d" {...icon}><rect x="4" y="7" width="20" height="14" rx="3" /><path d="M4 12h20" /></svg>, // packages
];

export default function WhyChoose() {
  return (
    <section data-nav-theme="light" className="section bg-warm" aria-labelledby="why-h">
      <div className="wrap grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 id="why-h" className="h-lg" data-reveal>{why.title}</h2>
          <p className="muted mt-5" data-reveal style={{ ["--d" as string]: "100ms" }}>{why.body}</p>
          <Link href={why.priceLine.href} className="btn btn-ghost mt-8" data-reveal style={{ ["--d" as string]: "200ms" }}>{why.priceLine.label}</Link>
        </div>
        <ul className="lg:col-span-7">
          {why.rows.map((r, i) => (
            <li key={r} className="flex items-center gap-5 border-t py-6 first:border-t-0 lg:first:border-t" style={{ borderColor: "var(--c-line)", ["--d" as string]: `${i * 110}ms` }} data-reveal>
              <span className="grid h-12 w-12 flex-none place-items-center rounded-full" style={{ background: "var(--c-blue-soft)", color: "var(--c-blue)" }}>{icons[i]}</span>
              <span className="text-[clamp(1.2rem,2vw,1.6rem)] font-medium leading-snug">{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
