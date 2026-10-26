"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { finishIntro, isIntroPending } from "@/lib/intro";
import { prefersReducedMotion } from "@/lib/hooks";

/**
 * The 15s "The Call Loop" showreel. Plays once per session, acts as the preloader.
 * Expects /public/intro/call-loop.mp4 (+ optional call-loop.webm). If the file is
 * missing or fails to load, the intro is skipped so the site is never blocked.
 */
export default function IntroReel() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(true);
  const doneRef = useRef(false);

  const end = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    // let the fade finish, then reveal the site and start the hero
    window.setTimeout(() => finishIntro(), 650);
  }, []);

  useEffect(() => {
    if (!isIntroPending()) return;
    if (prefersReducedMotion()) {
      finishIntro();
      return;
    }
    // preload the rest of the site while the reel plays
    ["/pricing", "/faq", "/contact", "/login", "/signup"].forEach((r) => router.prefetch(r));

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && end();
    window.addEventListener("keydown", onKey);
    const stall = window.setTimeout(() => {
      const v = videoRef.current;
      if (!v || v.readyState < 2) end(); // never block the site on a slow file
    }, 6000);
    const cap = window.setTimeout(end, 17000);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(stall);
      window.clearTimeout(cap);
    };
  }, [end, router]);

  return (
    <div className="intro" data-leaving={leaving} role="dialog" aria-label="Introduction video" aria-hidden={leaving}>
      <div className="absolute inset-0 grid place-items-center">
        {/* CSS poster frame shown until the first video frame paints */}
        <span className="text-[clamp(3rem,10vw,7rem)] font-bold tracking-tight" aria-hidden>talkaor</span>
      </div>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted={muted}
        playsInline
        preload="auto"
        poster="/intro/poster.jpg"
        onEnded={end}
        onError={end}
      >
        <source src="/intro/call-loop.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-6 md:p-8">
        <button type="button" onClick={() => setMuted((m) => { const n = !m; if (videoRef.current) videoRef.current.muted = n; return n; })}
          className="rounded-full px-4 py-2 text-sm" style={{ background: "color-mix(in srgb, var(--c-offwhite) 16%, transparent)" }}>
          {muted ? "Sound on" : "Sound off"}
        </button>
        <button type="button" onClick={end} className="rounded-full px-5 py-2 text-sm" style={{ background: "var(--c-offwhite)", color: "var(--c-navy)" }}>
          Skip
        </button>
      </div>
    </div>
  );
}
