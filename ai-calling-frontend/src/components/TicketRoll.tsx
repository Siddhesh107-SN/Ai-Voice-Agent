"use client";

import { useRef } from "react";
import { stubScene as s } from "@/data/scenes";
import { useLazyScene } from "@/lib/hooks";

/**
 * Scene 2 of 2 (pinned ~300vh). Stubs tear off a perforated roll, one per scroll beat.
 * The final stub prints the (placeholder) result numbers from data/scenes.ts.
 */
export default function TicketRoll() {
  const root = useRef<HTMLElement>(null);

  useLazyScene(root, ({ gsap, ScrollTrigger, el, reduced, mobile }) => {
    if (reduced) el.classList.add("scene-static");
    const stubs = Array.from(el.querySelectorAll<HTMLElement>("[data-stub]"));
    const final = el.querySelector<HTMLElement>("[data-final]")!;
    const all = [...stubs, final];
    const cap = el.querySelector<HTMLElement>("[data-tcap]");
    const static_ = reduced;

    // desktop: stubs leave the roll sideways; mobile: the roll sits on top and stubs drop down
    const P = mobile
      ? { start: { x: 0, y: -170 }, out: { x: 0, y: -40 }, end: { x: 0, y: 60 } }
      : { start: { x: -100, y: 0 }, out: { x: -10, y: 0 }, end: { x: 150, y: 16 } };
    gsap.set(all, { opacity: 0, ...P.start, rotate: 0, scale: 1 });
    const tl = gsap.timeline({ defaults: { ease: "power2.out" }, paused: reduced });

    all.forEach((st, i) => {
      const at = i * 1.4;
      // slide out from behind the roll, then tear off and settle
      tl.set(st, { opacity: 1 }, at);
      tl.to(st, { ...P.out, duration: 0.7, ease: "power1.inOut" }, at);
      tl.to(st, { ...P.end, rotate: i % 2 ? 3 : -3, duration: 0.6, ease: "power3.out" }, at + 0.7);
      // earlier stubs recede like a deck
      all.slice(0, i).forEach((prev, j) => {
        tl.to(prev, { y: `-=${mobile ? 24 : 34}`, scale: 0.97, opacity: Math.max(0.35, 1 - (i - j) * 0.22), duration: 0.6 }, at + 0.7);
      });
    });
    tl.to({}, { duration: 1.2 });
    if (cap) tl.fromTo(cap, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0);

    if (static_) {
      // static fallback: show every stub in a tidy deck
      tl.progress(1);
      return;
    }
    ScrollTrigger.create({
      trigger: el.querySelector<HTMLElement>("[data-track]")!,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.8,
      animation: tl,
    });
    ScrollTrigger.refresh();
  });

  return (
    <section ref={root} data-nav-theme="dark" aria-label="Appointments booked" className="bg-dark on-dark">
      <div data-track className="scene-track" style={{ ["--scene-h" as string]: "300vh", ["--scene-h-m" as string]: "230vh" }}>
        <div className="scene-stick">
          <p data-tcap className="absolute inset-x-0 text-center text-[clamp(1.5rem,3.4vw,2.6rem)] font-medium" style={{ top: "calc(var(--nav-h) + 24px)" }}>{s.caption}</p>

          <div className="absolute inset-0" style={{ top: "6vh" }}>
            {/* the roll */}
            <svg className="roll" viewBox="0 0 220 220" aria-hidden>
              <defs>
                <linearGradient id="rollg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="var(--c-offwhite)" />
                  <stop offset="1" stopColor="var(--c-blue-soft)" />
                </linearGradient>
              </defs>
              <circle cx="110" cy="110" r="104" fill="url(#rollg)" />
              <circle cx="110" cy="110" r="78" fill="none" stroke="var(--c-line)" strokeWidth="2" />
              <circle cx="110" cy="110" r="52" fill="none" stroke="var(--c-line)" strokeWidth="2" />
              <circle cx="110" cy="110" r="26" fill="var(--c-navy)" />
              <circle cx="110" cy="110" r="104" fill="none" stroke="var(--c-blue)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" opacity=".5" />
            </svg>

            {s.stubs.map((t) => (
              <div key={t.time} data-stub className="stub" style={{ ["--y" as string]: "50%" }}>
                <div className="stub-body">
                  <div className="text-2xl font-semibold">{t.time}</div>
                  <div className="mt-1 text-[1.02rem] font-medium">{t.name}</div>
                  <div className="text-[.95rem]" style={{ color: "var(--c-ink-soft)" }}>{t.service}</div>
                  <span className="stub-booked">{s.bookedLabel}</span>
                </div>
              </div>
            ))}

            <div data-final className="stub" style={{ width: "min(380px, 86vw)", marginLeft: "calc(min(380px, 86vw) / -2)" }}>
              <div className="stub-body">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-semibold">{s.results.title}</span>
                  <span className="rounded-full px-2.5 py-0.5 text-xs" style={{ background: "var(--c-blue-soft)" }}>{s.results.tag}</span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-3">
                  {s.results.stats.map((r) => (
                    <div key={r.label}>
                      <dt className="text-[2rem] font-semibold leading-none">{r.value}</dt>
                      <dd className="mt-1 text-[.8rem] leading-tight" style={{ color: "var(--c-ink-soft)" }}>{r.label}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
