import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Eye,
  Search,
  Download,
  Package,
  CheckCircle2,
  Truck,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Printer,
  Check,
  X,
  Undo2,
  PackageCheck,
  Trash2,
  Lock,
} from "lucide-react";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listAdminOrders,
  getAdminOrderCounts,
  setOrderStatus,
  setPaymentStatus,
  deleteOrderPermanently,
  type AdminOrderCounts,
} from "@/lib/admin-orders.functions";
import type { Order } from "@/lib/shop.functions";
import { getActiveBusinessInformation, type BusinessInformationRow } from "@/lib/business-info.functions";
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

export const Route = createFileRoute("/admin/orders")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: typeof search.status === "string" ? search.status : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  component: AdminOrdersPage,
});

type StatusKey = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

const TABS: { key: StatusKey; label: string; icon: typeof Package; tone: string }[] = [
  { key: "pending", label: "New Orders", icon: Package, tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "confirmed", label: "Confirmed Orders", icon: CheckCircle2, tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "shipped", label: "Shipping Orders", icon: Truck, tone: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "delivered", label: "Delivered Orders", icon: PackageCheck, tone: "bg-green-50 text-green-700 border-green-200" },
  { key: "cancelled", label: "Cancelled Orders", icon: XCircle, tone: "bg-red-50 text-red-700 border-red-200" },
];

