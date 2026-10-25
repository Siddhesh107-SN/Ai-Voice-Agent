"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import AuthBots, { BotState } from "@/components/AuthBots";

interface AuthShellProps {
  title: string;
  subtitle: string;
  botState: BotState;
  botLineLengths?: number[];
  statusText?: string;
  compact?: boolean;
  children: ReactNode;
}

export default function AuthShell({
  title,
  subtitle,
  botState,
  botLineLengths,
  statusText,
  compact = false,
  children,
}: AuthShellProps) {
  return (
    <main
      className={`min-h-[100svh] flex items-center justify-center text-[var(--c-auth-ink)] ${
        compact ? "p-2 sm:p-3" : "p-3 sm:p-4"
      }`}
      style={{ background: "var(--c-auth-bg)" }}
    >
      <div
        className={`w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-[44%_56%] rounded-[20px] overflow-hidden shadow-2xl ${
          compact ? "min-h-0" : "min-h-[640px]"
        }`}
        style={{
          background: "var(--c-auth-panel)",
          border: "1px solid var(--c-auth-line)",
        }}
      >
        {/* Left panel: desktop full view / mobile banner */}
        <section
          aria-label="Talkaor overview"
          className={`relative rounded-[14px] overflow-hidden flex flex-col ${
            compact ? "m-1.5 p-3.5 sm:p-4" : "m-2 p-5 sm:p-6"
          }`}
          style={{
            background:
              "radial-gradient(130% 62% at 50% 0%, var(--c-blue) 0%, var(--c-royal) 38%, var(--c-navy) 70%, var(--c-auth-bg) 100%)",
          }}
        >
          {/* Faint Nitro Orange glow at the bottom */}
          <div
            className="absolute inset-x-0 bottom-0 h-[45%] pointer-events-none"
            style={{
              background:
                "radial-gradient(70% 60% at 50% 100%, var(--c-auth-glow), transparent)",
            }}
            aria-hidden="true"
          />

          {/* Logo */}
          <Link
            href="/"
            className="relative z-[2] text-xl font-semibold tracking-tight text-[var(--c-auth-ink)] no-underline hover:opacity-95 transition-opacity"
            aria-label="Talkaor home"
          >
            talk<span style={{ color: "var(--c-orange)" }}>a</span>or
          </Link>

          {/* Animated Bots */}
          <AuthBots state={botState} lineLengths={botLineLengths} statusText={statusText} />

          {/* Bottom punchline */}
          <div className={`relative z-[2] mt-auto ${compact ? "pt-2 md:pt-3" : "pt-4 md:pt-5"}`}>
            <h3 className={`${compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"} font-semibold leading-tight tracking-tight`}>
              Smarter conversations.
              <br />
              Better business.
            </h3>
            <p
              className="mt-1 text-xs leading-relaxed hidden md:block"
              style={{ color: "var(--c-auth-muted)" }}
            >
              Let Talkaor handle your calls and appointments while you run your business.
            </p>
          </div>
        </section>

        {/* Right panel: Form view */}
        <section
          aria-label="Authentication form"
          className={`flex flex-col justify-between ${
            compact ? "p-3 sm:p-4 md:px-6 md:py-4" : "p-5 sm:p-6 md:px-8 md:py-6"
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <Link
              href="/"
              className="text-xs transition-colors hover:text-[var(--c-auth-ink)]"
              style={{ color: "var(--c-auth-muted)" }}
            >
              ← Back to home
            </Link>
          </div>

          <div className={`w-full mx-auto ${compact ? "max-w-[440px] py-0.5 sm:py-1" : "max-w-[360px] py-2 sm:py-4"}`}>
            <h2 className={`text-center font-semibold tracking-tight text-[var(--c-auth-ink)] ${
              compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-[26px]"
            }`}>
              {title}
            </h2>
            <p
              className={`text-center text-[13px] ${compact ? "mt-0.5 mb-2.5" : "mt-1.5 mb-5"}`}
              style={{ color: "var(--c-auth-muted)" }}
            >
              {subtitle}
            </p>
            {children}
          </div>

          <div className="text-center text-xs mt-1 text-[var(--c-auth-muted)]">
            © {new Date().getFullYear()} Talkaor. All rights reserved.
          </div>
        </section>
      </div>
    </main>
  );
}
