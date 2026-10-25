"use client";

import { useEffect } from "react";
import { INTRO_EVENT, isIntroPending } from "@/lib/intro";

/** Lenis on desktop pointer devices only, gently tuned and wired to ScrollTrigger. */
export default function SmoothScroll() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    let cleanup = () => {};
    let dead = false;

    (async () => {
      const [{ default: Lenis }, { gsap, ScrollTrigger }] = await Promise.all([import("lenis"), import("@/lib/gsap")]);
      if (dead) return;
      const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, smoothWheel: true });
      if (isIntroPending()) lenis.stop();
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (t: number) => lenis.raf(t * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      const onIntro = () => lenis.start();
      window.addEventListener(INTRO_EVENT, onIntro);
      document.fonts?.ready.then(() => ScrollTrigger.refresh());

      cleanup = () => {
        window.removeEventListener(INTRO_EVENT, onIntro);
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    })();

    return () => {
      dead = true;
      cleanup();
    };
  }, []);
  return null;
}
