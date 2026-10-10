"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { isMockMode } from "@/lib/api/client";
import {
  Bell,
  Search,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  Building2,
  ShieldCheck,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onToggleMobileNav: () => void;
  isMobileNavOpen: boolean;
}

export function Header({ onToggleMobileNav, isMobileNavOpen }: HeaderProps) {
  const { user, role, isAdmin, logout, switchDemoRole } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const mockActive = isMockMode();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 py-4 bg-[rgba(9,9,11,0.7)] backdrop-blur-2xl border-b border-white/10 select-none">
      {/* Left: Mobile Toggle & Greeting */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div>
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Good day, {user?.name?.split(" ")[0] || "Client"}
            <span className="text-lg">👋</span>
          </h1>
          <p className="text-xs text-white/40 hidden sm:block">
            AI Voice Concierge & Scheduling Platform
          </p>
        </div>
      </div>

      {/* Middle: Sleek Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search appointments, customers, or calls..."
            className="w-full h-10 pl-10 pr-4 rounded-full bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 backdrop-blur-md transition-all"
          />
        </div>
      </div>

      {/* Right Controls: Mode Badge, Quick Role Switcher, Notification, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mock / Live Backend Pill */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-medium text-emerald-400">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{mockActive ? "Mock API Mode" : "FastAPI Backend"}</span>
        </div>

        {/* Demo Role Quick Switcher */}
        <div className="hidden sm:flex items-center p-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => switchDemoRole("SUPER_ADMIN")}
            className={`px-2 py-1 rounded-lg font-medium transition-all ${
              role === "SUPER_ADMIN"
                ? "bg-purple-600 text-white shadow-glow-emerald font-semibold"
                : "text-white/50 hover:text-white"
            }`}
            title="Switch to Platform Super Admin"
          >
            Super Admin
          </button>
          <button
            type="button"
            onClick={() => switchDemoRole("BUSINESS_ADMIN")}
            className={`px-2 py-1 rounded-lg font-medium transition-all ${
              role === "BUSINESS_ADMIN" || role === "CLIENT_ADMIN"
                ? "bg-emerald-500 text-white shadow-glow-emerald font-semibold"
                : "text-white/50 hover:text-white"
            }`}
            title="Switch to Business Admin"
          >
            Admin View
          </button>
          <button
            type="button"
            onClick={() => switchDemoRole("STAFF")}
            className={`px-2 py-1 rounded-lg font-medium transition-all ${
              role === "STAFF" || role === "CLIENT_STAFF"
                ? "bg-cyan-500 text-white shadow-glow-emerald font-semibold"
                : "text-white/50 hover:text-white"
            }`}
            title="Switch to Staff User"
          >
            Staff View
          </button>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/70 hover:text-white transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-black" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-72 p-3 rounded-2xl bg-[#141620]/95 border border-white/10 shadow-2xl backdrop-blur-xl text-xs space-y-2 z-50">
              <div className="font-semibold text-white px-1">Notifications</div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <div className="font-medium text-emerald-400">Voice Agent Aria</div>
                <p className="text-white/70 text-[11px]">
                  Booked new appointment for John Smith (Monday at 10:30 AM).
                </p>
                <div className="text-[10px] text-white/40">10 mins ago</div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all text-left focus:outline-none"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-400 flex items-center justify-center text-white font-bold text-xs shadow-glow-emerald shrink-0">
                {user?.name?.slice(0, 2).toUpperCase() || "TA"}
              </div>
              <div className="hidden md:block leading-tight">
                <div className="text-xs font-semibold text-white truncate max-w-[120px]">
                  {user?.name || "Client User"}
                </div>
                <div className="text-[10px] text-white/40 font-mono">
                  {role === "CLIENT_ADMIN" ? "Admin" : "Staff"}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2 border-b border-white/10">
              <p className="text-xs font-semibold text-white">{user?.name}</p>
              <p className="text-[11px] text-white/50 truncate">{user?.email}</p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {role}
              </span>
            </div>

            <DropdownMenuItem asChild>
              <Link href="/dashboard/business-profile" className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-white/60" />
                <span>Business Profile</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href="/" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>TalkAor Landing Page</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => switchDemoRole(isAdmin ? "CLIENT_STAFF" : "CLIENT_ADMIN")}
              className="text-emerald-400 focus:text-emerald-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Switch to {isAdmin ? "Staff" : "Admin"} Demo
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => logout()}
              className="text-rose-400 focus:text-rose-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
