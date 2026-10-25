import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { introBootScript } from "@/lib/intro";

const body = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

// Armany Text. Drop-in: the font file lives in /public/fonts.
// To use a stand-in instead, swap this for next/font/google Fraunces.
const display = localFont({
  src: "../../public/fonts/Armany-Regular.otf",
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const metadata: Metadata = {
  title: "talkaor | Smarter Conversations. Better Business.",
  description: "AI-powered voice agents that answer your calls and book your appointments.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: introBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
