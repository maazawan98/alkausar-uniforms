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
  const key = `products/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(key, bytes, { contentType, upsert: false });
  if (error) throw new Error(error.message);
  return key;
}
async function removeImages(paths: string[]) {
  if (!paths.length) return;
  const db = await getDb();
  await db.storage.from(BUCKET).remove(paths);
}

const collectionSchema = z.enum(["boys", "girls"]);
const hexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex");
const uploadSchema = z.object({
  dataUrl: z.string().startsWith("data:").max(4_500_000),
  filename: z.string().min(1).max(200),
});

const imageInput = z.object({
  id: z.string().uuid().optional(),      // existing image id (kept)
  upload: uploadSchema.optional(),       // new image data
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

const classMappingInput = z.object({
  size: z.string().trim().min(1).max(60),
  class_ids: z.array(z.string().uuid()).default([]),
});

const productPayload = z.object({
  school_id: z.string().uuid(),
  category_id: z.string().uuid(),
  collection_type: collectionSchema,
  name: z.string().trim().min(1).max(160),
  description: z.string().max(50_000).default(""),
  rating: z.number().min(0).max(5),
  is_featured: z.boolean().default(false),
  is_deal: z.boolean().default(false),
  is_out_of_stock: z.boolean().default(false),
  is_active: z.boolean().default(true),
  images: z.array(imageInput).default([]),
  sizes: z.array(sizeInput).min(1),
  campus_ids: z.array(z.string().uuid()).default([]),
  quality_tags: z.array(z.string().trim().min(1).max(60)).default([]),
  product_types: z.array(z.string().trim().min(1).max(60)).default([]),
  colours: z.array(colourInput).default([]),
  class_mappings: z.array(classMappingInput).default([]),
});

export type ProductImage = {
  id: string;
  image: string;
  imageUrl: string | null;
  is_primary: boolean;
  sort_order: number;
};
export type ProductSize = {
  id: string;
  size: string;
  price: number;
  sale_price: number | null;
  sort_order: number;
};
export type ProductColour = {
  id: string;
  colour_name: string;
  hex_code: string;
};
export type ProductRow = {
  id: string;
  name: string;
  rating: number;
  is_featured: boolean;
  is_deal: boolean;
  is_out_of_stock: boolean;
  is_active: boolean;
  created_at: string;
  primaryImageUrl: string | null;
  sizeCount: number;
  priceFrom: number | null;
};
export type ProductClassMapping = { size: string; class_ids: string[] };
export type ProductDetail = {
  id: string;
  school_id: string;
  category_id: string;
  collection_type: "boys" | "girls";
  name: string;
  description: string;
  rating: number;
  is_featured: boolean;
  is_deal: boolean;
  is_out_of_stock: boolean;
  is_active: boolean;
  images: ProductImage[];
  sizes: ProductSize[];
  colours: ProductColour[];
  quality_tags: string[];
  product_types: string[];
  campus_ids: string[];
  class_mappings: ProductClassMapping[];
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

async function assertCampusesInSchool(schoolId: string, ids: string[]) {
  if (!ids.length) return;
  const db = await getDb();
  const { data, error } = await db
    .from("school_campuses")
    .select("id")
    .eq("school_id", schoolId)
    .in("id", ids);
  if (error) throw new Error(error.message);
  if ((data?.length ?? 0) !== ids.length) throw new Error("Invalid campus selection");
}

async function assertCategoryMatches(
  categoryId: string,
  schoolId: string,
  collection: "boys" | "girls",
) {
  const db = await getDb();
  const { data, error } = await db
    .from("school_categories")
    .select("id, school_id, collection_type")
    .eq("id", categoryId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.school_id !== schoolId || data.collection_type !== collection) {
    throw new Error("Category does not belong to this school/collection");
  }
}

async function assertClassesInSchool(schoolId: string, ids: string[]) {
  if (!ids.length) return;
  const db = await getDb();
  const { data, error } = await db
    .from("school_classes")
    .select("id")
    .eq("school_id", schoolId)
    .in("id", ids);
  if (error) throw new Error(error.message);
  if ((data?.length ?? 0) !== ids.length) throw new Error("Invalid class selection");
}

async function insertClassMappings(
  productId: string,
  schoolId: string,
  insertedSizes: { id: string; size: string }[],
  mappings: { size: string; class_ids: string[] }[],
) {
  const db = await getDb();
  const bySize = new Map(insertedSizes.map((s) => [s.size.trim().toLowerCase(), s.id]));
  const allClassIds = Array.from(
    new Set(mappings.flatMap((m) => m.class_ids)),
  );
  await assertClassesInSchool(schoolId, allClassIds);

  const rows: { product_id: string; product_size_id: string; school_class_id: string }[] = [];
  const seen = new Set<string>();
  for (const m of mappings) {
    const sid = bySize.get(m.size.trim().toLowerCase());
    if (!sid) continue; // size not present anymore
    for (const cid of m.class_ids) {
      const key = `${sid}:${cid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ product_id: productId, product_size_id: sid, school_class_id: cid });
    }
  }
  if (!rows.length) return;
  const { error } = await db.from("product_classes").insert(rows);
  if (error) throw new Error(error.message);
}

