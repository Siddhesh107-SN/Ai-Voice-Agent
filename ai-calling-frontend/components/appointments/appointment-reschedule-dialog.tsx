"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Appointment } from "@/lib/types";
import { appointmentsApi } from "@/lib/api/appointments";
import { CalendarClock, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";

interface AppointmentRescheduleDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AppointmentRescheduleDialog({
  appointment,
  open,
  onOpenChange,
  onSuccess,
}: AppointmentRescheduleDialogProps) {
  const [newDate, setNewDate] = useState(appointment?.date || "");
  const [newTime, setNewTime] = useState(appointment?.time || "10:00:00");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!appointment) return null;

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newTime) {
      toast.error("Please provide both new date and time.");
      return;
    }

    setLoading(true);
    try {
      // Ensure time has seconds format HH:MM:SS
      const formattedTime = newTime.length === 5 ? `${newTime}:00` : newTime;

      const res = await appointmentsApi.rescheduleAppointment(appointment.id, {
        new_date: newDate,
        new_time: formattedTime,
        reason: reason.trim() || undefined,
      });

      toast.success(res.message || "Appointment rescheduled successfully.");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to reschedule appointment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleReschedule}>
          <DialogHeader className="border-none pb-0 text-left">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 shrink-0 shadow-glow-emerald">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-white">
                  Reschedule Appointment
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs text-white/60">
                  Update booking slot for{" "}
                  <span className="font-semibold text-white">
                    {appointment.customer_name}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Current Booking Summary */}
          <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs flex justify-between items-center">
            <span className="text-white/50">Current Schedule:</span>
            <span className="font-medium text-white/90">
              {appointment.day_of_week}, {appointment.date} at {appointment.time}
            </span>
          </div>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  New Date (YYYY-MM-DD)
                </label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  New Time (HH:MM:SS)
                </label>
                <Input
                  type="time"
                  step="1"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">
                Reschedule Reason (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Client requested change, calendar adjustment..."
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none transition-all"
              />
            </div>
          </div>

          <DialogFooter className="border-none pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-glow-emerald"
            >
              {loading ? "Updating..." : "Save Reschedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
