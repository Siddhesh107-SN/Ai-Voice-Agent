"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { hero } from "@/data/content";
import { heroCard, heroExamples } from "@/data/scenes";
import { INTRO_EVENT, isIntroPending } from "@/lib/intro";
import { prefersReducedMotion } from "@/lib/hooks";

type Ex = (typeof heroExamples)[number];
const full = (ex: Ex) => ex.parts.map((p) => p.t).join("");

/** "The sentence that books itself": a caller's line types out, key words highlight, lift off, snap into a booking card. */
function SentenceVisual() {
  const stage = useRef<HTMLDivElement>(null);
  const sentence = useRef<HTMLParagraphElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const check = useRef<HTMLSpanElement>(null);
  const fields = useRef<Record<string, HTMLElement | null>>({});
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState(0);
  const [hl, setHl] = useState(false);
  const [filled, setFilled] = useState<Record<string, boolean>>({});
  const [started, setStarted] = useState(false);
  const [reduced, setReduced] = useState(false);

  const ex = heroExamples[idx];
  const text = full(ex);

  // wait for the intro to finish before starting
  useEffect(() => {
    const r = prefersReducedMotion();
    setReduced(r);
    if (r) {
      setTyped(9999);
      setHl(true);
      setFilled({ service: true, day: true, time: true });
      return;
    }
    if (!isIntroPending()) {
      setStarted(true);
      return;
    }
    const go = () => setStarted(true);
    window.addEventListener(INTRO_EVENT, go, { once: true });
    return () => window.removeEventListener(INTRO_EVENT, go);
  }, []);

  useEffect(() => {
    const stageEl = stage.current;
    if (!started || reduced) return;
    let dead = false;
    const timers: number[] = [];
    let interval = 0;
    const wait = (ms: number) => new Promise<void>((res) => timers.push(window.setTimeout(res, ms)));

    (async () => {
      const { gsap } = await import("@/lib/gsap");
      if (dead) return;

      // reset
      setTyped(0);
      setHl(false);
      setFilled({});
      gsap.set(card.current, { opacity: 0, y: 24 });
      gsap.set(check.current, { opacity: 0, scale: 0.4 });
      gsap.set(sentence.current, { opacity: 1 });
      gsap.to(card.current, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" });
      await wait(400);

      // type
      await new Promise<void>((res) => {
        let n = 0;
        interval = window.setInterval(() => {
          n += 1;
          setTyped(n);
          if (n >= text.length) {
            window.clearInterval(interval);
            res();
          }
        }, 38);
      });
      if (dead) return;
      await wait(350);

      // highlight
      setHl(true);
      await wait(900);
      if (dead) return;

      // lift off: key words fly into the card
      const root = stageEl!;
      const rootRect = root.getBoundingClientRect();
      const keys = ["service", "day", "time"] as const;
      const chips: HTMLElement[] = [];
      keys.forEach((k, i) => {
        const src = sentence.current!.querySelector<HTMLElement>(`[data-k="${k}"]`);
        const dst = fields.current[k];
        if (!src || !dst) return;
        const a = src.getBoundingClientRect();
        const b = dst.getBoundingClientRect();
        const chip = document.createElement("span");
        chip.setAttribute("data-chip", "");
        chip.textContent = src.textContent;
        chip.style.cssText = `position:absolute;left:${a.left - rootRect.left}px;top:${a.top - rootRect.top}px;white-space:nowrap;font:inherit;z-index:5;padding:0 3px;border-radius:6px;background:var(--c-blue);color:var(--c-offwhite);will-change:transform,opacity;`;
        chip.style.fontSize = getComputedStyle(src).fontSize;
        chip.style.fontFamily = getComputedStyle(src).fontFamily;
        root.appendChild(chip);
        chips.push(chip);
        src.style.opacity = "0.25";
        const scale = Math.min(1, 18 / parseFloat(getComputedStyle(src).fontSize || "28"));
        gsap.to(chip, {
          x: b.left - a.left,
          y: b.top - a.top - 2,
          scale: Math.max(scale, 0.55),
          transformOrigin: "left top",
          duration: 0.9,
          delay: i * 0.18,
          ease: "power3.inOut",
          onComplete: () => {
            setFilled((f) => ({ ...f, [k]: true }));
            gsap.to(chip, { opacity: 0, duration: 0.25, onComplete: () => chip.remove() });
          },
        });
      });
      await wait(1900);
      if (dead) return;
      gsap.to(check.current, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2.4)" });
      await wait(2600);
      if (dead) return;

      // out, next example
      gsap.to([sentence.current, card.current], { opacity: 0, duration: 0.5 });
      await wait(600);
      chips.forEach((c) => c.remove());
      if (dead) return;
      setTyped(0);
      setHl(false);
      setFilled({});
      setIdx((i) => (i + 1) % heroExamples.length);
    })();

    return () => {
      dead = true;
      timers.forEach(clearTimeout);
      window.clearInterval(interval);
      stageEl?.querySelectorAll("[data-chip]").forEach((n) => n.remove());
    };
  }, [started, reduced, idx, text.length, text]);

  // render sentence up to `typed` chars
  let consumed = 0;
  const nodes = ex.parts.map((p, i) => {
    const take = Math.max(0, Math.min(p.t.length, typed - consumed));
    consumed += p.t.length;
    const shown = p.t.slice(0, take);
    if (!shown) return null;
    return "k" in p && p.k ? (
      <span key={i} data-k={p.k} className="hl-mark" style={{ transition: "opacity .4s" }}>{shown}</span>
    ) : (
      <span key={i}>{shown}</span>
    );
  });

  return (
    <div ref={stage} className={`relative ${hl ? "hl-on" : ""}`} aria-label="Example: a caller's sentence becomes a booking">
      <p className="mb-3 text-sm muted">{ex.caller} is calling</p>
      <p key={idx} ref={sentence} className="min-h-[7.2em] text-[clamp(1.7rem,3.3vw,2.75rem)] font-medium leading-[1.18] md:min-h-[4.9em]" aria-live="off">
        {nodes}
        {typed < text.length && <span className="caret" aria-hidden />}
      </p>

      <div ref={card} className="card mt-6 flex max-w-[440px] items-center gap-5 p-5" style={{ opacity: reduced ? 1 : 0 }}>
        <div className="grid flex-1 grid-cols-3 gap-3 text-sm">
          {(["service", "day", "time"] as const).map((k) => (
            <div key={k} className="min-w-0">
              <div className="muted text-xs">{heroCard.labels[k]}</div>
              <div ref={(el) => { fields.current[k] = el; }} className="mt-1 min-h-[1.5em] font-medium leading-snug">
                <span style={{ opacity: filled[k] ? 1 : 0, transition: "opacity .3s" }}>
                  {ex.parts.find((p) => "k" in p && p.k === k)?.t}
                </span>
              </div>
            </div>
          ))}
        </div>
        <span ref={check} className="grid h-12 w-12 flex-none place-items-center rounded-full" style={{ background: "var(--c-blue)", color: "var(--c-offwhite)", opacity: reduced ? 1 : 0 }} aria-label={heroCard.confirmed}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="bg-page relative overflow-hidden" data-nav-theme="light" style={{ minHeight: "100svh" }}>
      <div className="wrap grid items-center gap-12 lg:grid-cols-12" style={{ minHeight: "100svh", paddingTop: "calc(var(--nav-h) + 32px)", paddingBottom: "56px" }}>
        <div className="lg:col-span-5">
          <h1 className="h-xl">{hero.headline}</h1>
          <p className="lead muted mt-6">{hero.sub}</p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href={hero.primary.href} className="btn btn-primary">{hero.primary.label}</Link>
            <Link href={hero.secondary.href} className="btn btn-ghost">{hero.secondary.label}</Link>
          </div>
        </div>
        <div className="lg:col-span-7">
          <SentenceVisual />
        </div>
      </div>
    </section>
  );
}
