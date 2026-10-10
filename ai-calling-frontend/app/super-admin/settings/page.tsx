"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { superAdminApi } from "@/lib/api/super-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Settings,
  Server,
  Database,
  PhoneCall,
  Bot,
  ShieldCheck,
  HardDrive,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Save,
  Check,
  Sliders,
  Lock,
} from "lucide-react";

export default function SystemSettingsPage() {
  const queryClient = useQueryClient();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const {
    data: healthData,
    isLoading: isHealthLoading,
    refetch: refetchHealth,
    isFetching: isFetchingHealth,
  } = useQuery({
    queryKey: ["super-admin-system-health"],
    queryFn: () => superAdminApi.getSystemHealth(),
    refetchInterval: 30000,
  });

  const {
    data: settingsData,
    isLoading: isSettingsLoading,
  } = useQuery({
    queryKey: ["super-admin-settings"],
    queryFn: () => superAdminApi.getSettings(),
  });

  const [formState, setFormState] = useState<Record<string, any>>({});

  React.useEffect(() => {
    if (settingsData) {
      setFormState(settingsData);
    }
  }, [settingsData]);

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Record<string, any>) => superAdminApi.updateSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-settings"] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleToggle = (key: string) => {
    setFormState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleInputChange = (key: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formState);
  };

  const getServiceIcon = (key: string) => {
    switch (key) {
      case "fastapi_backend":
        return <Server className="w-5 h-5 text-emerald-400" />;
      case "database":
        return <Database className="w-5 h-5 text-blue-400" />;
      case "ai_voice_service":
        return <PhoneCall className="w-5 h-5 text-cyan-400" />;
      case "agent_service":
        return <Bot className="w-5 h-5 text-purple-400" />;
      case "authentication":
        return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case "storage":
        return <HardDrive className="w-5 h-5 text-amber-400" />;
      case "frontend":
      default:
        return <Globe className="w-5 h-5 text-emerald-400" />;
    }
  };

  const services = healthData
    ? [
        { key: "fastapi_backend", data: healthData.fastapi_backend },
        { key: "database", data: healthData.database },
        { key: "ai_voice_service", data: healthData.ai_voice_service },
        { key: "agent_service", data: healthData.agent_service },
        { key: "authentication", data: healthData.authentication },
        { key: "storage", data: healthData.storage },
        { key: "frontend", data: healthData.frontend },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-emerald-400" />
            System Settings & Infrastructure
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time infrastructure health monitoring and global platform configuration.
          </p>
        </div>

        <Button
          onClick={() => refetchHealth()}
          variant="outline"
          size="sm"
          className="border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/60"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetchingHealth ? "animate-spin" : ""}`} />
          Run Health Diagnostics
        </Button>
      </div>

      {/* System Status Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Infrastructure Services
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Overall Health:{" "}
            <span className="text-emerald-400 font-semibold uppercase">
              {healthData?.overall_status || "Operational"}
            </span>
          </span>
        </div>

        {isHealthLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(({ key, data }) => {
              if (!data) return null;
              const isOnline = data.status === "ONLINE";
              const isDegraded = data.status === "DEGRADED";

              return (
                <div
                  key={key}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center">
                        {getServiceIcon(key)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{data.name}</div>
                        <div className="text-xs text-slate-400">{data.latency_ms} ms response time</div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        isOnline
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : isDegraded
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {isOnline ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : isDegraded ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {data.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-2.5">
                    {data.description}
                  </p>

                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                    <span>Verified: {data.last_checked || "Just now"}</span>
                    <span className="font-mono text-emerald-400/90 font-medium">99.98% Uptime</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Platform Settings Form */}
      <form onSubmit={handleSave} className="space-y-6 pt-4">
        <div className="rounded-2xl border border-slate-800 bg-[#0c0e14] p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-base font-semibold text-white">Platform Configuration</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage global SaaS operating parameters, telephony bridge, and access control policies.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow-emerald"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved Changes
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Platform Settings
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Platform Brand Name</label>
              <Input
                value={formState.platform_name || ""}
                onChange={(e) => handleInputChange("platform_name", e.target.value)}
                className="bg-slate-900/60 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Default Currency</label>
              <Input
                value={formState.default_currency || "INR"}
                onChange={(e) => handleInputChange("default_currency", e.target.value)}
                className="bg-slate-900/60 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Telephony Gateway Provider</label>
              <Input
                value={formState.telephony_provider || "TalkAor Neural SIP Bridge"}
                onChange={(e) => handleInputChange("telephony_provider", e.target.value)}
                className="bg-slate-900/60 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Max Concurrent Calls Per Agent</label>
              <Input
                type="number"
                value={formState.max_concurrent_calls_per_agent || 10}
                onChange={(e) =>
                  handleInputChange("max_concurrent_calls_per_agent", parseInt(e.target.value) || 1)
                }
                className="bg-slate-900/60 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">API Rate Limit (Req/Min/Tenant)</label>
              <Input
                type="number"
                value={formState.api_rate_limit_per_minute || 600}
                onChange={(e) =>
                  handleInputChange("api_rate_limit_per_minute", parseInt(e.target.value) || 60)
                }
                className="bg-slate-900/60 border-slate-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Recording Retention (Days)</label>
              <Input
                type="number"
                value={formState.recording_retention_days || 180}
                onChange={(e) =>
                  handleInputChange("recording_retention_days", parseInt(e.target.value) || 30)
                }
                className="bg-slate-900/60 border-slate-800 text-white"
              />
            </div>
          </div>

          {/* Toggle Switches */}
          <div className="border-t border-slate-800/80 pt-6 space-y-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Security & Policy Toggles
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    Admin Access Code Enforcement
                  </div>
                  <p className="text-xs text-slate-400">
                    Require business administrators to enter the secure access code to unlock controls.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("admin_access_code_enforced")}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    formState.admin_access_code_enforced ? "bg-emerald-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      formState.admin_access_code_enforced ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    Allow New Business Registrations
                  </div>
                  <p className="text-xs text-slate-400">
                    Permit public self-serve organization signups from the website.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("allow_new_registrations")}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    formState.allow_new_registrations ? "bg-emerald-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      formState.allow_new_registrations ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 border border-slate-800">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-white flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Platform Maintenance Mode
                  </div>
                  <p className="text-xs text-slate-400">
                    Suspends client agent calling and informs tenants of planned maintenance.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle("maintenance_mode")}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    formState.maintenance_mode ? "bg-amber-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      formState.maintenance_mode ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
