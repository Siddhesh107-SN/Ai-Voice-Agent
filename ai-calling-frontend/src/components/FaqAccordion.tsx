"use client";

import { useState } from "react";
import { faqs } from "@/data/content";

export default function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="max-w-[820px] divide-y" style={{ borderTop: "1px solid var(--c-line)", ["--tw-divide-opacity" as string]: 1 }}>
      {faqs.map((f, i) => {
        const isOpen = open === i;
        return (
          <li key={f.q} style={{ borderBottom: "1px solid var(--c-line)" }} data-reveal>
            <h2 className="font-body" style={{ fontFamily: "var(--font-body)", letterSpacing: 0 }}>
              <button type="button" id={`faq-b-${i}`} aria-expanded={isOpen} aria-controls={`faq-p-${i}`} onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-6 py-5 text-left text-[1.08rem] font-medium">
                {f.q}
                <span aria-hidden className="grid h-7 w-7 flex-none place-items-center rounded-full border text-lg leading-none" style={{ borderColor: "var(--c-line)", transition: "transform .4s var(--ease)", transform: isOpen ? "rotate(45deg)" : "none" }}>+</span>
              </button>
            </h2>
            <div id={`faq-p-${i}`} role="region" aria-labelledby={`faq-b-${i}`} className="faq-panel" data-open={isOpen}>
              <div><p className="muted pb-6 pr-10">{f.a}</p></div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
