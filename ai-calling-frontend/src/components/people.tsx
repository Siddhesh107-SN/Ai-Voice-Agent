import type { ReactElement } from "react";

/**
 * Five illustrated people (duotone, palette-only). Colours come from CSS classes in globals.css
 * (.pf-o offwhite, .pf-b blue, .pf-n navy; .ps-n / .ps-o strokes), which read the token variables.
 * Order matches whoFor.items in src/data/content.ts.
 */
export const people: ReactElement[] = [
  // Healthcare Providers: white coat, stethoscope
  <g key="doc">
    <path className="pf-o" d="M10 100C10 74 28 62 50 62S90 74 90 100Z" />
    <path className="pf-b" d="M38 62L50 84 62 62Z" />
    <path className="ps-n" strokeWidth="3" strokeLinecap="round" d="M34 70q-6 18 8 22" />
    <circle className="pf-n" cx="42" cy="93" r="3.5" />
    <circle className="pf-o" cx="50" cy="40" r="18" />
    <path className="pf-n" d="M32 38C32 20 68 20 68 38 62 30 38 30 32 38Z" />
  </g>,
  // Educational Institutions: graduation cap
  <g key="edu">
    <path className="pf-b" d="M10 100C10 74 28 66 50 66S90 74 90 100Z" />
    <circle className="pf-o" cx="50" cy="44" r="18" />
    <path className="pf-n" d="M30 33v10c6 6 34 6 40 0V33L50 41Z" />
    <path className="pf-n" d="M50 12L84 26 50 40 16 26Z" />
    <path className="ps-o" strokeWidth="2.5" d="M84 26v16" />
    <circle className="pf-o" cx="84" cy="44" r="3" />
  </g>,
  // Small and Medium Businesses: apron
  <g key="smb">
    <path className="pf-b" d="M10 100C10 74 28 62 50 62S90 74 90 100Z" />
    <path className="pf-o" d="M30 76h40l6 24H24Z" />
    <rect className="pf-b" x="42" y="86" width="16" height="8" rx="2" />
    <circle className="pf-o" cx="50" cy="40" r="18" />
    <path className="pf-n" d="M33 36C33 18 67 18 67 36 60 28 40 28 33 36Z" />
  </g>,
  // Service-Based Businesses: hard hat
  <g key="svc">
    <path className="pf-n" d="M10 100C10 74 28 66 50 66S90 74 90 100Z" />
    <circle className="pf-o" cx="50" cy="44" r="18" />
    <path className="pf-b" d="M28 38C28 14 72 14 72 38Z" />
    <rect className="pf-b" x="24" y="36" width="52" height="7" rx="3.5" />
    <path className="ps-o" strokeWidth="3" d="M50 14v14" />
    <rect className="pf-o" x="62" y="78" width="14" height="6" rx="2" />
  </g>,
  // Growing Companies: blazer and growth arrow
  <g key="grow">
    <path className="pf-n" d="M10 100C10 74 28 62 50 62S90 74 90 100Z" />
    <path className="pf-o" d="M40 62L50 90 60 62Z" />
    <path className="pf-b" d="M50 62l-8 4 8 24 8-24Z" />
    <circle className="pf-o" cx="50" cy="40" r="18" />
    <path className="pf-b" d="M33 36C33 18 67 18 67 36 60 28 40 28 33 36Z" />
    <path className="ps-o" strokeWidth="3" strokeLinecap="round" d="M66 78l8-8 6 5 8-10" />
  </g>,
];
