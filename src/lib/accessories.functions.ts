import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BUCKET = "school-assets";
const SIGNED_URL_TTL = 60 * 60;

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function getDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function ensureAdmin() {
  const { requireAdmin } = await import("./require-admin.server");
  return requireAdmin();
}
async function signUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const db = await getDb();
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}
async function uploadAsset(
  prefix: string,
  upload: { dataUrl: string; filename: string },
): Promise<string> {
  const db = await getDb();
  const match = upload.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data");
  const contentType = match[1];
  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(contentType)) throw new Error("Only PNG, JPG or WEBP");
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  const ext = contentType.split("/")[1];
  const key = `accessories/${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(key, bytes, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return key;
}
async function removeAsset(path: string | null | undefined) {
  if (!path) return;
  const db = await getDb();
  await db.storage.from(BUCKET).remove([path]);
}

const nameSchema = z.string().trim().min(1).max(120);
const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");
const uploadSchema = z
  .object({
    dataUrl: z.string().startsWith("data:").max(4_500_000),
    filename: z.string().min(1).max(200),
  })
  .nullable()
  .optional();

export type AccessoriesCategory = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  imageUrl: string | null;
  is_active: boolean;
  show_on_homepage: boolean;
  created_at: string;
  productCount: number;
};

export const listAccessoriesCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<AccessoriesCategory[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data, error } = await db
      .from("accessories_categories")
      .select("id, name, slug, image, is_active, show_on_homepage, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const counts = await Promise.all(
      rows.map((r) =>
        db
          .from("accessories_products")
          .select("id", { count: "exact", head: true })
          .eq("category_id", r.id)
          .then((res) => res.count ?? 0),
      ),
    );
    return Promise.all(
      rows.map(async (r, i) => ({
        ...r,
        show_on_homepage: (r as any).show_on_homepage ?? false,
        imageUrl: await signUrl(r.image),
        productCount: counts[i],
      })),
    );
  },
);

export const getAccessoriesCategory = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<AccessoriesCategory | null> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: row, error } = await db
      .from("accessories_categories")
      .select("id, name, slug, image, is_active, show_on_homepage, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const { count } = await db
      .from("accessories_products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", row.id);
    return {
      ...row,
      show_on_homepage: (row as any).show_on_homepage ?? false,
      imageUrl: await signUrl(row.image),
      productCount: count ?? 0,
    };
  });

export const createAccessoriesCategory = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        name: nameSchema,
        slug: slugSchema.optional(),
        is_active: z.boolean().default(true),
        show_on_homepage: z.boolean().default(false),
        upload: uploadSchema,
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const slug = data.slug ?? slugify(data.name);
    if (!slug) throw new Error("Invalid slug");
    const image = data.upload ? await uploadAsset("categories", data.upload) : null;
    const { data: row, error } = await db
      .from("accessories_categories")
      .insert({
        name: data.name,
        slug,
        image,
        is_active: data.is_active,
        show_on_homepage: data.show_on_homepage,
      })
      .select("id, slug")
      .single();
    if (error) {
      if (image) await removeAsset(image);
      if (error.code === "23505")
        throw new Error("A category with this name or slug already exists.");
      throw new Error(error.message);
    }
    return row;
  });

export const updateAccessoriesCategory = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: nameSchema,
        slug: slugSchema,
        is_active: z.boolean(),
        show_on_homepage: z.boolean().default(false),
        upload: uploadSchema,
        removeImage: z.boolean().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { data: existing, error: fErr } = await db
      .from("accessories_categories")
      .select("image")
      .eq("id", data.id)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!existing) throw new Error("Category not found");

    let newKey: string | null | undefined = undefined;
    if (data.upload) newKey = await uploadAsset("categories", data.upload);
    else if (data.removeImage) newKey = null;

    const patch: { name: string; slug: string; is_active: boolean; show_on_homepage: boolean; image?: string | null } = {
      name: data.name,
      slug: data.slug,
      is_active: data.is_active,
      show_on_homepage: data.show_on_homepage,
    };
    if (newKey !== undefined) patch.image = newKey;

    const { error } = await db.from("accessories_categories").update(patch).eq("id", data.id);
    if (error) {
      if (newKey) await removeAsset(newKey);
      if (error.code === "23505")
        throw new Error("A category with this name or slug already exists.");
      throw new Error(error.message);
    }
    if (newKey !== undefined && existing.image) await removeAsset(existing.image);
    return { ok: true };
  });

export const deleteAccessoriesCategory = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { count } = await db
      .from("accessories_products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", data.id);
    if ((count ?? 0) > 0) {
      throw new Error(
        "This category cannot be deleted because it contains products. Please delete all products first.",
      );
    }
    const { data: existing } = await db
      .from("accessories_categories")
      .select("image")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await db.from("accessories_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (existing?.image) await removeAsset(existing.image);
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * Accessories Classes (admin CRUD)
 * ------------------------------------------------------------------ */

export type AccessoriesClass = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export const adminListAccessoriesClasses = createServerFn({ method: "GET" }).handler(
  async (): Promise<AccessoriesClass[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data, error } = await (db as any)
      .from("accessories_classes")
      .select("id, name, sort_order, is_active")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as AccessoriesClass[];
  },
);

export const createAccessoriesClass = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ name: nameSchema }).parse(raw))
  .handler(async ({ data }): Promise<AccessoriesClass> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: last } = await (db as any)
      .from("accessories_classes")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    const next = ((last?.[0]?.sort_order as number | undefined) ?? -1) + 1;
    const { data: row, error } = await (db as any)
      .from("accessories_classes")
      .insert({ name: data.name, sort_order: next, is_active: true })
      .select("id, name, sort_order, is_active")
      .single();
    if (error) throw new Error(error.message);
    return row as AccessoriesClass;
  });

export const updateAccessoriesClass = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: nameSchema.optional(),
        is_active: z.boolean().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin();
    const db = await getDb();
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch["name"] = data.name;
    if (data.is_active !== undefined) patch["is_active"] = data.is_active;
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await (db as any)
      .from("accessories_classes")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAccessoriesClass = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin();
    const db = await getDb();
    await (db as any)
      .from("accessories_product_classes")
      .delete()
      .eq("accessory_class_id", data.id);
    const { error } = await (db as any)
      .from("accessories_classes")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
