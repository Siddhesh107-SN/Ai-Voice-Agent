import React from "react";
import { LucideIcon, PlusCircle, SearchX } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border border-white/10 bg-[rgba(12,12,16,0.5)] backdrop-blur-2xl my-4">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 shadow-glow-emerald">
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-white/50 max-w-sm">{description}</p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {actionLabel && onAction && (
            <Button onClick={onAction} className="shadow-glow-emerald">
              <PlusCircle className="w-4 h-4 mr-2" />
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