// ------- LIST -------
export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) =>
    z.object({ categoryId: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }): Promise<ProductRow[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: rows, error } = await db
      .from("products")
      .select(
        "id, name, rating, is_featured, is_deal, is_out_of_stock, is_active, created_at",
      )
      .eq("category_id", data.categoryId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.id);
    if (!ids.length) return [];
    const [{ data: imgs }, { data: szs }] = await Promise.all([
      db.from("product_images").select("product_id, image, is_primary, sort_order").in("product_id", ids),
      db.from("product_sizes").select("product_id, price").in("product_id", ids),
    ]);
    const primaryByProduct = new Map<string, string>();
    for (const i of imgs ?? []) {
      const existing = primaryByProduct.get(i.product_id);
      if (i.is_primary) primaryByProduct.set(i.product_id, i.image);
      else if (!existing) primaryByProduct.set(i.product_id, i.image);
    }
    const sizeMap = new Map<string, { count: number; min: number | null }>();
    for (const s of szs ?? []) {
      const cur = sizeMap.get(s.product_id) ?? { count: 0, min: null };
      cur.count += 1;
      const price = Number(s.price);
      cur.min = cur.min == null ? price : Math.min(cur.min, price);
      sizeMap.set(s.product_id, cur);
    }
    return Promise.all(
      (rows ?? []).map(async (r) => {
        const info = sizeMap.get(r.id);
        return {
          ...r,
          rating: Number(r.rating),
          primaryImageUrl: await signUrl(primaryByProduct.get(r.id)),
          sizeCount: info?.count ?? 0,
          priceFrom: info?.min ?? null,
        };
      }),
    );
  });

