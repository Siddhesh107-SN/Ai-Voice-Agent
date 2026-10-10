"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { callsApi } from "@/lib/api/calls";
import { useAuth } from "@/lib/auth/auth-context";
import { Call, CallDirection, CallStatus } from "@/lib/types";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  FileText,
  Play,
  Volume2,
  Clock,
  User,
  Bot,
  ShieldAlert,
  Headphones,
  CheckCircle,
} from "lucide-react";

export default function CallsPage() {
  const { isAdmin, role } = useAuth(); // CLIENT_ADMIN sees transcript & recording; CLIENT_STAFF restricted (Req #24)

  const [customerQuery, setCustomerQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Active call detail modal
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

  const {
    data: callsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["calls", customerQuery, directionFilter, statusFilter, page],
    queryFn: () =>
      callsApi.getCalls({
        customer: customerQuery || undefined,
        direction: directionFilter !== "all" ? directionFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        page,
        limit: 10,
      }),
  });

  const calls = callsData?.data || [];
  const pagination = callsData?.pagination;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Voice Call Logs
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              {pagination?.total || 0} Total Calls
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Real-time telephony feed, conversational transcripts, and agent session metrics.
          </p>
        </div>

        {/* Security Access Pill */}
        <div className="px-3 py-1.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs flex items-center gap-2">
          {isAdmin ? (
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Full Audio & Transcript Access
            </span>
          ) : (
            <span className="text-white/60 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Audio/Transcript Restricted to Admin
            </span>
          )}
        </div>
      </div>

      {/* Filters Bar: Search, Direction, Status */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 p-3.5 rounded-2xl bg-[rgba(12,12,16,0.65)] border border-white/10 backdrop-blur-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={customerQuery}
            onChange={(e) => {
              setCustomerQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search caller name or phone..."
            className="pl-10 h-10 border-white/10 bg-white/[0.03]"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="w-36">
            <Select
              value={directionFilter}
              onChange={(e) => {
                setDirectionFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Directions</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </Select>
          </div>

          <div className="w-36">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
              <option value="in_progress">In Progress</option>
              <option value="failed">Failed</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : isError ? (
        <ErrorBanner
          message={(error as any)?.message || "Failed to load call logs."}
          onRetry={() => refetch()}
        />
      ) : calls.length === 0 ? (
        <EmptyState
          icon={PhoneCall}
          title="No Voice Calls Recorded"
          description={
            customerQuery || directionFilter !== "all" || statusFilter !== "all"
              ? "No call logs match the selected filters."
              : "No voice calls have been processed yet."
          }
          secondaryActionLabel="Reset Filters"
          onSecondaryAction={() => {
            setCustomerQuery("");
            setDirectionFilter("all");
            setStatusFilter("all");
            setPage(1);
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[rgba(12,12,16,0.65)] backdrop-blur-2xl shadow-glass">
            <table className="w-full text-left text-sm text-white/80">
              <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-white/40">
                <tr>
                  <th className="py-4 px-4 sm:px-6">Date / Time</th>
                  <th className="py-4 px-4">Direction</th>
                  <th className="py-4 px-4">Customer</th>
                  <th className="py-4 px-4">AI Agent</th>
                  <th className="py-4 px-4">Duration</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {calls.map((call) => (
                  <tr
                    key={call.id}
                    className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    onClick={() => setSelectedCall(call)}
                  >
                    {/* Date / Time */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-semibold text-white">
                        {formatDateTime(call.date_time)}
                      </div>
                      <div className="text-[11px] text-white/40 font-mono">
                        {call.id}
                      </div>
                    </td>

                    {/* Direction */}
                    <td className="py-4 px-4">
                      {call.direction === "inbound" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <PhoneIncoming className="w-3 h-3" />
                          Inbound
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          <PhoneOutgoing className="w-3 h-3" />
                          Outbound
                        </span>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-4">
                      <div className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                        {call.customer_name}
                      </div>
                      <div className="text-xs text-white/40 font-mono">
                        {call.customer_phone}
                      </div>
                    </td>

                    {/* Agent */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <Bot className="w-3.5 h-3.5" />
                        {call.agent_name}
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-4 px-4 text-xs font-mono text-white/80">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-white/40" />
                        {formatDuration(call.duration_seconds)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                          call.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                            : call.status === "missed"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/25"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                        }`}
                      >
                        {call.status}
                      </span>
                    </td>

                    {/* Details Action */}
                    <td className="py-4 px-4 text-right">
                      <Button
                        size="sm"
                        variant="glass"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCall(call);
                        }}
                        className="h-8 px-2.5 text-xs text-emerald-400 hover:text-white"
                      >
                        View Call
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

      {/* Call Detail Modal with Role-Based Redaction (Req #24) */}
      <Dialog
        open={!!selectedCall}
        onOpenChange={(open) => !open && setSelectedCall(null)}
      >
        <DialogContent className="sm:max-w-[620px]">
          {selectedCall && (
            <div>
              <DialogHeader className="border-b border-white/10 pb-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-glow-emerald">
                    {selectedCall.direction} • {selectedCall.status}
                  </span>
                  <span className="text-xs text-white/40">
                    {formatDateTime(selectedCall.date_time)}
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold text-white mt-2">
                  Call Record: {selectedCall.customer_name}
                </DialogTitle>
                <DialogDescription className="text-xs text-white/50">
                  Phone: {selectedCall.customer_phone} • Duration: {formatDuration(selectedCall.duration_seconds)} • Agent: {selectedCall.agent_name}
                </DialogDescription>
              </DialogHeader>

              {/* Call Summary */}
              {selectedCall.summary && (
                <div className="mt-4 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                    AI Conversation Summary
                  </div>
                  <p className="text-white/80 leading-relaxed">
                    {selectedCall.summary}
                  </p>
                </div>
              )}

              {/* Role-Based Audio Recording & Transcript (Req #24) */}
              <div className="mt-4 space-y-4">
                {isAdmin ? (
                  <>
                    {/* Admin: Audio Recording Player */}
                    {selectedCall.has_recording && (
                      <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white flex items-center gap-1.5">
                            <Volume2 className="w-4 h-4 text-emerald-400" />
                            Voice Recording
                          </span>
                          <span className="text-[11px] text-white/40 font-mono">
                            Stereo Telephony Audio
                          </span>
                        </div>
                        <audio
                          controls
                          className="w-full h-9 rounded-lg"
                          src={selectedCall.recording_url || "https://actions.google.com/sounds/v1/telephones/telephone_ring.ogg"}
                        >
                          Your browser does not support audio element.
                        </audio>
                      </div>
                    )}

                    {/* Admin: Full Interactive Transcript */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-white/70">
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-emerald-400" />
                          Full Speech Transcript
                        </span>
                        <span className="text-[10px] text-emerald-400 uppercase font-mono">
                          Verified Transcript
                        </span>
                      </div>

                      {selectedCall.transcript && selectedCall.transcript.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto space-y-2.5 p-3 rounded-2xl bg-black/30 border border-white/10 text-xs">
                          {selectedCall.transcript.map((line, i) => {
                            const isAi = line.speaker.includes("AI") || line.speaker.includes("Aria") || line.speaker.includes("Leo");
                            return (
                              <div
                                key={i}
                                className={`p-2.5 rounded-xl border ${
                                  isAi
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
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-white/40">
                          No audio transcript recorded for this call.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* CLIENT_STAFF Restricted Notice (Req #24: CLIENT_STAFF must NOT see transcript/recording) */
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-amber-300">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      Administrator Access Required
                    </div>
                    <p className="text-white/70">
                      Voice call recordings and speech transcripts are confidential client records restricted to administrators (<span className="font-mono text-emerald-400">CLIENT_ADMIN</span>).
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
