"use client";

import { useEffect, useRef, useState } from "react";
import { how } from "@/data/content";
import { howCard } from "@/data/scenes";

/** Vertical stepper (~250vh). Only the appointment card is sticky: light pinning, no scrub. */
export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const els = refs.current.filter(Boolean) as HTMLLIElement[];
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        });
      },
      { rootMargin: "-42% 0px -42% 0px" }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <section data-nav-theme="light" className="section bg-soft" aria-labelledby="how-h">
      <div className="wrap">
        <h2 id="how-h" className="h-lg max-w-[20ch]" data-reveal>{how.title}</h2>

        <div className="mt-12 grid gap-8 lg:mt-16 lg:grid-cols-12 lg:gap-16">
          {/* card first on small screens (sticky), right column on desktop */}
          <div className="sticky top-[76px] z-10 lg:order-2 lg:col-span-5 lg:self-start lg:top-[120px]">
            <div className="card p-5 md:p-7" style={{ background: "color-mix(in srgb, var(--c-surface) 92%, transparent)" }} aria-hidden>
              <div className="flex items-center justify-between">
                <span className="text-xl font-medium">Appointment</span>
                <span className="muted text-sm">{active + 1} / {how.steps.length}</span>
              </div>
              <ul className="mt-4 space-y-2.5 md:mt-5 md:space-y-3">
                {howCard.rows.map((r, i) => (
                  <li key={r.k} className="build-row flex items-center gap-3 rounded-xl p-3" data-on={i <= active}
                    style={{ background: i === active ? "var(--c-blue-soft)" : "var(--c-blue-tint)", transition: "background .5s, opacity .6s var(--ease), transform .6s var(--ease)" }}>
                    <span className="grid h-7 w-7 flex-none place-items-center rounded-full text-xs" style={{ background: "var(--c-blue)", color: "var(--c-offwhite)" }}>
                      {i < active ? "✓" : i + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{r.k}</span>
                      <span className="muted block text-[.82rem] leading-snug">{r.v}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <ol className="lg:order-1 lg:col-span-7">
            {how.steps.map((s, i) => (
              <li key={s.title} ref={(el) => { refs.current[i] = el; }} data-i={i} data-active={active === i}
                className="step flex min-h-[38vh] items-center gap-5 lg:min-h-[52vh]">
                <span className="step-dot flex-none">{i + 1}</span>
                <div>
                  <h3 className="h-md">{s.title}</h3>
                  <p className="muted mt-2 max-w-[46ch]">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
