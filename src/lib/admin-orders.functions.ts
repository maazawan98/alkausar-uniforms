import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Order, OrderItemSnapshot } from "./shop.functions";
import {
  normalizeStoredPath,
  signStoredPath,
  primaryImagePathMap,
  resolveSnapshotImage,
} from "./order-images";


const BUCKET = "school-assets";
const SIGN_TTL = 60 * 60;

async function getDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function ensureAdmin() {
  const { requireAdmin } = await import("./require-admin.server");
  return requireAdmin();
}

async function signImage(db: any, raw: string | null): Promise<string | null> {
  return signStoredPath(db, normalizeStoredPath(raw));
}

async function hydrate(db: any, order: Order): Promise<Order> {
  const fallbacks = await primaryImagePathMap(db, (order.items ?? []) as any[]);
  const items: OrderItemSnapshot[] = await Promise.all(
    (order.items ?? []).map(async (it: any) => ({
      ...it,
      product_image: await resolveSnapshotImage(
        db,
        it.product_image,
        it.module,
        it.product_id,
        fallbacks,
      ),
    })),
  );
  const payment_screenshot = await signImage(db, order.payment_screenshot);
  return { ...order, items, payment_screenshot };
}

export type AdminOrderCounts = {
  pending: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
};

export const getAdminOrderCounts = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminOrderCounts> => {
    await ensureAdmin();
    const db = await getDb();
    // Advance any orders whose automatic timeline is due before counting.
    await db.rpc("run_order_timeline" as any);
    const statuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
    const out: AdminOrderCounts = { pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 };
    await Promise.all(
      statuses.map(async (s) => {
        const { count } = await db
          .from("customer_orders" as any)
          .select("id", { count: "exact", head: true })
          .eq("status", s);
        out[s] = count ?? 0;
      }),
    );
    return out;
  },
);

const listSchema = z.object({
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
});

export const listAdminOrders = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => listSchema.parse(raw))
  .handler(async ({ data }): Promise<Order[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: rows, error } = await db
      .from("customer_orders" as any)
      .select("*")
      .eq("status", data.status)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    const list = (rows as any[]) ?? [];
    const out: Order[] = [];
    for (const r of list) out.push(await hydrate(db, r as unknown as Order));
    return out;
  });

/* =========================================================
   Payment verification
   ========================================================= */

const paymentStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["verified", "rejected"]),
});

export const setPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => paymentStatusSchema.parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    // Enforce permanent verification lock — once verified, cannot change.
    const { data: cur } = await db
      .from("customer_orders" as any)
      .select("payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if ((cur as any)?.payment_status === "verified") {
      throw new Error("Payment is already verified and locked.");
    }
    const { error } = await db
      .from("customer_orders" as any)
      .update({
        payment_status: data.status,
        payment_verified_at: data.status === "verified" ? new Date().toISOString() : null,
      })
      .eq("id", data.orderId);
    if (error) throw error;
    return { ok: true };
  });


/* =========================================================
   Order approval / rejection + customer_history snapshot
   ========================================================= */

async function snapshotOrderToHistory(db: any, orderId: string) {
  // Prevent duplicate history rows
  const { data: existing } = await db
    .from("customer_history" as any)
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing) return;

  const { data: o, error } = await db
    .from("customer_orders" as any)
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !o) return;

  const row: any = o;
  await db.from("customer_history" as any).insert({
    order_id: row.id,
    order_number: row.order_number,
    order_date: row.created_at,
    order_status: row.status,
    customer_id: row.customer_id,
    customer_name: row.full_name,
    customer_email: row.email,
    customer_phone: row.phone,
    country: row.country,
    city: row.city,
    postal_code: row.postal_code,
    address: row.address,
    delivery_note: row.delivery_note,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    payment_screenshot: row.payment_screenshot,
    payment_verified_at: row.payment_verified_at,
    coupon_id: row.coupon_id,
    coupon_code: row.coupon_code,
    coupon_discount_type: row.coupon_discount_type,
    coupon_discount_value: row.coupon_discount_value,
    coupon_discount: row.coupon_discount ?? 0,
    delivery_charge: row.delivery_charge ?? 0,
    subtotal: row.subtotal ?? 0,
    grand_total: row.total ?? 0,
    items: row.items ?? [],
  });
}

const setStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]),
});

export const setOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => setStatusSchema.parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { error } = await db
      .from("customer_orders" as any)
      .update({ status: data.status })
      .eq("id", data.orderId);
    if (error) throw error;
    if (data.status === "confirmed" || data.status === "delivered") {
      // Snapshot only if a history record for this order does not already exist.
      await snapshotOrderToHistory(db, data.orderId);
    }
    return { ok: true };
  });

/* =========================================================
   Permanent delete
   ========================================================= */

const deleteSchema = z.object({
  orderId: z.string().uuid(),
  keepHistory: z.boolean().default(true),
});

export const deleteOrderPermanently = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => deleteSchema.parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();

    // Fetch order to know payment screenshot storage path
    const { data: row, error: fetchErr } = await db
      .from("customer_orders" as any)
      .select("id, payment_screenshot")
      .eq("id", data.orderId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!row) return { ok: true };

    // If not keeping history, remove it first (FK is ON DELETE SET NULL,
    // so deleting the order alone would leave an orphan history row).
    if (!data.keepHistory) {
      const { error: histErr } = await db
        .from("customer_history" as any)
        .delete()
        .eq("order_id", data.orderId);
      if (histErr) throw histErr;
    }

    // Delete order — cascades coupon_usage; sets history.order_id to NULL when kept.
    const { error: delErr } = await db
      .from("customer_orders" as any)
      .delete()
      .eq("id", data.orderId);
    if (delErr) throw delErr;

    // Best-effort storage cleanup for payment screenshot (skip absolute URLs)
    const path = (row as any).payment_screenshot as string | null;
    if (path && !/^https?:\/\//i.test(path)) {
      try {
        await db.storage.from(BUCKET).remove([path]);
      } catch {
        /* ignore storage errors */
      }
    }

    return { ok: true };
  });


/** Count of orders placed after the admin last opened the Orders page. */
export const countNewOrders = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) =>
    z.object({ since: z.string().datetime().nullable().optional() }).parse(raw ?? {}),
  )
  .handler(async ({ data }): Promise<{ count: number; latest: string | null }> => {
    await ensureAdmin();
    const db = await getDb();
    let query = (db as any)
      .from("customer_orders")
      .select("created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(1);
    if (data.since) query = query.gt("created_at", data.since);
    const { data: rows, count, error } = await query;
    if (error) throw new Error(error.message);
    return {
      count: count ?? 0,
      latest: ((rows ?? [])[0]?.created_at as string | undefined) ?? null,
    };
  });
