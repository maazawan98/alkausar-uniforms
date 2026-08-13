import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function getDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function ensureAdmin() {
  const { requireAdmin } = await import("./require-admin.server");
  return requireAdmin();
}

export type DashboardStats = {
  total_products: number;
  pending: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  total_orders: number;
  total_customers: number;
  history_customers: number;
  total_reviews: number;
  coupon_usage: number;
  coupons_created: number;
  coupons_used: number;
  coupon_usage_percent: number;
  coupon_usage_range: number;
  revenue_today: number;
  revenue_total: number;
  revenue_range: number;
  orders_range: number;
  delivered_range: number;
  avg_order_value: number;
};

export type RevenuePoint = { bucket: string; revenue: number };

export type TopProduct = {
  product_id: string;
  product_name: string;
  module: string;
  quantity: number;
  revenue: number;
  orders: number;
};

export type RecentOrder = {
  id: string;
  order_number: string;
  full_name: string;
  email: string;
  total: number;
  status: string;
  created_at: string;
};

const rangeSchema = z.object({
  from: z.string(),
  to: z.string(),
  bucket: z.enum(["day", "week", "month", "year"]).default("day"),
});


/** Runs the automatic shipping/delivery scheduler, then returns live counters. */
export const getDashboardStats = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => rangeSchema.parse(raw))
  .handler(async ({ data }): Promise<DashboardStats> => {
    await ensureAdmin();
    const db = await getDb();
    await db.rpc("run_order_timeline" as any);
    const { data: row, error } = await db.rpc("admin_dashboard_stats" as any, {
      p_from: data.from,
      p_to: data.to,
    });
    if (error) throw error;
    const s = (row ?? {}) as Record<string, number>;
    return {
      total_products: Number(s.total_products ?? 0),
      pending: Number(s.pending ?? 0),
      confirmed: Number(s.confirmed ?? 0),
      shipped: Number(s.shipped ?? 0),
      delivered: Number(s.delivered ?? 0),
      cancelled: Number(s.cancelled ?? 0),
      total_orders: Number(s.total_orders ?? 0),
      total_customers: Number(s.total_customers ?? 0),
      history_customers: Number(s.history_customers ?? 0),
      total_reviews: Number(s.total_reviews ?? 0),
      coupon_usage: Number(s.coupon_usage ?? 0),
      coupons_created: Number(s.coupons_created ?? 0),
      coupons_used: Number(s.coupons_used ?? 0),
      coupon_usage_percent: Number(s.coupon_usage_percent ?? 0),
      coupon_usage_range: Number(s.coupon_usage_range ?? 0),
      revenue_today: Number(s.revenue_today ?? 0),
      revenue_total: Number(s.revenue_total ?? 0),
      revenue_range: Number(s.revenue_range ?? 0),
      orders_range: Number(s.orders_range ?? 0),
      delivered_range: Number(s.delivered_range ?? 0),
      avg_order_value: Number(s.avg_order_value ?? 0),
    };
  });

export const getRevenueSeries = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => rangeSchema.parse(raw))
  .handler(async ({ data }): Promise<RevenuePoint[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: rows, error } = await db.rpc("admin_revenue_series" as any, {
      p_from: data.from,
      p_to: data.to,
      p_bucket: data.bucket,
    });
    if (error) throw error;
    return ((rows as any[]) ?? []).map((r) => ({
      bucket: r.bucket as string,
      revenue: Number(r.revenue ?? 0),
    }));
  });

export const getTopProducts = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => rangeSchema.parse(raw))
  .handler(async ({ data }): Promise<TopProduct[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: rows, error } = await db.rpc("admin_top_products" as any, {
      p_from: data.from,
      p_to: data.to,
      p_limit: 10,
    });
    if (error) throw error;
    return ((rows as any[]) ?? []).map((r) => ({
      product_id: String(r.product_id ?? ""),
      product_name: String(r.product_name ?? "—"),
      module: String(r.module ?? "—"),
      quantity: Number(r.quantity ?? 0),
      revenue: Number(r.revenue ?? 0),
      orders: Number(r.orders ?? 0),
    }));
  });

export const getRecentOrders = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => rangeSchema.parse(raw))
  .handler(async ({ data }): Promise<RecentOrder[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: rows, error } = await db.rpc("admin_recent_orders" as any, {
      p_from: data.from,
      p_to: data.to,
      p_limit: 10,
    });
    if (error) throw error;
    return ((rows as any[]) ?? []).map((r) => ({
      id: String(r.id),
      order_number: String(r.order_number ?? ""),
      full_name: String(r.full_name ?? ""),
      email: String(r.email ?? ""),
      total: Number(r.total ?? 0),
      status: String(r.status ?? ""),
      created_at: String(r.created_at),
    }));
  });

export type DashboardExport = {
  range: { from: string; to: string; bucket: string };
  stats: DashboardStats;
  revenue: RevenuePoint[];
  ledger: { occurred_at: string; order_number: string | null; amount: number; reason: string }[];
  orders: {
    order_number: string;
    created_at: string;
    full_name: string;
    email: string;
    status: string;
    payment_method: string;
    total: number;
  }[];
  customers: { name: string; email: string; orders: number; spent: number }[];
  coupons: {
    used_at: string;
    coupon_code: string | null;
    order_number: string | null;
    discount_amount: number;
    grand_total: number | null;
  }[];
  products: TopProduct[];
};

