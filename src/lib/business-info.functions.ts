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

export type BusinessInformationRow = {
  id: string;
  business_name: string;
  email: string;
  phone_number: string;
  whatsapp_number: string | null;
  landline_number: string | null;
  address: string;
  google_maps_link: string | null;
  business_description: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  whatsapp_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  opening_time: string; // "HH:MM" or "HH:MM:SS"
  closing_time: string;
  working_days: string[];
  business_note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const optStr = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v && v.length ? v : null));

const optUrl = () =>
  z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v && v.length ? v : null))
    .refine(
      (v) => v === null || /^https?:\/\/.+/i.test(v),
      { message: "Must be a valid URL starting with http:// or https://" },
    );

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const baseSchema = z.object({
  business_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  phone_number: z.string().trim().min(1).max(64),
  whatsapp_number: optStr(64),
  landline_number: optStr(64),
  address: z.string().trim().min(1).max(2000),
  google_maps_link: optUrl(),
  business_description: optStr(2000),
  facebook_url: optUrl(),
  instagram_url: optUrl(),
  whatsapp_url: optUrl(),
  tiktok_url: optUrl(),
  youtube_url: optUrl(),
  linkedin_url: optUrl(),
  twitter_url: optUrl(),
  opening_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time"),
  closing_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time"),
  working_days: z.array(z.enum(DAYS)).min(1, "Select at least one working day"),
  business_note: optStr(2000),
  is_active: z.boolean().optional().default(false),
});

function normalize(row: any): BusinessInformationRow {
  return {
    id: row.id,
    business_name: row.business_name,
    email: row.email,
    phone_number: row.phone_number,
    whatsapp_number: row.whatsapp_number ?? null,
    landline_number: row.landline_number ?? null,
    address: row.address,
    google_maps_link: row.google_maps_link ?? null,
    business_description: row.business_description ?? null,
    facebook_url: row.facebook_url ?? null,
    instagram_url: row.instagram_url ?? null,
    whatsapp_url: row.whatsapp_url ?? null,
    tiktok_url: row.tiktok_url ?? null,
    youtube_url: row.youtube_url ?? null,
    linkedin_url: row.linkedin_url ?? null,
    twitter_url: row.twitter_url ?? null,
    opening_time: (row.opening_time ?? "").slice(0, 5),
    closing_time: (row.closing_time ?? "").slice(0, 5),
    working_days: Array.isArray(row.working_days) ? row.working_days : [],
    business_note: row.business_note ?? null,
    is_active: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function deactivateOthers(db: any, keepId?: string | null) {
  const q = db.from("business_information" as any).update({ is_active: false }).eq("is_active", true);
  if (keepId) q.neq("id", keepId);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

/* Admin: list all */
export const listBusinessInformation = createServerFn({ method: "GET" }).handler(
  async (): Promise<BusinessInformationRow[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data, error } = await db
      .from("business_information" as any)
      .select("*")
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data as any[]) ?? []).map(normalize);
  },
);

/* Admin: create */
export const createBusinessInformation = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => baseSchema.parse(raw))
  .handler(async ({ data }): Promise<BusinessInformationRow> => {
    await ensureAdmin();
    const db = await getDb();
    if (data.is_active) await deactivateOthers(db);
    const { data: inserted, error } = await db
      .from("business_information" as any)
      .insert({
        business_name: data.business_name.trim(),
        email: data.email.trim(),
        phone_number: data.phone_number.trim(),
        whatsapp_number: data.whatsapp_number,
        landline_number: data.landline_number,
        address: data.address.trim(),
        google_maps_link: data.google_maps_link,
        business_description: data.business_description,
        facebook_url: data.facebook_url,
        instagram_url: data.instagram_url,
        whatsapp_url: data.whatsapp_url,
        tiktok_url: data.tiktok_url,
        youtube_url: data.youtube_url,
        linkedin_url: data.linkedin_url,
        twitter_url: data.twitter_url,
        opening_time: data.opening_time,
        closing_time: data.closing_time,
        working_days: data.working_days,
        business_note: data.business_note,
        is_active: !!data.is_active,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return normalize(inserted);
  });

/* Admin: update */
export const updateBusinessInformation = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    baseSchema.extend({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }): Promise<BusinessInformationRow> => {
    await ensureAdmin();
    const db = await getDb();
    if (data.is_active) await deactivateOthers(db, data.id);
    const { data: updated, error } = await db
      .from("business_information" as any)
      .update({
        business_name: data.business_name.trim(),
        email: data.email.trim(),
        phone_number: data.phone_number.trim(),
        whatsapp_number: data.whatsapp_number,
        landline_number: data.landline_number,
        address: data.address.trim(),
        google_maps_link: data.google_maps_link,
        business_description: data.business_description,
        facebook_url: data.facebook_url,
        instagram_url: data.instagram_url,
        whatsapp_url: data.whatsapp_url,
        tiktok_url: data.tiktok_url,
        youtube_url: data.youtube_url,
        linkedin_url: data.linkedin_url,
        twitter_url: data.twitter_url,
        opening_time: data.opening_time,
        closing_time: data.closing_time,
        working_days: data.working_days,
        business_note: data.business_note,
        is_active: !!data.is_active,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return normalize(updated);
  });

/* Admin: toggle active (activate → deactivates others) */
export const toggleBusinessInformationActive = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    if (data.is_active) await deactivateOthers(db, data.id);
    const { error } = await db
      .from("business_information" as any)
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* Admin: delete */
export const deleteBusinessInformation = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { error } = await db
      .from("business_information" as any)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* Public: active business info for website (Footer, Contact page) */
export const getActiveBusinessInformation = createServerFn({ method: "GET" }).handler(
  async (): Promise<BusinessInformationRow | null> => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabasePublic = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data, error } = await supabasePublic
      .from("business_information" as any)
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? normalize(data) : null;
  },
);

export const WORKING_DAYS = DAYS;
