import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(raw, SIGN_TTL);
  return data?.signedUrl ?? null;
}

export type ReviewStatus = "pending" | "approved" | "rejected" | "deleted";
export type ReviewModule = "school" | "college" | "medical" | "accessories";

export type ReviewRow = {
  id: string;
  order_id: string | null;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_photo: string | null;
  product_id: string;
  product_name: string;
  product_image: string | null;
  module: ReviewModule;
  category: string | null;
  review_title: string | null;
  review_text: string;
  rating: number;
  status: ReviewStatus;
  featured_on_homepage: boolean;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  deleted_at: string | null;
  deleted_by_email: string | null;
};

/* ---------- CUSTOMER ---------- */

const submitSchema = z.object({
  order_id: z.string().uuid(),
  product_id: z.string().uuid(),
  module: z.enum(["school", "college", "medical", "accessories"]),
  product_name: z.string().trim().min(1).max(200),
  product_image: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  review_title: z.string().trim().max(160).optional().nullable(),
  review_text: z.string().trim().min(3).max(4000),
  rating: z.number().int().min(1).max(5),
});

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => submitSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify order belongs to user & is delivered
    const { data: order, error: oErr } = await supabase
      .from("customer_orders" as any)
      .select("id, order_number, status, customer_id, full_name, email, phone, items")
      .eq("id", data.order_id)
      .eq("customer_id", userId)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!order) throw new Error("Order not found");
    if ((order as any).status !== "delivered") throw new Error("Only delivered orders can be reviewed");

    // Check duplicate
    const { data: existing } = await supabase
      .from("reviews" as any)
      .select("id")
      .eq("customer_id", userId)
      .eq("order_id", data.order_id)
      .eq("product_id", data.product_id)
      .maybeSingle();
    if (existing) throw new Error("You have already submitted a review for this product");

    // Customer profile
    const { data: profile } = await supabase
      .from("customers")
      .select("full_name, email, profile_picture")
      .eq("id", userId)
      .maybeSingle();

    const { error: iErr } = await supabase.from("reviews" as any).insert({
      order_id: data.order_id,
      order_number: (order as any).order_number,
      customer_id: userId,
      customer_name: profile?.full_name ?? (order as any).full_name ?? "",
      customer_email: profile?.email ?? (order as any).email ?? null,
      customer_phone: (order as any).phone ?? null,
      customer_photo: profile?.profile_picture ?? null,
      product_id: data.product_id,
      product_name: data.product_name,
      product_image: data.product_image ?? null,
      module: data.module,
      category: data.category ?? null,
      review_title: data.review_title?.trim() || null,
      review_text: data.review_text,
      rating: data.rating,
      status: "pending",
    });
    if (iErr) throw new Error(iErr.message);
    return { ok: true };
  });

export type MyReviewStatus = { status: ReviewStatus; id: string; rating: number };

export const listMyReviewStatuses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Record<string, MyReviewStatus>> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("reviews" as any)
      .select("id, order_id, product_id, status, rating")
      .eq("customer_id", userId);
    if (error) throw error;
    const map: Record<string, MyReviewStatus> = {};
    for (const r of (data as any[]) ?? []) {
      map[`${r.order_id}:${r.product_id}`] = {
        id: r.id,
        status: r.status,
        rating: r.rating,
      };
    }
    return map;
  });

/* ---------- PUBLIC (product page + homepage) ---------- */

const productReviewsSchema = z.object({
  module: z.enum(["school", "college", "medical", "accessories"]),
  product_id: z.string().uuid(),
});

export type PublicReview = {
  id: string;
  customer_name: string;
  customer_photo: string | null;
  rating: number;
  review_title: string | null;
  review_text: string;
  created_at: string;
};

export const getProductReviews = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => productReviewsSchema.parse(raw))
  .handler(async ({ data }): Promise<{ reviews: PublicReview[]; average: number; total: number }> => {
    const db = await getDb();
    const { data: rows, error } = await db
      .from("reviews" as any)
      .select("id, customer_name, customer_photo, rating, review_title, review_text, created_at")
      .eq("module", data.module)
      .eq("product_id", data.product_id)
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = (rows as any[]) ?? [];
    const total = list.length;
    const average = total ? list.reduce((s, r) => s + Number(r.rating), 0) / total : 0;
    return {
      reviews: list.map((r) => ({
        id: r.id,
        customer_name: r.customer_name,
        customer_photo: r.customer_photo,
        rating: r.rating,
        review_title: r.review_title,
        review_text: r.review_text,
        created_at: r.created_at,
      })),
      average,
      total,
    };
  });

export type HomepageReview = PublicReview & {
  product_name: string;
  product_image: string | null;
  module: ReviewModule;
  product_id: string;
};

