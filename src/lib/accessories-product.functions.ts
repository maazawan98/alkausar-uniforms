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
  const key = `accessories/products/${crypto.randomUUID()}.${ext}`;
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
const classMappingInput = z.object({
  size: z.string().trim().min(1).max(60),
  class_ids: z.array(z.string().uuid()).default([]),
});

const productPayload = z.object({
  category_id: z.string().uuid(),
  product_name: z.string().trim().max(160).optional().nullable(),
  company_name: z.string().trim().max(160).optional().nullable(),
  description: z.string().max(50_000).default(""),
  rating: z.number().min(0).max(5),
  is_featured: z.boolean().default(false),
  is_deal: z.boolean().default(false),
  is_out_of_stock: z.boolean().default(false),
  is_active: z.boolean().default(true),
  images: z.array(imageInput).default([]),
  sizes: z.array(sizeInput).min(1),
  quality_tags: z.array(z.string().trim().min(1).max(60)).default([]),
  product_types: z.array(z.string().trim().min(1).max(60)).default([]),
  colours: z.array(colourInput).default([]),
  genders: z.array(z.string().trim().min(1).max(40)).default([]),
  class_mappings: z.array(classMappingInput).default([]),
});


export type AccessoriesProductImage = {
  id: string;
  image: string;
  imageUrl: string | null;
  is_primary: boolean;
  sort_order: number;
};
export type AccessoriesProductSize = {
  id: string;
  size: string;
  price: number;
  sale_price: number | null;
  sort_order: number;
};
export type AccessoriesProductColour = {
  id: string;
  colour_name: string;
  hex_code: string;
};

function customerSeesFor(
  product_name: string | null,
  company_name: string | null,
  category_name: string,
): string {
  const p = (product_name ?? "").trim();
  const c = (company_name ?? "").trim();
  const cat = (category_name ?? "").trim();
  const parts: string[] = [];
  if (c) parts.push(c);
  if (p && p.toLowerCase() !== c.toLowerCase()) parts.push(p);
  if (cat) parts.push(cat);
  return parts.join(" ");
}

async function computeCustomerSees(
  categoryId: string,
  product_name: string | null,
  company_name: string | null,
): Promise<string> {
  const db = await getDb();
  const { data: cat } = await db
    .from("accessories_categories")
    .select("name")
    .eq("id", categoryId)
    .maybeSingle();
  return customerSeesFor(product_name, company_name, cat?.name ?? "");
}


export type AccessoriesProductRow = {
  id: string;
  category_id: string;
  product_name: string | null;
  company_name: string | null;
  customer_name: string;
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
export type AccessoriesClass = { id: string; name: string; sort_order: number };
export type AccessoriesProductClassMapping = { size: string; class_ids: string[] };

export type AccessoriesProductDetail = {
  id: string;
  category_id: string;
  product_name: string | null;
  company_name: string | null;
  description: string;
  rating: number;
  is_featured: boolean;
  is_deal: boolean;
  is_out_of_stock: boolean;
  is_active: boolean;
  images: AccessoriesProductImage[];
  sizes: AccessoriesProductSize[];
  colours: AccessoriesProductColour[];
  quality_tags: string[];
  product_types: string[];
  genders: string[];
  class_mappings: AccessoriesProductClassMapping[];
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
function validateNames(product_name: string | null | undefined, company_name: string | null | undefined) {
  const p = (product_name ?? "").trim();
  const c = (company_name ?? "").trim();
  if (!p && !c) throw new Error("Please enter either a Product Name or a Company Name.");
}

export const listAccessoriesProducts = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ categoryId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<AccessoriesProductRow[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: rows, error } = await db
      .from("accessories_products")
      .select(
        "id, category_id, product_name, company_name, customer_sees, rating, is_featured, is_deal, is_out_of_stock, is_active, created_at, updated_at",
      )
      .eq("category_id", data.categoryId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.id);
    if (!ids.length) return [];

    const [imgs, szs, gends] = await Promise.all([
      db
        .from("accessories_product_images")
        .select("product_id, image, is_primary, sort_order")
        .in("product_id", ids),
      db
        .from("accessories_product_sizes")
        .select("product_id, size, price, sort_order")
        .in("product_id", ids)
        .order("sort_order"),
      db.from("accessories_product_genders").select("product_id, gender").in("product_id", ids),
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
          customer_name: (r as { customer_sees?: string | null }).customer_sees ?? "",
          primaryImageUrl: await signUrl(primaryByProduct.get(r.id)),
          sizes: info?.sizes ?? [],
          priceFrom: info?.min ?? null,
          priceTo: info?.max ?? null,
          genders: genderMap.get(r.id) ?? [],
        };
      }),
    );
  });

