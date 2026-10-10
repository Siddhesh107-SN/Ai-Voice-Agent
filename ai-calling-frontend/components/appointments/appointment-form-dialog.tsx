"use client";

import React, { useEffect, useState } from "react";
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
import { Select } from "@/components/ui/select";
import { Appointment, Customer } from "@/lib/types";
import { appointmentsApi } from "@/lib/api/appointments";
import { customersApi } from "@/lib/api/customers";
import { CalendarPlus, Edit3, User, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null; // If passed, edit mode; else create mode
  onSuccess: () => void;
}

const COMMON_SERVICES = [
  "Hair Consultation & Scalp Assessment",
  "Signature Facial Treatment & Glow Therapy",
  "Executive Grooming & Beard Sculpting",
  "Balayage Color Refresh & Conditioning",
  "Hydra-Infusion Facial & Neck Therapy",
  "Full Scalp Treatment & Stress Relief",
  "Comprehensive Voice AI Setup & Onboarding",
  "General Wellness Consultation",
];

export function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  onSuccess,
}: AppointmentFormDialogProps) {
  const isEdit = !!appointment;

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:30:00");
  const [service, setService] = useState(COMMON_SERVICES[0]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Appointment["status"]>("scheduled");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      customersApi
        .getCustomers({ limit: 100 })
        .then((res) => setCustomers(res.data))
        .catch(() => {});

      if (appointment) {
        setCustomerName(appointment.customer_name);
        setCustomerPhone(appointment.customer_phone);
        setCustomerEmail(appointment.customer_email || "");
        setDate(appointment.date);
        setTime(appointment.time);
        setService(appointment.service);
        setNotes(appointment.notes || "");
        setStatus(appointment.status);
      } else {
        // Defaults for new appointment
        setCustomerName("");
        setCustomerPhone("");
        setCustomerEmail("");
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDate(tomorrow.toISOString().split("T")[0]);
        setTime("10:30:00");
        setService(COMMON_SERVICES[0]);
        setNotes("");
        setStatus("scheduled");
      }
    }
  }, [open, appointment]);

  const handleCustomerSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    const found = customers.find((c) => c.id === custId);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
      setCustomerEmail(found.email);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !date || !time || !service) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const formattedTime = time.length === 5 ? `${time}:00` : time;

      if (isEdit && appointment) {
        await appointmentsApi.updateAppointment(appointment.id, {
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || undefined,
          service,
          status,
          notes: notes || undefined,
        });
        toast.success("Appointment updated successfully.");
      } else {
        await appointmentsApi.createAppointment({
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || undefined,
          date,
          time: formattedTime,
          service,
          notes: notes || undefined,
        });
        toast.success("New appointment scheduled successfully.");
      }
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save appointment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-none pb-0 text-left">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 shrink-0 shadow-glow-emerald">
                {isEdit ? <Edit3 className="w-5 h-5" /> : <CalendarPlus className="w-5 h-5" />}
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-white">
                  {isEdit ? "Edit Appointment" : "Schedule New Appointment"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs text-white/60">
                  {isEdit
                    ? "Update appointment details and notes."
                    : "Create a verified booking for client calendar."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Quick Customer Autocomplete Picker */}
            {!isEdit && customers.length > 0 && (
              <div className="space-y-1.5 p-3 rounded-2xl bg-white/[0.02] border border-white/10">
                <label className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Select Existing Customer (Optional)
                </label>
                <Select onChange={handleCustomerSelect} defaultValue="">
                  <option value="">-- Choose from existing customer database --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Customer Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Customer Name *
                </label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Smith"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Phone Number *
                </label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 342-9811"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">
                Email Address
              </label>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="e.g. customer@example.com"
              />
            </div>

            {/* Date and Time (disabled in Edit mode if prompt says rescheduling is separate, or allowed if just editing details) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Date (YYYY-MM-DD) *
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  disabled={isEdit}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Time (HH:MM:SS) *
                </label>
                <Input
                  type="time"
                  step="1"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  disabled={isEdit}
                />
              </div>
            </div>

            {isEdit && (
              <p className="text-[11px] text-white/40 italic">
                * Note: To modify the date or time, please use the separate "Reschedule" action.
              </p>
            )}

            {/* Service & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Service *
                </label>
                <Select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  required
                >
                  {COMMON_SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>

              {isEdit && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/70">
                    Status
                  </label>
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                  </Select>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">
                Notes / Special Requests
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Client requested private room, allergic to latex..."
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
              {loading
                ? isEdit
                  ? "Updating..."
                  : "Scheduling..."
                : isEdit
                ? "Save Changes"
                : "Schedule Appointment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
