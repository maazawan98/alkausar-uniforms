import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchProductTypes, replaceProductTypes } from "@/lib/product-types";

const BUCKET = "school-assets";
const SIGNED_URL_TTL = 60 * 60;

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
async function uploadImage(upload: { dataUrl: string; filename: string }): Promise<string> {
  const db = await getDb();
  const match = upload.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data");
  const contentType = match[1];
  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(contentType)) throw new Error("Only PNG, JPG or WEBP");
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  const ext = contentType.split("/")[1];
  const key = `medical/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(key, bytes, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return key;
}
async function removeImages(paths: string[]) {
  if (!paths.length) return;
  const db = await getDb();
  await db.storage.from(BUCKET).remove(paths);
}

const hexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex");
const uploadSchema = z.object({
  dataUrl: z.string().startsWith("data:").max(4_500_000),
  filename: z.string().min(1).max(200),
});

const imageInput = z.object({
  id: z.string().uuid().optional(),
  upload: uploadSchema.optional(),
  is_primary: z.boolean().default(false),
});
const sizeInput = z.object({
  id: z.string().uuid().optional(),
  size: z.string().trim().min(1).max(60),
  price: z.number().finite().positive(),
  sale_price: z.number().finite().positive().nullable().optional(),
});
const colourInput = z.object({
  id: z.string().uuid().optional(),
  colour_name: z.string().trim().min(1).max(60),
  hex_code: hexSchema,
});

const productPayload = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(50_000).default(""),
  rating: z.number().min(0).max(5),
  is_featured: z.boolean().default(false),
  is_deal: z.boolean().default(false),
  is_out_of_stock: z.boolean().default(false),
  is_active: z.boolean().default(true),
  show_on_homepage: z.boolean().default(false),
  images: z.array(imageInput).default([]),
  sizes: z.array(sizeInput).min(1),
  quality_tags: z.array(z.string().trim().min(1).max(60)).default([]),
  product_types: z.array(z.string().trim().min(1).max(60)).default([]),
  colours: z.array(colourInput).default([]),
  genders: z.array(z.string().trim().min(1).max(40)).default([]),
});

export type MedicalProductImage = {
  id: string;
  image: string;
  imageUrl: string | null;
  is_primary: boolean;
  sort_order: number;
};
export type MedicalProductSize = {
  id: string;
  size: string;
  price: number;
  sale_price: number | null;
  sort_order: number;
};
export type MedicalProductColour = {
  id: string;
  colour_name: string;
  hex_code: string;
};
export type MedicalProductRow = {
  id: string;
  name: string;
  rating: number;
  is_featured: boolean;
  is_deal: boolean;
  is_out_of_stock: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  primaryImageUrl: string | null;
  sizes: string[];
  priceFrom: number | null;
  priceTo: number | null;
  genders: string[];
};
export type MedicalProductDetail = {
  id: string;
  name: string;
  description: string;
  rating: number;
  is_featured: boolean;
  is_deal: boolean;
  is_out_of_stock: boolean;
  is_active: boolean;
  show_on_homepage: boolean;
  images: MedicalProductImage[];
  sizes: MedicalProductSize[];
  colours: MedicalProductColour[];
  quality_tags: string[];
  product_types: string[];
  genders: string[];
};

function normalizeTag(t: string) {
  return t.trim().toUpperCase();
}

function validateSizes(sizes: z.infer<typeof sizeInput>[]) {
  const seen = new Set<string>();
  for (const s of sizes) {
    const k = s.size.trim().toLowerCase();
    if (seen.has(k)) throw new Error(`Duplicate size "${s.size}"`);
    seen.add(k);
    if (s.sale_price != null && s.sale_price > s.price) {
      throw new Error(`Sale price cannot exceed price for size "${s.size}"`);
    }
  }
}

// ------- LIST -------
export const listMedicalProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<MedicalProductRow[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: rows, error } = await db
      .from("medical_products")
      .select("id, name, rating, is_featured, is_deal, is_out_of_stock, is_active, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.id);
    if (!ids.length) return [];

    const [imgs, szs, gends] = await Promise.all([
      db.from("medical_product_images").select("product_id, image, is_primary, sort_order").in("product_id", ids),
      db.from("medical_product_sizes").select("product_id, size, price, sort_order").in("product_id", ids).order("sort_order"),
      db.from("medical_product_genders").select("product_id, gender").in("product_id", ids),
    ]);

    const primaryByProduct = new Map<string, string>();
    for (const i of imgs.data ?? []) {
      const existing = primaryByProduct.get(i.product_id);
      if (i.is_primary) primaryByProduct.set(i.product_id, i.image);
      else if (!existing) primaryByProduct.set(i.product_id, i.image);
    }

    const sizeMap = new Map<string, { sizes: string[]; min: number | null; max: number | null }>();
    for (const s of szs.data ?? []) {
      const cur = sizeMap.get(s.product_id) ?? { sizes: [], min: null, max: null };
      cur.sizes.push(s.size as string);
      const p = Number(s.price);
      cur.min = cur.min == null ? p : Math.min(cur.min, p);
      cur.max = cur.max == null ? p : Math.max(cur.max, p);
      sizeMap.set(s.product_id, cur);
    }

    const genderMap = new Map<string, string[]>();
    for (const g of gends.data ?? []) {
      const arr = genderMap.get(g.product_id) ?? [];
      arr.push(g.gender);
      genderMap.set(g.product_id, arr);
    }

    return Promise.all(
      (rows ?? []).map(async (r) => {
        const info = sizeMap.get(r.id);
        return {
          ...r,
          rating: Number(r.rating),
          primaryImageUrl: await signUrl(primaryByProduct.get(r.id)),
          sizes: info?.sizes ?? [],
          priceFrom: info?.min ?? null,
          priceTo: info?.max ?? null,
          genders: genderMap.get(r.id) ?? [],
        };
      }),
    );
  },
);

// ------- GET -------
export const getMedicalProduct = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<MedicalProductDetail | null> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: row, error } = await db
      .from("medical_products")
      .select("id, name, description, rating, is_featured, is_deal, is_out_of_stock, is_active, show_on_homepage")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const [images, sizes, colours, tags, genders] = await Promise.all([
      db.from("medical_product_images").select("id, image, is_primary, sort_order").eq("product_id", data.id).order("sort_order"),
      db.from("medical_product_sizes").select("id, size, price, sale_price, sort_order").eq("product_id", data.id).order("sort_order"),
      db.from("medical_product_colours").select("id, colour_name, hex_code, sort_order").eq("product_id", data.id).order("sort_order"),
      db.from("medical_product_quality_tags").select("tag").eq("product_id", data.id),
      db.from("medical_product_genders").select("gender").eq("product_id", data.id),
    ]);

    const productTypeNames = await fetchProductTypes(db, "medical", data.id);

    const imageRows = await Promise.all(
      (images.data ?? []).map(async (i) => ({
        id: i.id,
        image: i.image,
        imageUrl: await signUrl(i.image),
        is_primary: i.is_primary,
        sort_order: i.sort_order,
      })),
    );

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      rating: Number(row.rating),
      is_featured: row.is_featured,
      is_deal: row.is_deal,
      is_out_of_stock: row.is_out_of_stock,
      is_active: row.is_active,
      show_on_homepage: (row as any).show_on_homepage ?? false,
      images: imageRows,
      sizes: (sizes.data ?? []).map((s) => ({
        id: s.id as string,
        size: s.size as string,
        price: Number(s.price),
        sale_price: s.sale_price == null ? null : Number(s.sale_price),
        sort_order: s.sort_order as number,
      })),
      colours: (colours.data ?? []).map((c) => ({
        id: c.id,
        colour_name: c.colour_name,
        hex_code: c.hex_code,
      })),
      quality_tags: (tags.data ?? []).map((t) => t.tag),
      product_types: productTypeNames,
      genders: (genders.data ?? []).map((g) => g.gender),
    };
  });

// ------- CREATE -------
export const createMedicalProduct = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => productPayload.parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    validateSizes(data.sizes);
    const db = await getDb();
    const uploadedKeys: string[] = [];
    try {
      const prepared: { key: string; is_primary: boolean; sort_order: number }[] = [];
      let primaryCount = 0;
      for (let i = 0; i < data.images.length; i++) {
        const img = data.images[i];
        if (!img.upload) throw new Error("Image data missing");
        const key = await uploadImage(img.upload);
        uploadedKeys.push(key);
        prepared.push({ key, is_primary: img.is_primary, sort_order: i });
        if (img.is_primary) primaryCount++;
      }
      if (prepared.length && primaryCount === 0) prepared[0].is_primary = true;
      if (primaryCount > 1) throw new Error("Only one primary image allowed");

      const { data: row, error } = await db
        .from("medical_products")
        .insert({
          name: data.name.trim(),
          description: data.description,
          rating: data.rating,
          is_featured: data.is_featured,
          is_deal: data.is_deal,
          is_out_of_stock: data.is_out_of_stock,
          is_active: data.is_active,
          show_on_homepage: data.show_on_homepage,
        })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("A medical product with this name already exists.");
        throw new Error(error.message);
      }
      const productId = row.id;

      if (prepared.length) {
        const { error: iErr } = await db.from("medical_product_images").insert(
          prepared.map((p) => ({
            product_id: productId,
            image: p.key,
            is_primary: p.is_primary,
            sort_order: p.sort_order,
          })),
        );
        if (iErr) throw new Error(iErr.message);
      }

      const { error: sErr } = await db.from("medical_product_sizes").insert(
        data.sizes.map((s, i) => ({
          product_id: productId,
          size: s.size.trim(),
          price: s.price,
          sale_price: s.sale_price ?? null,
          sort_order: i,
        })),
      );
      if (sErr) throw new Error(sErr.message);

      await replaceProductTypes(db, "medical", productId, data.product_types);

      const tagsUnique = Array.from(new Set(data.quality_tags.map(normalizeTag))).filter(Boolean);
      if (tagsUnique.length) {
        const { error: tErr } = await db.from("medical_product_quality_tags").insert(
          tagsUnique.map((tag) => ({ product_id: productId, tag })),
        );
        if (tErr) throw new Error(tErr.message);
      }

      const gendersUnique = Array.from(
        new Set(data.genders.map((g) => g.trim()).filter(Boolean)),
      );
      if (gendersUnique.length) {
        const { error: gErr } = await db.from("medical_product_genders").insert(
          gendersUnique.map((gender) => ({ product_id: productId, gender })),
        );
        if (gErr) throw new Error(gErr.message);
      }

      if (data.colours.length) {
        const { error: cErr } = await db.from("medical_product_colours").insert(
          data.colours.map((c, i) => ({
            product_id: productId,
            colour_name: c.colour_name.trim(),
            hex_code: c.hex_code.toLowerCase(),
            sort_order: i,
          })),
        );
        if (cErr) throw new Error(cErr.message);
      }

      return { id: productId };
    } catch (err) {
      if (uploadedKeys.length) await removeImages(uploadedKeys);
      throw err;
    }
  });

// ------- UPDATE -------
export const updateMedicalProduct = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    productPayload.extend({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    validateSizes(data.sizes);
    const db = await getDb();

    const { data: existing, error: exErr } = await db
      .from("medical_products")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (!existing) throw new Error("Product not found");

    const { error: uErr } = await db
      .from("medical_products")
      .update({
        name: data.name.trim(),
        description: data.description,
        rating: data.rating,
        is_featured: data.is_featured,
        is_deal: data.is_deal,
        is_out_of_stock: data.is_out_of_stock,
        is_active: data.is_active,
        show_on_homepage: data.show_on_homepage,
      })
      .eq("id", data.id);
    if (uErr) {
      if (uErr.code === "23505") throw new Error("A medical product with this name already exists.");
      throw new Error(uErr.message);
    }

    // Images
    const { data: existingImgs } = await db
      .from("medical_product_images")
      .select("id, image")
      .eq("product_id", data.id);
    const keepIds = new Set(data.images.map((i) => i.id).filter(Boolean) as string[]);
    const toDelete = (existingImgs ?? []).filter((i) => !keepIds.has(i.id));
    if (toDelete.length) {
      await db.from("medical_product_images").delete().in("id", toDelete.map((i) => i.id));
      await removeImages(toDelete.map((i) => i.image));
    }

    let primaryCount = data.images.filter((i) => i.is_primary).length;
    if (primaryCount > 1) throw new Error("Only one primary image allowed");
    if (primaryCount === 0 && data.images.length) data.images[0].is_primary = true;

    await db.from("medical_product_images").update({ is_primary: false }).eq("product_id", data.id);

    const uploadedKeys: string[] = [];
    try {
      for (let i = 0; i < data.images.length; i++) {
        const img = data.images[i];
        if (img.id) {
          const { error } = await db
            .from("medical_product_images")
            .update({ sort_order: i, is_primary: img.is_primary })
            .eq("id", img.id);
          if (error) throw new Error(error.message);
        } else {
          if (!img.upload) throw new Error("Image data missing");
          const key = await uploadImage(img.upload);
          uploadedKeys.push(key);
          const { error } = await db.from("medical_product_images").insert({
            product_id: data.id,
            image: key,
            is_primary: img.is_primary,
            sort_order: i,
          });
          if (error) throw new Error(error.message);
        }
      }
    } catch (err) {
      if (uploadedKeys.length) await removeImages(uploadedKeys);
      throw err;
    }

    await db.from("medical_product_sizes").delete().eq("product_id", data.id);
    const { error: sErr } = await db.from("medical_product_sizes").insert(
      data.sizes.map((s, i) => ({
        product_id: data.id,
        size: s.size.trim(),
        price: s.price,
        sale_price: s.sale_price ?? null,
        sort_order: i,
      })),
    );
    if (sErr) throw new Error(sErr.message);

    await db.from("medical_product_quality_tags").delete().eq("product_id", data.id);
    await replaceProductTypes(db, "medical", data.id, data.product_types);

    const tagsUnique = Array.from(new Set(data.quality_tags.map(normalizeTag))).filter(Boolean);
    if (tagsUnique.length) {
      const { error: tErr } = await db.from("medical_product_quality_tags").insert(
        tagsUnique.map((tag) => ({ product_id: data.id, tag })),
      );
      if (tErr) throw new Error(tErr.message);
    }

    await db.from("medical_product_genders").delete().eq("product_id", data.id);
    const gendersUnique = Array.from(
      new Set(data.genders.map((g) => g.trim()).filter(Boolean)),
    );
    if (gendersUnique.length) {
      const { error: gErr } = await db.from("medical_product_genders").insert(
        gendersUnique.map((gender) => ({ product_id: data.id, gender })),
      );
      if (gErr) throw new Error(gErr.message);
    }

    await db.from("medical_product_colours").delete().eq("product_id", data.id);
    if (data.colours.length) {
      const { error: cErr } = await db.from("medical_product_colours").insert(
        data.colours.map((c, i) => ({
          product_id: data.id,
          colour_name: c.colour_name.trim(),
          hex_code: c.hex_code.toLowerCase(),
          sort_order: i,
        })),
      );
      if (cErr) throw new Error(cErr.message);
    }

    return { ok: true };
  });

// ------- DELETE -------
export const deleteMedicalProduct = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { data: imgs } = await db
      .from("medical_product_images")
      .select("image")
      .eq("product_id", data.id);
    await db
      .from("product_types")
      .delete()
      .eq("module", "medical")
      .eq("product_id", data.id);
    const { error } = await db.from("medical_products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (imgs?.length) await removeImages(imgs.map((i) => i.image));
    return { ok: true };
  });

// ------- Sizing library (shared, read-only) -------
export type SizingTemplate = {
  id: string;
  size_label: string;
  size: string;
  measurement_unit: string;
  measurements: { measurement_label: string; measurement_value: number }[];
};

export const listSizingTemplates = createServerFn({ method: "GET" }).handler(
  async (): Promise<SizingTemplate[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: rows, error } = await db
      .from("sizings")
      .select("id, size_label, size, measurement_unit")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.id);
    const { data: ms } = ids.length
      ? await db
          .from("sizing_measurements")
          .select("sizing_id, measurement_label, measurement_value, sort_order")
          .in("sizing_id", ids)
          .order("sort_order")
      : { data: [] as { sizing_id: string; measurement_label: string; measurement_value: number; sort_order: number }[] };
    const byId = new Map<string, { measurement_label: string; measurement_value: number }[]>();
    for (const m of ms ?? []) {
      const arr = byId.get(m.sizing_id) ?? [];
      arr.push({
        measurement_label: m.measurement_label,
        measurement_value: Number(m.measurement_value),
      });
      byId.set(m.sizing_id, arr);
    }
    return (rows ?? []).map((r) => ({
      ...r,
      measurements: byId.get(r.id) ?? [],
    }));
  },
);
