"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cancellationsApi } from "@/lib/api/cancellations";
import { formatDate, formatDateTime, formatTime } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  CalendarX,
  Search,
  Bot,
  User,
  Clock,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function CancellationsPage() {
  const [customerSearch, setCustomerSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [page, setPage] = useState(1);

  const {
    data: cancellationsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["cancellations", customerSearch, sourceFilter, page],
    queryFn: () =>
      cancellationsApi.getCancellations({
        customer: customerSearch || undefined,
        source: sourceFilter !== "all" ? sourceFilter : undefined,
        page,
        limit: 10,
      }),
  });

  const cancellations = cancellationsData?.data || [];
  const pagination = cancellationsData?.pagination;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Cancellations Log
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-rose-500/15 text-rose-400 border border-rose-500/25">
              {pagination?.total || 0} Total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Historical audit log of appointment cancellations initiated by clients or voice agents.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-white/60">
          Read-Only Audit Ledger
        </div>
      </div>

      {/* Filters Bar: Search & Source Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-2xl bg-[#141620]/80 border border-white/10 backdrop-blur-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by customer name or phone..."
            className="pl-10 h-10 border-white/10 bg-white/[0.03]"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Sources</option>
            <option value="ai_agent">AI Voice Agent</option>
            <option value="user">Staff / User</option>
          </Select>
        </div>
      </div>

      {/* Table / Skeleton / Empty state */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : isError ? (
        <ErrorBanner
          message={(error as any)?.message || "Failed to load cancellations."}
          onRetry={() => refetch()}
        />
      ) : cancellations.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="No Cancellations Recorded"
          description={
            customerSearch || sourceFilter !== "all"
              ? "No records match your cancellation filter query."
              : "Great job! There are currently no cancelled appointments."
          }
          secondaryActionLabel="Clear Filters"
          onSecondaryAction={() => {
            setCustomerSearch("");
            setSourceFilter("all");
            setPage(1);
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[rgba(12,12,16,0.65)] backdrop-blur-2xl shadow-glass">
            <table className="w-full text-left text-sm text-white/80">
              <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-white/40">
                <tr>
                  <th className="py-4 px-4 sm:px-6">Customer</th>
                  <th className="py-4 px-4">Original Schedule</th>
                  <th className="py-4 px-4">Cancellation Reason</th>
                  <th className="py-4 px-4">Cancelled By</th>
                  <th className="py-4 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cancellations.map((canc) => {
                  const isAi = canc.cancelled_by === "ai_agent";

                  return (
                    <tr
                      key={canc.id}
                      className="hover:bg-white/[0.03] transition-colors"
                    >
                      {/* Customer */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-semibold text-white">
                          {canc.customer_name}
                        </div>
                        <div className="text-xs text-white/40 font-mono">
                          {canc.customer_phone}
                        </div>
                      </td>

                      {/* Original Date & Time */}
                      <td className="py-4 px-4">
                        <div className="font-medium text-white/90">
                          {formatDate(canc.original_date)}
                        </div>
                        <div className="text-xs text-white/40">
                          {formatTime(canc.original_time)}
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-4 px-4 max-w-sm">
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200">
                          "{canc.reason}"
                        </div>
                      </td>

                      {/* Cancelled By */}
                      <td className="py-4 px-4">
                        {isAi ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <Bot className="w-3.5 h-3.5" />
                            {canc.cancelled_by_name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            <User className="w-3.5 h-3.5" />
                            {canc.cancelled_by_name}
                          </span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-4 px-4 text-right text-xs text-white/50">
                        {formatDateTime(canc.timestamp)}
                      </td>
                    </tr>
                  );
                })}
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
    </div>
  );
}
