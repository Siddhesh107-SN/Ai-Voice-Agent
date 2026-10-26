"use client";

import { useRef } from "react";
import { features } from "@/data/content";
import { offsetIn, useLazyScene } from "@/lib/hooks";

const sv = {
  width: 44,
  height: 44,
  viewBox: "0 0 44 44",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Tiny looping micro-animations: CSS + SVG, transform/opacity only. */
const icons: JSX.Element[] = [
  // 1 voice
  <svg key="1" {...sv}>
    <g fill="currentColor" stroke="none">
      <rect className="ma-bar" x="8" y="12" width="4" height="20" rx="2" />
      <rect className="ma-bar" x="16" y="8" width="4" height="28" rx="2" />
      <rect className="ma-bar" x="24" y="12" width="4" height="20" rx="2" />
      <rect className="ma-bar" x="32" y="16" width="4" height="12" rx="2" />
    </g>
  </svg>,
  // 2 enquiries
  <svg key="2" {...sv}>
    <g className="ma-fade">
      <rect x="5" y="8" width="22" height="12" rx="5" />
    </g>
    <g className="ma-fade d2">
      <rect x="17" y="24" width="22" height="12" rx="5" />
    </g>
  </svg>,
  // 3 appointment
  <svg key="3" {...sv}>
    <rect x="7" y="10" width="30" height="27" rx="5" />
    <path d="M7 18h30M15 6v8M29 6v8" />
    <path className="ma-pop" d="M16 28l4 4 8-8" />
  </svg>,
  // 4 availability (clock)
  <svg key="4" {...sv}>
    <circle cx="22" cy="22" r="16" />
    <path className="ma-spin" d="M22 22V11" />
    <path d="M22 22l7 4" />
  </svg>,
  // 5 knowledge
  <svg key="5" {...sv}>
    <rect className="ma-float" x="8" y="9" width="24" height="9" rx="3" />
    <rect className="ma-float d2" x="12" y="20" width="24" height="9" rx="3" />
    <rect className="ma-float d3" x="8" y="31" width="24" height="7" rx="3" />
  </svg>,
  // 6 monitoring
  <svg key="6" {...sv}>
    <path d="M6 38h32" />
    <g fill="currentColor" stroke="none">
      <rect className="ma-grow" x="10" y="22" width="6" height="14" rx="2" />
      <rect className="ma-grow" x="19" y="12" width="6" height="24" rx="2" />
      <rect className="ma-grow" x="28" y="18" width="6" height="18" rx="2" />
    </g>
  </svg>,
  // 7 reduced manual work (toggle)
  <svg key="7" {...sv}>
    <rect x="5" y="14" width="34" height="16" rx="8" />
    <circle className="ma-slide" cx="14" cy="22" r="5" fill="currentColor" stroke="none" />
    <path d="M30 22l2 2 4-4" />
  </svg>,
  // 8 flexible packages
  <svg key="8" {...sv}>
    <rect className="ma-fade" x="6" y="12" width="9" height="20" rx="3" />
    <rect className="ma-fade d2" x="17.5" y="12" width="9" height="20" rx="3" />
    <rect className="ma-fade" x="29" y="12" width="9" height="20" rx="3" />
  </svg>,
];

export default function Features() {
  const root = useRef<HTMLElement>(null);

  useLazyScene(root, ({ gsap, ScrollTrigger, el, reduced }) => {
    // Under prefers-reduced-motion, keep the static fallback (cards fully visible in HTML/CSS, no motion)
    if (reduced) return;

    const grid = el.querySelector<HTMLElement>("[data-features-grid]");
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>("[data-feature-card]"));
    if (cards.length === 0) return;

    const isMobileNow = () => window.innerWidth < 768;
    const rots = [-5, 4, -3, 6, -4, 3, -6, 5];

    const getCardOffsets = (card: HTMLElement, i: number) => {
      if (isMobileNow()) {
        return { x: 0, y: 32, rot: 0, scale: 0.95 };
      }
      const { x, y, w, h } = offsetIn(card, grid);
      const cardCenterX = x + w / 2;
      const cardCenterY = y + h / 2;
      const gridCenterX = grid.offsetWidth / 2;
      const gridCenterY = grid.offsetHeight / 2;
      const jitterX = ((i % 3) - 1) * 8;
      const jitterY = (Math.floor(i / 2) - 1.5) * 6;
      return {
        x: gridCenterX - cardCenterX + jitterX,
        y: gridCenterY - cardCenterY + jitterY,
        rot: rots[i % rots.length],
        scale: 0.88,
      };
    };

    // Arm the reveal: hide the cards and stack them into the deck only at the moment armed
    gsap.set(cards, {
      opacity: 0,
      x: (i: number, target: HTMLElement) => getCardOffsets(target, i).x,
      y: (i: number, target: HTMLElement) => getCardOffsets(target, i).y,
      rotation: (i: number, target: HTMLElement) => getCardOffsets(target, i).rot,
      scale: (i: number, target: HTMLElement) => getCardOffsets(target, i).scale,
      zIndex: (i: number) => i + 1,
    });

    const tl = gsap.timeline({
      paused: true,
      onComplete: () => {
        // Clear transforms upon completion so hover translateY works unhindered
        gsap.set(cards, { clearProps: "transform,zIndex" });
      },
    });

    // Fan out one by one into 4x2 grid slots with a soft pop (back.out overshoot to scale 1)
    tl.to(cards, {
      opacity: 1,
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      duration: 0.65,
      ease: "back.out(1.4)",
      stagger: 0.08,
    });

    ScrollTrigger.create({
      trigger: grid,
      start: "top 80%",
      once: true,
      animation: tl,
      invalidateOnRefresh: true,
    });
  });

  return (
    <section ref={root} data-nav-theme="light" className="section bg-warm" aria-labelledby="features-h">
      <div className="wrap">
        <h2 id="features-h" className="h-lg max-w-[20ch]" data-reveal>{features.title}</h2>
        <ul data-features-grid className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.items.map((f, i) => (
            <li
              key={f.title}
              data-feature-card
              className="card flex flex-col gap-4 p-6 transition-transform duration-300 hover:-translate-y-1"
            >
              <span style={{ color: "var(--c-blue)" }}>{icons[i]}</span>
              <h3 className="h-md" style={{ fontSize: "1.3rem" }}>{f.title}</h3>
              <p className="muted text-[.95rem]">{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
