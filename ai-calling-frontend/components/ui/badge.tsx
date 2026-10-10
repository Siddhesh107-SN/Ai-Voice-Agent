import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
        secondary:
          "border border-white/10 bg-white/5 text-white/80",
        destructive:
          "border border-rose-500/30 bg-rose-500/15 text-rose-400",
        outline: "border border-white/20 text-white/70",
        success:
          "border border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
        warning:
          "border border-amber-500/30 bg-amber-500/15 text-amber-400",
        info:
          "border border-cyan-500/30 bg-cyan-500/15 text-cyan-400",
        purple:
          "border border-purple-500/30 bg-purple-500/15 text-purple-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export function AppointmentStatusBadge({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case "confirmed":
      return <Badge variant="success">Confirmed</Badge>;
    case "scheduled":
      return <Badge variant="default">Scheduled</Badge>;
    case "rescheduled":
      return <Badge variant="warning">Rescheduled</Badge>;
    case "completed":
      return <Badge variant="info">Completed</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export { Badge, badgeVariants };
