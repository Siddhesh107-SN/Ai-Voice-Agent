"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { superAdminApi } from "@/lib/api/super-admin";
import { SuperAdminDashboardData } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/ui/error-banner";
import {
  Building2,
  Users,
  Bot,
  PhoneCall,
  Activity,
  CircleDollarSign,
  TrendingUp,
  Server,
  Terminal,
  ShieldCheck,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function SuperAdminDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery<SuperAdminDashboardData>({
    queryKey: ["super-admin-dashboard"],
    queryFn: () => superAdminApi.getDashboard(),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Platform Overview Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-[#0d1017] via-[#121622] to-[#0a0d14] border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-glow-emerald shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Super Admin Platform Console
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                PLATFORM OWNER
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Live multi-tenant telemetry, platform analytics, system health, and global AI agents.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/super-admin/api"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            FastAPI Docs
          </Link>
          <Link
            href="/super-admin/businesses"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs text-white font-medium transition-colors shadow-glow-emerald"
          >
            Manage Businesses →
          </Link>
        </div>
      </div>

      {isError && (
        <ErrorBanner
          message={(error as any)?.message || "Failed to load platform analytics"}
          onRetry={refetch}
        />
      )}

      {/* Platform Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Businesses */}
        <div className="p-4 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Total Businesses</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-20 bg-white/10 rounded-lg" />
          ) : (
            <div className="text-2xl font-bold text-white tracking-tight">
              {data?.total_businesses ?? 0}
            </div>
          )}
          <div className="text-[11px] text-white/40 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{data?.active_businesses ?? 0}</span> active on platform
          </div>
        </div>

        {/* Active Businesses */}
        <div className="p-4 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Active Businesses</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-20 bg-white/10 rounded-lg" />
          ) : (
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
              {data?.active_businesses ?? 0}
            </div>
          )}
          <div className="text-[11px] text-white/40">Registered organizations</div>
        </div>

        {/* Total Users */}
        <div className="p-4 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Total Users</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-20 bg-white/10 rounded-lg" />
          ) : (
            <div className="text-2xl font-bold text-white tracking-tight">
              {data?.total_users ?? 0}
            </div>
          )}
          <div className="text-[11px] text-white/40">Staff & Administrators</div>
        </div>

        {/* Active AI Agents */}
        <div className="p-4 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Active AI Agents</span>
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-20 bg-white/10 rounded-lg" />
          ) : (
            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
              {data?.active_agents ?? 0}
            </div>
          )}
          <div className="text-[11px] text-white/40">Across all tenants</div>
        </div>

        {/* Total Calls */}
        <div className="p-4 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Total Calls</span>
            <PhoneCall className="w-4 h-4 text-blue-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-20 bg-white/10 rounded-lg" />
          ) : (
            <div className="text-2xl font-bold text-white tracking-tight">
              {new Intl.NumberFormat().format(data?.total_calls ?? 0)}
            </div>
          )}
          <div className="text-[11px] text-white/40">Autonomous telephony</div>
        </div>

        {/* Total Revenue */}
        <div className="p-4 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Total Revenue</span>
            <CircleDollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-28 bg-white/10 rounded-lg" />
          ) : (
            <div className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(data?.total_revenue ?? 0)}
            </div>
          )}
          <div className="text-[11px] text-emerald-400 flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> All-time subscriptions
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="p-4 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Monthly Revenue</span>
            <CircleDollarSign className="w-4 h-4 text-amber-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-28 bg-white/10 rounded-lg" />
          ) : (
            <div className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(data?.monthly_revenue ?? 0)}
            </div>
          )}
          <div className="text-[11px] text-white/40">Current calendar month</div>
        </div>

        {/* System Status */}
        <div className="p-4 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">System Status</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            {data?.system_status || "Operational"}
          </div>
          <div className="text-[11px] text-white/40">All 7 services nominal</div>
        </div>
      </div>

      {/* Main Split: Top Businesses & Recent Platform Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Businesses Table Preview */}
        <div className="p-5 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Registered Businesses</h3>
              <p className="text-xs text-white/40">Top businesses registered on TalkAor.</p>
            </div>
            <Link
              href="/super-admin/businesses"
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
              <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
              <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
            </div>
          ) : (
            <div className="space-y-2.5">
              {data?.top_businesses?.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs hover:border-white/15 transition-all"
                >
                  <div>
                    <div className="font-bold text-white">{b.business_name}</div>
                    <div className="text-[11px] text-white/40">
                      Owner: {b.owner_name} • {b.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      {b.status}
                    </span>
                    <div className="text-[11px] text-white/50 mt-1 font-mono">
                      {formatCurrency(b.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Audit Logs Preview */}
        <div className="p-5 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Platform Activity Feed</h3>
              <p className="text-xs text-white/40">Real-time system events, authentication, & administrative logs.</p>
            </div>
            <Link
              href="/super-admin/logs"
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
            >
              Full Logs <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
              <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
              <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {data?.recent_logs?.map((l) => (
                <div
                  key={l.id}
                  className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-xs hover:border-white/15 transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          l.level === "ERROR" || l.level === "CRITICAL"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : l.level === "WARNING"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {l.level}
                      </span>
                      <span className="font-semibold text-white">{l.event}</span>
                    </div>
                    <span className="text-[10px] text-white/40 font-mono">{l.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-white/60 line-clamp-1">{l.details}</p>
                  <div className="text-[10px] text-white/40 flex items-center gap-2">
                    <span>{l.business_name}</span>
                    <span>•</span>
                    <span>{l.service}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