export const listHomepageReviews = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomepageReview[]> => {
    const db = await getDb();
    const { data, error } = await db
      .from("reviews" as any)
      .select("id, customer_name, customer_photo, rating, review_title, review_text, created_at, product_name, product_image, module, product_id")
      .eq("status", "approved")
      .eq("featured_on_homepage", true)
      .order("updated_at", { ascending: false })
      .limit(12);
    if (error) throw new Error(error.message);
    const rows = (data as any[]) ?? [];
    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        customer_name: r.customer_name,
        customer_photo: r.customer_photo,
        rating: r.rating,
        review_title: r.review_title,
        review_text: r.review_text,
        created_at: r.created_at,
        product_name: r.product_name,
        product_image: await signImage(db, r.product_image),
        module: r.module,
        product_id: r.product_id,
      })),
    );
  },
);

/* ---------- ADMIN ---------- */

export type AdminReviewCounts = {
  pending: number;
  approved: number;
  rejected: number;
  deleted: number;
};

export const getAdminReviewCounts = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminReviewCounts> => {
    await ensureAdmin();
    const db = await getDb();
    const statuses: ReviewStatus[] = ["pending", "approved", "rejected", "deleted"];
    const out: AdminReviewCounts = { pending: 0, approved: 0, rejected: 0, deleted: 0 };
    await Promise.all(
      statuses.map(async (s) => {
        const { count } = await db
          .from("reviews" as any)
          .select("id", { count: "exact", head: true })
          .eq("status", s);
        (out as any)[s] = count ?? 0;
      }),
    );
    return out;
  },
);

const listSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "deleted"]),
});

export const adminListReviews = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => listSchema.parse(raw))
  .handler(async ({ data }): Promise<ReviewRow[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: rows, error } = await db
      .from("reviews" as any)
      .select("*")
      .eq("status", data.status)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = (rows as any[]) ?? [];

    // Resolve deleted_by email
    const adminIds = Array.from(new Set(list.map((r) => r.deleted_by).filter(Boolean)));
    const adminMap = new Map<string, string>();
    if (adminIds.length) {
      const { data: admins } = await db
        .from("admins" as any)
        .select("id, email")
        .in("id", adminIds);
      for (const a of (admins as any[]) ?? []) adminMap.set(a.id, a.email);
    }

    return Promise.all(
      list.map(async (r) => ({
        id: r.id,
        order_id: r.order_id,
        order_number: r.order_number,
        customer_id: r.customer_id,
        customer_name: r.customer_name,
        customer_email: r.customer_email,
        customer_phone: r.customer_phone,
        customer_photo: r.customer_photo,
        product_id: r.product_id,
        product_name: r.product_name,
        product_image: await signImage(db, r.product_image),
        module: r.module,
        category: r.category,
        review_title: r.review_title,
        review_text: r.review_text,
        rating: r.rating,
        status: r.status,
        featured_on_homepage: r.featured_on_homepage,
        created_at: r.created_at,
        updated_at: r.updated_at,
        approved_at: r.approved_at,
        rejected_at: r.rejected_at,
        deleted_at: r.deleted_at,
        deleted_by_email: r.deleted_by ? adminMap.get(r.deleted_by) ?? null : null,
      })),
    );
  });

const setStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "deleted"]),
});

export const adminSetReviewStatus = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => setStatusSchema.parse(raw))
  .handler(async ({ data }) => {
    const admin = await ensureAdmin();
    const db = await getDb();
    const now = new Date().toISOString();
    const patch: any = { status: data.status };
    if (data.status === "approved") {
      patch.approved_by = admin.adminId;
      patch.approved_at = now;
    } else if (data.status === "rejected") {
      patch.rejected_by = admin.adminId;
      patch.rejected_at = now;
    } else if (data.status === "deleted") {
      patch.deleted_by = admin.adminId;
      patch.deleted_at = now;
      patch.featured_on_homepage = false;
    } else if (data.status === "pending") {
      patch.approved_at = null;
      patch.rejected_at = null;
      patch.deleted_at = null;
      patch.featured_on_homepage = false;
    }
    const { error } = await db.from("reviews" as any).update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const featureSchema = z.object({
  id: z.string().uuid(),
  featured: z.boolean(),
});

export const adminSetFeatured = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => featureSchema.parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    // Only allow featuring approved reviews
    const { data: row } = await db
      .from("reviews" as any)
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (!row || (row as any).status !== "approved") {
      throw new Error("Only approved reviews can be featured");
    }
    const { error } = await db
      .from("reviews" as any)
      .update({ featured_on_homepage: data.featured })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const idSchema = z.object({ id: z.string().uuid() });

export const adminDeletePermanent = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => idSchema.parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { error } = await db.from("reviews" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
