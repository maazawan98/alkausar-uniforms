import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Power,
  Ticket,
  CheckCircle2,
  Clock,
  BarChart3,
  Loader2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";
import {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  setCouponActive,
  getCouponStats,
  type CouponRow,
  type CouponModule,
} from "@/lib/coupons.functions";
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

const MODULES: { id: CouponModule; label: string }[] = [
  { id: "school", label: "School Uniforms" },
  { id: "college", label: "Colleges" },
  { id: "medical", label: "Medical" },
  { id: "accessories", label: "Accessories" },
];

const STATS_KEY = ["admin", "coupons", "stats"] as const;
const LIST_KEY = ["admin", "coupons", "list"] as const;

export const Route = createFileRoute("/admin/coupons")({
  component: CouponsPage,
});

function CouponsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCoupons);
  const statsFn = useServerFn(getCouponStats);
  const setActiveFn = useServerFn(setCouponActive);
  const deleteFn = useServerFn(deleteCoupon);

  const statsQ = useQuery({ queryKey: STATS_KEY, queryFn: () => statsFn() });
  const listQ = useQuery({ queryKey: LIST_KEY, queryFn: () => listFn() });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [dialog, setDialog] = useState<{ mode: "add" | "edit"; row?: CouponRow } | null>(null);
  const [viewRow, setViewRow] = useState<CouponRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<CouponRow | null>(null);

  const toggle = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) => setActiveFn({ data: v }),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: STATS_KEY });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Coupon deleted");
      setDeleteRow(null);
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: STATS_KEY });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const rows = useMemo(() => {
    const all = listQ.data ?? [];
    const now = Date.now();
    return all.filter((r) => {
      const term = search.trim().toLowerCase();
      if (term && !`${r.coupon_code} ${r.coupon_name}`.toLowerCase().includes(term)) return false;
      const expired = new Date(r.valid_until).getTime() < now;
      if (statusFilter === "active" && (!r.is_active || expired)) return false;
      if (statusFilter === "inactive" && r.is_active) return false;
      if (statusFilter === "expired" && !expired) return false;
      return true;
    });
  }, [listQ.data, search, statusFilter]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Coupons" subtitle="Create and manage discount coupons." />
        <button
          onClick={() => setDialog({ mode: "add" })}
          className="inline-flex items-center gap-2 rounded-xl bg-[#CF0A0A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#a80808]"
        >
          <Plus className="h-4 w-4" /> Add Coupon
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Coupons" value={statsQ.data?.total ?? 0} icon={Ticket} tint="bg-black/5 text-black" />
        <StatCard label="Active" value={statsQ.data?.active ?? 0} icon={CheckCircle2} tint="bg-green-50 text-green-700" />
        <StatCard label="Expired" value={statsQ.data?.expired ?? 0} icon={Clock} tint="bg-amber-50 text-amber-700" />
        <StatCard label="Used" value={statsQ.data?.used ?? 0} icon={BarChart3} tint="bg-blue-50 text-blue-700" />
        <StatCard label="Total Usage" value={statsQ.data?.totalUsage ?? 0} icon={BarChart3} tint="bg-[#CF0A0A]/10 text-[#CF0A0A]" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code or name…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-black/10 text-sm outline-none focus:border-[#CF0A0A]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="h-10 rounded-xl border border-black/10 px-3 text-sm outline-none focus:border-[#CF0A0A]"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/[0.03] text-[11px] uppercase tracking-wider text-black/60">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Discount</th>
                <th className="text-left px-4 py-3">Min Order</th>
                <th className="text-left px-4 py-3">Usage</th>
                <th className="text-left px-4 py-3">Valid From</th>
                <th className="text-left px-4 py-3">Valid Until</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Updated</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {listQ.isLoading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-black/50">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading coupons…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-black/50">
                    <Ticket className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No coupons found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const expired = new Date(r.valid_until).getTime() < Date.now();
                  return (
                    <tr key={r.id} className="hover:bg-black/[0.02]">
                      <td className="px-4 py-3 font-mono font-semibold text-black">{r.coupon_code}</td>
                      <td className="px-4 py-3 text-black">{r.coupon_name}</td>
                      <td className="px-4 py-3 text-black">
                        {r.discount_type === "percentage"
                          ? `${r.discount_value}%`
                          : `Rs ${r.discount_value.toLocaleString()}`}
                        {r.maximum_discount != null && r.discount_type === "percentage" && (
                          <span className="text-black/40 text-xs"> · max Rs {r.maximum_discount}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-black/70">
                        {r.minimum_order_amount != null ? `Rs ${r.minimum_order_amount.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-black/70">
                        {r.used_count}{r.usage_limit != null ? ` / ${r.usage_limit}` : ""}
                      </td>
                      <td className="px-4 py-3 text-black/70">{formatDate(r.valid_from)}</td>
                      <td className="px-4 py-3 text-black/70">{formatDate(r.valid_until)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge active={r.is_active} expired={expired} />
                      </td>
                      <td className="px-4 py-3 text-black/50 text-xs">{formatDate(r.updated_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn label="View" onClick={() => setViewRow(r)}><Eye className="h-4 w-4" /></IconBtn>
                          <IconBtn label="Edit" onClick={() => setDialog({ mode: "edit", row: r })}><Edit2 className="h-4 w-4" /></IconBtn>
                          <IconBtn
                            label={r.is_active ? "Deactivate" : "Activate"}
                            onClick={() => toggle.mutate({ id: r.id, is_active: !r.is_active })}
                          >
                            <Power className={`h-4 w-4 ${r.is_active ? "text-green-600" : "text-black/40"}`} />
                          </IconBtn>
                          <IconBtn label="Delete" onClick={() => setDeleteRow(r)}>
                            <Trash2 className="h-4 w-4 text-[#CF0A0A]" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {dialog && (
        <CouponDialog
          mode={dialog.mode}
          row={dialog.row}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            qc.invalidateQueries({ queryKey: LIST_KEY });
            qc.invalidateQueries({ queryKey: STATS_KEY });
          }}
        />
      )}

      {viewRow && <ViewDialog row={viewRow} onClose={() => setViewRow(null)} />}

      <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <b>{deleteRow?.coupon_code}</b>. Existing usage history is kept but coupon
              cannot be reused.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRow && remove.mutate(deleteRow.id)}
              className="bg-[#CF0A0A] hover:bg-[#a80808]"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- helpers ---------- */

function formatDate(s: string) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function toDatetimeLocal(iso: string | undefined | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: number;
  icon: any;
  tint: string;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-black/50 font-semibold">{label}</p>
        <div className={`grid h-8 w-8 place-items-center rounded-lg ${tint}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-black mt-2">{value.toLocaleString()}</p>
    </div>
  );
}

function StatusBadge({ active, expired }: { active: boolean; expired: boolean }) {
  if (expired)
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-xs font-semibold">
        Expired
      </span>
    );
  if (active)
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 px-2 py-0.5 text-xs font-semibold">
        Active
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-black/5 text-black/60 px-2 py-0.5 text-xs font-semibold">
      Inactive
    </span>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5 transition-colors"
    >
      {children}
    </button>
  );
}

/* ---------- Add/Edit dialog ---------- */

type FormState = {
  coupon_name: string;
  coupon_code: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  minimum_order_amount: string;
  maximum_discount: string;
  usage_limit: string;
  per_customer_limit: string;
  valid_from: string;
  valid_until: string;
  applicable_modules: CouponModule[];
  is_active: boolean;
  internal_notes: string;
};

function rowToForm(r?: CouponRow): FormState {
  return {
    coupon_name: r?.coupon_name ?? "",
    coupon_code: r?.coupon_code ?? "",
    discount_type: r?.discount_type ?? "percentage",
    discount_value: r?.discount_value != null ? String(r.discount_value) : "",
    minimum_order_amount: r?.minimum_order_amount != null ? String(r.minimum_order_amount) : "",
    maximum_discount: r?.maximum_discount != null ? String(r.maximum_discount) : "",
    usage_limit: r?.usage_limit != null ? String(r.usage_limit) : "",
    per_customer_limit: r?.per_customer_limit != null ? String(r.per_customer_limit) : "",
    valid_from: toDatetimeLocal(r?.valid_from) || toDatetimeLocal(new Date().toISOString()),
    valid_until:
      toDatetimeLocal(r?.valid_until) ||
      toDatetimeLocal(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()),
    applicable_modules: r?.applicable_modules ?? [],
    is_active: r?.is_active ?? true,
    internal_notes: r?.internal_notes ?? "",
  };
}

function CouponDialog({
  mode,
  row,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  row?: CouponRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const createFn = useServerFn(createCoupon);
  const updateFn = useServerFn(updateCoupon);
  const [form, setForm] = useState<FormState>(rowToForm(row));

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        coupon_name: form.coupon_name,
        coupon_code: form.coupon_code.toUpperCase(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        minimum_order_amount: form.minimum_order_amount ? Number(form.minimum_order_amount) : null,
        maximum_discount:
          form.discount_type === "percentage" && form.maximum_discount
            ? Number(form.maximum_discount)
            : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        per_customer_limit: form.per_customer_limit ? Number(form.per_customer_limit) : null,
        valid_from: new Date(form.valid_from).toISOString(),
        valid_until: new Date(form.valid_until).toISOString(),
        applicable_modules: form.applicable_modules,
        is_active: form.is_active,
        internal_notes: form.internal_notes || null,
      };
      if (mode === "edit" && row) {
        return updateFn({ data: { ...payload, id: row.id } });
      }
      return createFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(mode === "edit" ? "Coupon updated" : "Coupon created");
      onSaved();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const toggleModule = (m: CouponModule) =>
    setForm((f) => ({
      ...f,
      applicable_modules: f.applicable_modules.includes(m)
        ? f.applicable_modules.filter((x) => x !== m)
        : [...f.applicable_modules, m],
    }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Coupon" : "Add Coupon"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Coupon Name" required>
              <input
                value={form.coupon_name}
                onChange={(e) => setForm({ ...form, coupon_name: e.target.value })}
                className="input"
                placeholder="Eid Sale"
              />
            </FormField>
            <FormField label="Coupon Code" required>
              <input
                value={form.coupon_code}
                onChange={(e) => setForm({ ...form, coupon_code: e.target.value.toUpperCase() })}
                className="input font-mono"
                placeholder="EID2026"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Discount Type" required>
              <select
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })}
                className="input"
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </FormField>
            <FormField label={`Discount Value${form.discount_type === "percentage" ? " (%)" : " (Rs)"}`} required>
              <input
                type="number"
                min="0"
                max={form.discount_type === "percentage" ? "100" : undefined}
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                className="input"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Minimum Order Amount (Rs)">
              <input
                type="number"
                min="0"
                value={form.minimum_order_amount}
                onChange={(e) => setForm({ ...form, minimum_order_amount: e.target.value })}
                className="input"
                placeholder="Optional"
              />
            </FormField>
            {form.discount_type === "percentage" && (
              <FormField label="Maximum Discount (Rs)">
                <input
                  type="number"
                  min="0"
                  value={form.maximum_discount}
                  onChange={(e) => setForm({ ...form, maximum_discount: e.target.value })}
                  className="input"
                  placeholder="Optional cap"
                />
              </FormField>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Usage Limit (total)">
              <input
                type="number"
                min="1"
                value={form.usage_limit}
                onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                className="input"
                placeholder="Optional"
              />
            </FormField>
            <FormField label="Per Customer Limit">
              <input
                type="number"
                min="1"
                value={form.per_customer_limit}
                onChange={(e) => setForm({ ...form, per_customer_limit: e.target.value })}
                className="input"
                placeholder="Optional"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Valid From" required>
              <input
                type="datetime-local"
                value={form.valid_from}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                className="input"
              />
            </FormField>
            <FormField label="Valid Until" required>
              <input
                type="datetime-local"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                className="input"
              />
            </FormField>
          </div>

          <FormField label="Applicable Modules" hint="Leave all unchecked to apply site-wide.">
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map((m) => (
                <label
                  key={m.id}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer text-sm ${
                    form.applicable_modules.includes(m.id)
                      ? "border-[#CF0A0A] bg-[#CF0A0A]/5"
                      : "border-black/10 hover:border-black/20"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.applicable_modules.includes(m.id)}
                    onChange={() => toggleModule(m.id)}
                    className="accent-[#CF0A0A]"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </FormField>

          <FormField label="Status">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 accent-[#CF0A0A]"
              />
              <span className="text-sm text-black/70">
                {form.is_active ? "Active — customers can use this coupon" : "Inactive"}
              </span>
            </label>
          </FormField>

          <FormField label="Internal Notes (admin only)">
            <textarea
              rows={3}
              value={form.internal_notes}
              onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
              className="input"
              placeholder="Internal reference…"
            />
          </FormField>
        </div>

        <DialogFooter className="pt-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#CF0A0A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a80808] disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </DialogFooter>

        <style>{`.input{width:100%;height:2.5rem;border:1px solid rgb(0 0 0 / 0.1);border-radius:0.75rem;padding:0 0.75rem;font-size:0.875rem;outline:none;background:white}
        textarea.input{height:auto;padding:0.5rem 0.75rem}
        .input:focus{border-color:#CF0A0A}`}</style>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-black/60 mb-1.5">
        {label} {required && <span className="text-[#CF0A0A]">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-black/40">{hint}</p>}
    </div>
  );
}

function ViewDialog({ row, onClose }: { row: CouponRow; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-[#CF0A0A]" />
            {row.coupon_code}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <Info k="Name" v={row.coupon_name} />
          <Info
            k="Discount"
            v={row.discount_type === "percentage" ? `${row.discount_value}%` : `Rs ${row.discount_value}`}
          />
          {row.discount_type === "percentage" && row.maximum_discount != null && (
            <Info k="Max Discount" v={`Rs ${row.maximum_discount}`} />
          )}
          <Info
            k="Minimum Order"
            v={row.minimum_order_amount != null ? `Rs ${row.minimum_order_amount}` : "—"}
          />
          <Info
            k="Usage"
            v={`${row.used_count}${row.usage_limit != null ? ` / ${row.usage_limit}` : " (unlimited)"}`}
          />
          <Info
            k="Per Customer Limit"
            v={row.per_customer_limit != null ? String(row.per_customer_limit) : "Unlimited"}
          />
          <Info k="Valid From" v={formatDate(row.valid_from)} />
          <Info k="Valid Until" v={formatDate(row.valid_until)} />
          <Info
            k="Modules"
            v={row.applicable_modules.length ? row.applicable_modules.join(", ") : "Site-wide"}
          />
          <Info k="Status" v={row.is_active ? "Active" : "Inactive"} />
          {row.internal_notes && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-black/50 font-semibold">Notes</p>
              <p className="mt-1 text-sm text-black/70 whitespace-pre-line">{row.internal_notes}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <button
            onClick={onClose}
            className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold hover:bg-black/5 inline-flex items-center gap-2"
          >
            <X className="h-4 w-4" /> Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-black/5 pb-2">
      <span className="text-black/50">{k}</span>
      <span className="font-semibold text-black text-right">{v}</span>
    </div>
  );
}
