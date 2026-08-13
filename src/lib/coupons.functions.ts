import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function ensureAdmin() {
  const { requireAdmin } = await import("./require-admin.server");
  return requireAdmin();
}

export type CouponModule = "school" | "college" | "medical" | "accessories";

export type CouponRow = {
  id: string;
  coupon_name: string;
  coupon_code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  minimum_order_amount: number | null;
  maximum_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  per_customer_limit: number | null;
  valid_from: string;
  valid_until: string;
  applicable_modules: CouponModule[];
  is_active: boolean;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

function normalize(r: any): CouponRow {
  return {
    id: r.id,
    coupon_name: r.coupon_name,
    coupon_code: r.coupon_code,
    discount_type: r.discount_type,
    discount_value: Number(r.discount_value),
    minimum_order_amount: r.minimum_order_amount != null ? Number(r.minimum_order_amount) : null,
    maximum_discount: r.maximum_discount != null ? Number(r.maximum_discount) : null,
    usage_limit: r.usage_limit ?? null,
    used_count: r.used_count ?? 0,
    per_customer_limit: r.per_customer_limit ?? null,
    valid_from: r.valid_from,
    valid_until: r.valid_until,
    applicable_modules: (r.applicable_modules ?? []) as CouponModule[],
    is_active: !!r.is_active,
    internal_notes: r.internal_notes ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

const moduleEnum = z.enum(["school", "college", "medical", "accessories"]);

const couponSchema = z
  .object({
    coupon_name: z.string().trim().min(1).max(200),
    coupon_code: z.string().trim().min(2).max(60),
    discount_type: z.enum(["percentage", "fixed"]),
    discount_value: z.number().finite().gt(0),
    minimum_order_amount: z.number().finite().min(0).nullable().optional(),
    maximum_discount: z.number().finite().min(0).nullable().optional(),
    usage_limit: z.number().int().min(1).nullable().optional(),
    per_customer_limit: z.number().int().min(1).nullable().optional(),
    valid_from: z.string().min(1),
    valid_until: z.string().min(1),
    applicable_modules: z.array(moduleEnum).default([]),
    is_active: z.boolean().default(true),
    internal_notes: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.discount_type === "percentage" && v.discount_value > 100) {
      ctx.addIssue({ code: "custom", message: "Percentage cannot exceed 100", path: ["discount_value"] });
    }
    if (new Date(v.valid_until).getTime() < new Date(v.valid_from).getTime()) {
      ctx.addIssue({ code: "custom", message: "Valid Until must be after Valid From", path: ["valid_until"] });
    }
  });

/* ============ Admin ============ */

export type CouponStats = {
  total: number;
  active: number;
  expired: number;
  used: number;
  totalUsage: number;
};

export const getCouponStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<CouponStats> => {
    await ensureAdmin();
    const db = await getDb();
    const nowIso = new Date().toISOString();

    const [{ count: total }, { count: active }, { count: expired }, { data: usedRows }, { count: totalUsage }] =
      await Promise.all([
        db.from("coupons" as any).select("id", { count: "exact", head: true }),
        db
          .from("coupons" as any)
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .lte("valid_from", nowIso)
          .gte("valid_until", nowIso),
        db.from("coupons" as any).select("id", { count: "exact", head: true }).lt("valid_until", nowIso),
        db.from("coupons" as any).select("id").gt("used_count", 0),
        db.from("coupon_usage" as any).select("id", { count: "exact", head: true }),
      ]);
    return {
      total: total ?? 0,
      active: active ?? 0,
      expired: expired ?? 0,
      used: usedRows?.length ?? 0,
      totalUsage: totalUsage ?? 0,
    };
  },
);

export const listCoupons = createServerFn({ method: "GET" }).handler(async (): Promise<CouponRow[]> => {
  await ensureAdmin();
  const db = await getDb();
  const { data, error } = await db
    .from("coupons" as any)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data as any[]) ?? []).map(normalize);
});

