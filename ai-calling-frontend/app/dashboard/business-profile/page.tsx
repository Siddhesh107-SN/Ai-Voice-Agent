"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { clientsApi } from "@/lib/api/clients";
import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/ui/error-banner";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Save,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

const TIMEZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (PT) - America/Los_Angeles" },
  { value: "America/Denver", label: "Mountain Time (MT) - America/Denver" },
  { value: "America/Chicago", label: "Central Time (CT) - America/Chicago" },
  { value: "America/New_York", label: "Eastern Time (ET) - America/New_York" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT) - Europe/London" },
  { value: "Europe/Paris", label: "Central European Time (CET) - Europe/Paris" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST) - Asia/Dubai" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST) - Asia/Kolkata" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST) - Asia/Tokyo" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET) - Australia/Sydney" },
];

export default function BusinessProfilePage() {
  const { isAdmin, role } = useAuth(); // CLIENT_ADMIN can edit; CLIENT_STAFF is view only (Req #21 & #28)

  const {
    data: business,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["business-profile"],
    queryFn: () => clientsApi.getMyBusiness(),
  });

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (business) {
      setBusinessName(business.business_name);
      setPhone(business.phone);
      setAddress(business.address);
      setTimezone(business.timezone);
    }
  }, [business]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Only administrators can update the business profile.");
      return;
    }

    setIsSaving(true);
    try {
      await clientsApi.updateMyBusiness({
        business_name: businessName,
        phone,
        address,
        timezone,
      });
      toast.success("Business profile updated successfully.");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update business profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-6">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorBanner
        message={(error as any)?.message || "Failed to load business profile."}
        onRetry={() => refetch()}
      />
    );
  }

  if (!business) return null;

  return (
    <div className="max-w-4xl space-y-6 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Business Profile
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 uppercase">
              {business.status} Account
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Configure primary organization identity, contact lines, and operational timezone.
          </p>
        </div>

        {/* Role Access Tag */}
        <div className="px-3 py-1.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs">
          {isAdmin ? (
            <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Full Edit Rights (Admin)
            </span>
          ) : (
            <span className="text-white/60 flex items-center gap-1.5 font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> View Only (Staff Access)
            </span>
          )}
        </div>
      </div>

      {/* Main Profile Form Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[rgba(12,12,16,0.65)] border border-white/10 backdrop-blur-2xl shadow-glass">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Read-Only System Fields Banner */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-white/40" />
                Account Email (Read-Only)
              </span>
              <div className="mt-1 flex items-center justify-between text-sm text-white/70 bg-black/20 px-3 py-2 rounded-xl border border-white/5">
                <span>{business.email}</span>
                <Lock className="w-3.5 h-3.5 text-white/30" />
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-white/40" />
                Platform Status (Read-Only)
              </span>
              <div className="mt-1 flex items-center justify-between text-sm text-white/70 bg-black/20 px-3 py-2 rounded-xl border border-white/5">
                <span className="capitalize font-medium text-emerald-400">{business.status}</span>
                <Lock className="w-3.5 h-3.5 text-white/30" />
              </div>
            </div>
          </div>

          {/* Editable Fields (CLIENT_ADMIN only) */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                Business Name *
              </label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={!isAdmin || isSaving}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  Primary Phone Number *
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isAdmin || isSaving}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  Operating Timezone *
                </label>
                <Select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={!isAdmin || isSaving}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/70 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Physical Address *
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!isAdmin || isSaving}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none disabled:opacity-50 transition-all"
                required
              />
            </div>
          </div>

          {/* Action button */}
          {isAdmin ? (
            <div className="flex justify-end pt-4 border-t border-white/10">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-glow-emerald"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving Profile..." : "Save Business Profile"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-white/40 italic pt-2 border-t border-white/10">
              * Staff accounts have read-only visibility for organizational configuration. Contact an administrator to update business information.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
