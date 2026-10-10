"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Lock, AlertCircle, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface AdminAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AdminAccessModal({
  open,
  onOpenChange,
  onSuccess,
}: AdminAccessModalProps) {
  const router = useRouter();
  const { unlockAdminControls, role } = useAuth();
  const [accessCode, setAccessCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showCode, setShowCode] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!accessCode.trim()) {
      setErrorMessage("Please enter your administrator access code.");
      return;
    }

    setIsLoading(true);
    try {
      await unlockAdminControls(accessCode.trim());
      toast.success("Administrator access verified. Admin Controls unlocked!");
      onOpenChange(false);
      setAccessCode("");
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard/admin");
      }
    } catch (err: any) {
      const msg =
        err.message ||
        (err.status === 403
          ? "Staff users cannot access Admin Control. Administrator privilege required."
          : "Invalid Administrator Access Code. Please verify your code and retry.");
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-[#0d0f15]/95 backdrop-blur-2xl border border-white/10 text-white rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="text-left space-y-2">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow-emerald">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Admin Access
            </DialogTitle>
            <DialogDescription className="text-xs text-white/50 mt-1">
              Enter your administrator access code to continue.
            </DialogDescription>
          </div>
        </DialogHeader>

        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <label
              htmlFor="admin-access-code"
              className="block text-xs font-medium text-white/80"
            >
              Admin Access Code
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                id="admin-access-code"
                type={showCode ? "text" : "password"}
                placeholder="Enter access code..."
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value);
                  setErrorMessage("");
                }}
                disabled={isLoading}
                autoFocus
                className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-white/40">
              Validated cryptographically by backend authorization. Default:{" "}
              <span className="font-mono text-emerald-400 select-all">TALKAOR-ADMIN-2026</span>
            </p>
          </div>

          <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onOpenChange(false);
                setAccessCode("");
                setErrorMessage("");
              }}
              disabled={isLoading}
              className="text-white/60 hover:text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !accessCode.trim()}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-glow-emerald font-semibold gap-1.5"
            >
              {isLoading ? (
                <span>Validating...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Unlock Admin Controls</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
