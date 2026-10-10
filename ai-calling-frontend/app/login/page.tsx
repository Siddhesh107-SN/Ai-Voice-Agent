"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { WebglShaderBackground } from "@/components/ui/webgl-shader-background";
import { ShieldCheck, UserCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusMessage("Authenticating credentials...");

    if (!email || !password) {
      setErrorMessage("Please enter email and password.");
      setStatusMessage("");
      return;
    }

    setIsLoading(true);
    try {
      await login({ email, password });
      toast.success("Login successful. Opening TalkAor Dashboard...");
    } catch (err: any) {
      const msg = err.message || "Invalid credentials. Please try again.";
      setErrorMessage(msg);
      setStatusMessage("");
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsLoading(true);
    setErrorMessage("");
    setStatusMessage(`Signing in as ${demoEmail.includes("admin") ? "Client Admin" : "Client Staff"}...`);
    try {
      await login({ email: demoEmail, password: demoPass });
      toast.success(`Logged in as ${demoEmail.includes("admin") ? "Administrator" : "Staff"}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to log in.");
      setStatusMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-black overflow-hidden font-sans">
      {/* Fullscreen WebGL Soundwave Shader Background matching landing page */}
      <WebglShaderBackground />

      <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center">
        {/* Brand Logo returning home matching login.html */}
        <Link
          href="/"
          className="flex items-center gap-2.5 mb-7 group text-white no-underline"
        >
          <span className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shadow-glow-emerald">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="22"></line>
              <line x1="8" y1="22" x2="16" y2="22"></line>
            </svg>
          </span>
          <span className="text-xl font-extrabold tracking-tight text-white">
            Talkaor
          </span>
        </Link>

        {/* Login Glass Card matching login.html */}
        <div className="w-full rounded-2xl bg-[rgba(9,9,11,0.78)] backdrop-blur-2xl border border-[#27272a] p-8 shadow-2xl transition-all">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">
              Welcome Back
            </h1>
            <p className="text-xs text-[#a1a1aa]">
              Log in to your Talkaor account.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-white/80"
              >
                Email
              </label>
              <input
                type="email"
                id="login-email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="login-password"
                  className="font-medium text-white/80"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() =>
                    toast.info(
                      "Demo credentials: admin@talkaor.com (admin123) or staff@talkaor.com (staff123)"
                    )
                  }
                  className="text-xs text-[#71717a] hover:text-white transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
              <input
                type="password"
                id="login-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full h-11 px-3.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/60 transition-all"
              />
            </div>

            {/* Liquid Button matching login.html */}
            <button
              type="submit"
              disabled={isLoading}
              className="liquid-button w-full relative mt-2 text-sm font-semibold tracking-wide text-white overflow-hidden transition-all"
              style={{ height: "3.15rem" }}
            >
              <div className="liquid-glass-reflection"></div>
              <div className="liquid-glass-backdrop"></div>
              <span className="liquid-button-content font-semibold">
                {isLoading ? "Logging in..." : "Login"}
              </span>
            </button>

            {statusMessage && (
              <div className="text-center text-xs text-[#10b981] min-h-[1.25rem] mt-2 font-medium">
                {statusMessage}
              </div>
            )}

            {/* Demo Accounts Bar */}
            <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40 text-center">
                Instant Demo Access
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleDemoLogin("superadmin@talkaor.com", "super123")}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-1 p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-[11px] text-purple-300 transition-all font-medium"
                  title="Platform Owner"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Super Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin("admin@talkaor.com", "admin123")}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-1 p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-[11px] text-emerald-300 transition-all font-medium"
                  title="Business Owner / Admin"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Business Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin("staff@talkaor.com", "staff123")}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/80 transition-all font-medium"
                  title="Staff Member"
                >
                  <UserCheck className="w-3.5 h-3.5 text-white/60 shrink-0" />
                  <span>Staff Demo</span>
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-[#71717a] mt-4">
              Don't have an account?{" "}
              <Link
                href="/"
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </form>
        </div>

        {/* Back link matching login.html */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-[#71717a] hover:text-white transition-colors"
          >
            ← Back to Talkaor Home
          </Link>
        </div>
      </div>

      {/* SVG Filter for Liquid Glass Refraction matching login.html */}
      <svg className="hidden" aria-hidden="true" focusable="false">
        <defs>
          <filter
            id="container-glass"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.05 0.05"
              numOctaves="1"
              seed="1"
              result="turbulence"
            />
            <feGaussianBlur
              in="turbulence"
              stdDeviation="2"
              result="blurredNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="blurredNoise"
              scale="70"
              xChannelSelector="R"
              yChannelSelector="B"
              result="displaced"
            />
            <feGaussianBlur
              in="displaced"
              stdDeviation="4"
              result="finalBlur"
            />
            <feComposite in="finalBlur" in2="finalBlur" operator="over" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
