import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import {
  Package, ShoppingCart, Clock, CheckCircle2, Truck, PackageCheck, XCircle,
  Users, Star, Ticket, Wallet, TrendingUp, CreditCard, Download,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getDashboardStats, getRevenueSeries, getTopProducts, getRecentOrders, getDashboardExport,
  type DashboardStats, type RevenuePoint, type TopProduct, type RecentOrder,
} from "@/lib/admin-dashboard.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});

type Preset =
  | "today" | "yesterday" | "week" | "month" | "year" | "custom_day" | "custom_range";

const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "custom_day", label: "Custom Date" },
  { value: "custom_range", label: "Custom Range" },
];

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function toInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtMoney(n: number) { return `Rs ${Number(n || 0).toLocaleString("en-PK")}`; }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function resolveRange(preset: Preset, dayStr: string, fromStr: string, toStr: string) {
  const today = startOfDay(new Date());
  let from = today;
  let to = addDays(today, 1);
  let bucket: "day" | "week" | "month" | "year" = "day";

  if (preset === "today") { /* defaults */ }
  else if (preset === "yesterday") { from = addDays(today, -1); to = today; }
  else if (preset === "week") {
    const dow = (today.getDay() + 6) % 7; // Monday-start
    from = addDays(today, -dow); to = addDays(from, 7);
  } else if (preset === "month") {
    from = new Date(today.getFullYear(), today.getMonth(), 1);
    to = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  } else if (preset === "year") {
    from = new Date(today.getFullYear(), 0, 1);
    to = new Date(today.getFullYear() + 1, 0, 1);
    bucket = "month";
  } else if (preset === "custom_day") {
    const d = dayStr ? startOfDay(new Date(dayStr)) : today;
    from = d; to = addDays(d, 1);
  } else if (preset === "custom_range") {
    from = fromStr ? startOfDay(new Date(fromStr)) : today;
    to = toStr ? addDays(startOfDay(new Date(toStr)), 1) : addDays(from, 1);
    const days = Math.max(1, Math.round((+to - +from) / 86400000));
    bucket = days > 400 ? "month" : days > 90 ? "week" : "day";
  }
  return { from: from.toISOString(), to: to.toISOString(), bucket };
}

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-purple-50 text-purple-700 border-purple-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<Preset>("month");
  const [day, setDay] = useState(toInput(new Date()));
  const [from, setFrom] = useState(toInput(addDays(new Date(), -30)));
  const [to, setTo] = useState(toInput(new Date()));
  const [exporting, setExporting] = useState(false);

  const range: { from: string; to: string; bucket: "day" | "week" | "month" | "year" } =
    useMemo(() => resolveRange(preset, day, from, to), [preset, day, from, to]);

  const statsFn = useServerFn(getDashboardStats);
  const seriesFn = useServerFn(getRevenueSeries);
  const topFn = useServerFn(getTopProducts);
  const recentFn = useServerFn(getRecentOrders);
  const exportFn = useServerFn(getDashboardExport);

  const statsQ = useQuery<DashboardStats>({
    queryKey: ["admin-dashboard", "stats", range],
    queryFn: () => statsFn({ data: range }),
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
  const seriesQ = useQuery<RevenuePoint[]>({
    queryKey: ["admin-dashboard", "series", range],
    queryFn: () => seriesFn({ data: range }),
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
  const topQ = useQuery<TopProduct[]>({
    queryKey: ["admin-dashboard", "top-products", range],
    queryFn: () => topFn({ data: range }),
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
  const recentQ = useQuery<RecentOrder[]>({
    queryKey: ["admin-dashboard", "recent-orders", range],
    queryFn: () => recentFn({ data: range }),
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });

  const s = statsQ.data;
  const chartData = (seriesQ.data ?? []).map((p) => ({
    label: new Date(p.bucket).toLocaleDateString("en-GB", {
      day: range.bucket === "day" ? "2-digit" : undefined,
      month: "short",
      year: range.bucket === "month" || range.bucket === "year" ? "numeric" : undefined,
    }),
    revenue: p.revenue,
  }));

  const cards: { label: string; value?: number; icon: typeof Package; tone: string; to: string; search?: Record<string, string> }[] = [
    { label: "Total Products", value: s?.total_products, icon: Package, tone: "text-slate-700 bg-slate-100", to: "/admin/school-uniform" },
    { label: "Total Orders", value: s?.total_orders, icon: ShoppingCart, tone: "text-indigo-700 bg-indigo-100", to: "/admin/orders" },
    { label: "Total Customers", value: s?.total_customers, icon: Users, tone: "text-cyan-700 bg-cyan-100", to: "/admin/customers" },
    { label: "Total Reviews", value: s?.total_reviews, icon: Star, tone: "text-yellow-700 bg-yellow-100", to: "/admin/reviews" },
    { label: "Coupon Usage", value: s?.coupon_usage, icon: Ticket, tone: "text-pink-700 bg-pink-100", to: "/admin/coupons" },
  ];

  const statusCards: {
    label: string; value?: number; icon: typeof Package; status: string;
    ring: string; surface: string; chip: string; accent: string;
  }[] = [
    { label: "Pending", value: s?.pending, icon: Clock, status: "pending",
      ring: "hover:border-amber-400/60", surface: "from-amber-50 to-white", chip: "bg-amber-500/15 text-amber-700", accent: "bg-amber-500" },
    { label: "Confirmed", value: s?.confirmed, icon: CheckCircle2, status: "confirmed",
      ring: "hover:border-blue-400/60", surface: "from-blue-50 to-white", chip: "bg-blue-500/15 text-blue-700", accent: "bg-blue-500" },
    { label: "Shipping", value: s?.shipped, icon: Truck, status: "shipped",
      ring: "hover:border-purple-400/60", surface: "from-purple-50 to-white", chip: "bg-purple-500/15 text-purple-700", accent: "bg-purple-500" },
    { label: "Delivered", value: s?.delivered, icon: PackageCheck, status: "delivered",
      ring: "hover:border-emerald-400/60", surface: "from-emerald-50 to-white", chip: "bg-emerald-500/15 text-emerald-700", accent: "bg-emerald-500" },
    { label: "Cancelled", value: s?.cancelled, icon: XCircle, status: "cancelled",
      ring: "hover:border-red-400/60", surface: "from-red-50 to-white", chip: "bg-[#CF0A0A]/15 text-[#CF0A0A]", accent: "bg-[#CF0A0A]" },
  ];

  const runExport = async () => {
    setExporting(true);
    try {
      const data = await exportFn({ data: range });
      const wb = new ExcelJS.Workbook();

      const rev = wb.addWorksheet("Revenue Report");
      rev.columns = [
        { header: "Period", key: "p", width: 22 },
        { header: "Revenue (Rs)", key: "r", width: 18 },
      ];
      data.revenue.forEach((r) => rev.addRow({ p: fmtDate(r.bucket), r: r.revenue }));
      rev.addRow({});
      rev.addRow({ p: "Revenue (range)", r: data.stats.revenue_range });
      rev.addRow({ p: "Revenue today", r: data.stats.revenue_today });
      rev.addRow({ p: "Total revenue", r: data.stats.revenue_total });
      rev.addRow({ p: "Average order value", r: data.stats.avg_order_value });

      const led = wb.addWorksheet("Revenue Ledger");
      led.columns = [
        { header: "Date", key: "d", width: 20 },
        { header: "Order #", key: "o", width: 22 },
        { header: "Type", key: "t", width: 20 },
        { header: "Amount (Rs)", key: "a", width: 16 },
      ];
      data.ledger.forEach((l) =>
        led.addRow({ d: fmtDate(l.occurred_at), o: l.order_number ?? "—", t: l.reason, a: l.amount }),
      );

      const ord = wb.addWorksheet("Orders Summary");
      ord.columns = [
        { header: "Order #", key: "n", width: 22 },
        { header: "Date", key: "d", width: 16 },
        { header: "Customer", key: "c", width: 24 },
        { header: "Email", key: "e", width: 28 },
        { header: "Status", key: "s", width: 14 },
        { header: "Payment", key: "p", width: 14 },
        { header: "Total (Rs)", key: "t", width: 14 },
      ];
      data.orders.forEach((o) =>
        ord.addRow({
          n: o.order_number, d: fmtDate(o.created_at), c: o.full_name, e: o.email,
          s: o.status, p: (o.payment_method || "").toUpperCase(), t: o.total,
        }),
      );

      const cus = wb.addWorksheet("Customer Summary");
      cus.columns = [
        { header: "Customer", key: "c", width: 26 },
        { header: "Email", key: "e", width: 30 },
        { header: "Orders", key: "o", width: 12 },
        { header: "Total Spent (Rs)", key: "s", width: 18 },
      ];
      data.customers.forEach((c) => cus.addRow({ c: c.name, e: c.email, o: c.orders, s: c.spent }));

      const cou = wb.addWorksheet("Coupon Usage");
      cou.columns = [
        { header: "Date", key: "d", width: 18 },
        { header: "Coupon", key: "c", width: 20 },
        { header: "Order #", key: "o", width: 22 },
        { header: "Discount (Rs)", key: "x", width: 16 },
        { header: "Order Total (Rs)", key: "g", width: 18 },
      ];
      data.coupons.forEach((c) =>
        cou.addRow({
          d: fmtDate(c.used_at), c: c.coupon_code ?? "—", o: c.order_number ?? "—",
          x: c.discount_amount, g: c.grand_total ?? 0,
        }),
      );
      cou.addRow({});
      cou.addRow({ d: "Coupons created", c: data.stats.coupons_created });
      cou.addRow({ d: "Coupons used", c: data.stats.coupons_used });
      cou.addRow({ d: "Usage %", c: `${data.stats.coupon_usage_percent}%` });

      const prod = wb.addWorksheet("Product Summary");
      prod.columns = [
        { header: "Product", key: "p", width: 34 },
        { header: "Module", key: "m", width: 14 },
        { header: "Qty Sold", key: "q", width: 12 },
        { header: "Orders", key: "o", width: 12 },
        { header: "Revenue (Rs)", key: "r", width: 16 },
      ];
      data.products.forEach((p) =>
        prod.addRow({ p: p.product_name, m: p.module, q: p.quantity, o: p.orders, r: p.revenue }),
      );

      [rev, led, ord, cus, cou, prod].forEach((ws) => (ws.getRow(1).font = { bold: true }));

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dashboard_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Live analytics for orders, customers and revenue."
      />

      {/* Revenue */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RevenueCard
          label="Revenue Today"
          value={s?.revenue_today}
          loading={statsQ.isLoading}
          icon={Wallet}
          accent="from-[#CF0A0A] to-[#8a0606]"
        />
        <RevenueCard
          label="Total Revenue"
          value={s?.revenue_total}
          loading={statsQ.isLoading}
          icon={TrendingUp}
          accent="from-slate-900 to-slate-700"
        />
        <RevenueCard
          label="Revenue (Selected Range)"
          value={s?.revenue_range}
          loading={statsQ.isLoading}
          icon={TrendingUp}
          accent="from-emerald-700 to-emerald-500"
        />
        <RevenueCard
          label="Average Order Value"
          value={s?.avg_order_value}
          loading={statsQ.isLoading}
          icon={CreditCard}
          accent="from-indigo-700 to-indigo-500"
        />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-black/45">Period</p>
            <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preset === "custom_day" && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-black/45">Date</p>
              <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="w-[170px]" />
            </div>
          )}

          {preset === "custom_range" && (
            <>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-black/45">From</p>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[170px]" />
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-black/45">To</p>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[170px]" />
              </div>
            </>
          )}

          <Button onClick={runExport} disabled={exporting} className="ml-auto gap-2">
            <Download className="h-4 w-4" />
            {exporting ? "Preparing…" : "Export Reports"}
          </Button>
        </div>

        <div className="mt-2 text-xs text-black/50">
          {s ? `${s.orders_range} orders placed · ${s.delivered_range} delivered · ${s.coupon_usage_range} coupons used in this period` : ""}
        </div>

        {/* Chart */}
        <div className="mt-5 h-[300px] w-full">
          {seriesQ.isLoading ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : chartData.length === 0 ? (
            <div className="grid h-full place-items-center rounded-xl border border-dashed border-black/10 text-sm text-black/40">
              No revenue recorded in this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#CF0A0A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#CF0A0A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => Number(v).toLocaleString("en-PK")} width={70} />
                <Tooltip formatter={(v: any) => fmtMoney(Number(v))} />
                <Area type="monotone" dataKey="revenue" stroke="#CF0A0A" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Order status */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
          Orders by status
        </p>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statusCards.map((c) => (
            <Link
              key={c.label}
              to="/admin/orders"
              search={{ status: c.status } as any}
              className={`group relative flex min-h-[136px] flex-col justify-between overflow-hidden rounded-2xl border border-black/5 bg-gradient-to-br ${c.surface} p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${c.ring}`}
            >
              <span className={`absolute inset-x-0 top-0 h-1 ${c.accent}`} />
              <div className={`inline-grid h-10 w-10 place-items-center rounded-xl ${c.chip}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-black/50">
                  {c.label} Orders
                </p>
                {statsQ.isLoading ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <p className="mt-0.5 text-3xl font-bold tracking-tight text-black">
                    {Number(c.value ?? 0).toLocaleString()}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Counters */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            search={c.search as any}
            className="group rounded-2xl border border-black/5 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#CF0A0A]/30 hover:shadow-md"
          >
            <div className={`inline-grid h-9 w-9 place-items-center rounded-xl ${c.tone}`}>
              <c.icon className="h-4.5 w-4.5" />
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-black/45">{c.label}</p>
            {statsQ.isLoading ? (
              <Skeleton className="mt-1 h-7 w-16" />
            ) : (
              <p className="mt-0.5 text-2xl font-bold text-black">{Number(c.value ?? 0).toLocaleString()}</p>
            )}
          </Link>
        ))}
      </div>

      {/* Coupon breakdown */}
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-[#CF0A0A]" />
          <h3 className="text-sm font-semibold text-black">Coupon Performance</h3>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <MiniStat label="Coupons Created" value={s?.coupons_created} loading={statsQ.isLoading} />
          <MiniStat label="Coupons Used" value={s?.coupons_used} loading={statsQ.isLoading} />
          <MiniStat
            label="Usage Rate"
            value={s?.coupon_usage_percent}
            suffix="%"
            loading={statsQ.isLoading}
          />
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full rounded-full bg-[#CF0A0A] transition-all"
            style={{ width: `${Math.min(100, Number(s?.coupon_usage_percent ?? 0))}%` }}
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {/* Top products */}
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-black">Top 10 Selling Products</h3>
          <p className="mt-0.5 text-xs text-black/45">Based on delivered orders in the selected period.</p>
          <div className="mt-4 overflow-x-auto">
            {topQ.isLoading ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : (topQ.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-black/40">No delivered products in this period.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-black/45">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Product</th>
                    <th className="pb-2">Module</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(topQ.data ?? []).map((p, i) => (
                    <tr key={p.product_id} className="border-t border-black/5">
                      <td className="py-2 text-black/40">{i + 1}</td>
                      <td className="py-2 pr-3 font-medium text-black">{p.product_name}</td>
                      <td className="py-2 capitalize text-black/60">{p.module}</td>
                      <td className="py-2 text-right">{p.quantity}</td>
                      <td className="py-2 text-right font-semibold">{fmtMoney(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent orders */}
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-black">Latest 10 Orders</h3>
          <p className="mt-0.5 text-xs text-black/45">Click an order to open it in Orders management.</p>
          <div className="mt-4 overflow-x-auto">
            {recentQ.isLoading ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : (recentQ.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-black/40">No orders in this period.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-black/45">
                    <th className="pb-2">Order #</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentQ.data ?? []).map((o) => (
                    <tr
                      key={o.id}
                      onClick={() =>
                        navigate({
                          to: "/admin/orders",
                          search: { status: o.status, q: o.order_number } as any,
                        })
                      }
                      className="cursor-pointer border-t border-black/5 hover:bg-black/[0.02]"
                    >
                      <td className="py-2 font-medium text-black">{o.order_number}</td>
                      <td className="py-2 text-black/70">{o.full_name}</td>
                      <td className="py-2 text-black/60">{fmtDate(o.created_at)}</td>
                      <td className="py-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${STATUS_TONE[o.status] ?? "border-black/10 bg-black/5 text-black/60"}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-2 text-right font-semibold">{fmtMoney(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label, value, loading, suffix,
}: { label: string; value?: number; loading: boolean; suffix?: string }) {
  return (
    <div className="rounded-xl border border-black/5 bg-black/[0.02] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-black/45">{label}</p>
      {loading ? (
        <Skeleton className="mt-1 h-7 w-16" />
      ) : (
        <p className="mt-0.5 text-2xl font-bold text-black">
          {Number(value ?? 0).toLocaleString()}{suffix ?? ""}
        </p>
      )}
    </div>
  );
}

function RevenueCard({
  label, value, loading, icon: Icon, accent,
}: {
  label: string; value?: number; loading: boolean;
  icon: typeof Wallet; accent: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${accent} p-5 text-white shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-32 bg-white/20" />
          ) : (
            <p className="mt-1 text-3xl font-bold">{fmtMoney(value ?? 0)}</p>
          )}
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
