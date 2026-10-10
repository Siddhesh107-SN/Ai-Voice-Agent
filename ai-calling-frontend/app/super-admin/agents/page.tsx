"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { superAdminApi } from "@/lib/api/super-admin";
import { PlatformAgent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bot,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Radio,
  Eye,
  Activity,
  Phone,
  Languages,
  Clock,
  Sparkles,
} from "lucide-react";

export default function PlatformAgentsPage() {
  const [businessFilter, setBusinessFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["super-admin-agents", businessFilter, statusFilter, healthFilter, languageFilter],
    queryFn: () =>
      superAdminApi.getAgents({
        business: businessFilter !== "all" ? businessFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        health: healthFilter !== "all" ? healthFilter : undefined,
        language: languageFilter || undefined,
      }),
  });

  const summary = data?.summary || { total_agents: 0, active: 0, inactive: 0, error: 0, offline: 0 };
  const agents: PlatformAgent[] = data?.data || [];

  const [selectedAgent, setSelectedAgent] = useState<PlatformAgent | null>(null);

  const getHealthBadge = (health: string) => {
    switch (health) {
      case "HEALTHY":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
      case "DEGRADED":
        return "bg-amber-500/15 text-amber-300 border-amber-500/25";
      case "UNHEALTHY":
        return "bg-rose-500/15 text-rose-300 border-rose-500/25 font-bold";
      default:
        return "bg-white/5 text-white/50 border-white/10";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Platform AI Agent Fleet</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              Global Health
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Real-time status, language proficiencies, and neural performance of all AI voice agents across all businesses.
          </p>
        </div>
      </div>

      {/* Platform Level Summary Cards (Requirement #4) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#0c0e14]/90 border border-white/10 text-center">
          <span className="text-[10px] uppercase font-mono text-white/40 block font-semibold">Total Agents</span>
          <span className="text-2xl font-bold text-white font-mono">{summary.total_agents}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#0c0e14]/90 border border-white/10 text-center">
          <span className="text-[10px] uppercase font-mono text-emerald-400 block font-semibold">Active</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono">{summary.active}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#0c0e14]/90 border border-white/10 text-center">
          <span className="text-[10px] uppercase font-mono text-white/50 block font-semibold">Inactive</span>
          <span className="text-2xl font-bold text-white/70 font-mono">{summary.inactive}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#0c0e14]/90 border border-white/10 text-center">
          <span className="text-[10px] uppercase font-mono text-rose-400 block font-semibold">Error</span>
          <span className="text-2xl font-bold text-rose-400 font-mono">{summary.error}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#0c0e14]/90 border border-white/10 text-center col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-mono text-amber-400 block font-semibold">Offline</span>
          <span className="text-2xl font-bold text-amber-400 font-mono">{summary.offline}</span>
        </div>
      </div>

      {/* Filters Bar: Business, Status, Health, Language */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-2xl bg-[#0c0e14]/80 border border-white/10">
        <div className="w-full sm:w-48">
          <Select value={businessFilter} onChange={(e) => setBusinessFilter(e.target.value)}>
            <option value="all">All Businesses</option>
            <option value="TalkAor Voice Wellness">TalkAor Wellness</option>
            <option value="The Grooming Factory">The Grooming Factory</option>
            <option value="Apex Dental">Apex Dental</option>
          </Select>
        </div>

        <div className="w-full sm:w-36">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>

        <div className="w-full sm:w-36">
          <Select value={healthFilter} onChange={(e) => setHealthFilter(e.target.value)}>
            <option value="all">All Health</option>
            <option value="HEALTHY">Healthy</option>
            <option value="DEGRADED">Degraded</option>
            <option value="UNHEALTHY">Unhealthy</option>
          </Select>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Filter by language (e.g. Hindi, English, Spanish)..."
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="pl-10 h-10 border-white/10 bg-white/[0.03]"
          />
        </div>
      </div>

      {/* Agents Table */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : agents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No agents found"
          description="Try broadening your filter criteria."
        />
      ) : (
        <div className="rounded-3xl border border-white/10 overflow-hidden bg-[#0c0e14]/90 backdrop-blur-xl shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] border-b border-white/10 text-white/50 uppercase font-mono tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Agent Name</th>
                  <th className="px-4 py-3.5">Assigned Business</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Phone Number</th>
                  <th className="px-4 py-3.5">Language</th>
                  <th className="px-4 py-3.5">Last Active</th>
                  <th className="px-4 py-3.5">Total Calls</th>
                  <th className="px-4 py-3.5">Health</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white flex items-center gap-2">
                        <Bot className="w-4 h-4 text-emerald-400" />
                        {agent.name}
                      </div>
                      <div className="text-[10px] text-white/40 font-mono mt-0.5">{agent.provider}</div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-white/90">
                      {agent.business_name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          agent.status === "active"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-white/5 text-white/50 border-white/10"
                        }`}
                      >
                        ● {agent.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-white/80">
                      {agent.phone_number}
                    </td>
                    <td className="px-4 py-3.5 text-white/70 max-w-[150px] truncate">
                      {agent.language}
                    </td>
                    <td className="px-4 py-3.5 text-white/50 font-mono text-[11px]">
                      {agent.last_active}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-white font-semibold">
                      {new Intl.NumberFormat().format(agent.total_calls ?? 0)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${getHealthBadge(
                          agent.health
                        )}`}
                      >
                        {agent.health}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedAgent(agent)}
                        className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Agent Detail Modal */}
      <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
        <DialogContent className="sm:max-w-[540px] bg-[#0c0e14]/95 backdrop-blur-2xl border border-white/10 text-white rounded-3xl p-6 shadow-2xl">
          {selectedAgent && (
            <div className="space-y-4">
              <DialogHeader className="border-b border-white/10 pb-3 text-left">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${getHealthBadge(
                      selectedAgent.health
                    )}`}
                  >
                    {selectedAgent.health} • {selectedAgent.status}
                  </span>
                  <span className="text-xs text-white/40 font-mono">
                    ID: {selectedAgent.id}
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold text-white mt-2 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-emerald-400" />
                  {selectedAgent.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-white/50">
                  Assigned Tenant: {selectedAgent.business_name}
                </DialogDescription>
              </DialogHeader>

              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 text-xs space-y-2">
                <div>
                  <span className="text-white/40 block text-[10px] uppercase font-mono">Description</span>
                  <p className="text-white/80">{selectedAgent.description || "Voice concierge agent."}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-white/70">
                  <div>
                    <span className="text-white/40 text-[10px] block font-mono uppercase">Telephony Number</span>
                    <span className="font-mono text-emerald-400">{selectedAgent.phone_number}</span>
                  </div>
                  <div>
                    <span className="text-white/40 text-[10px] block font-mono uppercase">Language Model</span>
                    <span>{selectedAgent.language}</span>
                  </div>
                </div>
              </div>

              {selectedAgent.configuration && (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-white/70">Agent Runtime Config</div>
                  <pre className="p-3 rounded-2xl bg-black/60 border border-white/10 text-[11px] font-mono text-emerald-300/80 overflow-x-auto max-h-40">
                    {JSON.stringify(selectedAgent.configuration, null, 2)}
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
