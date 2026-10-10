"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { customersApi } from "@/lib/api/customers";
import { useAuth } from "@/lib/auth/auth-context";
import { Customer } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Pagination } from "@/components/ui/pagination";
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
  Users,
  Search,
  PlusCircle,
  Phone,
  Mail,
  Calendar,
  Edit,
  Trash2,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

export default function CustomersPage() {
  const { isAdmin } = useAuth(); // CLIENT_ADMIN has CRUD, CLIENT_STAFF is view only (Req #21 & #23)

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Dialog States
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // TanStack Query
  const {
    data: customersData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["customers", search, page],
    queryFn: () => customersApi.getCustomers({ search, page, limit: 10 }),
  });

  const customers = customersData?.data || [];
  const pagination = customersData?.pagination;

  const openCreateDialog = () => {
    setName("");
    setPhone("");
    setEmail("");
    setNotes("");
    setCreateDialogOpen(true);
  };

  const openEditDialog = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone);
    setEmail(cust.email);
    setNotes(cust.notes || "");
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email) {
      toast.error("Please fill in name, phone, and email.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingCustomer) {
        await customersApi.updateCustomer(editingCustomer.id, {
          name,
          phone,
          email,
          notes,
        });
        toast.success(`Customer "${name}" updated successfully.`);
        setEditingCustomer(null);
      } else {
        await customersApi.createCustomer({
          name,
          phone,
          email,
          notes,
        });
        toast.success(`Customer "${name}" created successfully.`);
        setCreateDialogOpen(false);
      }
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save customer.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    setIsDeleting(true);
    try {
      const res = await customersApi.deleteCustomer(deletingCustomer.id);
      toast.success(res.message);
      setDeletingCustomer(null);
      refetch();
    } catch (err: any) {
      // Specifically handle 409 CUSTOMER_HAS_RECORDS (Requirement #23)
      toast.error(err.message || "Failed to delete customer.");
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
              Customers Directory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              {pagination?.total || 0} Contacts
            </span>
          </div>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Verified caller identities, booking frequency, and customer profiles.
          </p>
        </div>

        {/* Create Customer Button — Only rendered for CLIENT_ADMIN (Req #21 & #23) */}
        {isAdmin && (
          <Button onClick={openCreateDialog} className="shadow-glow-emerald">
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-3.5 rounded-2xl bg-[rgba(12,12,16,0.65)] border border-white/10 backdrop-blur-2xl">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search customer name, phone number, or email..."
            className="pl-10 h-10 border-white/10 bg-white/[0.03]"
          />
        </div>
      </div>

      {/* Table / Skeleton / Empty state */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : isError ? (
        <ErrorBanner
          message={(error as any)?.message || "Failed to load customers."}
          onRetry={() => refetch()}
        />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Customers Found"
          description={
            search
              ? "No customer contacts match your search query."
              : "No customers in directory yet."
          }
          actionLabel={isAdmin ? "Add First Customer" : undefined}
          onAction={openCreateDialog}
          secondaryActionLabel={search ? "Clear Search" : undefined}
          onSecondaryAction={() => setSearch("")}
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[rgba(12,12,16,0.65)] backdrop-blur-2xl shadow-glass">
            <table className="w-full text-left text-sm text-white/80">
              <thead className="border-b border-white/10 bg-white/[0.02] text-xs uppercase tracking-wider text-white/40">
                <tr>
                  <th className="py-4 px-4 sm:px-6">Customer</th>
                  <th className="py-4 px-4">Contact Phone</th>
                  <th className="py-4 px-4">Email</th>
                  <th className="py-4 px-4">Created Date</th>
                  <th className="py-4 px-4">Bookings</th>
                  {isAdmin && <th className="py-4 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map((cust) => (
                  <tr
                    key={cust.id}
                    className="hover:bg-white/[0.03] transition-colors group"
                  >
                    {/* Name */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0 shadow-glow-emerald">
                          {cust.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                            {cust.name}
                          </div>
                          {cust.notes && (
                            <div className="text-[11px] text-white/40 truncate max-w-xs">
                              {cust.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-4 px-4">
                      <span className="flex items-center gap-1.5 text-xs text-white/80 font-mono">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        {cust.phone}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="py-4 px-4">
                      <span className="flex items-center gap-1.5 text-xs text-white/70">
                        <Mail className="w-3.5 h-3.5 text-white/40" />
                        {cust.email}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-4 text-xs text-white/60">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-white/40" />
                        {formatDate(cust.created_at)}
                      </span>
                    </td>

                    {/* Total Bookings */}
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-white/5 border border-white/10 text-white/90">
                        {cust.total_appointments || 0}
                      </span>
                    </td>

                    {/* Actions — CLIENT_ADMIN ONLY (Req #21 & #23) */}
                    {isAdmin && (
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(cust)}
                            className="h-8 px-2 text-xs text-cyan-400/80 hover:text-cyan-400"
                            title="Edit customer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingCustomer(cust)}
                            className="h-8 px-2 text-xs text-rose-400/80 hover:text-rose-400"
                            title="Delete customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.total_pages > 1 && (
            <div className="rounded-2xl bg-white/[0.02] border border-white/10 px-4">
              <Pagination
                pagination={pagination}
                onPageChange={(newPage) => setPage(newPage)}
              />
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={createDialogOpen || !!editingCustomer}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingCustomer(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSaveCustomer}>
            <DialogHeader className="border-none pb-0 text-left">
              <DialogTitle className="text-base font-semibold text-white">
                {editingCustomer ? "Edit Customer Profile" : "Add New Customer"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs text-white/60">
                {editingCustomer
                  ? "Update customer identity and contact information."
                  : "Register a new client contact for voice bookings."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Full Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sophia Patel"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Phone Number *
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 (555) 876-1243"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sophia@example.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">
                  Customer Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. VIP client, preferred service timings, allergies..."
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none transition-all"
                />
              </div>
            </div>

            <DialogFooter className="border-none pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCreateDialogOpen(false);
                  setEditingCustomer(null);
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
                  : editingCustomer
                  ? "Save Changes"
                  : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog with 409 handling (Req #23 & #34) */}
      <ConfirmDialog
        open={!!deletingCustomer}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        title="Delete Customer Record?"
        description={`Are you sure you want to delete customer "${deletingCustomer?.name}"? If this customer has existing appointments or voice call logs, the operation will be rejected.`}
        confirmText="Delete Customer"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteCustomer}
      />
    </div>
  );
}
