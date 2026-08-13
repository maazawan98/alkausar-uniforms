import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Eye, Search, Download, Trash2, Users, Package, ChevronDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listCustomerSummaries, listCustomerHistory, deleteCustomerHistoryByCustomer,
  type CustomerSummary, type HistoryRecord,
} from "@/lib/admin-customers.functions";

export const Route = createFileRoute("/admin/customers")({
  component: AdminCustomersPage,
});

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtMoney(n: number) { return `Rs ${Number(n || 0).toLocaleString("en-PK")}`; }
function moduleLabel(m: string) { return !m ? "—" : m.charAt(0).toUpperCase() + m.slice(1); }

function AdminCustomersPage() {
  const listFn = useServerFn(listCustomerSummaries);
  const q = useQuery<CustomerSummary[]>({
    queryKey: ["admin-customers"],
    queryFn: () => listFn(),
  });

  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<CustomerSummary | null>(null);
  const [deleting, setDeleting] = useState<CustomerSummary | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((c) => {
      if (!s) return true;
      return [c.name, c.email, c.phone ?? ""].join(" ").toLowerCase().includes(s);
    });
  }, [q.data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div>
      <PageHeader title="Customers" subtitle="All customers with confirmed order history." />

      <QuerySummaryCards />



      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email or phone…"
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-black/50">{filtered.length} {filtered.length === 1 ? "customer" : "customers"}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={filtered.length === 0} className="h-10 rounded-xl bg-black text-white hover:bg-black/85">
                <Download className="h-4 w-4 mr-2" /> Export <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => exportAll(filtered)}>Export All Customer Data</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportEmails(filtered)}>Export Email List Only</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPhones(filtered)}>Export Phone Numbers Only</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setExportOpen(true)}>Custom Export…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-20rem)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-black/55">
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Customer</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Email</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Phone</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">Total Orders</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Last Order</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">Total Spent</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {q.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F1F1F1]">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="mx-auto h-14 w-14 rounded-full bg-[#F3F4F6] grid place-items-center mb-3">
                      <Users className="h-6 w-6 text-black/40" />
                    </div>
                    <p className="text-black/60 font-medium">No customer history yet</p>
                    <p className="text-xs text-black/40 mt-1">Customers appear here after their first order is confirmed.</p>
                  </td>
                </tr>
              ) : paginated.map((c) => (
                <tr key={c.key} className="border-b border-[#F1F1F1] hover:bg-[#FAFAFA] transition-colors">
                  <td className="px-4 py-3 font-semibold text-black whitespace-nowrap">{c.name || "—"}</td>
                  <td className="px-4 py-3 text-black/70 whitespace-nowrap">{c.email}</td>
                  <td className="px-4 py-3 text-black/70 whitespace-nowrap">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.total_orders}</td>
                  <td className="px-4 py-3 text-black/70 whitespace-nowrap">{fmtDay(c.last_order)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">{fmtMoney(c.total_spent)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border-blue-200">
                      {c.last_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setViewing(c)}
                        className="inline-grid place-items-center h-8 w-8 rounded-lg border border-[#E5E7EB] hover:bg-black hover:text-white hover:border-black transition-colors"
                        title="View history"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => setDeleting(c)}
                        className="inline-grid place-items-center h-8 w-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors"
                        title="Delete history"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB] bg-[#FAFAFA]">
            <p className="text-xs text-black/60">Page {currentPage} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      <ViewCustomerDialog customer={viewing} onClose={() => setViewing(null)} />
      <DeleteConfirmDialog customer={deleting} onClose={() => setDeleting(null)} />
      <CustomExportDialog open={exportOpen} onClose={() => setExportOpen(false)} rows={filtered} />
    </div>
  );
}

/* ---------------- Export helpers ---------------- */

const ALL_COLUMNS = [
  { key: "name", label: "Customer Name", width: 24 },
  { key: "email", label: "Email", width: 30 },
  { key: "phone", label: "Phone", width: 18 },
  { key: "address", label: "Address", width: 40 },
  { key: "total_orders", label: "Total Orders", width: 14 },
  { key: "total_spent", label: "Total Spent", width: 16 },
  { key: "last_order", label: "Last Order", width: 18 },
  { key: "payment_method", label: "Payment Method", width: 18 },
  { key: "coupon", label: "Coupon Used", width: 16 },
  { key: "status", label: "Order Status", width: 14 },
] as const;

type ColKey = (typeof ALL_COLUMNS)[number]["key"];

function rowFor(c: CustomerSummary, key: ColKey) {
  switch (key) {
    case "name": return c.name;
    case "email": return c.email;
    case "phone": return c.phone ?? "";
    case "address": return c.last_address ?? "";
    case "total_orders": return c.total_orders;
    case "total_spent": return Number(c.total_spent || 0);
    case "last_order": return fmtDay(c.last_order);
    case "payment_method": return (c.last_payment_method ?? "").toUpperCase();
    case "coupon": return c.last_coupon ?? "";
    case "status": return c.last_status;
  }
}