// ------- GET -------
export const getProduct = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<ProductDetail | null> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: row, error } = await db
      .from("products")
      .select(
        "id, school_id, category_id, collection_type, name, description, rating, is_featured, is_deal, is_out_of_stock, is_active",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const [images, sizes, colours, tags, camps, pcls] = await Promise.all([
      db.from("product_images").select("id, image, is_primary, sort_order").eq("product_id", data.id).order("sort_order"),
      db.from("product_sizes").select("id, size, price, sale_price, sort_order").eq("product_id", data.id).order("sort_order"),
      db.from("product_colours").select("id, colour_name, hex_code, sort_order").eq("product_id", data.id).order("sort_order"),
      db.from("product_quality_tags").select("tag").eq("product_id", data.id),
      db.from("product_campuses").select("campus_id").eq("product_id", data.id),
      db.from("product_classes").select("product_size_id, school_class_id").eq("product_id", data.id),
    ]);

    const productTypeNames = await fetchProductTypes(db, "school", data.id);

    const imageRows = await Promise.all(
      (images.data ?? []).map(async (i) => ({
        id: i.id,
        image: i.image,
        imageUrl: await signUrl(i.image),
        is_primary: i.is_primary,
        sort_order: i.sort_order,
      })),
    );

    const sizeRows = (sizes.data ?? []).map((s) => ({
      id: s.id as string,
      size: s.size as string,
      price: Number(s.price),
      sale_price: s.sale_price == null ? null : Number(s.sale_price),
      sort_order: s.sort_order as number,
    }));

    const classesBySizeId = new Map<string, string[]>();
    for (const r of (pcls.data ?? []) as { product_size_id: string; school_class_id: string }[]) {
      const arr = classesBySizeId.get(r.product_size_id) ?? [];
      arr.push(r.school_class_id);
      classesBySizeId.set(r.product_size_id, arr);
    }
    const classMappings: ProductClassMapping[] = sizeRows.map((s) => ({
      size: s.size,
      class_ids: classesBySizeId.get(s.id) ?? [],
    }));

    return {
      id: row.id,
      school_id: row.school_id,
      category_id: row.category_id,
      collection_type: row.collection_type as "boys" | "girls",
      name: row.name,
      description: row.description ?? "",
      rating: Number(row.rating),
      is_featured: row.is_featured,
      is_deal: row.is_deal,
      is_out_of_stock: row.is_out_of_stock,
      is_active: row.is_active,
      images: imageRows,
      sizes: sizeRows,
      colours: (colours.data ?? []).map((c) => ({
        id: c.id,
        colour_name: c.colour_name,
        hex_code: c.hex_code,
      })),
      quality_tags: (tags.data ?? []).map((t) => t.tag),
      product_types: productTypeNames,
      campus_ids: (camps.data ?? []).map((c) => c.campus_id),
      class_mappings: classMappings,
    };
  });

// ------- CREATE -------
export const createProduct = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => productPayload.parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    validateSizes(data.sizes);
    await assertCategoryMatches(data.category_id, data.school_id, data.collection_type);
    await assertCampusesInSchool(data.school_id, data.campus_ids);

    const db = await getDb();
    // Upload new images
    const uploadedKeys: string[] = [];
    try {
      const preparedImages: { key: string; is_primary: boolean; sort_order: number }[] = [];
      let primaryCount = 0;
      for (let i = 0; i < data.images.length; i++) {
        const img = data.images[i];
        if (!img.upload) throw new Error("Image data missing");
        const key = await uploadImage(img.upload);
        uploadedKeys.push(key);
        preparedImages.push({ key, is_primary: img.is_primary, sort_order: i });
        if (img.is_primary) primaryCount++;
      }
      if (preparedImages.length && primaryCount === 0) preparedImages[0].is_primary = true;
      if (primaryCount > 1) throw new Error("Only one primary image allowed");

      const { data: row, error } = await db
        .from("products")
        .insert({
          school_id: data.school_id,
          category_id: data.category_id,
          collection_type: data.collection_type,
          name: data.name.trim(),
          description: data.description,
          rating: data.rating,
          is_featured: data.is_featured,
          is_deal: data.is_deal,
          is_out_of_stock: data.is_out_of_stock,
          is_active: data.is_active,
        })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("A product with this name already exists in this category.");
        throw new Error(error.message);
      }
      const productId = row.id;

      if (preparedImages.length) {
        const { error: imgErr } = await db.from("product_images").insert(
          preparedImages.map((p) => ({
            product_id: productId,
            image: p.key,
            is_primary: p.is_primary,
            sort_order: p.sort_order,
          })),
        );
        if (imgErr) throw new Error(imgErr.message);
      }

      const { data: insertedSizes, error: sErr } = await db
        .from("product_sizes")
        .insert(
          data.sizes.map((s, i) => ({
            product_id: productId,
            size: s.size.trim(),
            price: s.price,
            sale_price: s.sale_price ?? null,
            sort_order: i,
          })),
        )
        .select("id, size");
      if (sErr) throw new Error(sErr.message);

      await insertClassMappings(
        productId,
        data.school_id,
        (insertedSizes ?? []) as { id: string; size: string }[],
        data.class_mappings,
      );

      if (data.campus_ids.length) {
        const { error: cErr } = await db.from("product_campuses").insert(
          data.campus_ids.map((cid) => ({ product_id: productId, campus_id: cid })),
        );
        if (cErr) throw new Error(cErr.message);
      }

      await replaceProductTypes(db, "school", productId, data.product_types);

      const tagsUnique = Array.from(new Set(data.quality_tags.map(normalizeTag))).filter(Boolean);
      if (tagsUnique.length) {
        const { error: tErr } = await db.from("product_quality_tags").insert(
          tagsUnique.map((tag) => ({ product_id: productId, tag })),
        );
        if (tErr) throw new Error(tErr.message);
      }

      if (data.colours.length) {
        const { error: colErr } = await db.from("product_colours").insert(
          data.colours.map((c, i) => ({
            product_id: productId,
            colour_name: c.colour_name.trim(),
            hex_code: c.hex_code.toLowerCase(),
            sort_order: i,
          })),
        );
        if (colErr) throw new Error(colErr.message);
      }

      return { id: productId };
    } catch (err) {
      if (uploadedKeys.length) await removeImages(uploadedKeys);
      throw err;
    }
  });

