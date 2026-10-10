"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/users";
import { useAuth } from "@/lib/auth/auth-context";
import { StaffUser, UserRole } from "@/lib/types";
import { formatDate } from "@/lib/utils";
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
  UserCog,
  PlusCircle,
  Mail,
  ShieldCheck,
  UserCheck,
  Calendar,
  Edit,
  Power,
  ShieldAlert,
  Info,
} from "lucide-react";
import { toast } from "sonner";

export default function StaffPage() {
  const { user: currentUser, isAdmin } = useAuth();

  // If not admin, access is strictly denied (Req #21 & #27)
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Restricted</h2>
        <p className="mt-2 text-sm text-white/60 max-w-md">
          Staff management is reserved exclusively for Client Administrators (<span className="font-mono text-emerald-400">CLIENT_ADMIN</span>).
        </p>
      </div>
    );
  }

  const [roleFilter, setRoleFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [deactivatingStaff, setDeactivatingStaff] = useState<StaffUser | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("CLIENT_STAFF");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const {
    data: staffData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["staff-users", roleFilter, activeFilter],
    queryFn: () =>
      usersApi.getUsers({
        role: roleFilter !== "all" ? roleFilter : undefined,
        is_active:
          activeFilter === "active"
            ? true
            : activeFilter === "inactive"
            ? false
            : undefined,
        limit: 50,
      }),
  });

  const staffList = staffData?.data || [];

  const openCreateDialog = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("CLIENT_STAFF");
    setIsActive(true);
    setCreateDialogOpen(true);
  };

  const openEditDialog = (staff: StaffUser) => {
    setEditingStaff(staff);
    setName(staff.name);
    setEmail(staff.email);
    setRole(staff.role);
    setIsActive(staff.is_active);
  };

  const isEditingSelf = editingStaff?.id === currentUser?.id;

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || (!editingStaff && (!email || !password))) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingStaff) {
        await usersApi.updateUser(editingStaff.id, {
          name,
          role: isEditingSelf ? undefined : role,
          is_active: isEditingSelf ? undefined : isActive,
        });
        toast.success(`Staff member "${name}" updated successfully.`);
        setEditingStaff(null);
      } else {
        await usersApi.createUser({
          name,
          email,
          password,
          role,
        });
        toast.success(`Staff member "${name}" created successfully.`);
        setCreateDialogOpen(false);
      }
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save staff member.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!deactivatingStaff) return;
    setIsDeactivating(true);
    try {
      const nextStatus = !deactivatingStaff.is_active;
      await usersApi.updateUser(deactivatingStaff.id, {
        is_active: nextStatus,
      });
      toast.success(
        `Staff member "${deactivatingStaff.name}" has been ${
          nextStatus ? "reactivated" : "deactivated"
        }.`
      );
      setDeactivatingStaff(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update staff status.");
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Staff & Team Access
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              {staffList.length} Team Members
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Manage administrative personnel, scheduling operators, and role-based permissions.
          </p>
        </div>

        <Button onClick={openCreateDialog} className="shadow-glow-emerald">
          <PlusCircle className="w-4 h-4 mr-2" />
          Invite Staff Member
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 rounded-2xl bg-[rgba(12,12,16,0.65)] border border-white/10 backdrop-blur-2xl">
        <div className="w-full sm:w-48">
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="CLIENT_ADMIN">Client Admin</option>
            <option value="CLIENT_STAFF">Client Staff</option>
          </Select>
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </Select>
        </div>
      </div>

      {/* Staff Table */}
      {isLoading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : isError ? (
        <ErrorBanner
          message={(error as any)?.message || "Failed to load staff list."}
          onRetry={() => refetch()}
        />
      ) : staffList.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No Staff Members Found"
          description="No team members match the filter criteria."
          actionLabel="Invite Staff Member"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[rgba(12,12,16,0.65)] backdrop-blur-2xl shadow-glass">
          <table className="w-full text-left text-sm text-white/80">
            <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-white/40">
              <tr>
                <th className="py-4 px-4 sm:px-6">Staff Member</th>
                <th className="py-4 px-4">Role</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4">Date Joined</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {staffList.map((staff) => {
                const isSelf = staff.id === currentUser?.id;
                const isStaffAdmin = staff.role === "CLIENT_ADMIN";

                return (
                  <tr
                    key={staff.id}
                    className="hover:bg-white/[0.03] transition-colors group"
                  >
                    {/* Member Info */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0 shadow-glow-emerald">
                          {staff.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white flex items-center gap-2">
                            {staff.name}
                            {isSelf && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            {staff.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-4 px-4">
                      {isStaffAdmin ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Client Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          <UserCheck className="w-3.5 h-3.5" />
                          Client Staff
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                          staff.is_active
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-white/10 text-white/40 border border-white/10"
                        }`}
                      >
                        {staff.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>

                    {/* Date Joined */}
                    <td className="py-4 px-4 text-xs text-white/60">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-white/40" />
                        {formatDate(staff.created_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(staff)}
                          className="h-8 px-2 text-xs text-cyan-400 hover:text-white"
                          title="Edit staff details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>

                        {/* Deactivate Button (Disabled for own user per Req #27) */}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isSelf}
                          onClick={() => setDeactivatingStaff(staff)}
                          className={`h-8 px-2 text-xs ${
                            staff.is_active
                              ? "text-rose-400 hover:text-rose-300"
                              : "text-emerald-400 hover:text-emerald-300"
                          } disabled:opacity-30`}
                          title={
                            isSelf
                              ? "You cannot deactivate your own account"
                              : staff.is_active
                              ? "Deactivate staff member"
                              : "Reactivate staff member"
                          }
                        >
                          <Power className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog with Strict Self-Protection Logic (Req #27) */}
      <Dialog
        open={createDialogOpen || !!editingStaff}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingStaff(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSaveStaff}>
            <DialogHeader className="border-none pb-0 text-left">
              <DialogTitle className="text-base font-semibold text-white">
                {editingStaff ? "Edit Staff Details" : "Invite New Staff Member"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-white/60">
                {editingStaff
                  ? "Update member identity, administrative role, and access state."
                  : "Grant dashboard credentials to team members."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Full Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. David Miller"
                  required
                />
              </div>

              {!editingStaff && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/70">
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. staff@talkaor.com"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/70">
                      Initial Password *
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </>
              )}

              {/* Role Selection (Disabled for self with clear explanation) (Req #27) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Access Role *
                </label>
                <Select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  disabled={isEditingSelf}
                >
                  <option value="CLIENT_STAFF">Client Staff (Standard View)</option>
                  <option value="CLIENT_ADMIN">Client Admin (Full CRUD & Audio)</option>
                </Select>
                {isEditingSelf && (
                  <p className="text-[11px] text-amber-300/80 flex items-center gap-1 mt-1">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    You cannot change your own role. Another administrator must change your role.
                  </p>
                )}
              </div>

              {/* Active Status (Disabled for self with clear explanation) (Req #27) */}
              {editingStaff && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/70">
                    Account Status
                  </label>
                  <Select
                    value={isActive ? "active" : "inactive"}
                    onChange={(e) => setIsActive(e.target.value === "active")}
                    disabled={isEditingSelf}
                  >
                    <option value="active">Active (Access Allowed)</option>
                    <option value="inactive">Deactivated (Access Revoked)</option>
                  </Select>
                  {isEditingSelf && (
                    <p className="text-[11px] text-amber-300/80 flex items-center gap-1 mt-1">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      You cannot deactivate your own account. Another administrator must deactivate you.
                    </p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="border-none pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setEditingStaff(null);
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
                  : editingStaff
                  ? "Save Changes"
                  : "Invite Staff Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivation Confirmation Dialog (Req #27 & #34: Deactivation instead of delete) */}
      <ConfirmDialog
        open={!!deactivatingStaff}
        onOpenChange={(open) => !open && setDeactivatingStaff(null)}
        title={
          deactivatingStaff?.is_active
            ? "Deactivate Staff Member?"
            : "Reactivate Staff Member?"
        }
        description={
          deactivatingStaff?.is_active
            ? `Are you sure you want to deactivate ${deactivatingStaff?.name}? They will no longer be able to log in to the dashboard.`
            : `Are you sure you want to reactivate ${deactivatingStaff?.name}? Their dashboard access will be restored immediately.`
        }
        confirmText={
          deactivatingStaff?.is_active ? "Deactivate Account" : "Reactivate Account"
        }
        variant={deactivatingStaff?.is_active ? "destructive" : "default"}
        isLoading={isDeactivating}
        onConfirm={handleToggleActive}
      />
    </div>
  );
}
