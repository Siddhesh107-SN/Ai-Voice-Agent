"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { Skeleton } from "@/components/ui/skeleton";
import { WebglShaderBackground } from "@/components/ui/webgl-shader-background";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative">
        <WebglShaderBackground />
        <div className="relative z-10 w-full max-w-md space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto animate-pulse shadow-glow-emerald">
            <span className="font-bold text-lg">TA</span>
          </div>
          <p className="text-sm text-white/60">Loading TalkAor Dashboard...</p>
          <Skeleton className="h-2 w-48 mx-auto rounded-full bg-white/10" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-black text-slate-100 flex flex-col antialiased overflow-x-hidden font-sans">
      {/* WebGL Soundwave Shader Canvas Background (matching main website) */}
      <WebglShaderBackground className="opacity-35 fixed inset-0 pointer-events-none" />

      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (Floating Glass Rail) */}
        <div className="hidden lg:flex w-64 xl:w-72 shrink-0 p-4">
          <Sidebar />
        </div>

        {/* Mobile Navigation Drawer / Overlay */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-72 z-50 p-4 animate-in slide-in-from-left duration-200">
              <Sidebar onCloseMobile={() => setMobileNavOpen(false)} />
            </div>
          </div>
        )}

        {/* Main Application Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Header
            onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)}
            isMobileNavOpen={mobileNavOpen}
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
