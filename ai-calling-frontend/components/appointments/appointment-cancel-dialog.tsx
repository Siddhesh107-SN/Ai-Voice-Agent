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
import { Appointment } from "@/lib/types";
import { appointmentsApi } from "@/lib/api/appointments";
import { AlertTriangle, CalendarX } from "lucide-react";
import { toast } from "sonner";

interface AppointmentCancelDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AppointmentCancelDialog({
  appointment,
  open,
  onOpenChange,
  onSuccess,
}: AppointmentCancelDialogProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!appointment) return null;

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await appointmentsApi.cancelAppointment(appointment.id, {
        reason: reason.trim() || undefined,
      });
      toast.success(res.message || "Appointment cancelled successfully.");
      onOpenChange(false);
      setReason("");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel appointment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="border-none pb-0 text-left">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-400 shrink-0">
              <CalendarX className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-white">
                Cancel Appointment
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-white/60">
                Are you sure you want to cancel the appointment for{" "}
                <span className="font-semibold text-white">
                  {appointment.customer_name}
                </span>{" "}
                on {appointment.date} at {appointment.time}?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2 mt-2">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs space-y-1">
            <div className="text-white/50">Service:</div>
            <div className="font-medium text-white">{appointment.service}</div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/70">
              Cancellation Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Client requested reschedule, illness, scheduling conflict..."
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 resize-none transition-all"
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
            Keep Appointment
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancel}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/25"
          >
            {loading ? "Cancelling..." : "Confirm Cancellation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