export const getAccessoriesProduct = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<AccessoriesProductDetail | null> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: row, error } = await db
      .from("accessories_products")
      .select(
        "id, category_id, product_name, company_name, description, rating, is_featured, is_deal, is_out_of_stock, is_active",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const [images, sizes, colours, tags, genders, pcls] = await Promise.all([
      db
        .from("accessories_product_images")
        .select("id, image, is_primary, sort_order")
        .eq("product_id", data.id)
        .order("sort_order"),
      db
        .from("accessories_product_sizes")
        .select("id, size, price, sale_price, sort_order")
        .eq("product_id", data.id)
        .order("sort_order"),
      db
        .from("accessories_product_colours")
        .select("id, colour_name, hex_code, sort_order")
        .eq("product_id", data.id)
        .order("sort_order"),
      db.from("accessories_product_quality_tags").select("tag").eq("product_id", data.id),
      db.from("accessories_product_genders").select("gender").eq("product_id", data.id),
      (db as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (
              k: string,
              v: string,
            ) => Promise<{
              data: { product_size_id: string; accessory_class_id: string }[] | null;
            }>;
          };
        };
      })
        .from("accessories_product_classes")
        .select("product_size_id, accessory_class_id")
        .eq("accessory_product_id", data.id),
    ]);

    const productTypeNames = await fetchProductTypes(db, "accessories", data.id);

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
    for (const r of pcls.data ?? []) {
      const arr = classesBySizeId.get(r.product_size_id) ?? [];
      arr.push(r.accessory_class_id);
      classesBySizeId.set(r.product_size_id, arr);
    }
    const class_mappings: AccessoriesProductClassMapping[] = sizeRows.map((s) => ({
      size: s.size,
      class_ids: classesBySizeId.get(s.id) ?? [],
    }));

    return {
      id: row.id,
      category_id: row.category_id,
      product_name: row.product_name,
      company_name: row.company_name,
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
      genders: (genders.data ?? []).map((g) => g.gender),
      class_mappings,
    };
  });

export const listAccessoriesClasses = createServerFn({ method: "GET" }).handler(
  async (): Promise<AccessoriesClass[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data, error } = await (db as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (
            k: string,
            v: boolean,
          ) => {
            order: (
              c: string,
            ) => Promise<{
              data: { id: string; name: string; sort_order: number }[] | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    })
      .from("accessories_classes")
      .select("id, name, sort_order")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  },
);

