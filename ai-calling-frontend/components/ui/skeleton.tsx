import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-white/[0.06] border border-white/5",
        className
      )}
      {...props}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-3 p-4 bg-white/[0.02] border border-white/10 rounded-2xl">
      <div className="flex gap-4 border-b border-white/10 pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-3 border-b border-white/5 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-6 flex-1 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardStackSkeleton() {
  return (
    <div className="w-full max-w-[820px] mx-auto aspect-[4/5] sm:aspect-[1.75/1] rounded-3xl bg-white/[0.03] border border-white/10 p-8 flex flex-col justify-between animate-pulse">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="space-y-4 my-auto">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4 pt-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="flex justify-between items-center pt-4 border-t border-white/10">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

export { Skeleton };
