"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { superAdminApi } from "@/lib/api/super-admin";
import { PlatformAuditLog, AuditLogLevel } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Activity,
  Search,
  Filter,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Terminal,
  Server,
  Code,
  Shield,
  Layers,
} from "lucide-react";

export default function LogsMonitoringPage() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [businessFilter, setBusinessFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["super-admin-logs", search, levelFilter, serviceFilter, businessFilter, page],
    queryFn: () =>
      superAdminApi.getLogs({
        search: search || undefined,
        level: levelFilter !== "all" ? levelFilter : undefined,
        service: serviceFilter !== "all" ? serviceFilter : undefined,
        business: businessFilter !== "all" ? businessFilter : undefined,
        page,
        limit,
      }),
  });

  const logs: PlatformAuditLog[] = data?.data || [];
  const pagination = data?.pagination;

  const [selectedLog, setSelectedLog] = useState<PlatformAuditLog | null>(null);

  const getLevelBadge = (level: AuditLogLevel | string) => {
    switch (level) {
      case "CRITICAL":
        return "bg-rose-600/20 text-rose-300 border-rose-600/30 font-bold";
      case "ERROR":
        return "bg-rose-500/20 text-rose-400 border-rose-500/30 font-semibold";
      case "WARNING":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30 font-semibold";
      default:
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Platform Logs & Monitoring</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-purple-500/15 text-purple-300 border border-purple-500/25">
              {pagination?.total || logs.length} Records
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Centralized telemetry ledger, security events, authentication records, and service-level diagnostics.
          </p>
        </div>
      </div>

      {/* Filters Bar: Search, Level, Service, Business */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-3.5 rounded-2xl bg-[#0c0e14]/80 border border-white/10">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search events, details, user names, or tenants..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 h-10 border-white/10 bg-white/[0.03]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Level Filter */}
          <div className="w-32">
            <Select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Levels</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
            </Select>
          </div>

          {/* Service Filter */}
          <div className="w-40">
            <Select
              value={serviceFilter}
              onChange={(e) => {
                setServiceFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Services</option>
              <option value="Authentication">Auth Service</option>
              <option value="Voice Agent">Voice Agent</option>
              <option value="Appointment Service">Appointment Service</option>
              <option value="Access Control">Access Control</option>
              <option value="Platform Core">Platform Core</option>
              <option value="Database">Database</option>
            </Select>
          </div>

          {/* Business Filter */}
          <div className="w-48">
            <Select
              value={businessFilter}
              onChange={(e) => {
                setBusinessFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Businesses</option>
              <option value="TalkAor Voice Wellness">TalkAor Wellness</option>
              <option value="The Grooming Factory">The Grooming Factory</option>
              <option value="Apex Dental">Apex Dental</option>
              <option value="platform-system">Platform System</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No logs found"
          description="No event records match your current filter settings."
        />
      ) : (
        <div className="rounded-3xl border border-white/10 overflow-hidden bg-[#0c0e14]/90 backdrop-blur-xl shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] border-b border-white/10 text-white/50 uppercase font-mono tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Level</th>
                  <th className="px-4 py-3.5">Service</th>
                  <th className="px-4 py-3.5">Business</th>
                  <th className="px-4 py-3.5">User / Actor</th>
                  <th className="px-4 py-3.5">Event</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-white/[0.03] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3.5 font-mono text-white/50 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase border ${getLevelBadge(
                          log.level
                        )}`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-white/70 whitespace-nowrap">
                      {log.service}
                    </td>
                    <td className="px-4 py-3.5 text-white/90 font-medium max-w-[160px] truncate">
                      {log.business_name}
                    </td>
                    <td className="px-4 py-3.5 text-white/70">
                      <div>{log.user_name}</div>
                      <div className="text-[10px] text-white/40 font-mono">{log.role}</div>
                    </td>
                    <td className="px-4 py-3.5 text-white font-semibold max-w-[180px] truncate">
                      {log.event}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                            : "bg-rose-500/15 text-rose-400 border-rose-500/25"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="h-7 px-2 text-xs text-white/60 hover:text-white hover:bg-white/5"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1 text-purple-400" />
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.total_pages > 1 && (
            <div className="p-4 border-t border-white/10 flex justify-center">
              <Pagination
                pagination={pagination}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Log Details Modal / Drawer */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[640px] bg-[#0c0e14]/95 backdrop-blur-2xl border border-white/10 text-white rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
          {selectedLog && (
            <div className="space-y-4">
              <DialogHeader className="border-b border-white/10 pb-4 text-left">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase border ${getLevelBadge(
                      selectedLog.level
                    )}`}
                  >
                    {selectedLog.level} • {selectedLog.status}
                  </span>
                  <span className="text-xs text-white/40 font-mono">
                    {selectedLog.timestamp}
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold text-white mt-2">
                  {selectedLog.event}
                </DialogTitle>
                <DialogDescription className="text-xs text-white/50">
                  Service: {selectedLog.service} • Tenant: {selectedLog.business_name}
                </DialogDescription>
              </DialogHeader>

              {/* Event Details Text */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs space-y-1">
                <div className="text-[10px] uppercase font-mono text-white/40 font-semibold">
                  Event Description
                </div>
                <p className="text-white/90 leading-relaxed font-sans">{selectedLog.details}</p>
              </div>

              {/* Telemetry Fields */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-xs grid grid-cols-2 gap-3">
                <div>
                  <span className="text-white/30 text-[10px] block uppercase font-mono">Request ID</span>
                  <span className="font-mono text-purple-300">{selectedLog.request_id || "req-sys-001"}</span>
                </div>
                <div>
                  <span className="text-white/30 text-[10px] block uppercase font-mono">HTTP Method & Status</span>
                  <span className="font-mono text-white">
                    {selectedLog.http_method || "POST"} {selectedLog.status_code || 200}
                  </span>
                </div>
                <div>
                  <span className="text-white/30 text-[10px] block uppercase font-mono">Endpoint</span>
                  <span className="font-mono text-white/80">{selectedLog.endpoint || "/api/v1/..."}</span>
                </div>
                <div>
                  <span className="text-white/30 text-[10px] block uppercase font-mono">User & Role</span>
                  <span className="text-white">
                    {selectedLog.user_name} ({selectedLog.role})
                  </span>
                </div>
              </div>

              {/* Error Message if present */}
              {selectedLog.error_message && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs space-y-1">
                  <div className="text-rose-400 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Error Diagnostic
                  </div>
                  <p className="text-rose-200/90 font-mono text-[11px]">{selectedLog.error_message}</p>
                </div>
              )}

              {/* Stack Trace if present */}
              {selectedLog.stack_trace && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-rose-400" /> Stack Trace
                  </div>
                  <pre className="p-3 rounded-2xl bg-black/60 border border-rose-500/20 text-[11px] font-mono text-rose-300/80 overflow-x-auto max-h-48 leading-relaxed">
                    {selectedLog.stack_trace}
                  </pre>
                </div>
              )}

              {/* Metadata JSON */}
              {selectedLog.metadata && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-white/70 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-cyan-400" /> Context Metadata
                  </div>
                  <pre className="p-3 rounded-2xl bg-black/60 border border-white/10 text-[11px] font-mono text-cyan-300/80 overflow-x-auto max-h-40">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
