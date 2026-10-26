import { about } from "@/data/content";

export default function About() {
  return (
    <section data-nav-theme="light" className="section bg-soft" aria-labelledby="about-h">
      <div className="wrap grid gap-10 lg:grid-cols-12">
        <h2 id="about-h" className="h-lg lg:col-span-6" data-reveal>{about.title}</h2>
        <div className="space-y-6 lg:col-span-6">
          {about.paragraphs.map((p, i) => (
            <p key={i} className="lead" data-reveal style={{ ["--d" as string]: `${120 + i * 120}ms` }}>{p}</p>
          ))}
          <p className="text-[clamp(1.3rem,2.2vw,1.8rem)] font-medium leading-snug" style={{ ["--d" as string]: "360ms", color: "var(--c-blue)" }} data-reveal>{about.mission}</p>
        </div>
      </div>
    </section>
  );
}
