import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "TalkAor — AI Voice-Calling SaaS Platform",
  description:
    "Automate customer conversations, appointments, and voice workflows using AI voice agents built for your business.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
