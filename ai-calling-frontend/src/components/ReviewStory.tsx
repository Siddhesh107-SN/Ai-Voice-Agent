"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reviewScene as r } from "@/data/scenes";

const Star = ({ on }: { on: boolean }) => (
  <span className="rv-star" data-on={on} aria-hidden>
    <svg viewBox="0 0 24 24" width="26" height="26">
      <path className="rv-outline" d="M12 3.2l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17.1 6.6 20l1.1-6.1L3.2 9.6l6.1-.8z" />
      <path className="rv-fill" d="M12 3.2l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17.1 6.6 20l1.1-6.1L3.2 9.6l6.1-.8z" />
    </svg>
  </span>
);

/**
 * "Review growing" story: an illustrative review card goes from 2 stars and a frustrated message to
 * 5 stars and a happy one, then the business replies. Plays once when scrolled into view; Replay button.
 * Clearly labelled as an example (not a real customer review). Copy lives in src/data/scenes.ts.
 */
export default function ReviewStory() {
  const [step, setStep] = useState(0); // 0 start · 1 three stars · 2 four stars · 3 five stars + new text · 4 reply
  const root = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);
  const played = useRef(false);

  const clear = useCallback(() => timers.current.forEach(clearTimeout), []);
  const play = useCallback(() => {
    clear();
    setStep(0);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setStep(4);
    timers.current = [1100, 1700, 2300, 3300].map((ms, i) => window.setTimeout(() => setStep(i + 1), ms));
  }, [clear]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(4);
      played.current = true;
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !played.current) {
        played.current = true;
        play();
      }
    }, { threshold: 0.45 });
    io.observe(el);
    return () => { io.disconnect(); clear(); };
  }, [play, clear]);

  const stars = step >= 3 ? 5 : step === 2 ? 4 : step === 1 ? 3 : 2;
  const happy = step >= 3;

  return (
    <section ref={root} data-nav-theme="light" className="section bg-warm" aria-label="Example review">
      <div className="wrap flex flex-col items-center">
        <figure className="card relative w-full max-w-[520px] p-6 md:p-8" data-reveal
          style={{ borderColor: happy ? "var(--c-blue)" : undefined, transition: "border-color .6s" }}>
          <span className="absolute right-5 top-5 rounded-full px-3 py-1 text-xs" style={{ background: "var(--c-blue-tint)" }}>{r.tag}</span>

          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full text-lg font-medium" style={{ background: "var(--c-blue-soft)", color: "var(--c-blue)" }} aria-hidden>{r.initial}</span>
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="muted text-sm">
                {r.when}
                <span className="rv-fade ml-2" data-on={step >= 1} style={{ color: "var(--c-blue)" }}>· {r.updated}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-1" role="img" aria-label={`${stars} out of 5 stars`}>
            {[0, 1, 2, 3, 4].map((i) => <Star key={i} on={i < stars} />)}
          </div>

          <div className="mt-3 grid" aria-live="polite">
            <p className="rv-msg" data-on={!happy}>{r.before}</p>
            <p className="rv-msg" data-on={happy}>{r.after}</p>
          </div>

          <div className="rv-fade mt-5 rounded-xl p-4 text-[.95rem]" data-on={step >= 4} style={{ background: "var(--c-blue-tint)" }}>
            <div className="text-sm font-medium">{r.reply.from}</div>
            <p className="muted mt-1">{r.reply.text}</p>
          </div>
        </figure>

        <button type="button" className="btn btn-ghost mt-6" onClick={play}>{r.replay}</button>
      </div>
    </section>
  );
}
