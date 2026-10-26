"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { nav } from "@/data/content";

function Wordmark() {
  return (
    <Link href="/" className="text-[1.65rem] font-bold tracking-tight leading-none" aria-label="talkaor home">
      talkaor
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [open, setOpen] = useState(false);
  const sections = useRef<HTMLElement[]>([]);
  const menuBtn = useRef<HTMLButtonElement>(null);

  // theme detection + hide/show on scroll direction
  useEffect(() => {
    sections.current = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-theme]"));
    let last = window.scrollY;
    let raf = 0;
    const probe = 40;

    const update = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 8);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 120);
        last = y;
      }
      let t: "light" | "dark" = "light";
      for (const s of sections.current) {
        const r = s.getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) {
          t = (s.dataset.navTheme as "light" | "dark") || "light";
          break;
        }
      }
      setTheme((prev) => (prev === t ? prev : t));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  // close menu on route change, lock body scroll while open
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuBtn.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const effectiveTheme = open ? "dark" : theme;
  const isActive = (href: string) => pathname === href;

  // Standalone pages: hide marketing Nav on signup, login, and payment flows
  const isAuthPage =
    pathname.startsWith("/signup") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/payment") ||
    pathname.startsWith("/onboarding-status");
  if (isAuthPage) return null;

  return (
    <>
      <header className="site-nav" data-theme={effectiveTheme} data-scrolled={scrolled} data-hidden={hidden && !open}>
        <div className="nav-bg" />
        <div className="wrap relative flex h-full items-center justify-between">
          <Wordmark />

          {/* desktop */}
          <nav className="hidden items-center md:flex" aria-label="Primary">
            <div className="flex items-center gap-8">
              {nav.links.map((l) => (
                <Link key={l.href} href={l.href} className="nav-link" aria-current={isActive(l.href) ? "page" : undefined}>
                  {l.label}
                  {isActive(l.href) && <span className="nav-dot" aria-hidden />}
                </Link>
              ))}
            </div>
            <div className="ml-10 flex items-center gap-5">
              <Link href={nav.login.href} className="nav-link" aria-current={isActive(nav.login.href) ? "page" : undefined}>
                {nav.login.label}
                {isActive(nav.login.href) && <span className="nav-dot" aria-hidden />}
              </Link>
              <Link href={nav.signup.href} className="pill-sm">{nav.signup.label}</Link>
            </div>
          </nav>

          {/* mobile */}
          <div className="flex items-center gap-3 md:hidden">
            <Link href={nav.signup.href} className="pill-sm">{nav.signup.label}</Link>
            <button
              ref={menuBtn}
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((o) => !o)}
              className="grid h-10 w-10 place-items-center"
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
                {open ? <path d="M5 5l12 12M17 5L5 17" /> : <path d="M3 7h16M3 15h16" />}
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div id="mobile-menu" className="menu-overlay md:hidden" data-open={open} aria-hidden={!open} role="dialog" aria-label="Menu">
        <div className="flex h-[48px] items-center justify-between">
          <span className="text-[1.65rem] font-bold tracking-tight">talkaor</span>
        </div>
        <nav className="mt-16 flex flex-col gap-6" aria-label="Mobile">
          {[...nav.links, nav.login].map((l) => (
            <Link key={l.href} href={l.href} tabIndex={open ? 0 : -1} className="text-[2.4rem] font-medium leading-none" aria-current={isActive(l.href) ? "page" : undefined}>
              {l.label}
              {isActive(l.href) && <span className="ml-3 inline-block h-2 w-2 rounded-full bg-current align-middle" aria-hidden />}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
