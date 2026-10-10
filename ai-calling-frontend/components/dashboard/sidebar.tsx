"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { AdminAccessModal } from "@/components/dashboard/admin-access-modal";
import {
  LayoutDashboard,
  Calendar,
  Users,
  PhoneCall,
  CalendarX,
  Bot,
  UserCog,
  Building2,
  Mic,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Activity,
  CircleDollarSign,
  Terminal,
  Sliders,
  Lock,
  Unlock,
} from "lucide-react";

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, isAdmin, isBusinessAdmin, isSuperAdmin, adminUnlocked, logout } = useAuth();
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  // SUPER ADMIN MAIN MENU (Requirement #10 & Super Admin Sidebar Spec)
  const superAdminNav = [
    {
      name: "Super Admin Dashboard",
      href: "/super-admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Business Users",
      href: "/super-admin/businesses",
      icon: Building2,
    },
    {
      name: "Logs & Monitoring",
      href: "/super-admin/logs",
      icon: Activity,
    },
    {
      name: "Revenue",
      href: "/super-admin/revenue",
      icon: CircleDollarSign,
    },
    {
      name: "AI Agents",
      href: "/super-admin/agents",
      icon: Bot,
    },
    {
      name: "API / Swagger",
      href: "/super-admin/api",
      icon: Terminal,
    },
    {
      name: "System Settings",
      href: "/super-admin/settings",
      icon: Sliders,
    },
  ];

  // BUSINESS USERS MAIN MENU (Staff & Business Admin)
  const businessNav = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      name: "Appointments",
      href: "/dashboard/appointments",
      icon: Calendar,
    },
    {
      name: "Customers",
      href: "/dashboard/customers",
      icon: Users,
    },
    {
      name: "Voice Calls",
      href: "/dashboard/calls",
      icon: PhoneCall,
    },
    {
      name: "Cancellations",
      href: "/dashboard/cancellations",
      icon: CalendarX,
    },
    {
      name: "AI Agents",
      href: "/dashboard/agents",
      icon: Bot,
    },
    {
      name: "Staff",
      href: "/dashboard/staff",
      icon: UserCog,
      adminOnly: true,
    },
    {
      name: "Business Profile",
      href: "/dashboard/business-profile",
      icon: Building2,
    },
  ];

  const visibleNav = businessNav.filter((item) => !item.adminOnly || isAdmin);

  const handleAdminControlClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (adminUnlocked) {
      if (onCloseMobile) onCloseMobile();
      router.push("/dashboard/admin");
    } else {
      setAdminModalOpen(true);
    }
  };

  const isAdminControlActive = pathname.startsWith("/dashboard/admin");

  return (
    <>
      <aside className="flex flex-col h-full w-full bg-[rgba(10,12,16,0.7)] backdrop-blur-2xl border-r border-white/10 sm:rounded-3xl p-4 select-none shadow-2xl">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-3 py-3 mb-6">
          <Link
            href={isSuperAdmin ? "/super-admin" : "/dashboard"}
            className="flex items-center gap-3 group"
            onClick={onCloseMobile}
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 p-0.5 shadow-glow-emerald flex items-center justify-center group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0d0e12] rounded-[14px] flex items-center justify-center">
                <Mic className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                TalkAor
                <span
                  className={cn(
                    "text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border",
                    isSuperAdmin
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  )}
                >
                  {isSuperAdmin ? "SUPER" : "AI SaaS"}
                </span>
              </span>
              <span className="text-[11px] text-white/40 block">
                {isSuperAdmin ? "Platform Control" : "Voice Automation"}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Rail / List */}
        <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">
            {isSuperAdmin ? "Platform Menu" : "Main Menu"}
          </div>

          {/* Render Super Admin Menu if Super Admin */}
          {isSuperAdmin
            ? superAdminNav.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all group",
                      isActive
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-glow-emerald font-semibold"
                        : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          "w-5 h-5 transition-transform group-hover:scale-110",
                          isActive ? "text-white" : "text-white/50 group-hover:text-emerald-400"
                        )}
                      />
                      <span>{item.name}</span>
                    </div>

                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </Link>
                );
              })
            : /* Render Standard Business Menu if Business User / Staff */
              <>
                {visibleNav.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all group",
                        isActive
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-glow-emerald font-semibold"
                          : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            "w-5 h-5 transition-transform group-hover:scale-110",
                            isActive ? "text-white" : "text-white/50 group-hover:text-emerald-400"
                          )}
                        />
                        <span>{item.name}</span>
                      </div>

                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      )}
                    </Link>
                  );
                })}

                {/* ADMIN CONTROL SIDEBAR ITEM (Part 1 Specification) */}
                <div className="pt-2 mt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={handleAdminControlClick}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all group text-left",
                      isAdminControlActive
                        ? "bg-gradient-to-r from-amber-500/90 to-emerald-600 text-white shadow-glow-emerald font-semibold"
                        : adminUnlocked
                        ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20"
                        : "text-white/70 hover:text-white hover:bg-white/[0.06] border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-1 rounded-lg transition-transform group-hover:scale-110",
                          adminUnlocked
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-amber-500/15 text-amber-400"
                        )}
                      >
                        {adminUnlocked ? (
                          <Unlock className="w-3.5 h-3.5" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="font-semibold tracking-wide">ADMIN CONTROL</span>
                    </div>

                    <span
                      className={cn(
                        "text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold border",
                        adminUnlocked
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-white/5 text-white/40 border-white/10"
                      )}
                    >
                      {adminUnlocked ? "ACTIVE" : "CODE"}
                    </span>
                  </button>
                </div>
              </>}
        </div>

        {/* Current User Role Info & Logout */}
        <div className="pt-4 border-t border-white/10 mt-auto space-y-3">
          {/* Role Indicator Card */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-white/40 uppercase tracking-wider text-[10px] font-semibold">
                Current Access
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase",
                  isSuperAdmin
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : isBusinessAdmin
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                )}
              >
                {isSuperAdmin
                  ? "Super Admin"
                  : isBusinessAdmin
                  ? "Business Admin"
                  : "Staff"}
              </span>
            </div>
            <div className="mt-1 font-medium text-white/90 truncate">
              {user?.name || "Client User"}
            </div>
          </div>

          {/* Home & Logout Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex-1 text-center py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white/60 hover:text-white border border-white/10 transition-colors"
            >
              ← Main Site
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center justify-center p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Admin Access Modal */}
      <AdminAccessModal
        open={adminModalOpen}
        onOpenChange={setAdminModalOpen}
        onSuccess={() => {
          if (onCloseMobile) onCloseMobile();
          router.push("/dashboard/admin");
        }}
      />
    </>
  );
}
