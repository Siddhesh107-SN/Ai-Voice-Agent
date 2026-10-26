"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { footer, nav } from "@/data/content";

export default function Footer() {
  const pathname = usePathname();
  const isAuthPage =
    pathname.startsWith("/signup") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/payment") ||
    pathname.startsWith("/onboarding-status");
  if (isAuthPage) return null;

  const links = [...nav.links, nav.login, nav.signup];
  return (
    <footer data-nav-theme="dark" className="bg-dark">
      <div className="wrap flex flex-col gap-10 py-16 md:flex-row md:items-end md:justify-between">
        <div className="max-w-md">
          <p className="text-[2rem] font-medium leading-tight">{footer.tagline}</p>
          <p className="muted mt-4 text-[.98rem]">{footer.blurb}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-7 gap-y-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="nav-link">{l.label}</Link>
          ))}
        </nav>
      </div>
      <div className="wrap border-t py-6 text-sm muted" style={{ borderColor: "color-mix(in srgb, var(--c-offwhite) 16%, transparent)" }}>
        {footer.copyright}
      </div>
    </footer>
  );
}