export const getDashboardExport = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => rangeSchema.parse(raw))
  .handler(async ({ data }): Promise<DashboardExport> => {
    await ensureAdmin();
    const db = await getDb();

    const [statsRes, seriesRes, ledgerRes, ordersRes, couponRes, productsRes] = await Promise.all([
      db.rpc("admin_dashboard_stats" as any, { p_from: data.from, p_to: data.to }),
      db.rpc("admin_revenue_series" as any, {
        p_from: data.from,
        p_to: data.to,
        p_bucket: data.bucket,
      }),
      db
        .from("revenue_events" as any)
        .select("occurred_at, order_number, amount, reason")
        .gte("occurred_at", data.from)
        .lt("occurred_at", data.to)
        .order("occurred_at", { ascending: true })
        .limit(5000),
      db
        .from("customer_orders" as any)
        .select("order_number, created_at, full_name, email, status, payment_method, total")
        .gte("created_at", data.from)
        .lt("created_at", data.to)
        .order("created_at", { ascending: false })
        .limit(5000),
      db
        .from("coupon_usage" as any)
        .select("used_at, coupon_code, order_number, discount_amount, grand_total")
        .gte("used_at", data.from)
        .lt("used_at", data.to)
        .order("used_at", { ascending: false })
        .limit(5000),
      db.rpc("admin_top_products" as any, { p_from: data.from, p_to: data.to, p_limit: 50 }),
    ]);

    const s = (statsRes.data ?? {}) as Record<string, number>;
    const orders = ((ordersRes.data as any[]) ?? []).map((o) => ({
      order_number: String(o.order_number ?? ""),
      created_at: String(o.created_at),
      full_name: String(o.full_name ?? ""),
      email: String(o.email ?? ""),
      status: String(o.status ?? ""),
      payment_method: String(o.payment_method ?? ""),
      total: Number(o.total ?? 0),
    }));

    const byCustomer = new Map<string, { name: string; email: string; orders: number; spent: number }>();
    for (const o of orders) {
      const key = o.email.toLowerCase();
      const prev = byCustomer.get(key) ?? { name: o.full_name, email: o.email, orders: 0, spent: 0 };
      prev.orders += 1;
      prev.spent += o.total;
      byCustomer.set(key, prev);
    }

    return {
      range: { from: data.from, to: data.to, bucket: data.bucket },
      stats: {
        total_products: Number(s.total_products ?? 0),
        pending: Number(s.pending ?? 0),
        confirmed: Number(s.confirmed ?? 0),
        shipped: Number(s.shipped ?? 0),
        delivered: Number(s.delivered ?? 0),
        cancelled: Number(s.cancelled ?? 0),
        total_orders: Number(s.total_orders ?? 0),
        total_customers: Number(s.total_customers ?? 0),
        history_customers: Number(s.history_customers ?? 0),
        total_reviews: Number(s.total_reviews ?? 0),
        coupon_usage: Number(s.coupon_usage ?? 0),
        coupons_created: Number(s.coupons_created ?? 0),
        coupons_used: Number(s.coupons_used ?? 0),
        coupon_usage_percent: Number(s.coupon_usage_percent ?? 0),
        coupon_usage_range: Number(s.coupon_usage_range ?? 0),
        revenue_today: Number(s.revenue_today ?? 0),
        revenue_total: Number(s.revenue_total ?? 0),
        revenue_range: Number(s.revenue_range ?? 0),
        orders_range: Number(s.orders_range ?? 0),
        delivered_range: Number(s.delivered_range ?? 0),
        avg_order_value: Number(s.avg_order_value ?? 0),
      },
      revenue: ((seriesRes.data as any[]) ?? []).map((r) => ({
        bucket: String(r.bucket),
        revenue: Number(r.revenue ?? 0),
      })),
      ledger: ((ledgerRes.data as any[]) ?? []).map((r) => ({
        occurred_at: String(r.occurred_at),
        order_number: r.order_number ?? null,
        amount: Number(r.amount ?? 0),
        reason: String(r.reason ?? ""),
      })),
      orders,
      customers: Array.from(byCustomer.values()).sort((a, b) => b.spent - a.spent),
      coupons: ((couponRes.data as any[]) ?? []).map((c) => ({
        used_at: String(c.used_at),
        coupon_code: c.coupon_code ?? null,
        order_number: c.order_number ?? null,
        discount_amount: Number(c.discount_amount ?? 0),
        grand_total: c.grand_total == null ? null : Number(c.grand_total),
      })),
      products: ((productsRes.data as any[]) ?? []).map((r) => ({
        product_id: String(r.product_id ?? ""),
        product_name: String(r.product_name ?? "—"),
        module: String(r.module ?? "—"),
        quantity: Number(r.quantity ?? 0),
        revenue: Number(r.revenue ?? 0),
        orders: Number(r.orders ?? 0),
      })),
    };
  });
