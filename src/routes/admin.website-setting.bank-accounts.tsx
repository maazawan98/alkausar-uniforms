import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Landmark, CheckCircle2, Loader2, Eye, Power } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createBankAccount,
  deleteBankAccount,
  listBankAccounts,
  toggleBankAccountActive,
  updateBankAccount,
  type BankAccountRow,
} from "@/lib/bank-accounts.functions";

export const Route = createFileRoute("/admin/website-setting/bank-accounts")({
  component: BankAccountsPage,
});

function formatDate(d: string) {
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BankAccountsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listBankAccounts);
  const create = useServerFn(createBankAccount);
  const update = useServerFn(updateBankAccount);
  const toggle = useServerFn(toggleBankAccountActive);
  const del = useServerFn(deleteBankAccount);

  const rowsQ = useQuery<BankAccountRow[]>({
    queryKey: ["bank-accounts"],
    queryFn: () => list(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccountRow | null>(null);
  const [viewing, setViewing] = useState<BankAccountRow | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) => toggle({ data: v }),
    onSuccess: (_, v) => {
      toast.success(v.is_active ? "Bank activated" : "Bank deactivated");
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      setConfirmId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = rowsQ.data ?? [];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8 pb-6 border-b border-[#E5E7EB]">
        <div>
          <div className="text-xs font-medium text-black/50 mb-1">
            <Link to="/admin/website-setting" className="hover:text-[#CF0A0A] transition-colors">
              Website Setting
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-black/70">Bank Accounts</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-black tracking-tight">
            Bank Accounts
          </h2>
          <p className="mt-2 text-[15px] text-black/55 max-w-2xl">
            Manage the bank accounts shown to customers when they choose online payment at
            checkout. Only active accounts are visible, sorted by display order.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-[#CF0A0A] hover:bg-[#a80808] text-white text-sm font-medium px-4 py-2.5 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Bank
        </button>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-[#F1F1F1] text-xs uppercase tracking-wider text-black/55 font-semibold flex items-center gap-2">
          <Landmark className="h-4 w-4 text-[#CF0A0A]" />
          All Bank Accounts
        </div>
        {rowsQ.isLoading ? (
          <div className="p-8 text-sm text-black/50">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-black/55">
            No bank accounts yet. Add one to enable online payment on checkout.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] text-black/55 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left font-semibold px-5 py-3">Order</th>
                  <th className="text-left font-semibold px-5 py-3">Bank Name</th>
                  <th className="text-left font-semibold px-5 py-3">Account Title</th>
                  <th className="text-left font-semibold px-5 py-3">Account Number</th>
                  <th className="text-left font-semibold px-5 py-3">IBAN</th>
                  <th className="text-left font-semibold px-5 py-3">Status</th>
                  <th className="text-left font-semibold px-5 py-3">Updated</th>
                  <th className="text-right font-semibold px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F1F1]">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-5 py-4">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-black/[0.05] text-black/70 text-xs font-semibold px-2">
                        {r.display_order}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-black">{r.bank_name}</td>
                    <td className="px-5 py-4 text-black/80">{r.account_title}</td>
                    <td className="px-5 py-4 text-black/80 font-mono text-xs">{r.account_number}</td>
                    <td className="px-5 py-4 text-black/70 font-mono text-xs">
                      {r.iban_number || <span className="text-black/40 font-sans">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      {r.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-black/[0.05] text-black/60 text-xs font-medium px-2.5 py-1">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-black/60 text-xs">{formatDate(r.updated_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewing(r)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-black/70 hover:bg-black/[0.05] hover:text-black transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            toggleMut.mutate({ id: r.id, is_active: !r.is_active })
                          }
                          disabled={toggleMut.isPending}
                          className={[
                            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                            r.is_active
                              ? "text-black/70 hover:bg-black/[0.05]"
                              : "text-green-700 hover:bg-green-50",
                          ].join(" ")}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {r.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(r);
                            setDialogOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-black/70 hover:bg-black/[0.05] hover:text-black transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(r.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#CF0A0A] hover:bg-[#CF0A0A]/[0.06] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BankAccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["bank-accounts"] });
          setDialogOpen(false);
        }}
        create={create}
        update={update}
      />

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Bank Account Details</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 py-2">
              <ViewRow label="Bank Name" value={viewing.bank_name} />
              <ViewRow label="Account Title" value={viewing.account_title} />
              <ViewRow label="Account Number" value={viewing.account_number} mono />
              <ViewRow label="IBAN" value={viewing.iban_number || "—"} mono />
              <ViewRow label="Display Order" value={String(viewing.display_order)} />
              <ViewRow label="Status" value={viewing.is_active ? "Active" : "Inactive"} />
              <ViewRow label="Last Updated" value={formatDate(viewing.updated_at)} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bank account? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmId && deleteMut.mutate(confirmId)}
              className="rounded-lg bg-[#CF0A0A] hover:bg-[#a80808] text-white"
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ViewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-[#F9FAFB] px-4 py-3">
      <span className="text-[11px] uppercase tracking-wider font-semibold text-black/50">
        {label}
      </span>
      <span className={`text-sm text-black text-right ${mono ? "font-mono" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}

function BankAccountDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
  create,
  update,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: BankAccountRow | null;
  onSaved: () => void;
  create: ReturnType<typeof useServerFn<typeof createBankAccount>>;
  update: ReturnType<typeof useServerFn<typeof updateBankAccount>>;
}) {
  const [bankName, setBankName] = useState("");
  const [accountTitle, setAccountTitle] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [displayOrder, setDisplayOrder] = useState<string>("1");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open) {
      setBankName(editing?.bank_name ?? "");
      setAccountTitle(editing?.account_title ?? "");
      setAccountNumber(editing?.account_number ?? "");
      setIban(editing?.iban_number ?? "");
      setDisplayOrder(editing ? String(editing.display_order) : "1");
      setIsActive(editing ? editing.is_active : true);
    }
  }, [open, editing]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!bankName.trim()) throw new Error("Bank name is required.");
      if (!accountTitle.trim()) throw new Error("Account title is required.");
      if (!accountNumber.trim()) throw new Error("Account number is required.");
      const order = Number(displayOrder);
      if (!Number.isInteger(order) || order < 1) {
        throw new Error("Display order must be a positive number.");
      }
      const payload = {
        bank_name: bankName.trim(),
        account_title: accountTitle.trim(),
        account_number: accountNumber.trim(),
        iban_number: iban.trim() || null,
        display_order: order,
        is_active: isActive,
      };
      if (editing) return update({ data: { id: editing.id, ...payload } });
      return create({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Bank account updated" : "Bank account saved");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Bank Account" : "Add Bank Account"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
          <FormField label="Bank Name *" placeholder="Habib Bank Limited (HBL)" value={bankName} onChange={setBankName} />
          <FormField label="Account Title *" placeholder="Alkausar Uniforms" value={accountTitle} onChange={setAccountTitle} />
          <FormField label="Account Number *" placeholder="1234567890123" value={accountNumber} onChange={setAccountNumber} mono />
          <FormField label="IBAN Number (optional)" placeholder="PK36HABB0000001234567890" value={iban} onChange={setIban} mono />
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/60 mb-1.5">
              Display Order *
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm focus:border-[#CF0A0A] outline-none"
            />
            <p className="text-[11px] text-black/50 mt-1">
              Positive number. Must be unique. Lower numbers appear first on checkout.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-black/80">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="accent-[#CF0A0A]"
            />
            Active (visible on checkout)
          </label>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-black/70 hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[#CF0A0A] hover:bg-[#a80808] text-white text-sm font-semibold px-5 py-2.5 disabled:opacity-60"
          >
            {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Update" : "Save"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  label,
  placeholder,
  value,
  onChange,
  mono,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/60 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-11 rounded-xl border border-black/10 px-3 text-sm focus:border-[#CF0A0A] outline-none ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
