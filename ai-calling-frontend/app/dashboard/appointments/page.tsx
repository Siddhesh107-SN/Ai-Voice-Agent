"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { appointmentsApi } from "@/lib/api/appointments";
import { Appointment, AppointmentStatus } from "@/lib/types";
import { AppointmentCardStack } from "@/components/appointments/appointment-card-stack";
import { AppointmentTable } from "@/components/appointments/appointment-table";
import { AppointmentFormDialog } from "@/components/appointments/appointment-form-dialog";
import { AppointmentCancelDialog } from "@/components/appointments/appointment-cancel-dialog";
import { AppointmentRescheduleDialog } from "@/components/appointments/appointment-reschedule-dialog";
import { AppointmentHistoryModal } from "@/components/appointments/appointment-history-modal";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, CardStackSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Calendar,
  Layers,
  Table as TableIcon,
  PlusCircle,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";

export default function AppointmentsPage() {
  // View presentation mode: 'stack' (default) vs 'table' (Requirements #9 & #13)
  const [viewMode, setViewMode] = useState<"stack" | "table">("stack");

  // Filters & Pagination state
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = viewMode === "stack" ? 8 : 10;

  // Active dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // TanStack Query
  const {
    data: appointmentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["appointments", statusFilter, customerSearch, page, limit],
    queryFn: () =>
      appointmentsApi.getAppointments({
        status: statusFilter,
        customer: customerSearch || undefined,
        page,
        limit,
      }),
  });

  const appointments = appointmentsData?.data || [];
  const pagination = appointmentsData?.pagination;

  // Handlers for appointment actions
  const handleEdit = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setEditDialogOpen(true);
  };

  const handleCancel = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelDialogOpen(true);
  };

  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleDialogOpen(true);
  };

  const handleViewHistory = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setHistoryModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header: Title, View Switcher & Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Appointments
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              {pagination?.total || 0} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Browse bookings via 3D Flip Stack or Data Table.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher: Card Stack vs Table (Req #9 & #13) */}
          <div className="flex items-center p-1 rounded-2xl bg-white/[0.04] border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("stack")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all ${
                viewMode === "stack"
                  ? "bg-emerald-500 text-white shadow-glow-emerald font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Card Stack
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all ${
                viewMode === "table"
                  ? "bg-emerald-500 text-white shadow-glow-emerald font-semibold"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table
            </button>
          </div>

          {/* New Appointment Button */}
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="shadow-glow-emerald"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Filters Bar: Search & Status Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-2xl bg-[rgba(12,12,16,0.65)] border border-white/10 backdrop-blur-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by customer name, phone, or email..."
            className="pl-10 h-10 border-white/10 bg-white/[0.03]"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-40 sm:w-44">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            className="h-10 w-10 text-white/60 hover:text-white hover:bg-white/10 rounded-xl"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content Rendering: Loading, Error, Empty, or Data */}
      {isLoading ? (
        viewMode === "stack" ? (
          <CardStackSkeleton />
        ) : (
          <TableSkeleton rows={6} cols={6} />
        )
      ) : isError ? (
        <ErrorBanner
          message={(error as any)?.message || "Failed to load appointments."}
          onRetry={() => refetch()}
        />
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Appointments Found"
          description={
            customerSearch || statusFilter !== "all"
              ? "No appointments match your active filter criteria. Try resetting filters."
              : "No appointments have been booked yet. Create your first appointment now."
          }
          actionLabel="Schedule Appointment"
          onAction={() => setCreateDialogOpen(true)}
          secondaryActionLabel={
            customerSearch || statusFilter !== "all" ? "Clear Filters" : undefined
          }
          onSecondaryAction={() => {
            setCustomerSearch("");
            setStatusFilter("all");
            setPage(1);
          }}
        />
      ) : (
        <div className="space-y-6">
          {viewMode === "stack" ? (
            <AppointmentCardStack
              appointments={appointments}
              onViewHistory={handleViewHistory}
              onEdit={handleEdit}
              onCancel={handleCancel}
              onReschedule={handleReschedule}
            />
          ) : (
            <AppointmentTable
              appointments={appointments}
              onViewHistory={handleViewHistory}
              onEdit={handleEdit}
              onCancel={handleCancel}
              onReschedule={handleReschedule}
            />
          )}

          {/* Reusable Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/10 px-4">
              <Pagination
                pagination={pagination}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          )}
        </div>
      )}

      {/* Dialogs and Modals */}
      <AppointmentFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => refetch()}
      />

      <AppointmentFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        appointment={selectedAppointment}
        onSuccess={() => refetch()}
      />

      <AppointmentCancelDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        appointment={selectedAppointment}
        onSuccess={() => refetch()}
      />

      <AppointmentRescheduleDialog
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
        appointment={selectedAppointment}
        onSuccess={() => refetch()}
      />

      <AppointmentHistoryModal
        open={historyModalOpen}
        onOpenChange={setHistoryModalOpen}
        appointment={selectedAppointment}
      />
    </div>
  );
}
