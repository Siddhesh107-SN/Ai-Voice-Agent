"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useIsoLayoutEffect } from "@/lib/hooks";

/** Calm fade/slide-up for any element marked data-reveal. Content is visible without JS. */
export default function RevealObserver() {
  const pathname = usePathname();

  useIsoLayoutEffect(() => {
    document.documentElement.classList.add("js-ready");
  }, []);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.in)"));
    if (!els.length) return;
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
