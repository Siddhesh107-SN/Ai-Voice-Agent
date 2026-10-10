"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { superAdminApi } from "@/lib/api/super-admin";
import { PlatformRevenueData } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/ui/error-banner";
import {
  CircleDollarSign,
  TrendingUp,
  Calendar,
  CreditCard,
  Building2,
  PieChart,
  Layers,
  ArrowUpRight,
  Filter,
} from "lucide-react";

export default function PlatformRevenuePage() {
  const [timeframe, setTimeframe] = useState("30days");

  const { data, isLoading, isError, error, refetch } = useQuery<PlatformRevenueData>({
    queryKey: ["super-admin-revenue", timeframe],
    queryFn: () => superAdminApi.getRevenue(timeframe),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const timefilters = [
    { label: "Today", value: "today" },
    { label: "7 Days", value: "7days" },
    { label: "30 Days", value: "30days" },
    { label: "3 Months", value: "3months" },
    { label: "6 Months", value: "6months" },
    { label: "1 Year", value: "1year" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Date Filter Pills */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Platform Revenue & Subscriptions</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              INR (₹)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Global SaaS revenue, plan breakdowns, active tenant billing metrics, and transaction history.
          </p>
        </div>

        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-[#0c0e14]/90 border border-white/10 text-xs">
          {timefilters.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => setTimeframe(tf.value)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                timeframe === tf.value
                  ? "bg-emerald-500 text-white shadow-glow-emerald font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <ErrorBanner
          message={(error as any)?.message || "Failed to load revenue data"}
          onRetry={refetch}
        />
      )}

      {/* Top Cards: Total, Month, Year, Active Subscriptions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Total Revenue</span>
            <CircleDollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-9 w-32 bg-white/10 rounded-lg" />
          ) : (
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {formatCurrency(data?.total_revenue ?? 0)}
            </div>
          )}
          <div className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> +{data?.revenue_growth_percentage ?? 24.8}% vs previous cycle
          </div>
        </div>

        {/* This Month */}
        <div className="p-5 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">This Month</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-9 w-32 bg-white/10 rounded-lg" />
          ) : (
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
              {formatCurrency(data?.this_month ?? 0)}
            </div>
          )}
          <div className="text-xs text-white/40">October 2026 Collections</div>
        </div>

        {/* This Year */}
        <div className="p-5 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">This Year</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-9 w-32 bg-white/10 rounded-lg" />
          ) : (
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {formatCurrency(data?.this_year ?? 0)}
            </div>
          )}
          <div className="text-xs text-white/40">FY 2026 Cumulative</div>
        </div>

        {/* Active Subscriptions */}
        <div className="p-5 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-2 shadow-xl">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Active Subscriptions</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          {isLoading ? (
            <Skeleton className="h-9 w-16 bg-white/10 rounded-lg" />
          ) : (
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {data?.active_subscriptions ?? 0}
            </div>
          )}
          <div className="text-xs text-white/40">Paid business licenses</div>
        </div>
      </div>

      {/* Analytics Breakdown Grid: Revenue by Plan & Revenue by Business */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Subscription Plan */}
        <div className="p-5 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Revenue by Subscription Plan</h3>
              <p className="text-xs text-white/40">Plan distribution across active tenants.</p>
            </div>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="space-y-3">
            {data?.revenue_by_plan?.map((p) => {
              const total = data?.total_revenue || 1;
              const pct = Math.round((p.revenue / total) * 100);
              return (
                <div key={p.plan} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white font-mono">{p.plan} PLAN</span>
                    <span className="font-semibold text-emerald-400">{formatCurrency(p.revenue)}</span>
                  </div>
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/40">
                    <span>{p.count} active subscribers</span>
                    <span>{pct}% of platform volume</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue by Business Tenant */}
        <div className="p-5 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-base">Revenue by Business</h3>
              <p className="text-xs text-white/40">Top contributing organizations.</p>
            </div>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>

          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {data?.revenue_by_business?.map((b) => (
              <div
                key={b.business_id}
                className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs hover:border-white/10 transition-colors"
              >
                <div>
                  <div className="font-bold text-white">{b.business_name}</div>
                  <div className="text-[11px] text-white/40 font-mono">{b.plan} Plan</div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-400 text-sm font-mono">
                    {formatCurrency(b.revenue)}
                  </span>
                  <div className="text-[10px] text-white/40">Paid to date</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