async function insertClassMappings(
  productId: string,
  insertedSizes: { id: string; size: string }[],
  mappings: { size: string; class_ids: string[] }[],
) {
  const db = await getDb();
  const bySize = new Map(insertedSizes.map((s) => [s.size.trim().toLowerCase(), s.id]));
  const rows: {
    accessory_product_id: string;
    product_size_id: string;
    accessory_class_id: string;
  }[] = [];
  const seen = new Set<string>();
  for (const m of mappings) {
    const sid = bySize.get(m.size.trim().toLowerCase());
    if (!sid) continue;
    for (const cid of m.class_ids) {
      const key = `${sid}:${cid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        accessory_product_id: productId,
        product_size_id: sid,
        accessory_class_id: cid,
      });
    }
  }
  if (!rows.length) return;
  const { error } = await (db as unknown as {
    from: (t: string) => {
      insert: (
        rows: unknown[],
      ) => Promise<{ error: { message: string } | null }>;
    };
  })
    .from("accessories_product_classes")
    .insert(rows);
  if (error) throw new Error(error.message);
}


export const createAccessoriesProduct = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => productPayload.parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    validateNames(data.product_name, data.company_name);
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

      const customerSees = await computeCustomerSees(
        data.category_id,
        data.product_name ?? null,
        data.company_name ?? null,
      );
      const { data: row, error } = await db
        .from("accessories_products")
        .insert({
          category_id: data.category_id,
          product_name: data.product_name?.trim() || null,
          company_name: data.company_name?.trim() || null,
          customer_sees: customerSees,
          description: data.description,
          rating: data.rating,
          is_featured: data.is_featured,
          is_deal: data.is_deal,
          is_out_of_stock: data.is_out_of_stock,
          is_active: data.is_active,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      const productId = row.id;

      if (prepared.length) {
        const { error: iErr } = await db.from("accessories_product_images").insert(
          prepared.map((p) => ({
            product_id: productId,
            image: p.key,
            is_primary: p.is_primary,
            sort_order: p.sort_order,
          })),
        );
        if (iErr) throw new Error(iErr.message);
      }

      const { data: insertedSizes, error: sErr } = await db
        .from("accessories_product_sizes")
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
        (insertedSizes ?? []).map((s) => ({ id: s.id as string, size: s.size as string })),
        data.class_mappings,
      );


      await replaceProductTypes(db, "accessories", productId, data.product_types);

      const tagsUnique = Array.from(new Set(data.quality_tags.map(normalizeTag))).filter(Boolean);
      if (tagsUnique.length) {
        const { error: tErr } = await db
          .from("accessories_product_quality_tags")
          .insert(tagsUnique.map((tag) => ({ product_id: productId, tag })));
        if (tErr) throw new Error(tErr.message);
      }

      const gendersUnique = Array.from(
        new Set(data.genders.map((g) => g.trim()).filter(Boolean)),
      );
      if (gendersUnique.length) {
        const { error: gErr } = await db
          .from("accessories_product_genders")
          .insert(gendersUnique.map((gender) => ({ product_id: productId, gender })));
        if (gErr) throw new Error(gErr.message);
      }

      if (data.colours.length) {
        const { error: cErr } = await db.from("accessories_product_colours").insert(
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

export const updateAccessoriesProduct = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => productPayload.extend({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    validateNames(data.product_name, data.company_name);
    validateSizes(data.sizes);
    const db = await getDb();

    const { data: existing, error: exErr } = await db
      .from("accessories_products")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();
    if (exErr) throw new Error(exErr.message);
    if (!existing) throw new Error("Product not found");

    const customerSees = await computeCustomerSees(
      data.category_id,
      data.product_name ?? null,
      data.company_name ?? null,
    );
    const { error: uErr } = await db
      .from("accessories_products")
      .update({
        category_id: data.category_id,
        product_name: data.product_name?.trim() || null,
        company_name: data.company_name?.trim() || null,
        customer_sees: customerSees,
        description: data.description,
        rating: data.rating,
        is_featured: data.is_featured,
        is_deal: data.is_deal,
        is_out_of_stock: data.is_out_of_stock,
        is_active: data.is_active,
      })
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);

    const { data: existingImgs } = await db
      .from("accessories_product_images")
      .select("id, image")
      .eq("product_id", data.id);
    const keepIds = new Set(data.images.map((i) => i.id).filter(Boolean) as string[]);
    const toDelete = (existingImgs ?? []).filter((i) => !keepIds.has(i.id));
    if (toDelete.length) {
      await db
        .from("accessories_product_images")
        .delete()
        .in("id", toDelete.map((i) => i.id));
      await removeImages(toDelete.map((i) => i.image));
    }

    let primaryCount = data.images.filter((i) => i.is_primary).length;
    if (primaryCount > 1) throw new Error("Only one primary image allowed");
    if (primaryCount === 0 && data.images.length) data.images[0].is_primary = true;

    await db
      .from("accessories_product_images")
      .update({ is_primary: false })
      .eq("product_id", data.id);

    const uploadedKeys: string[] = [];
    try {
      for (let i = 0; i < data.images.length; i++) {
        const img = data.images[i];
        if (img.id) {
          const { error } = await db
            .from("accessories_product_images")
            .update({ sort_order: i, is_primary: img.is_primary })
            .eq("id", img.id);
          if (error) throw new Error(error.message);
        } else {
          if (!img.upload) throw new Error("Image data missing");
          const key = await uploadImage(img.upload);
          uploadedKeys.push(key);
          const { error } = await db.from("accessories_product_images").insert({
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

    // Sizes wipe cascades accessories_product_classes rows via FK.
    await db.from("accessories_product_sizes").delete().eq("product_id", data.id);
    const { data: insertedSizesU, error: sErr } = await db
      .from("accessories_product_sizes")
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
      (insertedSizesU ?? []).map((s) => ({ id: s.id as string, size: s.size as string })),
      data.class_mappings,
    );


    await db.from("accessories_product_quality_tags").delete().eq("product_id", data.id);
    await replaceProductTypes(db, "accessories", data.id, data.product_types);

    const tagsUnique = Array.from(new Set(data.quality_tags.map(normalizeTag))).filter(Boolean);
    if (tagsUnique.length) {
      const { error: tErr } = await db
        .from("accessories_product_quality_tags")
        .insert(tagsUnique.map((tag) => ({ product_id: data.id, tag })));
      if (tErr) throw new Error(tErr.message);
    }

    await db.from("accessories_product_genders").delete().eq("product_id", data.id);
    const gendersUnique = Array.from(
      new Set(data.genders.map((g) => g.trim()).filter(Boolean)),
    );
    if (gendersUnique.length) {
      const { error: gErr } = await db
        .from("accessories_product_genders")
        .insert(gendersUnique.map((gender) => ({ product_id: data.id, gender })));
      if (gErr) throw new Error(gErr.message);
    }

    await db.from("accessories_product_colours").delete().eq("product_id", data.id);
    if (data.colours.length) {
      const { error: cErr } = await db.from("accessories_product_colours").insert(
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

export const deleteAccessoriesProduct = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { data: imgs } = await db
      .from("accessories_product_images")
      .select("image")
      .eq("product_id", data.id);
    await db
      .from("product_types")
      .delete()
      .eq("module", "accessories")
      .eq("product_id", data.id);
    const { error } = await db.from("accessories_products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (imgs?.length) await removeImages(imgs.map((i) => i.image));
    return { ok: true };
  });
