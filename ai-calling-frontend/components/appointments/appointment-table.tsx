"use client";

import React from "react";
import { Appointment } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/utils";
import { AppointmentStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  History,
  Edit,
  CalendarClock,
  CalendarX,
  Phone,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppointmentTableProps {
  appointments: Appointment[];
  onViewHistory: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
}

export function AppointmentTable({
  appointments,
  onViewHistory,
  onEdit,
  onCancel,
  onReschedule,
}: AppointmentTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-3xl border border-white/10 bg-[rgba(12,12,16,0.65)] backdrop-blur-2xl shadow-glass">
      <table className="w-full text-left text-sm text-white/80">
        <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-white/40">
          <tr>
            <th className="py-4 px-4 sm:px-6">Customer</th>
            <th className="py-4 px-4">Date & Day</th>
            <th className="py-4 px-4">Time</th>
            <th className="py-4 px-4">Service</th>
            <th className="py-4 px-4">Status</th>
            <th className="py-4 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 font-normal">
          {appointments.map((apt) => {
            const isCancelled = apt.status === "cancelled";
            const isCompleted = apt.status === "completed";

            return (
              <tr
                key={apt.id}
                className="hover:bg-white/[0.03] transition-colors group"
              >
                {/* Customer */}
                <td className="py-4 px-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0 shadow-glow-emerald">
                      {apt.customer_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        {apt.customer_name}
                      </div>
                      <div className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {apt.customer_phone}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Date & Day */}
                <td className="py-4 px-4">
                  <div className="font-medium text-white/90">
                    {formatDate(apt.date)}
                  </div>
                  <div className="text-xs text-white/40">{apt.day_of_week}</div>
                </td>

                {/* Time */}
                <td className="py-4 px-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-xs font-mono text-white/90">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    {formatTime(apt.time)}
                  </span>
                </td>

                {/* Service */}
                <td className="py-4 px-4 max-w-[220px]">
                  <div className="font-medium text-white truncate" title={apt.service}>
                    {apt.service}
                  </div>
                  <div className="text-xs text-white/40 truncate">
                    Agent: {apt.agent_name || "Aria (Voice AI)"}
                  </div>
                </td>

                {/* Status */}
                <td className="py-4 px-4">
                  <AppointmentStatusBadge status={apt.status} />
                </td>

                {/* Actions */}
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewHistory(apt)}
                      className="h-8 px-2 text-xs text-white/60 hover:text-white"
                      title="View Timeline"
                    >
                      <History className="w-3.5 h-3.5" />
                    </Button>

                    {!isCancelled && !isCompleted && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onReschedule(apt)}
                          className="h-8 px-2 text-xs text-amber-400/80 hover:text-amber-400"
                          title="Reschedule"
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(apt)}
                          className="h-8 px-2 text-xs text-cyan-400/80 hover:text-cyan-400"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onCancel(apt)}
                          className="h-8 px-2 text-xs text-rose-400/80 hover:text-rose-400"
                          title="Cancel"
                        >
                          <CalendarX className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
