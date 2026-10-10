"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Button } from "@/components/ui/button";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import { formatDate, formatTime, formatDuration } from "@/lib/utils";
import {
  Calendar,
  Users,
  PhoneCall,
  Bot,
  CalendarCheck,
  CalendarX,
  Clock,
  Sparkles,
  ArrowUpRight,
  PlusCircle,
  Headphones,
  CheckCircle2,
} from "lucide-react";

export default function DashboardHomePage() {
  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => dashboardApi.getSummary(),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorBanner
        message={(error as any)?.message || "Failed to load dashboard overview."}
        onRetry={() => refetch()}
      />
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-8 select-none">
      {/* Top Banner & Quick Actions with Liquid Glass Transparency */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-[2rem] bg-[rgba(10,12,16,0.6)] border border-white/10 backdrop-blur-2xl relative overflow-hidden shadow-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold uppercase tracking-wider border border-emerald-500/30 shadow-glow-emerald">
            <Sparkles className="w-3.5 h-3.5" />
            AI Voice Concierge Live
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            TalkAor Operations Pulse
          </h2>
          <p className="text-xs sm:text-sm text-white/60">
            Automating customer calls, calendar bookings, and client inquiries 24/7.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild className="shadow-glow-emerald">
            <Link href="/dashboard/appointments">
              <PlusCircle className="w-4 h-4 mr-2" />
              Manage Appointments
            </Link>
          </Button>
          <Button asChild variant="glass">
            <Link href="/dashboard/calls">
              <PhoneCall className="w-4 h-4 mr-2 text-emerald-400" />
              Recent Calls
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Grid: Left 2 Columns Content + Right 1 Column Calendar Widget */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left & Center Columns (Span 2 on xl screens) */}
        <div className="xl:col-span-2 space-y-6">
          {/* Row 1: Primary Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatsCard
              title="Today's Appointments"
              value={summary.today_appointments}
              change={12}
              changeLabel="vs yesterday"
              icon={Calendar}
              accentColor="emerald"
              subtitle={`${summary.scheduled_appointments} scheduled pending`}
            />

            <StatsCard
              title="Total Calls Today"
              value={summary.calls_today}
              change={18}
              changeLabel="higher volume"
              icon={PhoneCall}
              accentColor="emerald"
              subtitle={`${summary.total_calls} cumulative calls`}
            />

            <StatsCard
              title="Active AI Agents"
              value={`${summary.active_agents} / ${summary.total_agents}`}
              icon={Bot}
              accentColor="emerald"
              subtitle="99.9% uptime on voice neural pipeline"
            />

            <StatsCard
              title="Total Customer Records"
              value={summary.total_customers}
              change={8}
              changeLabel="new this month"
              icon={Users}
              accentColor="emerald"
              subtitle="Verified client contacts"
            />
          </div>

          {/* Row 2: Secondary Status Distribution Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-[rgba(12,12,16,0.6)] border border-white/10 backdrop-blur-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-white/50">Total Bookings</div>
                <div className="text-xl font-bold text-white mt-0.5">{summary.total_appointments}</div>
              </div>
              <CalendarCheck className="w-6 h-6 text-white/20" />
            </div>

            <div className="p-4 rounded-2xl bg-[rgba(12,12,16,0.6)] border border-white/10 backdrop-blur-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-400/90 font-medium">Completed</div>
                <div className="text-xl font-bold text-emerald-400 mt-0.5">{summary.completed_appointments}</div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-400/30" />
            </div>

            <div className="p-4 rounded-2xl bg-[rgba(12,12,16,0.6)] border border-white/10 backdrop-blur-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-white/60">Scheduled Active</div>
                <div className="text-xl font-bold text-white mt-0.5">{summary.scheduled_appointments}</div>
              </div>
              <Clock className="w-6 h-6 text-white/20" />
            </div>

            <div className="p-4 rounded-2xl bg-[rgba(12,12,16,0.6)] border border-white/10 backdrop-blur-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-rose-400/90 font-medium">Cancelled</div>
                <div className="text-xl font-bold text-rose-400 mt-0.5">{summary.cancelled_appointments}</div>
              </div>
              <CalendarX className="w-6 h-6 text-rose-400/30" />
            </div>
          </div>

          {/* Row 3: Weekly Activity Tracking Chart (Liquid Glass) */}
          <div className="p-6 sm:p-7 rounded-[2rem] bg-[rgba(12,12,16,0.65)] border border-white/10 backdrop-blur-2xl shadow-glass">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Call & Booking Volume</h3>
                <p className="text-xs text-white/40">Weekly voice session distribution</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-emerald-400 font-mono">
                Past 7 Days
              </span>
            </div>

            <div className="space-y-4">
              <div className="h-44 w-full flex items-end justify-between gap-3 pt-6 px-2">
                {summary.weekly_stats.map((stat) => {
                  const maxVal = 70;
                  const callHeight = (stat.calls / maxVal) * 100;
                  const aptHeight = ((stat.appointments * 3) / maxVal) * 100;

                  return (
                    <div key={stat.day} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="w-full flex items-end justify-center gap-1.5 h-36">
                        {/* Calls Bar (Emerald) */}
                        <div
                          style={{ height: `${callHeight}%` }}
                          className="w-full max-w-[16px] rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:brightness-125 transition-all shadow-glow-emerald"
                          title={`${stat.calls} voice calls`}
                        />
                        {/* Appointments Bar */}
                        <div
                          style={{ height: `${aptHeight}%` }}
                          className="w-full max-w-[16px] rounded-t-lg bg-gradient-to-t from-zinc-700 to-zinc-400 group-hover:brightness-125 transition-all"
                          title={`${stat.appointments} booked`}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-white/50 group-hover:text-emerald-400 transition-colors">
                        {stat.day}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-6 pt-3 border-t border-white/10 text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-glow-emerald" />
                  <span>Voice Calls Handled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-zinc-400" />
                  <span>Appointments Booked</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Recent Voice Calls Feed */}
          <div className="p-6 sm:p-7 rounded-[2rem] bg-[rgba(12,12,16,0.65)] border border-white/10 backdrop-blur-2xl shadow-glass">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Recent Voice Agent Calls</h3>
                <p className="text-xs text-white/40">Latest AI interactions with customers</p>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
                <Link href="/dashboard/calls">
                  View Call Logs →
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.recent_calls.map((call) => (
                <div
                  key={call.id}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-all space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                        <Headphones className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-white block">
                          {call.customer_name}
                        </span>
                        <span className="text-[10px] text-white/40">
                          Agent: {call.agent_name}
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                      {call.status} • {formatDuration(call.duration_seconds)}
                    </span>
                  </div>

                  {call.summary && (
                    <p className="text-white/70 bg-black/30 p-2.5 rounded-xl border border-white/5 line-clamp-2">
                      "{call.summary}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Dashboard Calendar Widget (Matching Reference Screenshot) */}
        <div className="w-full">
          <DashboardCalendar
            appointments={summary.upcoming_appointments}
            activeAgentsCount={summary.active_agents}
            totalCallsToday={summary.calls_today}
          />
        </div>
      </div>
    </div>
  );
}
