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

export type ExportSizeRow = { size: string; price: number; sale_price: number | null };
export type ExportProductRow = {
  school_name: string;
  collection: "boys" | "girls";
  category_name: string;
  name: string;
  customer_sees: string;
  is_active: boolean;
  is_featured: boolean;
  is_deal: boolean;
  is_out_of_stock: boolean;
  rating: number;
  sizes: ExportSizeRow[];
  classes: string[];
  campuses: string[];
  quality_tags: string[];
  colours: { name: string; hex: string }[];
  description: string;
  primary_image_filename: string | null;
  created_at: string;
  updated_at: string;
};
export type ExportPayload = {
  scope: "school" | "category";
  school: { name: string; slug: string };
  collection?: "boys" | "girls";
  category?: string;
  generated_at: string;
  rows: ExportProductRow[];
};

const inputSchema = z.object({
  schoolId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
});

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export const getProductsExport = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => inputSchema.parse(raw))
  .handler(async ({ data }): Promise<ExportPayload> => {
    await ensureAdmin();
    const db = await getDb();

    const { data: school, error: sErr } = await db
      .from("schools")
      .select("id, name, slug")
      .eq("id", data.schoolId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!school) throw new Error("School not found");

    let categoryInfo: { id: string; name: string; collection_type: "boys" | "girls" } | null = null;
    if (data.categoryId) {
      const { data: cat, error: cErr } = await db
        .from("school_categories")
        .select("id, name, collection_type, school_id")
        .eq("id", data.categoryId)
        .maybeSingle();
      if (cErr) throw new Error(cErr.message);
      if (!cat || cat.school_id !== school.id) throw new Error("Category not found for this school");
      categoryInfo = {
        id: cat.id,
        name: cat.name,
        collection_type: cat.collection_type as "boys" | "girls",
      };
    }

    let query = db
      .from("products")
      .select(
        "id, name, collection_type, category_id, description, rating, is_active, is_featured, is_deal, is_out_of_stock, created_at, updated_at",
      )
      .eq("school_id", school.id);
    if (categoryInfo) query = query.eq("category_id", categoryInfo.id);

    const { data: products, error: pErr } = await query;
    if (pErr) throw new Error(pErr.message);

    const [{ data: cats }, { data: campuses }, { data: classes }] = await Promise.all([
      db.from("school_categories").select("id, name, collection_type").eq("school_id", school.id),
      db
        .from("school_campuses")
        .select("id, campus_name, area, city")
        .eq("school_id", school.id),
      db
        .from("school_classes")
        .select("id, name, sort_order")
        .eq("school_id", school.id)
        .order("sort_order"),
    ]);

    const ids = (products ?? []).map((p) => p.id);
    let imgs: { product_id: string; image: string; is_primary: boolean; sort_order: number }[] = [];
    let szs: {
      id: string;
      product_id: string;
      size: string;
      price: number | string;
      sale_price: number | string | null;
      sort_order: number;
    }[] = [];
    let camps: { product_id: string; campus_id: string }[] = [];
    let pcls: { product_id: string; school_class_id: string }[] = [];
    let tags: { product_id: string; tag: string }[] = [];
    let colours: { product_id: string; colour_name: string; hex_code: string; sort_order: number }[] = [];

    if (ids.length) {
      const [i, s, cp, cl, t, co] = await Promise.all([
        db
          .from("product_images")
          .select("product_id, image, is_primary, sort_order")
          .in("product_id", ids),
        db
          .from("product_sizes")
          .select("id, product_id, size, price, sale_price, sort_order")
          .in("product_id", ids)
          .order("sort_order"),
        db.from("product_campuses").select("product_id, campus_id").in("product_id", ids),
        db.from("product_classes").select("product_id, school_class_id").in("product_id", ids),
        db.from("product_quality_tags").select("product_id, tag").in("product_id", ids),
        db
          .from("product_colours")
          .select("product_id, colour_name, hex_code, sort_order")
          .in("product_id", ids)
          .order("sort_order"),
      ]);
      imgs = (i.data ?? []) as typeof imgs;
      szs = (s.data ?? []) as typeof szs;
      camps = (cp.data ?? []) as typeof camps;
      pcls = (cl.data ?? []) as typeof pcls;
      tags = (t.data ?? []) as typeof tags;
      colours = (co.data ?? []) as typeof colours;
    }

    const catById = new Map((cats ?? []).map((c) => [c.id, c]));
    const campusNameById = new Map(
      (campuses ?? []).map((c) => [
        c.id,
        c.campus_name?.trim() || [c.area, c.city].filter(Boolean).join(", "),
      ]),
    );
    const classNameById = new Map((classes ?? []).map((c) => [c.id, c.name]));

    const primaryByProduct = new Map<string, string>();
    for (const i of imgs) {
      const existing = primaryByProduct.get(i.product_id);
      if (i.is_primary) primaryByProduct.set(i.product_id, i.image);
      else if (!existing) primaryByProduct.set(i.product_id, i.image);
    }

    const sizesByProduct = new Map<string, ExportSizeRow[]>();
    for (const s of szs) {
      const arr = sizesByProduct.get(s.product_id) ?? [];
      arr.push({
        size: s.size,
        price: Number(s.price),
        sale_price: s.sale_price == null ? null : Number(s.sale_price),
      });
      sizesByProduct.set(s.product_id, arr);
    }

    const campusesByProduct = new Map<string, string[]>();
    for (const c of camps) {
      const name = campusNameById.get(c.campus_id);
      if (!name) continue;
      const arr = campusesByProduct.get(c.product_id) ?? [];
      arr.push(name);
      campusesByProduct.set(c.product_id, arr);
    }

    const classesByProduct = new Map<string, Set<string>>();
    for (const r of pcls) {
      const name = classNameById.get(r.school_class_id);
      if (!name) continue;
      const set = classesByProduct.get(r.product_id) ?? new Set<string>();
      set.add(name);
      classesByProduct.set(r.product_id, set);
    }

    const tagsByProduct = new Map<string, string[]>();
    for (const t of tags) {
      const arr = tagsByProduct.get(t.product_id) ?? [];
      arr.push(t.tag);
      tagsByProduct.set(t.product_id, arr);
    }

    const coloursByProduct = new Map<string, { name: string; hex: string }[]>();
    for (const c of colours) {
      const arr = coloursByProduct.get(c.product_id) ?? [];
      arr.push({ name: c.colour_name, hex: c.hex_code });
      coloursByProduct.set(c.product_id, arr);
    }

    const rows: ExportProductRow[] = (products ?? []).map((p) => {
      const cat = catById.get(p.category_id);
      const collLabel = p.collection_type === "boys" ? "Boys" : "Girls";
      const customer_sees = `${school.name} ${collLabel} ${p.name}${cat?.name ? " " + cat.name : ""}`.trim();
      const primaryKey = primaryByProduct.get(p.id) ?? null;
      const primaryFilename = primaryKey ? primaryKey.split("/").pop() ?? primaryKey : null;
      return {
        school_name: school.name,
        collection: p.collection_type as "boys" | "girls",
        category_name: cat?.name ?? "—",
        name: p.name,
        customer_sees,
        is_active: p.is_active,
        is_featured: p.is_featured,
        is_deal: p.is_deal,
        is_out_of_stock: p.is_out_of_stock,
        rating: Number(p.rating),
        sizes: sizesByProduct.get(p.id) ?? [],
        classes: Array.from(classesByProduct.get(p.id) ?? []),
        campuses: campusesByProduct.get(p.id) ?? [],
        quality_tags: tagsByProduct.get(p.id) ?? [],
        colours: coloursByProduct.get(p.id) ?? [],
        description: stripHtml(p.description ?? ""),
        primary_image_filename: primaryFilename,
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
    });

    rows.sort((a, b) => {
      if (a.collection !== b.collection) return a.collection === "boys" ? -1 : 1;
      const c = a.category_name.localeCompare(b.category_name);
      if (c !== 0) return c;
      return a.name.localeCompare(b.name);
    });

    return {
      scope: categoryInfo ? "category" : "school",
      school: { name: school.name, slug: school.slug },
      collection: categoryInfo?.collection_type,
      category: categoryInfo?.name,
      generated_at: new Date().toISOString(),
      rows,
    };
  });
