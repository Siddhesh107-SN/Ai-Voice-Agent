import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { PaginationMeta } from "@/lib/types";

interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (newPage: number) => void;
  className?: string;
}

export function Pagination({ pagination, onPageChange, className = "" }: PaginationProps) {
  const { page, total_pages, total, limit } = pagination;

  if (total <= 0) return null;

  const startRecord = Math.min((page - 1) * limit + 1, total);
  const endRecord = Math.min(page * limit, total);

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-sm text-white/60 ${className}`}>
      <div>
        Showing <span className="font-medium text-white">{startRecord}</span> to{" "}
        <span className="font-medium text-white">{endRecord}</span> of{" "}
        <span className="font-medium text-white">{total}</span> results
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-8 px-2.5 rounded-lg border-white/10 text-white/80 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Previous
        </Button>

        <div className="flex items-center gap-1 px-1">
          {Array.from({ length: total_pages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === total_pages || Math.abs(p - page) <= 1)
            .map((p, idx, arr) => {
              const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
              return (
                <React.Fragment key={p}>
                  {showEllipsis && <span className="px-1 text-white/30">...</span>}
                  <button
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      p === page
                        ? "bg-emerald-500 text-white shadow-glow-emerald font-semibold"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= total_pages}
          className="h-8 px-2.5 rounded-lg border-white/10 text-white/80 hover:text-white"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
