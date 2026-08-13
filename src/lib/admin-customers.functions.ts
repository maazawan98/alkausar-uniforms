import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
async function signImage(db: any, raw: string | null | undefined): Promise<string | null> {
  return signStoredPath(db, normalizeStoredPath(raw));
}

export type HistoryItem = {
  module: string;
  category_id?: string | null;
  product_id?: string;
  product_name: string;
  product_image: string | null;
  color?: string | null;
  size?: string | null;
  gender?: string | null;
  class_name?: string | null;
  product_type?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type HistoryRecord = {
  id: string;
  order_id: string | null;
  order_number: string;
  order_date: string;
  order_status: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  country: string | null;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  delivery_note: string | null;
  payment_method: string | null;
  payment_status: string | null;
  payment_screenshot: string | null;
  payment_verified_at: string | null;
  coupon_id: string | null;
  coupon_code: string | null;
  coupon_discount_type: string | null;
  coupon_discount_value: number | null;
  coupon_discount: number;
  delivery_charge: number;
  subtotal: number;
  grand_total: number;
  items: HistoryItem[];
  confirmed_at: string;
  created_at: string;
};

export type CustomerSummary = {
  key: string; // customer_id or lower(email)
  customer_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  total_orders: number;
  total_spent: number;
  last_order: string;
  last_status: string;
  last_payment_method: string | null;
  last_coupon: string | null;
  last_address: string | null;
};

async function hydrateRecord(db: any, r: HistoryRecord): Promise<HistoryRecord> {
  const fallbacks = await primaryImagePathMap(db, (r.items ?? []) as any[]);
  const items = await Promise.all(
    (r.items ?? []).map(async (it: any) => ({
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
  const payment_screenshot = await signImage(db, r.payment_screenshot);
  return { ...r, items, payment_screenshot };
}

export const listCustomerSummaries = createServerFn({ method: "GET" }).handler(
  async (): Promise<CustomerSummary[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data, error } = await db
      .from("customer_history" as any)
      .select(
        "customer_id, customer_name, customer_email, customer_phone, grand_total, confirmed_at, order_status, payment_method, coupon_code, address, city, country",
      )
      .order("confirmed_at", { ascending: false })
      .limit(5000);
    if (error) throw error;
    const rows = (data as any[]) ?? [];
    const map = new Map<string, CustomerSummary>();
    for (const r of rows) {
      const key = (r.customer_id ?? `email:${(r.customer_email || "").toLowerCase()}`) as string;
      const existing = map.get(key);
      const spent = Number(r.grand_total ?? 0);
      if (!existing) {
        map.set(key, {
          key,
          customer_id: r.customer_id,
          name: r.customer_name ?? "",
          email: r.customer_email ?? "",
          phone: r.customer_phone ?? null,
          total_orders: 1,
          total_spent: spent,
          last_order: r.confirmed_at,
          last_status: r.order_status,
          last_payment_method: r.payment_method ?? null,
          last_coupon: r.coupon_code ?? null,
          last_address: [r.address, r.city, r.country].filter(Boolean).join(", ") || null,
        });
      } else {
        existing.total_orders += 1;
        existing.total_spent += spent;
        // rows are sorted DESC by confirmed_at, so first seen is latest
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.last_order).getTime() - new Date(a.last_order).getTime(),
    );
  },
);

const byCustomerSchema = z.object({
  customerId: z.string().uuid().nullable().optional(),
  email: z.string().trim().min(1),
});

export const listCustomerHistory = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => byCustomerSchema.parse(raw))
  .handler(async ({ data }): Promise<HistoryRecord[]> => {
    await ensureAdmin();
    const db = await getDb();
    let q = db.from("customer_history" as any).select("*");
    if (data.customerId) q = q.eq("customer_id", data.customerId);
    else q = q.ilike("customer_email", data.email);
    const { data: rows, error } = await q.order("confirmed_at", { ascending: false });
    if (error) throw error;
    const out: HistoryRecord[] = [];
    for (const r of (rows as any[]) ?? []) {
      out.push(await hydrateRecord(db, r as HistoryRecord));
    }
    return out;
  });

export const deleteCustomerHistoryByCustomer = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => byCustomerSchema.parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    let q = db.from("customer_history" as any).delete();
    if (data.customerId) q = q.eq("customer_id", data.customerId);
    else q = q.ilike("customer_email", data.email);
    const { error } = await q;
    if (error) throw error;
    return { ok: true };
  });
