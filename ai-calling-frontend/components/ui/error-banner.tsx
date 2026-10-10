import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./button";

interface ErrorBannerProps {
  message?: string;
  errorCode?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorBanner({
  message = "An error occurred while loading data.",
  errorCode,
  onRetry,
  className = "",
}: ErrorBannerProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-white backdrop-blur-md ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5 sm:mt-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-rose-200">Action Required</h4>
          <p className="text-sm text-white/80 mt-0.5">{message}</p>
          {errorCode && (
            <span className="inline-block mt-1 font-mono text-[11px] text-rose-300/60 uppercase">
              Ref: {errorCode}
            </span>
          )}
        </div>
      </div>

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-rose-500/30 text-rose-200 hover:bg-rose-500/20 shrink-0 self-end sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Try Again
        </Button>
      )}
    </div>
  );
}