async function exportCustom(rows: CustomerSummary[], columns: ColKey[], sheetName: string) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  const cols = ALL_COLUMNS.filter((c) => columns.includes(c.key));
  ws.columns = cols.map((c) => ({ header: c.label, key: c.key, width: c.width }));
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => {
    const rec: Record<string, any> = {};
    cols.forEach((c) => { rec[c.key] = rowFor(r, c.key); });
    ws.addRow(rec);
  });
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customers_${sheetName.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
const exportAll = (rows: CustomerSummary[]) =>
  exportCustom(rows, ALL_COLUMNS.map((c) => c.key), "All Customer Data");
const exportEmails = (rows: CustomerSummary[]) =>
  exportCustom(rows, ["name", "email"], "Emails");
const exportPhones = (rows: CustomerSummary[]) =>
  exportCustom(rows, ["name", "phone"], "Phones");

/* ---------------- Custom export dialog ---------------- */

function CustomExportDialog({ open, onClose, rows }:
  { open: boolean; onClose: () => void; rows: CustomerSummary[] }) {
  const [sel, setSel] = useState<Record<ColKey, boolean>>({
    name: true, email: true, phone: true, address: false, total_orders: true,
    total_spent: true, last_order: true, payment_method: false, coupon: false, status: false,
  });
  const active = ALL_COLUMNS.filter((c) => sel[c.key]).map((c) => c.key);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Custom Export</DialogTitle>
          <DialogDescription>Choose the columns to include in the Excel file.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-2">
          {ALL_COLUMNS.map((c) => (
            <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-black/[0.03]">
              <Checkbox checked={sel[c.key]} onCheckedChange={(v) => setSel((s) => ({ ...s, [c.key]: !!v }))} />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={active.length === 0}
            onClick={async () => { await exportCustom(rows, active, "Custom Export"); onClose(); }}
            className="bg-black text-white hover:bg-black/85"
          >
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Delete confirm ---------------- */

function DeleteConfirmDialog({ customer, onClose }: { customer: CustomerSummary | null; onClose: () => void }) {
  const qc = useQueryClient();
  const delFn = useServerFn(deleteCustomerHistoryByCustomer);
  const mut = useMutation({
    mutationFn: () => delFn({
      data: {
        customerId: customer?.customer_id ?? null,
        email: customer?.email ?? "",
      },
    }),
    onSuccess: () => {
      toast.success("Customer history deleted");
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  return (
    <Dialog open={!!customer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This will permanently delete the customer history for{" "}
            <span className="font-semibold text-black">{customer?.name || customer?.email}</span>.
            The original orders will not be affected. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={mut.isPending}
            onClick={() => mut.mutate()}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- View customer dialog ---------------- */

function ViewCustomerDialog({ customer, onClose }: { customer: CustomerSummary | null; onClose: () => void }) {
  const listFn = useServerFn(listCustomerHistory);
  const q = useQuery<HistoryRecord[]>({
    queryKey: ["admin-customer-history", customer?.key],
    queryFn: () => listFn({ data: { customerId: customer?.customer_id ?? null, email: customer?.email ?? "" } }),
    enabled: !!customer,
  });

  return (
    <Dialog open={!!customer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl">
        {customer && (
          <div>
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#E5E7EB] sticky top-0 bg-white z-10">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-black/45">Customer</p>
                  <DialogTitle className="text-xl font-bold text-black mt-1">{customer.name || customer.email}</DialogTitle>
                  <p className="text-xs text-black/60 mt-1">{customer.email} · {customer.phone ?? "no phone"}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-black/50 text-[11px] uppercase tracking-wider">Total Spent</p>
                  <p className="text-lg font-bold text-black tabular-nums">{fmtMoney(customer.total_spent)}</p>
                  <p className="text-xs text-black/60">{customer.total_orders} order{customer.total_orders === 1 ? "" : "s"}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 py-6 space-y-4">
              {q.isLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
              ) : (q.data ?? []).length === 0 ? (
                <p className="text-sm text-black/50">No history records.</p>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-black/55 font-semibold mb-2">Order Timeline</p>
                    <div className="border-l-2 border-[#E5E7EB] pl-4 space-y-3">
                      {q.data!.map((h) => (
                        <div key={h.id} className="relative">
                          <span className="absolute -left-[22px] top-1.5 h-3 w-3 rounded-full bg-[#CF0A0A] border-2 border-white" />
                          <p className="text-sm font-semibold text-black">{h.order_number}</p>
                          <p className="text-xs text-black/60">{fmtDate(h.confirmed_at)} · {h.order_status.toUpperCase()} · {fmtMoney(h.grand_total)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {q.data!.map((h) => (
                    <div key={h.id} className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-black">{h.order_number}</p>
                          <p className="text-xs text-black/60">{fmtDate(h.order_date)}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 font-semibold uppercase tracking-wider">{h.order_status}</span>
                          <span className="rounded-full bg-black/5 border border-black/10 px-2.5 py-0.5 font-semibold uppercase tracking-wider">{(h.payment_method || "—").toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="p-4 grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-semibold mb-2">Shipping</p>
                          <p className="text-black/80">{h.address}</p>
                          <p className="text-black/60">{[h.city, h.postal_code, h.country].filter(Boolean).join(", ")}</p>
                          {h.delivery_note && <p className="text-black/60 mt-1 text-xs">Note: {h.delivery_note}</p>}
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-semibold mb-2">Payment</p>
                          <p className="text-black/80">{(h.payment_method || "—").toUpperCase()} · {(h.payment_status || "—").replace(/_/g, " ").toUpperCase()}</p>
                          {h.payment_screenshot && (
                            <a href={h.payment_screenshot} target="_blank" rel="noreferrer"
                              className="text-xs text-[#CF0A0A] hover:underline mt-1 inline-block">View proof</a>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-semibold mb-2">Totals</p>
                          <p className="text-black/70 text-xs">Subtotal: {fmtMoney(h.subtotal)}</p>
                          <p className="text-black/70 text-xs">Delivery: {fmtMoney(h.delivery_charge)}</p>
                          {h.coupon_code && (
                            <p className="text-green-700 text-xs">Coupon {h.coupon_code}: -{fmtMoney(h.coupon_discount)}</p>
                          )}
                          <p className="text-black font-bold mt-1">Total: {fmtMoney(h.grand_total)}</p>
                        </div>
                      </div>
                      <div className="border-t border-[#E5E7EB]">
                        <table className="w-full text-xs">
                          <thead className="bg-[#F9FAFB] text-[10px] uppercase tracking-[0.1em] text-black/55">
                            <tr>
                              <th className="text-left px-3 py-2 font-semibold">Product</th>
                              <th className="text-left px-3 py-2 font-semibold">Module</th>
                              <th className="text-left px-3 py-2 font-semibold">Colour</th>
                              <th className="text-left px-3 py-2 font-semibold">Size</th>
                              <th className="text-left px-3 py-2 font-semibold">Gender</th>
                              <th className="text-left px-3 py-2 font-semibold">Class</th>
                              <th className="text-left px-3 py-2 font-semibold">Type</th>
                              <th className="text-right px-3 py-2 font-semibold">Qty</th>
                              <th className="text-right px-3 py-2 font-semibold">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(h.items ?? []).map((it, idx) => (
                              <tr key={idx} className="border-t border-[#F1F1F1]">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-10 w-8 rounded bg-[#F5F5F5] overflow-hidden shrink-0 grid place-items-center">
                                      {it.product_image ? (
                                        <img src={it.product_image} alt="" className="h-full w-full object-contain" />
                                      ) : <Package className="h-3 w-3 text-black/30" />}
                                    </div>
                                    <span className="text-black/85">{it.product_name}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-black/70">{moduleLabel(it.module)}</td>
                                <td className="px-3 py-2 text-black/70">{it.color ?? "—"}</td>
                                <td className="px-3 py-2 text-black/70">{it.size ?? "—"}</td>
                                <td className="px-3 py-2 text-black/70">{it.gender ?? "—"}</td>
                                <td className="px-3 py-2 text-black/70">{it.class_name ?? "—"}</td>
                                <td className="px-3 py-2 text-black/70">{it.product_type ?? "—"}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{it.quantity}</td>
                                <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmtMoney(it.total_price)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────── Query Summary Cards ───────────────────────────────
import { Link } from "@tanstack/react-router";
import { Mail, MessageSquare } from "lucide-react";
import { adminQueryCounts } from "@/lib/customer-query.functions";

function QuerySummaryCards() {
  const countsFn = useServerFn(adminQueryCounts);
  const q = useQuery({
    queryKey: ["admin-query-counts"],
    queryFn: () => countsFn(),
  });
  const c = q.data ?? { newsletter_total: 0, contact_total: 0, contact_new: 0 };

  return (
    <div className="grid sm:grid-cols-2 gap-4 mb-6">
      <Link
        to="/admin/newsletter"
        className="group rounded-2xl border border-[#E5E7EB] bg-white p-5 hover:border-black hover:shadow-sm transition-all"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-black/50 font-semibold">Newsletter</p>
            <p className="mt-2 text-3xl font-bold text-black">{c.newsletter_total}</p>
            <p className="mt-1 text-xs text-black/60">Active subscribers</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-700 grid place-items-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Mail className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-4 text-xs font-semibold text-black/70 group-hover:text-black">View subscribers →</p>
      </Link>

      <Link
        to="/admin/messages"
        className="group rounded-2xl border border-[#E5E7EB] bg-white p-5 hover:border-black hover:shadow-sm transition-all"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-black/50 font-semibold">Contact Messages</p>
            <p className="mt-2 text-3xl font-bold text-black">{c.contact_total}</p>
            <p className="mt-1 text-xs text-black/60">
              {c.contact_new > 0 ? (
                <span className="text-blue-700 font-semibold">{c.contact_new} unread</span>
              ) : "All read"}
            </p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <MessageSquare className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-4 text-xs font-semibold text-black/70 group-hover:text-black">View messages →</p>
      </Link>
    </div>
  );
}
