"use client";

import React from "react";
import { CaseStudyFlipStack, CaseStudyFlipItem } from "@/components/ui/case-study-flip-stack";
import { Appointment } from "@/lib/types";
import { formatDate, formatTime } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Sparkles,
  User,
  History,
  Edit,
  CalendarClock,
  CalendarX,
  Phone,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppointmentCardStackProps {
  appointments: Appointment[];
  onViewHistory: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
}

export function AppointmentCardStack({
  appointments,
  onViewHistory,
  onEdit,
  onCancel,
  onReschedule,
}: AppointmentCardStackProps) {
  const items: CaseStudyFlipItem[] = appointments.map((apt, index) => {
    const isCancelled = apt.status === "cancelled";
    const isCompleted = apt.status === "completed";

    return {
      number: String(index + 1).padStart(2, "0"),
      eyebrow: apt.status.toUpperCase(),
      title: apt.customer_name,
      description: apt.service,
      image:
        apt.image ||
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80&auto=format&fit=crop",
      imageAlt: `${apt.customer_name} appointment portrait`,
      background: "rgba(12, 14, 20, 0.9)",
      foreground: "#ffffff",
      customerName: apt.customer_name,
      customerPhone: apt.customer_phone,
      customerEmail: apt.customer_email,
      appointmentDay: apt.day_of_week,
      appointmentDate: formatDate(apt.date),
      appointmentTime: formatTime(apt.time),
      service: apt.service,
      status: apt.status,
      agentName: apt.agent_name || "Aria (Voice AI)",
      staffName: apt.staff_name || "David Miller",
      notes: apt.notes,
      actions: (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="glass"
            onClick={() => onViewHistory(apt)}
            className="text-xs h-8 px-2.5 rounded-xl hover:border-emerald-500/40 text-emerald-300"
          >
            <History className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            History
          </Button>

          {!isCancelled && !isCompleted && (
            <>
              <Button
                size="sm"
                variant="glass"
                onClick={() => onReschedule(apt)}
                className="text-xs h-8 px-2.5 rounded-xl hover:border-emerald-500/40"
              >
                <CalendarClock className="w-3.5 h-3.5 mr-1 text-amber-400" />
                Reschedule
              </Button>

              <Button
                size="sm"
                variant="glass"
                onClick={() => onEdit(apt)}
                className="text-xs h-8 px-2.5 rounded-xl hover:border-emerald-500/40"
              >
                <Edit className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                Edit
              </Button>

              <Button
                size="sm"
                variant="destructive"
                onClick={() => onCancel(apt)}
                className="text-xs h-8 px-2.5 rounded-xl ml-auto"
              >
                <CalendarX className="w-3.5 h-3.5 mr-1" />
                Cancel
              </Button>
            </>
          )}
        </div>
      ),
    };
  });

  return (
    <div className="w-full">
      <CaseStudyFlipStack
        items={items}
        hint="Flip Appointments"
        heading="Today's Active Roster"
      />
    </div>
  );
}
