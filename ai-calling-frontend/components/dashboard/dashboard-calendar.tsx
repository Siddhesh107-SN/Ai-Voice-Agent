"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { Appointment } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { AppointmentStatusBadge } from "@/components/ui/badge";

interface DashboardCalendarProps {
  appointments?: Appointment[];
  activeAgentsCount?: number;
  totalCallsToday?: number;
}

export function DashboardCalendar({
  appointments = [],
  activeAgentsCount = 2,
  totalCallsToday = 14,
}: DashboardCalendarProps) {
  const { user, role } = useAuth();

  // Current calendar view state: October 2026 (matching system reference time)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // 0-indexed: 9 = October
  const [selectedDay, setSelectedDay] = useState(12); // Oct 12 (active day with John Smith & Sophia Patel)

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Helper calculations for calendar days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // Find appointments on selected date
  const selectedDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
  const appointmentsForSelectedDate = appointments.filter((a) => a.date === selectedDateStr);
  const upcomingFallback = appointments.slice(0, 3);
  const displayedAppointments =
    appointmentsForSelectedDate.length > 0 ? appointmentsForSelectedDate : upcomingFallback;

  // Set of day numbers in current month that have appointments
  const appointmentDays = new Set(
    appointments
      .filter((a) => {
        const parts = a.date.split("-");
        return (
          parseInt(parts[0], 10) === currentYear &&
          parseInt(parts[1], 10) === currentMonth + 1
        );
      })
      .map((a) => parseInt(a.date.split("-")[2], 10))
  );

  return (
    <aside className="w-full rounded-[2.25rem] bg-[rgba(12,12,16,0.65)] backdrop-blur-2xl border border-white/10 p-5 sm:p-6 shadow-2xl flex flex-col justify-between text-white select-none">
      {/* 1. User Profile Card at Top (matching reference screenshot layout) */}
      <div className="flex items-center justify-between pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 p-0.5 shadow-glow-emerald flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#111] rounded-[14px] flex items-center justify-center font-bold text-emerald-400 text-sm">
              {user?.name?.slice(0, 2).toUpperCase() || "TA"}
            </div>
          </div>
          <div className="leading-tight">
            <h4 className="font-bold text-sm text-white truncate max-w-[130px]">
              {user?.name || "Client Operator"}
            </h4>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3" />
              {role === "CLIENT_ADMIN" ? "Administrator" : "Staff Member"}
            </span>
          </div>
        </div>

        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-glow-emerald animate-pulse" title="System Live" />
      </div>

      {/* Quick Metrics Bar (matching "75kg / 180cm / 26yrs" in reference screenshot) */}
      <div className="grid grid-cols-3 gap-2 my-4 text-center">
        <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="text-base font-extrabold text-white">{appointments.length}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Booked</div>
        </div>
        <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="text-base font-extrabold text-emerald-400">{activeAgentsCount}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Agents</div>
        </div>
        <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="text-base font-extrabold text-white">{totalCallsToday}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Calls</div>
        </div>
      </div>

      {/* 2. Interactive Calendar Widget (matching reference screenshot) */}
      <div className="my-2 p-4 rounded-3xl bg-black/40 border border-white/5">
        {/* Month Title & Arrows */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-bold text-sm tracking-tight text-white">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Row */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {daysOfWeek.map((d) => (
            <div key={d} className="text-[10px] font-semibold text-white/40 uppercase">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {/* Leading empty cells */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const isSelected = day === selectedDay;
            const hasAppointments = appointmentDays.has(day);

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`relative h-8 w-8 mx-auto rounded-full flex flex-col items-center justify-center text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-emerald-500 text-white font-bold shadow-glow-emerald"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <span>{day}</span>
                {hasAppointments && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Scheduled Appointments Section (matching reference screenshot) */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-glow-emerald" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-white">
              Scheduled
            </h4>
          </div>
          <Link
            href="/dashboard/appointments"
            className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            View all →
          </Link>
        </div>

        {/* Scheduled Cards List */}
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {displayedAppointments.length === 0 ? (
            <div className="text-center py-4 text-xs text-white/40">
              No appointments scheduled for this day.
            </div>
          ) : (
            displayedAppointments.map((apt) => (
              <div
                key={apt.id}
                className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white group-hover:text-emerald-400 transition-colors truncate max-w-[130px]">
                    {apt.customer_name}
                  </span>
                  <AppointmentStatusBadge status={apt.status} />
                </div>

                <div className="text-[11px] text-emerald-300/80 truncate">
                  {apt.service}
                </div>

                <div className="flex items-center justify-between text-[10px] text-white/40 pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    {formatTime(apt.time)}
                  </span>
                  <span>{formatDate(apt.date)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
