"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/auth-context";
import { adminApi } from "@/lib/api/admin";
import {
  Appointment,
  AIAgent,
  Call,
  BusinessProfile,
  Cancellation,
} from "@/lib/types";
import { formatDateTime, formatDate, formatDuration } from "@/lib/utils";
import { AdminAccessModal } from "@/components/dashboard/admin-access-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  ShieldAlert,
  Calendar,
  CalendarX,
  PhoneCall,
  Bot,
  Building2,
  Clock,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  Download,
  Power,
  Volume2,
  FileText,
  Lock,
  Search,
  ArrowRight,
  Save,
  Check,
  AlertTriangle,
  User,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";

export default function BusinessAdminPage() {
  const { user, role, isAdmin, isBusinessAdmin, adminUnlocked, lockAdminControls } = useAuth();
  const queryClient = useQueryClient();

  // Tab State: 'appointments' | 'cancellations' | 'rescheduling' | 'recordings' | 'agents' | 'profile'
  const [activeTab, setActiveTab] = useState<
    "appointments" | "cancellations" | "rescheduling" | "recordings" | "agents" | "profile"
  >("appointments");

  const [unlockModalOpen, setUnlockModalOpen] = useState(!adminUnlocked);

  // 1. APPOINTMENTS STATE & QUERIES
  const [aptSearch, setAptSearch] = useState("");
  const [aptStatus, setAptStatus] = useState("all");

  const {
    data: appointmentsData,
    isLoading: aptLoading,
    refetch: refetchApts,
  } = useQuery({
    queryKey: ["admin-appointments", aptSearch, aptStatus],
    queryFn: () => adminApi.getAppointments({ customer: aptSearch || undefined, status: aptStatus !== "all" ? aptStatus : undefined }),
    enabled: adminUnlocked && isAdmin,
  });

  const appointments: Appointment[] = appointmentsData?.data || [];

  // Action modals
  const [cancellingApt, setCancellingApt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");

  // 2. CANCELLATIONS QUERY
  const {
    data: cancellationsList,
    isLoading: cancLoading,
    refetch: refetchCanc,
  } = useQuery({
    queryKey: ["admin-cancellations"],
    queryFn: async () => {
      // Fetch cancelled appointments directly with cancellation reasons
      const res = await adminApi.getAppointments({ status: "cancelled" });
      return res.data;
    },
    enabled: adminUnlocked && isAdmin,
  });

  // 3. VOICE RECORDINGS QUERY
  const [callSearch, setCallSearch] = useState("");
  const {
    data: callsData,
    isLoading: callsLoading,
  } = useQuery({
    queryKey: ["admin-calls", callSearch],
    queryFn: () => adminApi.getCalls({ customer: callSearch || undefined }),
    enabled: adminUnlocked && isAdmin,
  });

  const calls: Call[] = callsData?.data || [];
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // 4. AI AGENTS QUERY
  const {
    data: agentsData,
    isLoading: agentsLoading,
    refetch: refetchAgents,
  } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: () => adminApi.getAgents(),
    enabled: adminUnlocked && isAdmin,
  });

  const agents: AIAgent[] = agentsData?.data || [];
  const [agentToToggle, setAgentToToggle] = useState<AIAgent | null>(null);

  // 5. BUSINESS PROFILE QUERY
  const {
    data: businessProfile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["admin-business"],
    queryFn: () => adminApi.getBusiness(),
    enabled: adminUnlocked && isAdmin,
  });

  // Profile edit form state
  const [bizName, setBizName] = useState("");
  const [bizPhone, setBizPhone] = useState("");
  const [bizEmail, setBizEmail] = useState("");
  const [bizAddress, setBizAddress] = useState("");
  const [bizTimezone, setBizTimezone] = useState("America/Los_Angeles");
  const [bizDescription, setBizDescription] = useState("");
  const [bizWorkingHours, setBizWorkingHours] = useState("");

  React.useEffect(() => {
    if (businessProfile) {
      setBizName(businessProfile.business_name || "");
      setBizPhone(businessProfile.phone || "");
      setBizEmail(businessProfile.email || "");
      setBizAddress(businessProfile.address || "");
      setBizTimezone(businessProfile.timezone || "America/Los_Angeles");
      setBizDescription(businessProfile.description || "");
      setBizWorkingHours(businessProfile.working_hours || "");
    }
  }, [businessProfile]);

  // RESTORE APPOINTMENT HANDLER
  const handleRestoreAppointment = async (aptId: string) => {
    try {
      await adminApi.restoreAppointment(aptId);
      toast.success("Appointment restored to scheduled status.");
      refetchApts();
      refetchCanc();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore appointment.");
    }
  };

  // CONFIRM APPOINTMENT HANDLER
  const handleConfirmAppointment = async (aptId: string) => {
    try {
      await adminApi.updateAppointment(aptId, { status: "confirmed" });
      toast.success("Appointment confirmed.");
      refetchApts();
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm appointment.");
    }
  };

  // CANCEL APPOINTMENT EXECUTION
  const handleExecuteCancel = async () => {
    if (!cancellingApt) return;
    try {
      await adminApi.cancelAppointment(cancellingApt.id, { reason: cancelReason || "Cancelled by Business Admin" });
      toast.success("Appointment cancelled.");
      setCancellingApt(null);
      setCancelReason("");
      refetchApts();
      refetchCanc();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel appointment.");
    }
  };

  // RESCHEDULE APPOINTMENT EXECUTION
  const handleExecuteReschedule = async () => {
    if (!reschedulingApt || !newDate || !newTime) {
      toast.error("Please specify both new date and time.");
      return;
    }
    try {
      await adminApi.rescheduleAppointment(reschedulingApt.id, {
        new_date: newDate,
        new_time: newTime,
        reason: rescheduleReason,
      });
      toast.success(`Rescheduled to ${newDate} at ${newTime}.`);
      setReschedulingApt(null);
      setNewDate("");
      setNewTime("");
      setRescheduleReason("");
      refetchApts();
    } catch (err: any) {
      toast.error(err.message || "Failed to reschedule appointment.");
    }
  };

  // TOGGLE AGENT STATUS EXECUTION
  const handleExecuteToggleAgent = async () => {
    if (!agentToToggle) return;
    const nextStatus = agentToToggle.status === "active" ? "inactive" : "active";
    try {
      await adminApi.toggleAgentStatus(agentToToggle.id, nextStatus);
      toast.success(`AI Agent '${agentToToggle.name}' turned ${nextStatus.toUpperCase()}.`);
      setAgentToToggle(null);
      refetchAgents();
    } catch (err: any) {
      toast.error(err.message || "Failed to update agent status.");
    }
  };

  // SAVE BUSINESS PROFILE
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.updateBusiness({
        business_name: bizName,
        phone: bizPhone,
        address: bizAddress,
        timezone: bizTimezone,
        description: bizDescription,
        working_hours: bizWorkingHours,
      });
      toast.success("Business profile saved successfully.");
      refetchProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile.");
    }
  };

  // NON-ADMIN GUARD
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-xl mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Access Restricted</h2>
        <p className="text-sm text-white/60">
          This area is restricted to Business Administrators (<span className="font-mono text-emerald-400">BUSINESS_ADMIN</span>). Staff accounts do not have permission to unlock admin controls.
        </p>
      </div>
    );
  }

  // LOCKED STATE: Require unlock modal
  if (!adminUnlocked) {
    return (
      <div className="p-8 max-w-md mx-auto rounded-3xl bg-[#0e1017]/90 border border-white/10 text-center space-y-4 backdrop-blur-2xl shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-glow-emerald">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Admin Controls Locked</h2>
        <p className="text-xs text-white/60">
          Enter your administrator access code to unlock appointments, cancellations, voice recordings, and AI agent controls.
        </p>
        <Button
          onClick={() => setUnlockModalOpen(true)}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-glow-emerald font-semibold"
        >
          <ShieldCheck className="w-4 h-4 mr-2" />
          Enter Admin Access Code
        </Button>

        <AdminAccessModal
          open={unlockModalOpen}
          onOpenChange={setUnlockModalOpen}
          onSuccess={() => setUnlockModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Admin Control Center Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-[#0d1017] via-[#121622] to-[#0a0d14] border border-emerald-500/25 shadow-glow-emerald">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-glow-emerald shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Admin Control Center
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE SESSION
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">
              Elevated administrator privileges for {businessProfile?.business_name || "your organization"}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex flex-col text-right text-xs">
            <span className="text-white/40">Logged in as</span>
            <span className="font-semibold text-emerald-400">{user?.name}</span>
          </div>
          <Button
            variant="ghost"
            onClick={lockAdminControls}
            className="text-xs text-white/60 hover:text-white hover:bg-white/5 border border-white/10"
          >
            <Lock className="w-3.5 h-3.5 mr-1.5" />
            Lock Controls
          </Button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0c0e14]/80 border border-white/10 overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("appointments")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all shrink-0 ${
            activeTab === "appointments"
              ? "bg-emerald-500 text-white shadow-glow-emerald font-semibold"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Appointments</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cancellations")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all shrink-0 ${
            activeTab === "cancellations"
              ? "bg-emerald-500 text-white shadow-glow-emerald font-semibold"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <CalendarX className="w-4 h-4" />
          <span>Cancellations</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rescheduling")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all shrink-0 ${
            activeTab === "rescheduling"
              ? "bg-emerald-500 text-white shadow-glow-emerald font-semibold"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Rescheduling</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("recordings")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all shrink-0 ${
            activeTab === "recordings"
              ? "bg-emerald-500 text-white shadow-glow-emerald font-semibold"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span>Voice Recordings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("agents")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all shrink-0 ${
            activeTab === "agents"
              ? "bg-emerald-500 text-white shadow-glow-emerald font-semibold"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>AI Agent Control</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all shrink-0 ${
            activeTab === "profile"
              ? "bg-emerald-500 text-white shadow-glow-emerald font-semibold"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Business Profile</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 1. APPOINTMENTS MANAGEMENT TAB                           */}
      {/* ======================================================== */}
      {activeTab === "appointments" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0c0e14]/80 border border-white/10">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search appointments by customer or phone..."
                value={aptSearch}
                onChange={(e) => setAptSearch(e.target.value)}
                className="pl-10 h-10 border-white/10 bg-white/[0.03]"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={aptStatus} onChange={(e) => setAptStatus(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
          </div>

          {aptLoading ? (
            <TableSkeleton rows={6} />
          ) : appointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No appointments found"
              description="No booking records match your filter criteria."
            />
          ) : (
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0c0e14]/90 backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.04] border-b border-white/10 text-white/50 uppercase font-mono tracking-wider">
                    <tr>
                      <th className="px-4 py-3.5">Customer</th>
                      <th className="px-4 py-3.5">Date & Slot</th>
                      <th className="px-4 py-3.5">Service</th>
                      <th className="px-4 py-3.5">Agent / Staff</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5 font-medium text-white">
                          <div>{apt.customer_name}</div>
                          <div className="text-[11px] text-white/40 font-mono">{apt.customer_phone}</div>
                        </td>
                        <td className="px-4 py-3.5 text-white/80">
                          <div>{apt.date} ({apt.day_of_week})</div>
                          <div className="text-[11px] text-emerald-400 font-mono">{apt.time}</div>
                        </td>
                        <td className="px-4 py-3.5 text-white/70 max-w-[200px] truncate">
                          {apt.service}
                        </td>
                        <td className="px-4 py-3.5 text-white/60">
                          {apt.agent_name || apt.staff_name || "TalkAor Core"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase border ${
                              apt.status === "confirmed"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : apt.status === "cancelled"
                                ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                : apt.status === "rescheduled"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                            }`}
                          >
                            {apt.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {apt.status !== "confirmed" && apt.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleConfirmAppointment(apt.id)}
                              className="h-8 px-2.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" /> Confirm
                            </Button>
                          )}
                          {apt.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setReschedulingApt(apt);
                                setNewDate(apt.date);
                                setNewTime(apt.time);
                              }}
                              className="h-8 px-2.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reschedule
                            </Button>
                          )}
                          {apt.status !== "cancelled" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setCancellingApt(apt)}
                              className="h-8 px-2.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRestoreAppointment(apt.id)}
                              className="h-8 px-2.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reopen
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CANCELLATIONS TAB                                     */}
      {/* ======================================================== */}
      {activeTab === "cancellations" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-white">Cancellation Ledger</span>
              <p className="text-white/40">Audit cancelled slots and optionally reopen them for clients.</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-mono text-[11px] border border-rose-500/25">
              {cancellationsList?.length || 0} Cancelled Records
            </span>
          </div>

          {cancLoading ? (
            <TableSkeleton rows={4} />
          ) : !cancellationsList || cancellationsList.length === 0 ? (
            <EmptyState
              icon={CalendarX}
              title="No cancellations"
              description="No cancelled appointments found for your business."
            />
          ) : (
            <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0c0e14]/90">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.04] border-b border-white/10 text-white/50 uppercase font-mono">
                  <tr>
                    <th className="px-4 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">Original Slot</th>
                    <th className="px-4 py-3.5">Service</th>
                    <th className="px-4 py-3.5">Reason / Notes</th>
                    <th className="px-4 py-3.5 text-right">Admin Recovery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cancellationsList.map((apt) => (
                    <tr key={apt.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3.5 font-medium text-white">
                        <div>{apt.customer_name}</div>
                        <div className="text-[11px] text-white/40 font-mono">{apt.customer_phone}</div>
                      </td>
                      <td className="px-4 py-3.5 text-white/70">
                        {apt.date} at {apt.time}
                      </td>
                      <td className="px-4 py-3.5 text-white/70">{apt.service}</td>
                      <td className="px-4 py-3.5 text-rose-300/80 italic max-w-[280px]">
                        {apt.notes || "No cancellation note provided"}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleRestoreAppointment(apt.id)}
                          className="h-8 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore Slot
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. RESCHEDULING AUDIT CONSOLE                            */}
      {/* ======================================================== */}
      {activeTab === "rescheduling" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-white">Rescheduling Console</span>
              <p className="text-white/40">Select an appointment below to update booking slot with audit trail.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointments
              .filter((a) => a.status !== "cancelled")
              .slice(0, 8)
              .map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 rounded-2xl bg-[#0c0e14]/90 border border-white/10 hover:border-emerald-500/40 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{apt.customer_name}</div>
                      <div className="text-[11px] text-white/50">{apt.customer_phone}</div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70 uppercase">
                      {apt.status}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs space-y-1">
                    <div className="text-white/40 text-[10px] uppercase font-mono">Current Slot</div>
                    <div className="font-semibold text-white">
                      {apt.date} ({apt.day_of_week}) at {apt.time}
                    </div>
                    <div className="text-white/60 text-[11px]">{apt.service}</div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setReschedulingApt(apt);
                      setNewDate(apt.date);
                      setNewTime(apt.time);
                    }}
                    className="w-full bg-white/5 hover:bg-emerald-500 hover:text-white border border-white/10 text-xs transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Reschedule This Booking
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. VOICE RECORDINGS TAB                                  */}
      {/* ======================================================== */}
      {activeTab === "recordings" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-white">Authorized Voice Recordings</span>
              <p className="text-white/40">Encrypted call recordings and transcripts strictly isolated to your business.</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[11px] border border-emerald-500/25">
              Tenant Isolated
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calls List */}
            <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {callsLoading ? (
                <TableSkeleton rows={4} />
              ) : calls.length === 0 ? (
                <EmptyState icon={PhoneCall} title="No calls found" description="No calls recorded yet." />
              ) : (
                calls.map((call) => (
                  <button
                    key={call.id}
                    type="button"
                    onClick={() => setSelectedCall(call)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                      selectedCall?.id === call.id
                        ? "bg-emerald-500/10 border-emerald-500/50 shadow-glow-emerald"
                        : "bg-[#0c0e14]/80 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white truncate max-w-[140px]">
                        {call.customer_name}
                      </span>
                      <span className="text-[10px] text-white/40 font-mono">
                        {formatDuration(call.duration_seconds)}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/50 mt-1">{call.agent_name}</div>
                    <div className="text-[10px] text-white/40 mt-1">{formatDateTime(call.date_time)}</div>
                  </button>
                ))
              )}
            </div>

            {/* Selected Recording Player & Transcript */}
            <div className="lg:col-span-2 p-5 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-4">
              {selectedCall ? (
                <>
                  <div className="border-b border-white/10 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase text-emerald-400 font-bold">
                        {selectedCall.direction} • {selectedCall.status}
                      </span>
                      <span className="text-xs text-white/40">{formatDateTime(selectedCall.date_time)}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">{selectedCall.customer_name}</h3>
                    <p className="text-xs text-white/50">{selectedCall.customer_phone} • Agent: {selectedCall.agent_name}</p>
                  </div>

                  {/* Audio Player */}
                  {selectedCall.has_recording ? (
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                          Audio Playback
                        </span>
                        <a
                          href={selectedCall.recording_url}
                          download={`call-${selectedCall.id}.ogg`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      </div>
                      <audio controls className="w-full mt-2" src={selectedCall.recording_url}>
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-white/40 text-center">
                      No voice recording captured for this call.
                    </div>
                  )}

                  {/* Summary */}
                  {selectedCall.summary && (
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs">
                      <div className="text-[10px] font-mono uppercase text-emerald-400 font-semibold mb-1">
                        AI Call Summary
                      </div>
                      <p className="text-white/80 leading-relaxed">{selectedCall.summary}</p>
                    </div>
                  )}

                  {/* Transcript */}
                  {selectedCall.transcript && selectedCall.transcript.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-white/70">Conversation Transcript</div>
                      <div className="max-h-56 overflow-y-auto space-y-2 p-3 rounded-2xl bg-black/30 border border-white/10 text-xs">
                        {selectedCall.transcript.map((line, idx) => (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-xl border ${
                              line.speaker.includes("AI") || line.speaker.includes("Aria")
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200 ml-4"
                                : "bg-white/[0.04] border-white/10 text-white/90 mr-4"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] opacity-70 mb-1">
                              <span className="font-bold">{line.speaker}</span>
                              <span>{line.time}</span>
                            </div>
                            <p className="leading-relaxed">{line.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center text-xs text-white/40">
                  <Volume2 className="w-8 h-8 text-white/20 mb-2" />
                  Select a call on the left to play audio and view transcript.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. AI AGENT CONTROL TAB                                  */}
      {/* ======================================================== */}
      {activeTab === "agents" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-white">AI Agent Controls</span>
              <p className="text-white/40">Activate or deactivate autonomous conversational voice agents for incoming/outgoing calls.</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[11px] border border-emerald-500/25">
              Live State
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentsLoading ? (
              <TableSkeleton rows={3} />
            ) : agents.length === 0 ? (
              <EmptyState icon={Bot} title="No AI agents" description="No agents configured." />
            ) : (
              agents.map((agent) => {
                const isActive = agent.status === "active";
                return (
                  <div
                    key={agent.id}
                    className="p-5 rounded-3xl bg-[#0c0e14]/90 border border-white/10 flex flex-col justify-between space-y-4 shadow-xl"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <Bot className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{agent.name}</div>
                            <div className="text-[11px] text-white/40 font-mono">{agent.phone_number}</div>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                            isActive
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-glow-emerald"
                              : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          ● {isActive ? "ACTIVE" : "OFFLINE"}
                        </span>
                      </div>

                      <p className="text-xs text-white/60 mt-3 line-clamp-2 leading-relaxed">
                        {agent.description || "Voice receptionist agent."}
                      </p>

                      <div className="mt-3 p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-white/50 space-y-1">
                        <div>
                          <span className="text-white/30">Assigned Business:</span>{" "}
                          <span className="text-white/80">{businessProfile?.business_name || "TalkAor"}</span>
                        </div>
                        <div>
                          <span className="text-white/30">Provider:</span>{" "}
                          <span className="text-white/80">{agent.provider}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => setAgentToToggle(agent)}
                      className={`w-full font-semibold gap-2 transition-all ${
                        isActive
                          ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30"
                          : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-glow-emerald"
                      }`}
                    >
                      <Power className="w-4 h-4" />
                      {isActive ? "Turn OFF" : "Turn ON"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. BUSINESS PROFILE TAB                                  */}
      {/* ======================================================== */}
      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="space-y-6 max-w-3xl">
          <div className="p-5 rounded-3xl bg-[#0c0e14]/90 border border-white/10 space-y-4 shadow-xl">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Organization Profile</h3>
                <p className="text-xs text-white/40">Only authorized Business Administrators can modify these settings.</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                {businessProfile?.plan || "PRO"} Plan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">Business Name</label>
                <Input value={bizName} onChange={(e) => setBizName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">Phone Number</label>
                <Input value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">Contact Email (Read-Only)</label>
                <Input value={bizEmail} disabled className="opacity-60 cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">Timezone</label>
                <Select value={bizTimezone} onChange={(e) => setBizTimezone(e.target.value)}>
                  <option value="America/Los_Angeles">Pacific Time (PT) - America/Los_Angeles</option>
                  <option value="America/New_York">Eastern Time (ET) - America/New_York</option>
                  <option value="Asia/Kolkata">India Standard Time (IST) - Asia/Kolkata</option>
                  <option value="Europe/London">Greenwich Mean Time (GMT) - Europe/London</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Physical Address</label>
              <Input value={bizAddress} onChange={(e) => setBizAddress(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Working Hours</label>
              <Input value={bizWorkingHours} onChange={(e) => setBizWorkingHours(e.target.value)} placeholder="e.g. Mon - Fri: 9:00 AM - 7:00 PM" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70">Business Description</label>
              <textarea
                value={bizDescription}
                onChange={(e) => setBizDescription(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>

            <Button
              type="submit"
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-glow-emerald font-semibold gap-1.5"
            >
              <Save className="w-4 h-4" /> Save Business Profile
            </Button>
          </div>
        </form>
      )}

      {/* CONFIRMATION DIALOG: CANCEL APPOINTMENT */}
      <Dialog open={!!cancellingApt} onOpenChange={() => setCancellingApt(null)}>
        <DialogContent className="sm:max-w-[420px] bg-[#0c0e14] border border-white/10 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Cancel Appointment
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50">
              Are you sure you want to cancel the booking for {cancellingApt?.customer_name}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 my-3">
            <label className="text-xs font-medium text-white/80">Cancellation Reason</label>
            <Input
              placeholder="e.g. Client requested emergency rescheduling"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>

          <DialogFooter className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancellingApt(null)}>
              Dismiss
            </Button>
            <Button
              onClick={handleExecuteCancel}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG: RESCHEDULE APPOINTMENT */}
      <Dialog open={!!reschedulingApt} onOpenChange={() => setReschedulingApt(null)}>
        <DialogContent className="sm:max-w-[460px] bg-[#0c0e14] border border-white/10 text-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              Reschedule Appointment
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50">
              Select the updated appointment date and slot.
            </DialogDescription>
          </DialogHeader>

          {reschedulingApt && (
            <div className="space-y-4 my-2">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                <div>
                  <span className="text-white/40 block">Previous Slot</span>
                  <span className="font-semibold text-rose-300">
                    {reschedulingApt.date} at {reschedulingApt.time}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-white/40" />
                <div>
                  <span className="text-white/40 block">New Slot</span>
                  <span className="font-semibold text-emerald-400">
                    {newDate || "YYYY-MM-DD"} at {newTime || "HH:MM"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/80">New Date</label>
                  <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/80">New Time</label>
                  <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/80">Reschedule Note (Audit)</label>
                <Input
                  placeholder="e.g. Client requested flight adjustment"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setReschedulingApt(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleExecuteReschedule}
              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-glow-emerald"
            >
              Confirm New Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG: TOGGLE AI AGENT ON/OFF (Requirement #5) */}
      <ConfirmDialog
        open={!!agentToToggle}
        onOpenChange={() => setAgentToToggle(null)}
        title={
          agentToToggle?.status === "active"
            ? "Are you sure you want to turn this AI agent off?"
            : "Turn ON AI Agent?"
        }
        description={
          agentToToggle?.status === "active"
            ? "Turning off this agent may prevent incoming/outgoing calls for your business."
            : "Activating this agent will allow it to answer incoming customer telephony calls."
        }
        confirmText={agentToToggle?.status === "active" ? "Turn OFF" : "Turn ON"}
        variant={agentToToggle?.status === "active" ? "destructive" : "default"}
        onConfirm={handleExecuteToggleAgent}
      />
    </div>
  );
}
