"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { Skeleton } from "@/components/ui/skeleton";
import { WebglShaderBackground } from "@/components/ui/webgl-shader-background";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, isSuperAdmin, role } = useAuth();
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
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto animate-pulse">
            <span className="font-bold text-lg">SA</span>
          </div>
          <p className="text-sm text-white/60">Loading Super Admin Platform Console...</p>
          <Skeleton className="h-2 w-48 mx-auto rounded-full bg-white/10" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative font-sans">
        <WebglShaderBackground />
        <div className="relative z-10 w-full max-w-md p-8 rounded-3xl bg-[#0c0e14]/90 border border-white/10 text-center space-y-4 shadow-2xl backdrop-blur-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Super Admin Access Required</h2>
          <p className="text-xs text-white/60">
            This platform section is restricted to the platform owner (<span className="font-mono text-purple-400">SUPER_ADMIN</span>). Your current account role is <span className="font-mono text-emerald-400">{role}</span>.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Button
              onClick={() => router.push("/dashboard")}
              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-glow-emerald"
            >
              Return to Business Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-slate-100 flex flex-col antialiased overflow-x-hidden font-sans">
      {/* WebGL Soundwave Shader Background */}
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