const MODULES = [
  { value: "all", label: "All Modules" },
  { value: "school", label: "School" },
  { value: "college", label: "College" },
  { value: "medical", label: "Medical" },
  { value: "accessories", label: "Accessories" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}
function fmtMoney(n: number) { return `Rs ${Number(n || 0).toLocaleString("en-PK")}`; }
function moduleLabel(m: string) { return !m ? "—" : m.charAt(0).toUpperCase() + m.slice(1); }
function esc(s: any) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function primaryModule(o: Order) {
  const mods = Array.from(new Set((o.items ?? []).map((i) => i.module)));
  if (mods.length === 0) return "—";
  if (mods.length === 1) return moduleLabel(mods[0]);
  return "Mixed";
}
function totalQty(o: Order) {
  return (o.items ?? []).reduce((s, it) => s + Number(it.quantity || 0), 0);
}

function paymentStatusLabel(s: string | null | undefined) {
  const map: Record<string, string> = {
    pending_verification: "Pending Verification",
    verified: "Verified",
    rejected: "Rejected",
    not_applicable: "N/A",
  };
  return map[s ?? ""] ?? (s ?? "—");
}

function buildInvoiceHtml(o: Order, biz: BusinessInformationRow | null) {
  const rows = (o.items ?? []).map((it) => `
    <tr>
      <td>${esc(it.product_name)}${it.color || it.size || it.gender || it.class_name || it.product_type ? `<div class="meta">${[it.color, it.size, it.gender, it.class_name, it.product_type].filter(Boolean).map(esc).join(" · ")}</div>` : ""}</td>
      <td class="num">${esc(it.quantity)}</td>
      <td class="num">${esc(fmtMoney(it.unit_price))}</td>
      <td class="num">${esc(fmtMoney(it.total_price))}</td>
    </tr>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Invoice ${esc(o.order_number)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font: 12px/1.5 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color:#111; margin:0; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #111; padding-bottom:12px; margin-bottom:16px; }
    .biz h1 { margin:0 0 4px; font-size:18px; }
    .biz p { margin:2px 0; color:#444; font-size:11px; }
    .inv { text-align:right; }
    .inv h2 { margin:0; font-size:22px; letter-spacing:1px; color:#CF0A0A; }
    .inv .no { font-weight:700; font-size:14px; margin-top:4px; }
    .inv .date, .inv .status { font-size:11px; color:#444; margin-top:2px; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px; }
    .card { border:1px solid #ddd; border-radius:6px; padding:10px 12px; }
    .card h3 { margin:0 0 6px; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#666; }
    .card p { margin:2px 0; font-size:12px; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th, td { border-bottom:1px solid #eee; padding:8px 6px; text-align:left; font-size:12px; vertical-align:top; }
    th { background:#f7f7f7; text-transform:uppercase; font-size:10px; letter-spacing:1px; color:#555; }
    .num { text-align:right; white-space:nowrap; }
    .meta { color:#777; font-size:10px; margin-top:2px; }
    .totals { margin-top:12px; margin-left:auto; width:280px; }
    .totals .row { display:flex; justify-content:space-between; padding:4px 0; font-size:12px; }
    .totals .grand { border-top:2px solid #111; margin-top:6px; padding-top:8px; font-weight:700; font-size:14px; }
    .foot { margin-top:24px; text-align:center; color:#888; font-size:10px; border-top:1px solid #eee; padding-top:8px; }
    @media print { .noprint { display:none } }
  </style></head><body>
    <div class="head">
      <div class="biz">
        <h1>${esc(biz?.business_name ?? "Alkausar Uniforms")}</h1>
        ${biz?.address ? `<p>${esc(biz.address)}</p>` : ""}
        ${biz?.phone_number ? `<p>Phone: ${esc(biz.phone_number)}</p>` : ""}
        ${biz?.email ? `<p>Email: ${esc(biz.email)}</p>` : ""}
      </div>
      <div class="inv">
        <h2>INVOICE</h2>
        <div class="no">${esc(o.order_number)}</div>
        <div class="date">Date: ${esc(fmtDate(o.created_at))}</div>
        <div class="status">Status: ${esc(String(o.status).toUpperCase())}</div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h3>Bill To</h3>
        <p><strong>${esc(o.full_name)}</strong></p>
        <p>${esc(o.phone ?? "—")}</p>
        <p>${esc(o.email)}</p>
      </div>
      <div class="card">
        <h3>Ship To</h3>
        <p>${esc(o.address)}</p>
        <p>${esc(o.city)}${o.postal_code ? ", " + esc(o.postal_code) : ""}</p>
        <p>${esc(o.country)}</p>
        ${o.delivery_note ? `<p class="meta">Note: ${esc(o.delivery_note)}</p>` : ""}
      </div>
    </div>

    <table>
      <thead><tr>
        <th>Product</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${esc(fmtMoney(o.subtotal))}</span></div>
      <div class="row"><span>Delivery</span><span>${esc(fmtMoney(o.delivery_charge))}</span></div>
      ${o.coupon_code ? `<div class="row"><span>Coupon (${esc(o.coupon_code)})</span><span>- ${esc(fmtMoney(o.coupon_discount))}</span></div>` : ""}
      <div class="row grand"><span>Grand Total</span><span>${esc(fmtMoney(o.total))}</span></div>
    </div>

    <div class="grid" style="margin-top:24px">
      <div class="card">
        <h3>Payment</h3>
        <p>Method: <strong>${esc(o.payment_method === "cod" ? "Cash on Delivery" : "Online Payment")}</strong></p>
        ${o.payment_method === "online" ? `<p>Status: ${esc(paymentStatusLabel(o.payment_status))}</p>` : ""}
      </div>
      ${o.coupon_code ? `<div class="card">
        <h3>Coupon</h3>
        <p>Code: <strong>${esc(o.coupon_code)}</strong></p>
        <p>Type: ${esc(String(o.coupon_discount_type ?? "").toUpperCase())}</p>
        <p>Discount: ${esc(fmtMoney(o.coupon_discount))}</p>
      </div>` : `<div class="card"><h3>Coupon</h3><p class="meta">No coupon applied</p></div>`}
    </div>

    <div class="foot">Thank you for shopping with ${esc(biz?.business_name ?? "us")}.</div>
    <script>window.onload=function(){setTimeout(function(){window.print()},250)};<\/script>
  </body></html>`;
}

function printOrder(o: Order, biz: BusinessInformationRow | null) {
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) { toast.error("Popup blocked — allow popups to print."); return; }
  w.document.open();
  w.document.write(buildInvoiceHtml(o, biz));
  w.document.close();
}

function AdminOrdersPage() {
  const sp = Route.useSearch();
  const initialTab = (["pending", "confirmed", "shipped", "delivered", "cancelled"] as const).includes(
    sp.status as StatusKey,
  )
    ? (sp.status as StatusKey)
    : "pending";
  const [tab, setTab] = useState<StatusKey>(initialTab);
  const listFn = useServerFn(listAdminOrders);
  const countsFn = useServerFn(getAdminOrderCounts);
  const bizFn = useServerFn(getActiveBusinessInformation);

  const countsQ = useQuery<AdminOrderCounts>({
    queryKey: ["admin-orders", "counts"],
    queryFn: () => countsFn(),
    refetchOnWindowFocus: true,
  });

  const ordersQ = useQuery<Order[]>({
    queryKey: ["admin-orders", "list", tab],
    queryFn: () => listFn({ data: { status: tab } }),
  });

  const bizQ = useQuery<BusinessInformationRow | null>({
    queryKey: ["business-info", "active"],
    queryFn: () => bizFn(),
    staleTime: 5 * 60_000,
  });

  const [search, setSearch] = useState(sp.q ?? "");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<Order | null>(null);

  const pageSize = 25;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (ordersQ.data ?? []).filter((o) => {
      if (q) {
        const hay = [o.order_number, o.full_name, o.phone ?? "", o.email].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (moduleFilter !== "all") {
        if (!(o.items ?? []).some((i) => i.module === moduleFilter)) return false;
      }
      if (paymentFilter !== "all" && o.payment_method !== paymentFilter) return false;
      if (dateFilter) {
        const d = new Date(o.created_at).toISOString().slice(0, 10);
        if (d !== dateFilter) return false;
      }
      return true;
    });
  }, [ordersQ.data, search, moduleFilter, paymentFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeTab = TABS.find((t) => t.key === tab)!;

  const exportXlsx = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Orders");
    ws.columns = [
      { header: "Order Number", key: "order_number", width: 22 },
      { header: "Order Date", key: "order_date", width: 18 },
      { header: "Customer", key: "customer", width: 24 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Email", key: "email", width: 28 },
      { header: "Module", key: "module", width: 14 },
      { header: "Total Products", key: "qty", width: 14 },
      { header: "Grand Total", key: "total", width: 14 },
      { header: "Payment Method", key: "payment", width: 16 },
      { header: "Payment Status", key: "pstatus", width: 20 },
      { header: "Order Status", key: "status", width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    filtered.forEach((o) => {
      ws.addRow({
        order_number: o.order_number,
        order_date: fmtDay(o.created_at),
        customer: o.full_name,
        phone: o.phone ?? "",
        email: o.email,
        module: primaryModule(o),
        qty: totalQty(o),
        total: Number(o.total ?? 0),
        payment: (o.payment_method || "").toUpperCase(),
        pstatus: paymentStatusLabel(o.payment_status),
        status: o.status,
      });
    });
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${tab}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Orders" subtitle="Monitor and manage all customer orders across every module." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {TABS.map((t) => {
          const Icon = t.icon;
          const count = countsQ.data ? countsQ.data[t.key] : null;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={[
                "text-left rounded-2xl border p-5 transition-all",
                isActive
                  ? "border-[#CF0A0A] shadow-[0_4px_16px_-4px_rgba(207,10,10,0.25)] bg-white"
                  : "border-[#E5E7EB] bg-white hover:border-black/20 hover:shadow-sm",
              ].join(" ")}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-black/50 font-semibold">{t.label}</p>
                  <p className="mt-3 text-3xl font-bold text-black tabular-nums">
                    {count === null ? <Skeleton className="h-8 w-12" /> : count}
                  </p>
                </div>
                <div className={`grid place-items-center h-10 w-10 rounded-xl border ${t.tone}`}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search order #, customer, phone, email…"
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] h-10 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MODULES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[170px] h-10 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="cod">Cash on Delivery</SelectItem>
            <SelectItem value="online">Online Payment</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date" value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
          className="w-[170px] h-10 rounded-xl"
        />
        {(search || moduleFilter !== "all" || paymentFilter !== "all" || dateFilter) && (
          <Button variant="ghost" className="h-10 rounded-xl"
            onClick={() => { setSearch(""); setModuleFilter("all"); setPaymentFilter("all"); setDateFilter(""); setPage(1); }}>
            Clear
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-black/50">{filtered.length} {filtered.length === 1 ? "order" : "orders"}</span>
          <Button onClick={exportXlsx} disabled={filtered.length === 0}
            className="h-10 rounded-xl bg-black text-white hover:bg-black/85">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5E7EB] bg-white overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-24rem)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-black/55">
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Order #</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Customer Name</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Phone</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Email</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">Grand Total</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ordersQ.isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F1F1F1]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : ordersQ.isError ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-red-600">Failed to load orders.</td></tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="mx-auto h-14 w-14 rounded-full bg-[#F3F4F6] grid place-items-center mb-3">
                      <activeTab.icon className="h-6 w-6 text-black/40" />
                    </div>
                    <p className="text-black/60 font-medium">No {activeTab.label.toLowerCase()} yet</p>
                  </td>
                </tr>
              ) : (
                paginated.map((o) => (
                  <tr key={o.id} className="border-b border-[#F1F1F1] hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3 font-semibold text-black whitespace-nowrap">{o.order_number}</td>
                    <td className="px-4 py-3 text-black/80 whitespace-nowrap">{o.full_name}</td>
                    <td className="px-4 py-3 text-black/70 whitespace-nowrap">{o.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-black/70 whitespace-nowrap">{o.email}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">{fmtMoney(o.total)}</td>
                    <td className="px-4 py-3">
                      <RowActions
                        order={o}
                        tab={tab}
                        onView={() => setViewing(o)}
                        onPrint={() => printOrder(o, bizQ.data ?? null)}
                      />
                    </td>
                  </tr>
                ))
              )}
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

      <OrderDetailsDialog
        order={viewing}
        onClose={() => setViewing(null)}
        currentTab={tab}
        onPrint={(o) => printOrder(o, bizQ.data ?? null)}
      />
    </div>
  );
}

/* ---------- Row action icons (per tab) ---------- */

function IconBtn({
  title, onClick, className = "", disabled = false, children,
}: {
  title: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-grid place-items-center h-8 w-8 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}>
      {children}
    </button>
  );
}

function RowActions({
  order, tab, onView, onPrint,
}: {
  order: Order;
  tab: StatusKey;
  onView: () => void;
  onPrint: () => void;
}) {
  const qc = useQueryClient();
  const setStatusFn = useServerFn(setOrderStatus);
  const setPayFn = useServerFn(setPaymentStatus);
  const deleteFn = useServerFn(deleteOrderPermanently);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-orders"] });

  const statusMut = useMutation({
    mutationFn: (v: { status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"; toastMsg: string }) =>
      setStatusFn({ data: { orderId: order.id, status: v.status } }),
    onSuccess: (_d, v) => { toast.success(v.toastMsg); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update order"),
  });

  const payMut = useMutation({
    mutationFn: (v: { status: "verified" | "rejected" }) =>
      setPayFn({ data: { orderId: order.id, status: v.status } }),
    onSuccess: (_d, v) => {
      toast.success(v.status === "verified" ? "Payment verified" : "Payment rejected");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update payment"),
  });

  const deleteMut = useMutation({
    mutationFn: (v: { keepHistory: boolean }) =>
      deleteFn({ data: { orderId: order.id, keepHistory: v.keepHistory } }),
    onSuccess: () => { toast.success("Order deleted permanently"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete order"),
  });

  const [confirm, setConfirm] = useState<
    | null
    | { kind: "reject" | "deliver" | "backToPending" | "deleteCancelled" | "deleteDelivered" }
  >(null);
  const busy = statusMut.isPending || payMut.isPending || deleteMut.isPending;

  const isOnline = order.payment_method === "online";
  const paymentVerified = order.payment_status === "verified";
  const canApprove = !isOnline || paymentVerified;

  const confirmMap: Record<string, {
    title: string; description: string; label: string; danger?: boolean; onConfirm: () => void;
  }> = {
    reject: {
      title: "Reject this order?",
      description: "The order will be moved to Cancelled Orders.",
      label: "Yes, Reject",
      danger: true,
      onConfirm: () => statusMut.mutate({ status: "cancelled", toastMsg: "Order rejected" }),
    },
    deliver: {
      title: "Mark this order as delivered?",
      description: "The order will move to Delivered Orders.",
      label: "Yes, Mark Delivered",
      onConfirm: () => statusMut.mutate({ status: "delivered", toastMsg: "Order marked as delivered" }),
    },
    backToPending: {
      title: "Move this order back to Pending?",
      description: "The order will return to New Orders. Its customer history stays intact.",
      label: "Yes, Move Back",
      onConfirm: () => statusMut.mutate({ status: "pending", toastMsg: "Order moved back to Pending" }),
    },
    deleteCancelled: {
      title: "Delete this order permanently?",
      description: "This action cannot be undone. The customer will no longer see it in My Orders.",
      label: "Delete Permanently",
      danger: true,
      onConfirm: () => deleteMut.mutate({ keepHistory: false }),
    },
    deleteDelivered: {
      title: "Delete this order permanently?",
      description: "The order will be removed from admin. The customer will still see it in My Orders via purchase history.",
      label: "Delete Permanently",
      danger: true,
      onConfirm: () => deleteMut.mutate({ keepHistory: true }),
    },
  };

  return (
    <div className="flex items-center justify-center gap-1.5">
      <IconBtn title="View details" onClick={onView}
        className="border-[#E5E7EB] hover:bg-black hover:text-white hover:border-black">
        <Eye className="h-4 w-4" />
      </IconBtn>

      {tab === "pending" && (
        <>
          {isOnline && !paymentVerified && (
            <>
              <IconBtn title="Verify payment" disabled={busy}
                onClick={() => payMut.mutate({ status: "verified" })}
                className="border-green-200 text-green-700 hover:bg-green-600 hover:text-white hover:border-green-600">
                <ShieldCheck className="h-4 w-4" />
              </IconBtn>
              <IconBtn title="Reject payment" disabled={busy || order.payment_status === "rejected"}
                onClick={() => payMut.mutate({ status: "rejected" })}
                className="border-red-200 text-red-600 hover:bg-red-50">
                <ShieldAlert className="h-4 w-4" />
              </IconBtn>
            </>
          )}
          <IconBtn title={canApprove ? "Approve order" : "Verify payment first"}
            disabled={!canApprove || busy}
            onClick={() => statusMut.mutate({ status: "confirmed", toastMsg: "Order approved" })}
            className="border-green-200 text-green-700 hover:bg-green-600 hover:text-white hover:border-green-600">
            <Check className="h-4 w-4" />
          </IconBtn>
          <IconBtn title="Reject order" disabled={busy}
            onClick={() => setConfirm({ kind: "reject" })}
            className="border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600">
            <X className="h-4 w-4" />
          </IconBtn>
        </>
      )}

      {tab === "confirmed" && (
        <>
          <IconBtn title="Mark as delivered" disabled={busy}
            onClick={() => setConfirm({ kind: "deliver" })}
            className="border-green-200 text-green-700 hover:bg-green-600 hover:text-white hover:border-green-600">
            <Truck className="h-4 w-4" />
          </IconBtn>
          <IconBtn title="Move back to Pending" disabled={busy}
            onClick={() => setConfirm({ kind: "backToPending" })}
            className="border-[#E5E7EB] hover:bg-black hover:text-white hover:border-black">
            <Undo2 className="h-4 w-4" />
          </IconBtn>
        </>
      )}

      {tab === "shipped" && (
        <>
          <IconBtn title="Mark as delivered" disabled={busy}
            onClick={() => setConfirm({ kind: "deliver" })}
            className="border-green-200 text-green-700 hover:bg-green-600 hover:text-white hover:border-green-600">
            <PackageCheck className="h-4 w-4" />
          </IconBtn>
          <IconBtn title="Move back to Pending" disabled={busy}
            onClick={() => setConfirm({ kind: "backToPending" })}
            className="border-[#E5E7EB] hover:bg-black hover:text-white hover:border-black">
            <Undo2 className="h-4 w-4" />
          </IconBtn>
        </>
      )}

      {tab === "delivered" && (
        <>
          <IconBtn title="Move back to Pending" disabled={busy}
            onClick={() => setConfirm({ kind: "backToPending" })}
            className="border-[#E5E7EB] hover:bg-black hover:text-white hover:border-black">
            <Undo2 className="h-4 w-4" />
          </IconBtn>
          <IconBtn title="Delete permanently" disabled={busy}
            onClick={() => setConfirm({ kind: "deleteDelivered" })}
            className="border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600">
            <Trash2 className="h-4 w-4" />
          </IconBtn>
        </>
      )}

      {tab === "cancelled" && (
        <IconBtn title="Delete permanently" disabled={busy}
          onClick={() => setConfirm({ kind: "deleteCancelled" })}
          className="border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600">
          <Trash2 className="h-4 w-4" />
        </IconBtn>
      )}

      <IconBtn title="Print receipt" onClick={onPrint}
        className="border-[#E5E7EB] hover:bg-black hover:text-white hover:border-black">
        <Printer className="h-4 w-4" />
      </IconBtn>

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          {confirm && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirmMap[confirm.kind].title}</AlertDialogTitle>
                <AlertDialogDescription>{confirmMap[confirm.kind].description}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={busy}
                  className={confirmMap[confirm.kind].danger ? "bg-red-600 hover:bg-red-700 text-white" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    confirmMap[confirm.kind].onConfirm();
                    setConfirm(null);
                  }}>
                  {confirmMap[confirm.kind].label}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------- Status pill ---------- */

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    confirmed: "bg-blue-100 text-blue-700 border-blue-200",
    shipped: "bg-purple-100 text-purple-700 border-purple-200",
    delivered: "bg-green-100 text-green-700 border-green-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
  };
  const cls = map[status] ?? "bg-black/10 text-black/70 border-black/10";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}

function PaymentBadge({ order }: { order: Order }) {
  if (order.payment_method !== "online") {
    return <span className="text-xs text-black/50 uppercase tracking-wider">Cash on Delivery</span>;
  }
  const s = order.payment_status ?? "pending_verification";
  const map: Record<string, string> = {
    pending_verification: "bg-amber-100 text-amber-700 border-amber-200",
    verified: "bg-green-100 text-green-700 border-green-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${map[s] ?? map.pending_verification}`}>
      {s === "verified" && <Lock className="h-3 w-3" />}
      {paymentStatusLabel(s)}
      {s === "verified" && <span className="normal-case tracking-normal text-[10px] font-normal">· Locked</span>}
    </span>
  );
}

/* ---------- Details popup (read-only sections + payment verify) ---------- */

function OrderDetailsDialog({
  order, onClose, currentTab, onPrint,
}: {
  order: Order | null;
  onClose: () => void;
  currentTab: StatusKey;
  onPrint: (o: Order) => void;
}) {
  const qc = useQueryClient();
  const setPayFn = useServerFn(setPaymentStatus);

  const payMut = useMutation({
    mutationFn: (v: { status: "verified" | "rejected" }) =>
      setPayFn({ data: { orderId: order!.id, status: v.status } }),
    onSuccess: (_d, v) => {
      toast.success(v.status === "verified" ? "Payment verified" : "Payment rejected");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update payment"),
  });

  const isOnline = order?.payment_method === "online";
  const payStatus = order?.payment_status ?? (isOnline ? "pending_verification" : "not_applicable");
  const paymentLocked = payStatus === "verified";

  return (
    <Dialog open={!!order} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl">
        {order && (
          <div>
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#E5E7EB] sticky top-0 bg-white z-10">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-black/45">Order</p>
                  <DialogTitle className="text-xl font-bold text-black mt-1">{order.order_number}</DialogTitle>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={order.status} />
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => onPrint(order)}>
                    <Printer className="h-4 w-4 mr-1.5" /> Print
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 py-6 space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <InfoCard title="Order Information">
                  <InfoRow k="Order #" v={order.order_number} />
                  <InfoRow k="Date" v={fmtDate(order.created_at)} />
                  <InfoRow k="Status" v={String(order.status).toUpperCase()} />
                  <InfoRow k="Module" v={primaryModule(order)} />
                  <InfoRow k="Payment Method" v={order.payment_method === "cod" ? "Cash on Delivery" : "Online Payment"} />
                  <InfoRow k="Payment Status" v={paymentStatusLabel(order.payment_status)} />
                </InfoCard>
                <InfoCard title="Customer Information">
                  <InfoRow k="Full Name" v={order.full_name} />
                  <InfoRow k="Email" v={order.email} />
                  <InfoRow k="Phone" v={order.phone ?? "—"} />
                </InfoCard>
                <InfoCard title="Shipping Address">
                  <InfoRow k="Country" v={order.country} />
                  <InfoRow k="City" v={order.city} />
                  <InfoRow k="Postal Code" v={order.postal_code ?? "—"} />
                  <InfoRow k="Address" v={order.address} />
                  {order.delivery_note && <InfoRow k="Delivery Note" v={order.delivery_note} />}
                </InfoCard>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-black mb-3">Payment Information</h4>
                <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
                  {!isOnline ? (
                    <p className="text-sm font-semibold">Cash on Delivery</p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2 text-sm">
                        <InfoRow k="Payment Method" v="Online Payment" />
                        <div className="pt-1"><PaymentBadge order={order} /></div>
                        <div className="flex flex-wrap items-center gap-2 pt-3">
                          {paymentLocked ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                              <Lock className="h-3.5 w-3.5" /> Payment Verified · Locked
                            </span>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                className="rounded-lg bg-green-600 hover:bg-green-700 text-white"
                                disabled={payMut.isPending}
                                onClick={() => payMut.mutate({ status: "verified" })}>
                                <ShieldCheck className="h-4 w-4 mr-1.5" /> Verify Payment
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                className="rounded-lg border-red-300 text-red-600 hover:bg-red-50"
                                disabled={payStatus === "rejected" || payMut.isPending}
                                onClick={() => payMut.mutate({ status: "rejected" })}>
                                <ShieldAlert className="h-4 w-4 mr-1.5" /> Reject Payment
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-black/55 mb-2">Payment Screenshot</p>
                        {order.payment_screenshot ? (
                          /\.pdf(\?|$)/i.test(order.payment_screenshot) ? (
                            <a href={order.payment_screenshot} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-semibold text-[#CF0A0A] hover:underline">
                              View PDF proof
                            </a>
                          ) : (
                            <a href={order.payment_screenshot} target="_blank" rel="noreferrer" className="block">
                              <img src={order.payment_screenshot} alt="Payment screenshot"
                                className="max-h-64 rounded-lg border border-[#E5E7EB] object-contain bg-[#F9FAFB]" />
                              <span className="mt-1 inline-block text-xs text-[#CF0A0A] hover:underline">View Full Image</span>
                            </a>
                          )
                        ) : <p className="text-sm text-black/50">Not uploaded</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-black mb-3">Coupon Information</h4>
                <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-sm">
                  {order.coupon_code ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <InfoRow k="Coupon Code" v={order.coupon_code} />
                        <InfoRow k="Discount Type" v={(order.coupon_discount_type ?? "—").toUpperCase()} />
                        <InfoRow k="Discount Value"
                          v={order.coupon_discount_type === "percentage"
                            ? `${Number(order.coupon_discount_value ?? 0)}%`
                            : fmtMoney(Number(order.coupon_discount_value ?? 0))} />
                        <InfoRow k="Actual Discount" v={fmtMoney(order.coupon_discount)} />
                      </div>
                      <div className="space-y-2">
                        <InfoRow k="Subtotal" v={fmtMoney(order.subtotal)} />
                        <InfoRow k="Delivery" v={fmtMoney(order.delivery_charge)} />
                        <InfoRow k="Grand Total" v={fmtMoney(order.total)} />
                      </div>
                    </div>
                  ) : (<p className="text-black/50">No Coupon Applied</p>)}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-black mb-3">Ordered Products ({order.items.length})</h4>
                <div className="rounded-xl border border-[#E5E7EB] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F9FAFB] text-[11px] uppercase tracking-[0.1em] text-black/55">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold">Product</th>
                        <th className="text-left px-3 py-2 font-semibold">Module</th>
                        <th className="text-left px-3 py-2 font-semibold">Colour</th>
                        <th className="text-left px-3 py-2 font-semibold">Size</th>
                        <th className="text-left px-3 py-2 font-semibold">Gender</th>
                        <th className="text-left px-3 py-2 font-semibold">Class</th>
                        <th className="text-left px-3 py-2 font-semibold">Type</th>
                        <th className="text-right px-3 py-2 font-semibold">Qty</th>
                        <th className="text-right px-3 py-2 font-semibold">Unit</th>
                        <th className="text-right px-3 py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((it, idx) => (
                        <tr key={idx} className="border-t border-[#F1F1F1]">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-3 min-w-[220px]">
                              <div className="h-14 w-12 rounded-md bg-[#F5F5F5] overflow-hidden shrink-0 grid place-items-center">
                                {it.product_image ? (
                                  <img src={it.product_image} alt="" className="h-full w-full object-contain" />
                                ) : <Package className="h-4 w-4 text-black/30" />}
                              </div>
                              <span className="text-black/85">{it.product_name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-black/70">{moduleLabel(it.module)}</td>
                          <td className="px-3 py-3 text-black/70">{it.color ?? "—"}</td>
                          <td className="px-3 py-3 text-black/70">{it.size ?? "—"}</td>
                          <td className="px-3 py-3 text-black/70">{it.gender ?? "—"}</td>
                          <td className="px-3 py-3 text-black/70">{it.class_name ?? "—"}</td>
                          <td className="px-3 py-3 text-black/70">{it.product_type ?? "—"}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{it.quantity}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{fmtMoney(it.unit_price)}</td>
                          <td className="px-3 py-3 text-right font-semibold tabular-nums">{fmtMoney(it.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#F9FAFB] border-t border-[#E5E7EB]">
                        <td colSpan={8} className="px-3 py-3 text-right font-semibold text-black">Order Total</td>
                        <td className="px-3 py-3 text-right font-bold text-black tabular-nums">{fmtMoney(order.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {currentTab === "pending" && (
                <p className="text-[11px] text-black/50 pt-2 border-t border-[#E5E7EB]">
                  Approve, reject, and status actions are available from the row action icons.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] p-4 bg-[#FAFAFA]">
      <p className="text-[10px] uppercase tracking-[0.2em] text-black/50 font-semibold mb-3">{title}</p>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-black/55">{k}</span>
      <span className="text-black/90 font-medium text-right break-all">{v}</span>
    </div>
  );
}
