"use client";

import React from "react";
import { motion } from "framer-motion";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  subtitle?: string;
  accentColor?: "emerald" | "amber" | "sky" | "rose" | "purple" | "orange";
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel = "vs last week",
  icon: Icon,
  subtitle,
  accentColor = "emerald",
  className,
}: StatsCardProps) {
  const isPositive = change === undefined || change >= 0;

  const accentStyles = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-glow-emerald",
    orange: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-3xl bg-[rgba(12,12,16,0.65)] p-5 sm:p-6 border border-white/10 backdrop-blur-2xl shadow-glass hover:border-emerald-500/40 transition-all select-none relative overflow-hidden group",
        className
      )}
    >
      {/* Subtle emerald background glow on hover */}
      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-white/[0.02] group-hover:bg-emerald-500/[0.08] transition-all blur-xl pointer-events-none" />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-white/60 tracking-tight">{title}</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{value}</h2>

          {change !== undefined && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs">
              <span
                className={cn(
                  "flex items-center font-semibold",
                  isPositive ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {Math.abs(change)}%
              </span>
              <span className="text-white/40">{changeLabel}</span>
            </div>
          )}

          {subtitle && (
            <p className="mt-2 text-xs text-white/40">{subtitle}</p>
          )}
        </div>

        <div
          className={cn(
            "p-3 rounded-2xl border shrink-0 transition-transform group-hover:scale-110",
            accentStyles[accentColor]
          )}
        >
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
    </motion.div>
  );
}
