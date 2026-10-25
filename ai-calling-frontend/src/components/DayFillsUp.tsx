"use client";

import { useRef } from "react";
import { dayScene as d } from "@/data/scenes";
import { offsetIn, useLazyScene } from "@/lib/hooks";

const bookedSlots = d.slots.map((_, i) => i);

/**
 * Scene 1 of 2 (pinned ~350vh). Sticky stage + scrubbed GSAP timeline, built lazily.
 * Stages: missed calls pop in -> talkaor answers -> calls land on the calendar -> counters settle.
 */
export default function DayFillsUp() {
  const root = useRef<HTMLElement>(null);

  useLazyScene(root, ({ gsap, ScrollTrigger, el, reduced }) => {
    if (reduced) el.classList.add("scene-static");
    const q = <T extends HTMLElement>(s: string) => Array.from(el.querySelectorAll<T>(s));
    const stage = el.querySelector<HTMLElement>("[data-stage]")!;
    const notifs = q("[data-notif]");
    const badges = q("[data-badge]");
    const flyers = q("[data-flyer]");
    const blocks = q("[data-block]");
    const pill = el.querySelector<HTMLElement>("[data-pill]")!;
    const caps = q("[data-cap]");
    const missedEl = el.querySelector<HTMLElement>("[data-missed]")!;
    const bookedEl = el.querySelector<HTMLElement>("[data-booked]")!;
    const pillCol = el.querySelector<HTMLElement>("[data-pillcol]")!;
    const state = { missed: 0, booked: 0 };
    const render = () => {
      missedEl.textContent = String(Math.round(state.missed));
      bookedEl.textContent = String(Math.round(state.booked));
    };

    // geometry (offset-based, so it ignores transforms)
    const notifPos = (i: number) => offsetIn(notifs[i], stage);
    const slotPos = (i: number) => offsetIn(blocks[i], stage);
    const pillX = () => offsetIn(pillCol, stage).x + pillCol.offsetWidth / 2 - pill.offsetWidth / 2;
    const pillY = (i: number) => notifPos(i).y + notifs[i].offsetHeight / 2 - pill.offsetHeight / 2;

    gsap.set(notifs, { opacity: 0, scale: 0.94 });
    gsap.set(badges, { opacity: 0, scale: 0.5 });
    gsap.set(flyers, { opacity: 0 });
    gsap.set(blocks, { opacity: 0, scale: 0.94 });
    gsap.set(pill, { opacity: 0, left: 0, top: 0 });
    gsap.set(caps, { opacity: 0 });
    gsap.set(caps[0], { opacity: 1 });

    const n = notifs.length;
    const tl = gsap.timeline({ defaults: { ease: "power2.out" }, paused: reduced });

    // Stage 1: notifications pop in, counter climbs to 7
    tl.to(notifs, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.38 }, 0);
    tl.to(state, { missed: d.missedTotal, duration: 0.38 * n, ease: "none", onUpdate: render }, 0);

    // Stage 2: the pill sweeps through them
    tl.to(caps[0], { opacity: 0, duration: 0.4 }, 3.1);
    tl.to(caps[1], { opacity: 1, duration: 0.4 }, 3.4);
    tl.fromTo(pill, { opacity: 0, x: () => pillX(), y: () => pillY(0) - 24 }, { opacity: 1, y: () => pillY(0), duration: 0.5 }, 3.2);
    notifs.forEach((_, i) => {
      if (i > 0) tl.to(pill, { y: () => pillY(i), duration: 0.38, ease: "power1.inOut" }, 3.7 + (i - 1) * 0.38);
      tl.to(badges[i], { opacity: 1, scale: 1, duration: 0.25 }, 3.7 + i * 0.38 - (i === 0 ? 0 : 0.1));
    });

    // Stage 3: each notification slides off the phone into its calendar slot
    const s3 = 6.3;
    tl.to(caps[1], { opacity: 0, duration: 0.4 }, s3 - 0.2);
    tl.to(caps[2], { opacity: 1, duration: 0.4 }, s3 + 0.1);
    tl.to(pill, { opacity: 0, duration: 0.4 }, s3 - 0.1);
    notifs.forEach((_, i) => {
      const at = s3 + i * 0.34;
      tl.set(flyers[i], { opacity: 1 }, at);
      tl.set(notifs[i], { opacity: 0 }, at);
      tl.fromTo(
        flyers[i],
        { x: () => notifPos(i).x - 0, y: () => notifPos(i).y },
        {
          x: () => slotPos(i).x + slotPos(i).w / 2 - flyers[i].offsetWidth / 2,
          y: () => slotPos(i).y + slotPos(i).h / 2 - flyers[i].offsetHeight / 2,
          duration: 0.7,
          ease: "power2.inOut",
        },
        at
      );
      tl.to(blocks[i], { opacity: 1, scale: 1, duration: 0.3 }, at + 0.55);
      tl.to(flyers[i], { opacity: 0, duration: 0.25 }, at + 0.62);
    });

    // Stage 4: missed drains, booked climbs
    const s4 = s3 + n * 0.34 + 0.9;
    tl.to(caps[2], { opacity: 0, duration: 0.4 }, s4 - 0.3);
    tl.to(caps[3], { opacity: 1, duration: 0.4 }, s4);
    tl.to(state, { missed: 0, duration: 1.6, ease: "none", onUpdate: render }, s4);
    tl.to(state, { booked: d.bookedTotal, duration: 1.6, ease: "none", onUpdate: render }, s4);
    tl.to({}, { duration: 1.2 }); // hold on the finished day

    if (reduced) {
      tl.progress(1);
      state.missed = 0;
      state.booked = d.bookedTotal;
      render();
      return;
    }
    ScrollTrigger.create({
      trigger: el.querySelector<HTMLElement>("[data-track]")!,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.8,
      animation: tl,
      invalidateOnRefresh: true,
    });
    ScrollTrigger.refresh();
  });

  return (
    <section ref={root} data-nav-theme="dark" aria-label="The day fills up" className="bg-dark on-dark">
      <div data-track className="scene-track" style={{ ["--scene-h" as string]: "350vh", ["--scene-h-m" as string]: "240vh" }}>
        <div className="scene-stick flex flex-col items-center justify-between" style={{ paddingTop: "calc(var(--nav-h) + 8px)", paddingBottom: "20px" }}>
          {/* captions */}
          <div className="relative h-[4.5rem] w-full max-w-3xl px-5 text-center">
            {d.captions.map((c, i) => (
              <p key={i} data-cap className="absolute inset-0 grid place-items-center text-[clamp(1.5rem,3.4vw,2.6rem)] font-medium leading-tight" style={i === 0 ? undefined : { opacity: 0 }}>
                {c}
              </p>
            ))}
          </div>

          {/* stage */}
          <div data-stage className="day-stage">
            {/* phone */}
            <div className="phone">
              {/* side buttons */}
              <span className="phone-btn phone-btn-left phone-btn-action" aria-hidden />
              <span className="phone-btn phone-btn-left phone-btn-vol-up" aria-hidden />
              <span className="phone-btn phone-btn-left phone-btn-vol-down" aria-hidden />
              <span className="phone-btn phone-btn-right phone-btn-power" aria-hidden />

              <div className="phone-screen">
                {/* Dynamic Island */}
                <div className="dynamic-island" aria-hidden>
                  <span className="dynamic-island-camera" />
                </div>

                <div className="phone-date">Today</div>
                <div className="phone-time">9:41</div>
                <div className="notif-list">
                  {d.notifs.map((t, i) => (
                    <div key={i} data-notif className="notif">
                      <span className="ico-miss" aria-hidden>✕</span>
                      <b>Missed call</b>
                      <span className="t">{t}</span>
                      <span data-badge className="notif-badge" aria-hidden>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                      </span>
                    </div>
                  ))}
                </div>

                {/* Home bar */}
                <div className="home-bar" aria-hidden />
              </div>
            </div>

            {/* middle column: answering pill travels here */}
            <div data-pillcol aria-hidden className="h-full" />

            {/* calendar */}
            <div className="cal">
              <div className="cal-head">Today</div>
              <div className="cal-rows">
                {bookedSlots.map((i) => (
                  <div key={i} className="cal-row">
                    {d.slots[i]}
                    <div data-block className={`cal-block ${i === d.progressIndex ? "prog" : ""}`}>
                      {i === d.progressIndex ? (<><i aria-hidden />{d.inProgress}</>) : "Booked"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* absolutely positioned travellers (not clipped by the phone) */}
            <div data-pill className="answer-pill"><i aria-hidden />{d.pill}</div>
            {d.notifs.map((t, i) => (
              <div key={i} data-flyer className="flyer" aria-hidden>
                <b className="font-medium">Missed call</b>
                <span className="ml-auto opacity-70">{t}</span>
              </div>
            ))}
          </div>

          {/* counters */}
          <div className="flex items-end gap-10 md:gap-16" role="status" aria-live="off">
            <div className="counter">
              <span className="n" data-missed>0</span>
              <span className="muted text-sm">{d.missedLabel}</span>
            </div>
            <div className="counter">
              <span className="n" data-booked>0</span>
              <span className="muted text-sm">{d.bookedLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
