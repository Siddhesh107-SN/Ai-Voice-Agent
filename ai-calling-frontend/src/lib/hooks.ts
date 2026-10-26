"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

export const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isMobileViewport = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;

type GsapMod = typeof import("@/lib/gsap");
type SceneSetup = (ctx: {
  gsap: GsapMod["gsap"];
  ScrollTrigger: GsapMod["ScrollTrigger"];
  el: HTMLElement;
  reduced: boolean;
  mobile: boolean;
}) => void;

/**
 * Lazy scene init: GSAP is imported and the scene is built only when the
 * section is within ~2 viewports of the screen. Everything is reverted on unmount.
 */
export function useLazyScene(ref: RefObject<HTMLElement>, setup: SceneSetup) {
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ctx: { revert: () => void } | null = null;
    let cancelled = false;

    const start = async () => {
      const mod = await import("@/lib/gsap");
      if (cancelled) return;
      ctx = mod.gsap.context(() => {
        setupRef.current({
          gsap: mod.gsap,
          ScrollTrigger: mod.ScrollTrigger,
          el,
          reduced: prefersReducedMotion(),
          mobile: isMobileViewport(),
        });
      }, el);
    };

    if (typeof IntersectionObserver === "undefined") {
      start();
      return () => {
        cancelled = true;
        ctx?.revert();
      };
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          start();
        }
      },
      { rootMargin: "200% 0px" }
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      ctx?.revert();
    };
  }, [ref]);
}

/** Offset of `el` centre/top-left inside `root`, ignoring transforms. */
export function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let e: HTMLElement | null = el;
  while (e && e !== root) {
    x += e.offsetLeft;
    y += e.offsetTop;
    e = e.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}
