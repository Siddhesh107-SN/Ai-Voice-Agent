"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function Logo() {
  return (
    <Link
      href="/"
      className="text-xl font-semibold tracking-tight text-[var(--c-auth-ink)] no-underline hover:opacity-95 transition-opacity"
      aria-label="Talkaor home"
    >
      talk<span style={{ color: "var(--c-orange)" }}>a</span>or
    </Link>
  );
}

export const FLOW_STEPS = [
  "Account",
  "Email verified",
  "Package",
  "Payment",
  "Verification",
];

const LEGACY_STEPS = ["Account", "Package", "Email", "Payment"];

export function StepIndicator({
  current,
  steps = FLOW_STEPS,
}: {
  current: number;
  steps?: readonly string[] | string[];
}) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3 flex-wrap" aria-label="Registration progress">
      {steps.map((label, i) => {
        const n = i + 1;
        const isDone = n < current;
        const isOn = n === current;
        return (
          <li
            key={label}
            className={`flex items-center gap-1.5 sm:gap-2 text-xs font-medium ${
              isOn
                ? "text-[var(--c-auth-ink)]"
                : isDone
                ? "text-[var(--c-auth-muted)]"
                : "text-[rgba(232,236,255,0.38)]"
            }`}
            aria-current={isOn ? "step" : undefined}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all ${
                isOn
                  ? "bg-[var(--c-orange)] text-white shadow-sm"
                  : isDone
                  ? "bg-[var(--c-blue)] text-white"
                  : "border border-[var(--c-auth-line)] text-[var(--c-auth-muted)]"
              }`}
            >
              {isDone ? "✓" : n}
            </span>
            <span className="hidden xs:inline sm:inline">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ArrowIcon() {
  return (
    <i
      className="w-[34px] h-[34px] rounded-full flex items-center justify-center -mr-2 bg-white/20 flex-shrink-0"
      aria-hidden="true"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 8h10M9 4l4 4-4 4" />
      </svg>
    </i>
  );
}

export function Frame({
  children,
  maxWidth = "max-w-[1000px]",
}: {
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <main
      className="min-h-[100svh] flex items-center justify-center p-3 sm:p-4 text-[var(--c-auth-ink)]"
      style={{ background: "var(--c-auth-bg)" }}
    >
      <div
        className={`w-full ${maxWidth} rounded-[20px] overflow-hidden min-h-[640px] shadow-2xl flex flex-col`}
        style={{
          background: "var(--c-auth-panel)",
          border: "1px solid var(--c-auth-line)",
        }}
      >
        {children}
      </div>
    </main>
  );
}

export function GuardMessage({
  title,
  body,
  href,
  label,
}: {
  title: string;
  body: string;
  href: string;
  label: string;
}) {
  return (
    <div className="m-auto text-center p-8 max-w-[460px]" role="alert">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--c-auth-ink)] mb-2.5">
        {title}
      </h1>
      <p className="text-sm text-[var(--c-auth-muted)] mb-6 leading-relaxed">
        {body}
      </p>
      <Link
        href={href}
        className="inline-flex h-[46px] rounded-full items-center justify-between px-6 text-sm font-semibold text-white transition-all duration-200 cursor-pointer hover:brightness-110 active:scale-[0.99] gap-4"
        style={{ background: "var(--c-orange)" }}
      >
        <span>{label}</span>
        <ArrowIcon />
      </Link>
    </div>
  );
}
