"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Phone,
  Sparkles,
} from "lucide-react";

export interface CaseStudyFlipItem {
  number?: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  background: string;
  foreground?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  appointmentDay?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  service?: string;
  status?: string;
  statusBadgeClass?: string;
  staffName?: string;
  agentName?: string;
  notes?: string;
  actions?: React.ReactNode;
}

interface CaseStudyFlipStackProps {
  items?: CaseStudyFlipItem[];
  className?: string;
  hint?: string;
  heading?: string;
  endLabel?: string;
}

const DEFAULT_ITEMS: CaseStudyFlipItem[] = [
  {
    eyebrow: "CONFIRMED",
    title: "John Smith",
    description: "Hair Consultation & Scalp Assessment",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80&auto=format&fit=crop",
    imageAlt: "John Smith appointment photo",
    background: "#09090b",
    foreground: "#ffffff",
    appointmentDay: "Monday",
    appointmentDate: "October 12, 2026",
    appointmentTime: "10:30 AM",
    service: "Hair Consultation & Scalp Assessment",
    status: "confirmed",
  },
];

function FlipCard({
  item,
  index,
  total,
  activeIndex,
  reduceMotion,
}: {
  item: CaseStudyFlipItem;
  index: number;
  total: number;
  activeIndex: number;
  reduceMotion: boolean;
}) {
  const isPast = index < activeIndex;
  const isCurrent = index === activeIndex;
  const isFuture = index > activeIndex;

  // Stacking calculation to ensure cards stick firmly in section
  // Future cards sit slightly below and scaled down
  // Past cards tuck neatly into the top stacked lip without flying out
  const stackOffset = isCurrent
    ? 0
    : isPast
    ? -24 * (activeIndex - index)
    : 16 * (index - activeIndex);

  const scale = isCurrent
    ? 1
    : isPast
    ? Math.max(0.9, 1 - (activeIndex - index) * 0.04)
    : Math.max(0.92, 1 - (index - activeIndex) * 0.035);

  const opacity = isPast ? 0.35 : 1;
  const zIndex = isCurrent ? total + 10 : isPast ? index : total - index;

  return (
    <motion.article
      className="absolute inset-x-0 top-0 will-change-transform aspect-[4/5] sm:aspect-[1.8/1] select-none"
      style={{
        zIndex,
        transformStyle: "preserve-3d",
      }}
      animate={{
        y: stackOffset,
        scale,
        opacity,
        rotateX: isPast ? 12 : isCurrent ? 0 : -4,
      }}
      transition={{
        type: "spring",
        stiffness: 80, // Decreased speed for smooth, gentle pacing
        damping: 24,
        mass: 1.1,
      }}
    >
      <div
        className="grid h-full overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.65)] sm:grid-cols-[1.25fr_0.75fr] backdrop-blur-2xl transition-all"
        style={{
          backgroundColor: item.background || "rgba(12, 12, 16, 0.85)",
          color: item.foreground ?? "white",
        }}
      >
        {/* Left Appointment Details */}
        <div className="flex min-w-0 flex-col p-6 sm:p-8 justify-between">
          {/* Top Status & Item Number */}
          <div className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-white/30">
              {item.number ?? String(index + 1).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                item.status === "confirmed"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : item.status === "cancelled"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : item.status === "rescheduled"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
              )}
            >
              {item.eyebrow}
            </span>
          </div>

          {/* Main Appointment Body */}
          <div className="my-auto py-2">
            <div className="text-[11px] uppercase tracking-widest text-emerald-400 font-semibold mb-1">
              Customer Appointment
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {item.title}
            </h2>

            {/* Structured Appointment Details */}
            <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs sm:text-sm">
              <div>
                <span className="text-white/40 block text-[10px] uppercase tracking-wider">Date & Day</span>
                <span className="font-semibold text-white/95 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  {item.appointmentDay ? `${item.appointmentDay}, ${item.appointmentDate}` : item.appointmentDate}
                </span>
              </div>

              <div>
                <span className="text-white/40 block text-[10px] uppercase tracking-wider">Scheduled Time</span>
                <span className="font-semibold text-white/95 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  {item.appointmentTime}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-white/40 block text-[10px] uppercase tracking-wider">Service Booked</span>
                <span className="font-semibold text-emerald-300 flex items-center gap-1.5 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {item.service || item.description}
                </span>
              </div>
            </div>

            {item.notes && (
              <p className="mt-3 text-xs text-white/60 line-clamp-2 italic bg-black/30 p-2.5 rounded-xl border border-white/5">
                "{item.notes}"
              </p>
            )}
          </div>

          {/* Action Buttons Slot */}
          {item.actions && (
            <div className="pt-3 border-t border-white/10 mt-auto">
              {item.actions}
            </div>
          )}
        </div>

        {/* Right Media / Portrait with Liquid Glass Overlays */}
        <div className="relative m-3 sm:m-4 min-h-[160px] overflow-hidden rounded-2xl bg-black/40 border border-white/5">
          <img
            src={item.image}
            alt={item.imageAlt}
            className="h-full w-full object-cover brightness-90 contrast-105"
            draggable={false}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

          {/* Floating Pill for Assigned Agent */}
          <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-xs">
            <div className="flex items-center justify-between text-white/80">
              <span className="flex items-center gap-1.5 text-[11px] text-white/50">
                <User className="w-3 h-3 text-emerald-400" />
                Handled by
              </span>
              <span className="font-medium text-emerald-300">{item.agentName || "Aria (Voice AI)"}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function CaseStudyFlipStack({
  items = DEFAULT_ITEMS,
  className,
}: CaseStudyFlipStackProps) {
  const safeItems = items.length > 0 ? items : DEFAULT_ITEMS;
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() ?? false;

  const handleNext = () => {
    setActiveIndex((prev) => Math.min(prev + 1, safeItems.length - 1));
  };

  const handlePrev = () => {
    setActiveIndex((prev) => Math.max(prev - 1, 0));
  };

  // Wheel scroll with smooth throttling so cards don't fly fast or jump out
  const lastScrollTime = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastScrollTime.current < 450) return; // Smooth pacing threshold

    if (e.deltaY > 25) {
      if (activeIndex < safeItems.length - 1) {
        lastScrollTime.current = now;
        setActiveIndex((prev) => prev + 1);
      }
    } else if (e.deltaY < -25) {
      if (activeIndex > 0) {
        lastScrollTime.current = now;
        setActiveIndex((prev) => prev - 1);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className={cn(
        "relative rounded-3xl p-6 sm:p-8 bg-[rgba(9,9,11,0.6)] backdrop-blur-2xl border border-white/10 shadow-glass overflow-hidden select-none",
        className
      )}
    >
      {/* Interactive Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white/[0.03] backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-glow-emerald" />
          <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
            TalkAor 3D Flip Stack
          </span>
          <span className="text-xs text-white/40 hidden sm:inline ml-2">
            • Scroll gently or use arrows to flip cards
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60 font-mono mr-2">
            {activeIndex + 1} / {safeItems.length}
          </span>
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeIndex === 0}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 border border-white/10 text-white transition-all hover:border-emerald-500/40"
            aria-label="Previous appointment"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={activeIndex === safeItems.length - 1}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 border border-white/10 text-white transition-all hover:border-emerald-500/40"
            aria-label="Next appointment"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Confined Card Stage: Cards STICK firmly inside without coming out */}
      <div className="relative mx-auto aspect-[4/5] w-full max-w-[820px] [perspective:1200px] sm:aspect-[1.8/1] my-4">
        {safeItems.map((item, index) => (
          <FlipCard
            key={`${item.title}-${index}`}
            item={item}
            index={index}
            total={safeItems.length}
            activeIndex={activeIndex}
            reduceMotion={reduceMotion}
          />
        ))}
      </div>

      {/* Progress Dots Indicator */}
      <div className="flex justify-center items-center gap-2 mt-8">
        {safeItems.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-400",
              i === activeIndex
                ? "w-8 bg-emerald-400 shadow-glow-emerald"
                : "w-2 bg-white/20 hover:bg-white/40"
            )}
            aria-label={`Go to appointment ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
