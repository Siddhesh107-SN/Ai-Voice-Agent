"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { appointmentsApi } from "@/lib/api/appointments";
import { Appointment, AppointmentHistoryItem } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Bot, User, History, Clock, ArrowRight, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AppointmentHistoryModalProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentHistoryModal({
  appointment,
  open,
  onOpenChange,
}: AppointmentHistoryModalProps) {
  const [history, setHistory] = useState<AppointmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && appointment) {
      setLoading(true);
      appointmentsApi
        .getAppointmentHistory(appointment.id)
        .then((items) => setHistory(items))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [open, appointment]);

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader className="text-left border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <History className="w-4 h-4" />
            Audit Trail & Timeline
          </div>
          <DialogTitle className="text-lg font-bold text-white mt-1">
            History: {appointment.customer_name}
          </DialogTitle>
          <DialogDescription className="text-xs text-white/50">
            {appointment.service} • Ref: {appointment.id}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-white/40 text-sm">
              No audit records logged yet for this appointment.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
              {history.map((item, idx) => {
                const isAi = item.actor_type === "ai_agent";
                return (
                  <div key={item.id || idx} className="relative group">
                    {/* Timeline Node Icon */}
                    <div
                      className={`absolute -left-6 top-0 w-5 h-5 rounded-full border-2 border-[#12141c] flex items-center justify-center text-[10px] ${
                        isAi
                          ? "bg-emerald-500 text-white shadow-glow-emerald"
                          : "bg-cyan-500 text-white"
                      }`}
                    >
                      {isAi ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    </div>

                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 backdrop-blur-sm group-hover:border-white/20 transition-all">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-white tracking-tight">
                          {item.event}
                        </span>
                        <span className="text-[11px] text-white/40 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(item.timestamp)}
                        </span>
                      </div>

                      {/* Actor Information */}
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mb-2">
                        {isAi ? (
                          <span className="flex items-center gap-1">
                            <Bot className="w-3.5 h-3.5" /> AI Agent: {item.actor}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-cyan-300">
                            <User className="w-3.5 h-3.5" /> Staff: {item.actor}
                          </span>
                        )}
                      </div>

                      {/* Transition values */}
                      {(item.old_value || item.new_value) && (
                        <div className="text-xs space-y-1 bg-black/20 p-2.5 rounded-xl border border-white/5">
                          {item.old_value && (
                            <div className="text-white/40 line-through">
                              Old: {item.old_value}
                            </div>
                          )}
                          {item.new_value && (
                            <div className="text-white/90 font-medium flex items-start gap-1">
                              <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{item.new_value}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
