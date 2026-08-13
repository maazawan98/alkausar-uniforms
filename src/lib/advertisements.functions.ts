import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(raw, SIGN_TTL);
  return data?.signedUrl ?? null;
}

export type AdvertisementRow = {
  id: string;
  image_path: string;
  image_url: string | null;
  title: string | null;
  description: string | null;
  redirect_url: string | null;
  display_priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

async function normalize(db: any, row: any): Promise<AdvertisementRow> {
  return {
    id: row.id,
    image_path: row.image_path,
    image_url: await signImage(db, row.image_path),
    title: row.title ?? null,
    description: row.description ?? null,
    redirect_url: row.redirect_url ?? null,
    display_priority: Number(row.display_priority),
    is_active: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp"] as const;

const uploadSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(1).max(120),
  dataBase64: z.string().min(1),
});

export const uploadAdvertisementImage = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => uploadSchema.parse(raw))
  .handler(async ({ data }): Promise<{ path: string }> => {
    await ensureAdmin();
    const ext = (data.fileName.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext as any)) {
      throw new Error("Unsupported file type. Use JPG, PNG, or WEBP.");
    }
    const buf = Buffer.from(data.dataBase64, "base64");
    if (buf.byteLength > 5 * 1024 * 1024) {
      throw new Error("Image is larger than 5 MB.");
    }
    const db = await getDb();
    const path = `advertisements/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage
      .from(BUCKET)
      .upload(path, buf, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);
    return { path };
  });

const baseSchema = z.object({
  image_path: z.string().trim().min(1),
  title: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  redirect_url: z.string().trim().max(500).nullable().optional(),
  display_priority: z.number().int().min(1).max(9999),
  is_active: z.boolean().optional().default(true),
});

export const listAdvertisements = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdvertisementRow[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data, error } = await db
      .from("advertisements" as any)
      .select("*")
      .order("display_priority", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data as any[]) ?? [];
    return Promise.all(rows.map((r) => normalize(db, r)));
  },
);

export const createAdvertisement = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => baseSchema.parse(raw))
  .handler(async ({ data }): Promise<AdvertisementRow> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: inserted, error } = await db
      .from("advertisements" as any)
      .insert({
        image_path: data.image_path.trim(),
        title: data.title?.trim() || null,
        description: data.description?.trim() || null,
        redirect_url: data.redirect_url?.trim() || null,
        display_priority: data.display_priority,
        is_active: !!data.is_active,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return normalize(db, inserted);
  });

export const updateAdvertisement = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    baseSchema.extend({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }): Promise<AdvertisementRow> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: updated, error } = await db
      .from("advertisements" as any)
      .update({
        image_path: data.image_path.trim(),
        title: data.title?.trim() || null,
        description: data.description?.trim() || null,
        redirect_url: data.redirect_url?.trim() || null,
        display_priority: data.display_priority,
        is_active: !!data.is_active,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return normalize(db, updated);
  });

export const toggleAdvertisementActive = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { error } = await db
      .from("advertisements" as any)
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAdvertisement = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { data: row } = await db
      .from("advertisements" as any)
      .select("image_path")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await db.from("advertisements" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const path = (row as any)?.image_path as string | undefined;
    if (path && !path.startsWith("http")) {
      await db.storage.from(BUCKET).remove([path]);
    }
    return { ok: true };
  });

/* Public: return the top active advertisement (with signed image URL) for the homepage popup */
export const getActiveAdvertisement = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdvertisementRow | null> => {
    const db = await getDb();
    const { data, error } = await db
      .from("advertisements" as any)
      .select("*")
      .eq("is_active", true)
      .order("display_priority", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return normalize(db, data);
  },
);