export const createCoupon = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => couponSchema.parse(raw))
  .handler(async ({ data }): Promise<CouponRow> => {
    await ensureAdmin();
    const db = await getDb();
    const code = data.coupon_code.trim().toUpperCase();

    const { data: exists } = await db
      .from("coupons" as any)
      .select("id")
      .eq("coupon_code", code)
      .maybeSingle();
    if (exists) throw new Error("Coupon code already exists");

    const { data: inserted, error } = await db
      .from("coupons" as any)
      .insert({
        coupon_name: data.coupon_name.trim(),
        coupon_code: code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        minimum_order_amount: data.minimum_order_amount ?? null,
        maximum_discount: data.discount_type === "percentage" ? data.maximum_discount ?? null : null,
        usage_limit: data.usage_limit ?? null,
        per_customer_limit: data.per_customer_limit ?? null,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        applicable_modules: data.applicable_modules,
        is_active: data.is_active,
        internal_notes: data.internal_notes?.trim() || null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return normalize(inserted);
  });

export const updateCoupon = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => couponSchema.and(z.object({ id: z.string().uuid() })).parse(raw))
  .handler(async ({ data }): Promise<CouponRow> => {
    await ensureAdmin();
    const db = await getDb();
    const code = data.coupon_code.trim().toUpperCase();
    const { data: exists } = await db
      .from("coupons" as any)
      .select("id")
      .eq("coupon_code", code)
      .neq("id", data.id)
      .maybeSingle();
    if (exists) throw new Error("Coupon code already exists");

    const { data: updated, error } = await db
      .from("coupons" as any)
      .update({
        coupon_name: data.coupon_name.trim(),
        coupon_code: code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        minimum_order_amount: data.minimum_order_amount ?? null,
        maximum_discount: data.discount_type === "percentage" ? data.maximum_discount ?? null : null,
        usage_limit: data.usage_limit ?? null,
        per_customer_limit: data.per_customer_limit ?? null,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        applicable_modules: data.applicable_modules,
        is_active: data.is_active,
        internal_notes: data.internal_notes?.trim() || null,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return normalize(updated);
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { error } = await db.from("coupons" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCouponActive = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { error } = await db
      .from("coupons" as any)
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============ Checkout: validation ============ */

export type ValidateCouponInput = {
  code: string;
  subtotal: number;
  modules: CouponModule[];
};

export type ValidateCouponResult = {
  ok: boolean;
  error?: string;
  coupon?: {
    id: string;
    code: string;
    name: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    discount_amount: number;
  };
};

function computeDiscount(row: CouponRow, subtotal: number): number {
  let discount = 0;
  if (row.discount_type === "percentage") {
    discount = (subtotal * row.discount_value) / 100;
    if (row.maximum_discount != null) discount = Math.min(discount, row.maximum_discount);
  } else {
    discount = row.discount_value;
  }
  discount = Math.min(discount, subtotal);
  return Math.round(discount * 100) / 100;
}

async function validateCouponCore(
  db: any,
  userId: string,
  input: ValidateCouponInput,
): Promise<ValidateCouponResult> {
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, error: "Invalid Coupon Code" };

  const { data: row } = await db
    .from("coupons" as any)
    .select("*")
    .eq("coupon_code", code)
    .maybeSingle();
  if (!row) return { ok: false, error: "Invalid Coupon Code" };
  const coupon = normalize(row);

  if (!coupon.is_active) return { ok: false, error: "Coupon Not Active" };

  const now = Date.now();
  if (now < new Date(coupon.valid_from).getTime())
    return { ok: false, error: "Coupon Not Yet Active" };
  if (now > new Date(coupon.valid_until).getTime())
    return { ok: false, error: "Coupon Expired" };

  if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit)
    return { ok: false, error: "Coupon Usage Limit Reached" };

  if (coupon.minimum_order_amount != null && input.subtotal < coupon.minimum_order_amount)
    return {
      ok: false,
      error: `Minimum Order Amount Required: Rs ${coupon.minimum_order_amount.toLocaleString()}`,
    };

  if (coupon.applicable_modules.length > 0) {
    const has = input.modules.some((m) => coupon.applicable_modules.includes(m));
    if (!has) return { ok: false, error: "Coupon Not Applicable to Selected Products" };
  }

  if (coupon.per_customer_limit != null) {
    const { count } = await db
      .from("coupon_usage" as any)
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("customer_id", userId);
    if ((count ?? 0) >= coupon.per_customer_limit)
      return { ok: false, error: "Coupon Already Used" };
  }

  const discount_amount = computeDiscount(coupon, input.subtotal);
  if (discount_amount <= 0) return { ok: false, error: "Coupon has no effect on this order" };

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.coupon_code,
      name: coupon.coupon_name,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount,
    },
  };
}

const validateInput = z.object({
  code: z.string().trim().min(1).max(60),
  subtotal: z.number().finite().min(0),
  modules: z.array(moduleEnum).default([]),
});

export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => validateInput.parse(raw))
  .handler(async ({ data, context }): Promise<ValidateCouponResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return validateCouponCore(supabaseAdmin, context.userId, data);
  });

/** Server-side re-validation used by placeOrder. Not exposed as its own fn. */
export async function applyCouponServerSide(
  userId: string,
  input: ValidateCouponInput,
): Promise<ValidateCouponResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return validateCouponCore(supabaseAdmin, userId, input);
}

export async function recordCouponUsage(params: {
  couponId: string;
  customerId: string;
  orderId: string;
  discountAmount: number;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("coupon_usage" as any).insert({
    coupon_id: params.couponId,
    customer_id: params.customerId,
    order_id: params.orderId,
    discount_amount: params.discountAmount,
  });
  // increment used_count
  const { data: row } = await supabaseAdmin
    .from("coupons" as any)
    .select("used_count")
    .eq("id", params.couponId)
    .maybeSingle();
  const current = Number((row as any)?.used_count ?? 0);
  await supabaseAdmin
    .from("coupons" as any)
    .update({ used_count: current + 1 })
    .eq("id", params.couponId);
}
