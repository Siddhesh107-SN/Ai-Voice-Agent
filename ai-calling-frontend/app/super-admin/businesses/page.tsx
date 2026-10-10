"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { superAdminApi } from "@/lib/api/super-admin";
import { PlatformBusiness } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  Search,
  Filter,
  Users,
  Bot,
  PhoneCall,
  CheckCircle2,
  XCircle,
  Eye,
  Settings,
  CircleDollarSign,
  Clock,
  Mail,
  Phone,
  MapPin,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

export default function BusinessUsersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["super-admin-businesses", search, statusFilter, planFilter],
    queryFn: () =>
      superAdminApi.getBusinesses({
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        plan: planFilter !== "all" ? planFilter : undefined,
      }),
  });

  const businesses: PlatformBusiness[] = data?.data || [];

  // Business Detail Modal State
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const { data: businessDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["super-admin-business-detail", selectedBusinessId],
    queryFn: () => (selectedBusinessId ? superAdminApi.getBusiness(selectedBusinessId) : null),
    enabled: !!selectedBusinessId,
  });

  // Toggle Status Confirmation
  const [businessToToggle, setBusinessToToggle] = useState<PlatformBusiness | null>(null);

  const handleExecuteStatusToggle = async () => {
    if (!businessToToggle) return;
    const nextStatus = businessToToggle.status === "active" ? "inactive" : "active";
    try {
      await superAdminApi.updateBusinessStatus(businessToToggle.id, nextStatus);
      toast.success(
        `Business '${businessToToggle.business_name}' status set to ${nextStatus.toUpperCase()}.`
      );
      setBusinessToToggle(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update business status.");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Business Users</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-purple-500/15 text-purple-300 border border-purple-500/25">
              {businesses.length} Tenants
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Global monitoring of all registered customer businesses, agent allocations, and platform activity.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-2xl bg-[#0c0e14]/80 border border-white/10">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search by business name, owner, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 border-white/10 bg-white/[0.03]"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="w-36">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
            </Select>
          </div>

          <div className="w-36">
            <Select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
              <option value="all">All Plans</option>
              <option value="STARTER">Starter</option>
              <option value="PRO">Pro</option>
              <option value="ENTERPRISE">Enterprise</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Businesses Table */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : businesses.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No businesses found"
          description="Try adjusting your search or status filter."
        />
      ) : (
        <div className="rounded-3xl border border-white/10 overflow-hidden bg-[#0c0e14]/90 backdrop-blur-xl shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] border-b border-white/10 text-white/50 uppercase font-mono tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Business</th>
                  <th className="px-4 py-3.5">Owner / Admin</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Plan</th>
                  <th className="px-4 py-3.5">Agents</th>
                  <th className="px-4 py-3.5">Calls</th>
                  <th className="px-4 py-3.5">Revenue</th>
                  <th className="px-4 py-3.5">Last Active</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {businesses.map((biz) => {
                  const isActive = biz.status === "active";
                  return (
                    <tr key={biz.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white text-sm">{biz.business_name}</div>
                        <div className="text-[11px] text-white/40 font-mono mt-0.5">{biz.id}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-white">{biz.owner_name}</div>
                        <div className="text-[11px] text-white/40">{biz.email}</div>
                        <div className="text-[11px] text-white/40 font-mono">{biz.phone}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                            isActive
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          ● {biz.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/5 border border-white/10 text-white/80">
                          {biz.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-white/90">
                        {biz.active_agents ?? 0}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-white/90">
                        {new Intl.NumberFormat().format(biz.total_calls ?? 0)}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-emerald-400 font-semibold">
                        {formatCurrency(biz.revenue ?? 0)}
                      </td>
                      <td className="px-4 py-3.5 text-white/50 text-[11px]">
                        {biz.last_activity}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedBusinessId(biz.id)}
                          className="h-8 px-2.5 text-xs text-white/80 hover:text-white hover:bg-white/5"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-cyan-400" /> View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setBusinessToToggle(biz)}
                          className={`h-8 px-2.5 text-xs ${
                            isActive
                              ? "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                              : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          }`}
                        >
                          {isActive ? "Disable" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Business Details Modal */}
      <Dialog open={!!selectedBusinessId} onOpenChange={() => setSelectedBusinessId(null)}>
        <DialogContent className="sm:max-w-[680px] bg-[#0c0e14]/95 backdrop-blur-2xl border border-white/10 text-white rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
          {detailLoading ? (
            <div className="space-y-4 py-8">
              <TableSkeleton rows={3} />
            </div>
          ) : businessDetail ? (
            <div className="space-y-5">
              <DialogHeader className="border-b border-white/10 pb-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase font-bold">
                    {businessDetail.plan} Plan • {businessDetail.status}
                  </span>
                  <span className="text-xs text-white/40 font-mono">
                    ID: {businessDetail.id}
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold text-white mt-2">
                  {businessDetail.business_name}
                </DialogTitle>
                <DialogDescription className="text-xs text-white/50">
                  {businessDetail.description || "Registered business tenant on TalkAor."}
                </DialogDescription>
              </DialogHeader>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                  <span className="text-[10px] font-mono uppercase text-white/40 block">Total Calls</span>
                  <span className="text-lg font-bold text-white font-mono">
                    {new Intl.NumberFormat().format(businessDetail.total_calls ?? 0)}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                  <span className="text-[10px] font-mono uppercase text-white/40 block">Total Revenue</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {formatCurrency(businessDetail.revenue ?? 0)}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
                  <span className="text-[10px] font-mono uppercase text-white/40 block">Active Agents</span>
                  <span className="text-lg font-bold text-cyan-400 font-mono">
                    {businessDetail.active_agents ?? 0}
                  </span>
                </div>
              </div>

              {/* Organization Contact Details */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-xs">
                <div className="font-semibold text-white/80 uppercase font-mono text-[10px]">
                  Contact & Location
                </div>
                <div className="grid grid-cols-2 gap-2 text-white/70">
                  <div>
                    <span className="text-white/30 block">Owner / Admin:</span>
                    <span className="font-medium text-white">{businessDetail.owner_name}</span>
                  </div>
                  <div>
                    <span className="text-white/30 block">Email:</span>
                    <span>{businessDetail.email}</span>
                  </div>
                  <div>
                    <span className="text-white/30 block">Phone:</span>
                    <span className="font-mono">{businessDetail.phone}</span>
                  </div>
                  <div>
                    <span className="text-white/30 block">Timezone:</span>
                    <span>{businessDetail.timezone || "America/Los_Angeles"}</span>
                  </div>
                </div>
                {businessDetail.address && (
                  <div className="pt-2 text-white/60">
                    <span className="text-white/30 block">Address:</span>
                    {businessDetail.address}
                  </div>
                )}
              </div>

              {/* Associated AI Agents */}
              {businessDetail.agents && businessDetail.agents.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-white/70">Configured AI Agents</div>
                  <div className="space-y-1.5">
                    {businessDetail.agents.map((ag: any) => (
                      <div
                        key={ag.id}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-white">{ag.name}</span>
                          <span className="text-white/40 font-mono text-[11px] ml-2">{ag.phone_number}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                            ag.status === "active"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {ag.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Registered Users */}
              {businessDetail.users && businessDetail.users.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-white/70">Staff & Administrators</div>
                  <div className="space-y-1.5">
                    {businessDetail.users.map((u: any) => (
                      <div
                        key={u.id}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-white">{u.name}</span>
                          <span className="text-white/40 text-[11px] ml-2">({u.email})</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/5 text-white/70 border border-white/10 uppercase">
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Activate / Disable Business */}
      <ConfirmDialog
        open={!!businessToToggle}
        onOpenChange={() => setBusinessToToggle(null)}
        title={
          businessToToggle?.status === "active"
            ? `Disable ${businessToToggle?.business_name}?`
            : `Activate ${businessToToggle?.business_name}?`
        }
        description={
          businessToToggle?.status === "active"
            ? "Disabling this business will suspend telephony agent processing and admin dashboard access for their staff."
            : "Activating this business will restore their access and voice agent calling pipeline."
        }
        confirmText={businessToToggle?.status === "active" ? "Disable Business" : "Activate Business"}
        variant={businessToToggle?.status === "active" ? "destructive" : "default"}
        onConfirm={handleExecuteStatusToggle}
      />
    </div>
  );
}
