"use client";

import { useEffect, useRef, useState } from "react";
import { tryIt } from "@/data/content";
import { demo } from "@/data/scenes";

/** Compact interactive demo: sticky panel on the right, short explainer on the left. */
export default function TryIt() {
  const [sel, setSel] = useState<string | null>(null);
  const [stage, setStage] = useState(0); // 0 idle, 1 caller, 2 agent, 3 card
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const play = (id: string) => {
    timers.current.forEach(clearTimeout);
    setSel(id);
    setStage(1);
    timers.current = [window.setTimeout(() => setStage(2), 900), window.setTimeout(() => setStage(3), 2100)];
  };
  const sc = demo.scenarios.find((s) => s.id === sel);

  return (
    <section data-nav-theme="light" className="section bg-warm" aria-labelledby="try-h">
      <div className="wrap grid items-start gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6" style={{ minHeight: "clamp(0px, 40vh, 420px)" }}>
          <h2 id="try-h" className="h-lg" data-reveal>{tryIt.title}</h2>
          <p className="lead muted mt-6" data-reveal style={{ ["--d" as string]: "100ms" }}>{tryIt.body}</p>
        </div>

        <div className="lg:sticky lg:top-[110px] lg:col-span-6">
          <div className="card mx-auto w-full max-w-[460px] p-5 md:ml-auto md:p-6" data-reveal>
            <p className="muted text-sm">{demo.hint}</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={demo.hint}>
              {demo.scenarios.map((s) => (
                <button key={s.id} type="button" className="tab" aria-pressed={sel === s.id} onClick={() => play(s.id)}
                  style={sel === s.id ? { background: "var(--c-navy)", color: "var(--c-offwhite)", borderColor: "var(--c-navy)" } : undefined}>
                  {s.label}
                </button>
              ))}
            </div>

            <div className="mt-5 min-h-[210px] space-y-3" aria-live="polite">
              {!sc && <p className="muted text-sm">&nbsp;</p>}
              {sc && stage >= 1 && (
                <div key={sc.id + "c"} className="demo-line max-w-[88%] rounded-2xl rounded-bl-md px-4 py-2.5 text-[.95rem]" style={{ background: "var(--c-blue-tint)" }}>
                  {sc.caller}
                </div>
              )}
              {sc && stage >= 2 && (
                <div key={sc.id + "a"} className="demo-line ml-auto max-w-[88%] rounded-2xl rounded-br-md px-4 py-2.5 text-[.95rem]" style={{ background: "var(--c-blue)", color: "var(--c-offwhite)" }}>
                  {sc.agent}
                </div>
              )}
              {sc && stage >= 3 && (
                <div key={sc.id + "k"} className="demo-line flex items-center justify-between rounded-xl border p-3 text-sm" style={{ borderColor: "var(--c-line)" }}>
                  <span><b className="font-medium">{sc.card.day}</b> · {sc.card.time}</span>
                  <span className="rounded-full px-3 py-0.5 text-xs" style={{ background: "var(--c-blue)", color: "var(--c-offwhite)" }}>{sc.card.status}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
