"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "@/lib/api/agents";
import { useAuth } from "@/lib/auth/auth-context";
import { AIAgent, AgentStatus } from "@/lib/types";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bot,
  PlusCircle,
  Phone,
  Server,
  Settings,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Code,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function AgentsPage() {
  const { isAdmin } = useAuth(); // CLIENT_ADMIN has CRUD; CLIENT_STAFF is view only (Req #21 & #26)

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<AIAgent | null>(null);
  const [viewConfigAgent, setViewConfigAgent] = useState<AIAgent | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [provider, setProvider] = useState("TalkAor Neural Voice");
  const [status, setStatus] = useState<AgentStatus>("active");
  const [configJson, setConfigJson] = useState('{\n  "temperature": 0.3,\n  "recording_enabled": true\n}');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: agentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentsApi.getAgents({ limit: 50 }),
  });

  const agents = agentsData?.data || [];

  const openCreateDialog = () => {
    setName("");
    setDescription("");
    setPhone("+1 (555) 019-0000");
    setProvider("TalkAor Neural Voice");
    setStatus("active");
    setConfigJson('{\n  "temperature": 0.3,\n  "recording_enabled": true,\n  "interrupt_threshold": 0.6\n}');
    setCreateDialogOpen(true);
  };

  const openEditDialog = (agent: AIAgent) => {
    setEditingAgent(agent);
    setName(agent.name);
    setDescription(agent.description);
    setPhone(agent.phone_number);
    setProvider(agent.provider);
    setStatus(agent.status);
    setConfigJson(JSON.stringify(agent.configuration || {}, null, 2));
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !phone || !provider) {
      toast.error("Please fill in all required fields.");
      return;
    }

    let parsedConfig: Record<string, any> = {};
    try {
      parsedConfig = JSON.parse(configJson);
    } catch {
      toast.error("Invalid JSON in configuration. Please fix syntax.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingAgent) {
        await agentsApi.updateAgent(editingAgent.id, {
          name,
          description,
          phone_number: phone,
          provider,
          status,
          configuration: parsedConfig,
        });
        toast.success(`Agent "${name}" updated successfully.`);
        setEditingAgent(null);
      } else {
        await agentsApi.createAgent({
          name,
          description,
          phone_number: phone,
          provider,
          status,
          configuration: parsedConfig,
        });
        toast.success(`Agent "${name}" created successfully.`);
        setCreateDialogOpen(false);
      }
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save agent.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!deletingAgent) return;
    setIsDeleting(true);
    try {
      const res = await agentsApi.deleteAgent(deletingAgent.id);
      toast.success(res.message);
      setDeletingAgent(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete agent.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              AI Voice Agents
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              {agents.length} Deployed
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Intelligent voice receptionists, after-hours booking agents, and outbound follow-up bots.
          </p>
        </div>

        {/* CLIENT_ADMIN ONLY Create Action (Req #21 & #26) */}
        {isAdmin && (
          <Button onClick={openCreateDialog} className="shadow-glow-emerald">
            <PlusCircle className="w-4 h-4 mr-2" />
            Provision Agent
          </Button>
        )}
      </div>

      {/* Grid of Agent Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4 animate-pulse">
              <div className="h-6 w-32 bg-white/10 rounded-lg" />
              <div className="h-16 w-full bg-white/5 rounded-xl" />
              <div className="h-8 w-24 bg-white/10 rounded-lg" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorBanner
          message={(error as any)?.message || "Failed to load AI agents."}
          onRetry={() => refetch()}
        />
      ) : agents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No AI Agents Provisioned"
          description="Provision your first AI voice agent to begin automating incoming phone bookings."
          actionLabel={isAdmin ? "Provision First Agent" : undefined}
          onAction={openCreateDialog}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent) => {
            const isActive = agent.status === "active";

            return (
              <div
                key={agent.id}
                className="flex flex-col justify-between p-6 rounded-3xl bg-[rgba(12,12,16,0.65)] border border-white/10 backdrop-blur-2xl hover:border-emerald-500/40 shadow-glass transition-all group"
              >
                <div>
                  {/* Top Bar: Icon & Status */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shadow-glow-emerald">
                      <Bot className="w-6 h-6" />
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                          : "bg-white/10 text-white/50 border border-white/10"
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>

                  {/* Agent Identity */}
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {agent.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-white/60 line-clamp-3 leading-relaxed">
                    {agent.description}
                  </p>

                  {/* Details Pill Box */}
                  <div className="mt-4 p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-white/40 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        Direct Phone
                      </span>
                      <span className="font-mono text-white/90">{agent.phone_number}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-white/40 flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-emerald-400" />
                        Engine Provider
                      </span>
                      <span className="text-white/90 truncate max-w-[130px]">{agent.provider}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="glass"
                    onClick={() => setViewConfigAgent(agent)}
                    className="text-xs h-8 px-2.5 text-white/70 hover:text-white"
                  >
                    <Code className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    Config JSON
                  </Button>

                  {/* CLIENT_ADMIN Only Edit & Delete Actions (Req #21 & #26) */}
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(agent)}
                        className="h-8 px-2 text-cyan-400/80 hover:text-cyan-400"
                        title="Edit Agent"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingAgent(agent)}
                        className="h-8 px-2 text-rose-400/80 hover:text-rose-400"
                        title="Delete Agent"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Free-Form Configuration JSON Dialog */}
      <Dialog
        open={!!viewConfigAgent}
        onOpenChange={(open) => !open && setViewConfigAgent(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="border-b border-white/10 pb-3 text-left">
            <DialogTitle className="text-base font-semibold text-white">
              Agent Configuration: {viewConfigAgent?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50">
              Free-form parameters passed to the neural voice synthesizer.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <pre className="p-4 rounded-2xl bg-black/50 border border-white/10 text-xs font-mono text-emerald-300 max-h-72 overflow-y-auto">
              {JSON.stringify(viewConfigAgent?.configuration || {}, null, 2)}
            </pre>
          </div>

          <DialogFooter className="border-none pt-2">
            <Button variant="outline" onClick={() => setViewConfigAgent(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Agent Dialog */}
      <Dialog
        open={createDialogOpen || !!editingAgent}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingAgent(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[540px]">
          <form onSubmit={handleSaveAgent}>
            <DialogHeader className="border-none pb-0 text-left">
              <DialogTitle className="text-base font-semibold text-white">
                {editingAgent ? "Edit AI Voice Agent" : "Deploy New Voice Agent"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-white/60">
                Configure agent identity, phone line, and neural synthesis parameters.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Agent Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aria (Front Desk AI)"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Handles customer inquiries, booking confirmations, and cancellations..."
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/70">
                    Phone Number *
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2831"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/70">
                    Status
                  </label>
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AgentStatus)}
                  >
                    <option value="active">Active (Online)</option>
                    <option value="inactive">Inactive</option>
                    <option value="training">Training</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Telephony Provider
                </label>
                <Input
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="TalkAor Neural Voice"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Free-Form Configuration (JSON)
                </label>
                <textarea
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none transition-all"
                />
              </div>
            </div>

            <DialogFooter className="border-none pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setEditingAgent(null);
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-glow-emerald"
              >
                {isSaving
                  ? "Saving..."
                  : editingAgent
                  ? "Save Changes"
                  : "Deploy Agent"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Agent Confirmation */}
      <ConfirmDialog
        open={!!deletingAgent}
        onOpenChange={(open) => !open && setDeletingAgent(null)}
        title="Delete AI Agent?"
        description={`Are you sure you want to delete "${deletingAgent?.name}"? Inbound calls to ${deletingAgent?.phone_number} will cease to connect.`}
        confirmText="Delete Agent"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteAgent}
      />
    </div>
  );
}
