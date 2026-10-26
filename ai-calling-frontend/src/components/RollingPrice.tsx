"use client";

import { useEffect, useRef, useState } from "react";

export interface RollingPriceProps {
  value: string;
  className?: string;
}

interface Slot {
  id: string;
  type: "digit" | "static";
  char?: string;
  targetDigit?: number;
  digitIndexFromRight: number;
  isEntering?: boolean;
  isExiting?: boolean;
}

function parsePrice(str: string): Slot[] {
  const slots: Slot[] = [];
  let digitIndex = 0;
  // Parse from right to left so indices align with units, tens, hundreds...
  for (let i = str.length - 1; i >= 0; i--) {
    const char = str[i];
    if (char >= "0" && char <= "9") {
      slots.push({
        id: `digit-${digitIndex}`,
        type: "digit",
        targetDigit: parseInt(char, 10),
        digitIndexFromRight: digitIndex,
      });
      digitIndex++;
    } else if (char === ",") {
      slots.push({
        id: `comma-${digitIndex}`,
        type: "static",
        char: ",",
        digitIndexFromRight: digitIndex,
      });
    } else {
      slots.push({
        id: `char-${char}`,
        type: "static",
        char,
        digitIndexFromRight: digitIndex,
      });
    }
  }
  return slots.reverse();
}

/**
 * RollingPrice: Odometer-style price display using per-character slots aligned from the right.
 * - Digits roll by translateY to the target digit with --ease, staggered 60ms from right to left.
 * - Non-digits (₹, commas) are static.
 * - Extra slots fade & scale in or out on digit count changes.
 * - Does not animate on first load; only rolls after user interaction.
 * - Instant update with prefers-reduced-motion.
 * - Accessible: aria-hidden on digits, sr-only polite live region for screen readers.
 */
export default function RollingPrice({ value, className = "" }: RollingPriceProps) {
  const [slots, setSlots] = useState<Slot[]>(() => parsePrice(value));
  const [animated, setAnimated] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const initialValue = useRef(value);
  const exitTimer = useRef<number>();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (value === initialValue.current && !animated) {
      return;
    }

    setAnimated(true);
    window.clearTimeout(exitTimer.current);

    const nextSlots = parsePrice(value);

    setSlots((prev) => {
      const nextMap = new Map(nextSlots.map((s) => [s.id, s]));
      const prevMap = new Map(prev.map((s) => [s.id, s]));

      const merged: Slot[] = [];

      for (const slot of nextSlots) {
        const isNew = prevMap.size > 0 && !prevMap.has(slot.id);
        merged.push({
          ...slot,
          isEntering: isNew,
          isExiting: false,
        });
      }

      let hasExiting = false;
      for (const oldSlot of prev) {
        if (!nextMap.has(oldSlot.id)) {
          hasExiting = true;
          const insertIdx = merged.findIndex(
            (s) => s.digitIndexFromRight < oldSlot.digitIndexFromRight
          );
          const exitingSlot: Slot = {
            ...oldSlot,
            isEntering: false,
            isExiting: true,
          };
          if (insertIdx === -1) {
            merged.push(exitingSlot);
          } else {
            merged.splice(insertIdx, 0, exitingSlot);
          }
        }
      }

      if (hasExiting) {
        exitTimer.current = window.setTimeout(() => {
          setSlots(parsePrice(value));
        }, 750);
      }

      return merged;
    });
  }, [value, animated]);

  useEffect(() => {
    return () => window.clearTimeout(exitTimer.current);
  }, []);

  const shouldAnimate = animated && !reducedMotion;

  return (
    <span
      className={`inline-flex items-baseline font-semibold leading-none ${className}`}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {/* Screen-reader announcement: announced once politely */}
      <span className="sr-only" aria-live="polite">
        {value}
      </span>

      {/* Visual digits & static characters */}
      <span aria-hidden="true" className="inline-flex items-baseline">
        {slots.map((slot) => {
          if (slot.type === "static") {
            const isComma = slot.char === ",";
            return (
              <span
                key={slot.id}
                className={`inline-block select-none leading-none ${
                  slot.isEntering && shouldAnimate ? "slot-in" : ""
                }`}
                style={{
                  opacity: slot.isExiting ? 0 : 1,
                  transform: slot.isExiting ? "scale(0.6)" : "scale(1)",
                  transition: shouldAnimate
                    ? "opacity 0.6s var(--ease), transform 0.6s var(--ease)"
                    : "none",
                  marginRight: isComma ? "0.06em" : slot.char === "₹" ? "0.06em" : undefined,
                  marginLeft: isComma ? "0.02em" : undefined,
                }}
              >
                {slot.char}
              </span>
            );
          }

          const target = slot.targetDigit ?? 0;
          const delay = slot.digitIndexFromRight * 60;

          return (
            <span
              key={slot.id}
              className={`inline-block leading-none select-none ${
                slot.isEntering && shouldAnimate ? "slot-in" : ""
              }`}
              style={{
                height: "1em",
                overflow: "hidden",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                opacity: slot.isExiting ? 0 : 1,
                transform: slot.isExiting ? "scale(0.6)" : "scale(1)",
                transition: shouldAnimate
                  ? "opacity 0.6s var(--ease), transform 0.6s var(--ease)"
                  : "none",
              }}
            >
              <span
                className="flex flex-col"
                style={{
                  transform: `translateY(-${target * 10}%)`,
                  transition: shouldAnimate
                    ? `transform 0.8s var(--ease) ${delay}ms`
                    : "none",
                  willChange: "transform",
                }}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <span
                    key={num}
                    className="flex h-[1em] items-center justify-center leading-none"
                  >
                    {num}
                  </span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
