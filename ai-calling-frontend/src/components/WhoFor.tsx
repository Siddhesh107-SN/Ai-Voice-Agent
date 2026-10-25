"use client";

import { useEffect, useRef, useState } from "react";
import { whoFor } from "@/data/content";
import { audienceChips } from "@/data/scenes";
import { people } from "@/components/people";

const items = whoFor.items;
const N = items.length;
const STEP = 360 / (N - 1); // ring slots for everyone except the centre person
const CHIP_ANGLES = [-135, -45, 135];
const AUTO_MS = 6500;

type S = { active: number; angles: number[] };
const slotAngle = (r: number) => (r === 0 ? -90 - STEP : -90 + (r - 1) * STEP);
const initial = (): S => ({ active: 0, angles: items.map((_, i) => slotAngle(i)) });

/** One quarter-turn of the ring. Everyone moves one slot, the centre person swaps with the next. */
function stepState(s: S, dir: 1 | -1): S {
  const angles = s.angles.map((a, i) => {
    const r = (i - s.active + N) % N;
    if (dir === 1) return r === 0 ? a : a - STEP;
    return r === N - 1 ? a : a + STEP;
  });
  return { active: (s.active + dir + N) % N, angles };
}

/**
 * Who it's for: illustrated people on an orbit. The ring turns to bring the next person to the centre.
 * Auto-rotates; pauses while the visitor hovers, touches or focuses the section (and while off-screen).
 * Orbit positions use registered CSS custom properties (@property --a/--r/--s) so the motion is a
 * transform-only arc. Reduced motion: no auto-rotation, instant changes.
 */
export default function WhoFor() {
  const [s, setS] = useState<S>(initial);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const root = useRef<HTMLElement>(null);
  const leave = useRef<number>();

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => () => window.clearTimeout(leave.current), []);

  const goTo = (target: number) =>
    setS((cur) => {
      const k = (target - cur.active + N) % N;
      if (!k) return cur;
      let next = cur;
      if (k <= N / 2) for (let i = 0; i < k; i++) next = stepState(next, 1);
      else for (let i = 0; i < N - k; i++) next = stepState(next, -1);
      return next;
    });

  const hold = () => {
    window.clearTimeout(leave.current);
    setHover(true);
  };
  const release = () => {
    window.clearTimeout(leave.current);
    leave.current = window.setTimeout(() => setHover(false), 1500); // resume shortly after leaving
  };

  const paused = hover || !visible;
  const cur = items[s.active];
  const chips = audienceChips[cur.title] ?? [];

  return (
    <section ref={root} data-nav-theme="light" className="section bg-soft" aria-labelledby="who-h"
      onPointerEnter={hold} onPointerLeave={release} onFocus={hold}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) release(); }}>
      <div className="wrap grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
        {/* text */}
        <div className="lg:col-span-5">
          <h2 id="who-h" className="h-lg" data-reveal>{whoFor.heading}</h2>
          <p className="muted mt-4" data-reveal style={{ ["--d" as string]: "80ms" }}>{whoFor.title}</p>

          <div className="mt-8 min-h-[11rem]" aria-live="polite">
            <h3 key={cur.title} className="h-md demo-line">{cur.title}</h3>
            <p key={cur.title + "b"} className="muted demo-line mt-3 max-w-[44ch]" style={{ animationDelay: "80ms" }}>{cur.body}</p>
            {/* chips for small screens (the orbit chips are hidden there) */}
            <ul key={cur.title + "c"} className="mt-4 flex flex-wrap gap-2 sm:hidden">
              {chips.map((c) => <li key={c} className="who-chip demo-line">{c}</li>)}
            </ul>
          </div>

          <div className="mt-6 h-[3px] max-w-[430px] overflow-hidden rounded" style={{ background: "var(--c-line)" }} aria-hidden>
            {!reduced && (
              <div key={s.active} className="who-bar h-full" style={{ ["--who-ms" as string]: `${AUTO_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
                onAnimationEnd={() => setS((c) => stepState(c, 1))} />
            )}
          </div>
          <div className="mt-4 flex gap-2.5" role="group" aria-label="Choose an audience">
            {items.map((it, i) => (
              <button key={it.title} type="button" aria-label={it.title} aria-current={i === s.active} onClick={() => goTo(i)}
                className="h-2.5 w-2.5 rounded-full" style={{ background: i === s.active ? "var(--c-blue)" : "var(--c-line)", transition: "background .3s" }} />
            ))}
          </div>
        </div>

        {/* orbit */}
        <div className="lg:col-span-7">
          <div className="orbit" role="group" aria-label={whoFor.heading}>
            <div className="orbit-ring" aria-hidden />
            {items.map((it, i) => {
              const r = (i - s.active + N) % N;
              return (
                <button key={it.title} type="button" className="orbit-av" aria-label={it.title} aria-current={r === 0}
                  onClick={() => goTo(i)}
                  style={{ ["--a" as string]: `${s.angles[i]}deg`, ["--r" as string]: r === 0 ? "0px" : "var(--orbit-r)", ["--s" as string]: r === 0 ? 1 : 0.4, zIndex: r === 0 ? 3 : 2 }}>
                  <svg viewBox="0 0 100 100" aria-hidden>{people[i]}</svg>
                </button>
              );
            })}
            {chips.map((c, i) => {
              const a = (CHIP_ANGLES[i] * Math.PI) / 180;
              return (
                <div key={s.active + c} className="orbit-chip hidden sm:block"
                  style={{ left: `calc(50% + ${(11.8 * Math.cos(a)).toFixed(2)}em)`, top: `calc(50% + ${(11.8 * Math.sin(a)).toFixed(2)}em)` }}>
                  <span className="who-chip chip-float" style={{ animationDelay: `${i * 140}ms, ${i * 400}ms` }}>{c}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