// ------- UPDATE -------
export const updateProduct = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    productPayload.extend({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    validateSizes(data.sizes);
    await assertCategoryMatches(data.category_id, data.school_id, data.collection_type);
    await assertCampusesInSchool(data.school_id, data.campus_ids);

    const db = await getDb();
    const { data: existing, error: exErr } = await db
      .from("products")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (!existing) throw new Error("Product not found");

    const { error: uErr } = await db
      .from("products")
      .update({
        school_id: data.school_id,
        category_id: data.category_id,
        collection_type: data.collection_type,
        name: data.name.trim(),
        description: data.description,
        rating: data.rating,
        is_featured: data.is_featured,
        is_deal: data.is_deal,
        is_out_of_stock: data.is_out_of_stock,
        is_active: data.is_active,
      })
      .eq("id", data.id);
    if (uErr) {
      if (uErr.code === "23505") throw new Error("A product with this name already exists in this category.");
      throw new Error(uErr.message);
    }

    // Images: keep only ones matching existing IDs; upload new ones; delete removed storage objects
    const { data: existingImgs } = await db
      .from("product_images")
      .select("id, image")
      .eq("product_id", data.id);
    const keepIds = new Set(
      data.images.map((i) => i.id).filter(Boolean) as string[],
    );
    const toDelete = (existingImgs ?? []).filter((i) => !keepIds.has(i.id));
    if (toDelete.length) {
      await db.from("product_images").delete().in("id", toDelete.map((i) => i.id));
      await removeImages(toDelete.map((i) => i.image));
    }

    // Update ordering + primary for kept, insert new
    let primaryCount = data.images.filter((i) => i.is_primary).length;
    if (primaryCount > 1) throw new Error("Only one primary image allowed");
    if (primaryCount === 0 && data.images.length) {
      data.images[0].is_primary = true;
    }

    // Reset all primary first to avoid unique conflict
    await db.from("product_images").update({ is_primary: false }).eq("product_id", data.id);

    const uploadedKeys: string[] = [];
    try {
      for (let i = 0; i < data.images.length; i++) {
        const img = data.images[i];
        if (img.id) {
          const { error } = await db
            .from("product_images")
            .update({ sort_order: i, is_primary: img.is_primary })
            .eq("id", img.id);
          if (error) throw new Error(error.message);
        } else {
          if (!img.upload) throw new Error("Image data missing");
          const key = await uploadImage(img.upload);
          uploadedKeys.push(key);
          const { error } = await db.from("product_images").insert({
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

    // Sizes: wipe & reinsert. product_classes cascades on size delete, so it clears too.
    await db.from("product_sizes").delete().eq("product_id", data.id);
    const { data: insertedSizes, error: sErr } = await db
      .from("product_sizes")
      .insert(
        data.sizes.map((s, i) => ({
          product_id: data.id,
          size: s.size.trim(),
          price: s.price,
          sale_price: s.sale_price ?? null,
          sort_order: i,
        })),
      )
      .select("id, size");
    if (sErr) throw new Error(sErr.message);

    await insertClassMappings(
      data.id,
      data.school_id,
      (insertedSizes ?? []) as { id: string; size: string }[],
      data.class_mappings,
    );

    await db.from("product_campuses").delete().eq("product_id", data.id);
    if (data.campus_ids.length) {
      const { error: cErr } = await db.from("product_campuses").insert(
        data.campus_ids.map((cid) => ({ product_id: data.id, campus_id: cid })),
      );
      if (cErr) throw new Error(cErr.message);
    }

    await db.from("product_quality_tags").delete().eq("product_id", data.id);
    await replaceProductTypes(db, "school", data.id, data.product_types);

    const tagsUnique = Array.from(new Set(data.quality_tags.map(normalizeTag))).filter(Boolean);
    if (tagsUnique.length) {
      const { error: tErr } = await db.from("product_quality_tags").insert(
        tagsUnique.map((tag) => ({ product_id: data.id, tag })),
      );
      if (tErr) throw new Error(tErr.message);
    }

    await db.from("product_colours").delete().eq("product_id", data.id);
    if (data.colours.length) {
      const { error: colErr } = await db.from("product_colours").insert(
        data.colours.map((c, i) => ({
          product_id: data.id,
          colour_name: c.colour_name.trim(),
          hex_code: c.hex_code.toLowerCase(),
          sort_order: i,
        })),
      );
      if (colErr) throw new Error(colErr.message);
    }

    return { ok: true };
  });

// ------- DELETE -------
export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { data: imgs } = await db
      .from("product_images")
      .select("image")
      .eq("product_id", data.id);
    await db
      .from("product_types")
      .delete()
      .eq("module", "school")
      .eq("product_id", data.id);
    const { error } = await db.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (imgs?.length) await removeImages(imgs.map((i) => i.image));
    return { ok: true };
  });

// ------- Standard sizes browser (read-only) -------
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

// ------- LIST ALL PRODUCTS BY SCHOOL (READ-ONLY OVERVIEW) -------
export type SchoolProductRow = {
  id: string;
  name: string;
  collection_type: "boys" | "girls";
  category_id: string;
  category_name: string;
  rating: number;
  is_active: boolean;
  is_featured: boolean;
  is_deal: boolean;
  is_out_of_stock: boolean;
  primaryImageUrl: string | null;
  sizes: string[];
  priceFrom: number | null;
  priceTo: number | null;
  campusNames: string[]; // empty => all campuses
  classNames: string[];
};

export type SchoolProductsPayload = {
  rows: SchoolProductRow[];
  categories: { id: string; name: string; collection_type: "boys" | "girls" }[];
};

export const listSchoolProducts = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) =>
    z.object({ schoolId: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }): Promise<SchoolProductsPayload> => {
    await ensureAdmin();
    const db = await getDb();

    const [{ data: products, error: pErr }, { data: cats }, { data: campuses }, { data: classes }] =
      await Promise.all([
        db
          .from("products")
          .select(
            "id, name, collection_type, category_id, rating, is_active, is_featured, is_deal, is_out_of_stock, created_at",
          )
          .eq("school_id", data.schoolId)
          .order("created_at", { ascending: false }),
        db
          .from("school_categories")
          .select("id, name, collection_type")
          .eq("school_id", data.schoolId),
        db.from("school_campuses").select("id, campus_name, area, city").eq("school_id", data.schoolId),
        db.from("school_classes").select("id, name").eq("school_id", data.schoolId).order("sort_order"),
      ]);
    if (pErr) throw new Error(pErr.message);

    const ids = (products ?? []).map((p) => p.id);
    if (!ids.length) {
      return {
        rows: [],
        categories: (cats ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          collection_type: c.collection_type as "boys" | "girls",
        })),
      };
    }

    const [imgs, szs, camps, pcls] = await Promise.all([
      db.from("product_images").select("product_id, image, is_primary, sort_order").in("product_id", ids),
      db.from("product_sizes").select("product_id, size, price, sort_order").in("product_id", ids).order("sort_order"),
      db.from("product_campuses").select("product_id, campus_id").in("product_id", ids),
      db.from("product_classes").select("product_id, school_class_id").in("product_id", ids),
    ]);

    const catById = new Map((cats ?? []).map((c) => [c.id, c]));
    const campusById = new Map(
      (campuses ?? []).map((c) => [c.id, c.campus_name?.trim() || `${c.area}, ${c.city}`]),
    );
    const classById = new Map((classes ?? []).map((c) => [c.id, c.name]));

    const primaryByProduct = new Map<string, string>();
    for (const i of imgs.data ?? []) {
      const existing = primaryByProduct.get(i.product_id);
      if (i.is_primary) primaryByProduct.set(i.product_id, i.image);
      else if (!existing) primaryByProduct.set(i.product_id, i.image);
    }

    const sizesByProduct = new Map<string, { sizes: string[]; min: number | null; max: number | null }>();
    for (const s of szs.data ?? []) {
      const cur = sizesByProduct.get(s.product_id) ?? { sizes: [], min: null, max: null };
      cur.sizes.push(s.size as string);
      const p = Number(s.price);
      cur.min = cur.min == null ? p : Math.min(cur.min, p);
      cur.max = cur.max == null ? p : Math.max(cur.max, p);
      sizesByProduct.set(s.product_id, cur);
    }

    const campusesByProduct = new Map<string, string[]>();
    for (const c of camps.data ?? []) {
      const name = campusById.get(c.campus_id);
      if (!name) continue;
      const arr = campusesByProduct.get(c.product_id) ?? [];
      arr.push(name);
      campusesByProduct.set(c.product_id, arr);
    }

    const classesByProduct = new Map<string, Set<string>>();
    for (const r of pcls.data ?? []) {
      const name = classById.get(r.school_class_id);
      if (!name) continue;
      const set = classesByProduct.get(r.product_id) ?? new Set<string>();
      set.add(name);
      classesByProduct.set(r.product_id, set);
    }

    const rows: SchoolProductRow[] = await Promise.all(
      (products ?? []).map(async (p) => {
        const cat = catById.get(p.category_id);
        const sinfo = sizesByProduct.get(p.id);
        return {
          id: p.id,
          name: p.name,
          collection_type: p.collection_type as "boys" | "girls",
          category_id: p.category_id,
          category_name: cat?.name ?? "—",
          rating: Number(p.rating),
          is_active: p.is_active,
          is_featured: p.is_featured,
          is_deal: p.is_deal,
          is_out_of_stock: p.is_out_of_stock,
          primaryImageUrl: await signUrl(primaryByProduct.get(p.id)),
          sizes: sinfo?.sizes ?? [],
          priceFrom: sinfo?.min ?? null,
          priceTo: sinfo?.max ?? null,
          campusNames: campusesByProduct.get(p.id) ?? [],
          classNames: Array.from(classesByProduct.get(p.id) ?? []),
        };
      }),
    );

    return {
      rows,
      categories: (cats ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        collection_type: c.collection_type as "boys" | "girls",
      })),
    };
  });
