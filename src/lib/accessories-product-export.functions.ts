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

export type AccExportSizeRow = { size: string; price: number; sale_price: number | null };
export type AccExportProductRow = {
  customer_name: string;
  product_name: string | null;
  company_name: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_deal: boolean;
  is_out_of_stock: boolean;
  rating: number;
  genders: string[];
  sizes: AccExportSizeRow[];
  quality_tags: string[];
  colours: { name: string; hex: string }[];
  description: string;
  primary_image_filename: string | null;
  created_at: string;
  updated_at: string;
};
export type AccExportPayload = {
  category_name: string;
  generated_at: string;
  rows: AccExportProductRow[];
};

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

export const getAccessoriesProductsExport = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ categoryId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<AccExportPayload> => {
    await ensureAdmin();
    const db = await getDb();

    const { data: cat } = await db
      .from("accessories_categories")
      .select("name")
      .eq("id", data.categoryId)
      .maybeSingle();

    const { data: products, error: pErr } = await db
      .from("accessories_products")
      .select(
        "id, product_name, company_name, customer_sees, description, rating, is_active, is_featured, is_deal, is_out_of_stock, created_at, updated_at",
      )
      .eq("category_id", data.categoryId)
      .order("created_at", { ascending: false });
    if (pErr) throw new Error(pErr.message);


    const ids = (products ?? []).map((p) => p.id);
    let imgs: { product_id: string; image: string; is_primary: boolean }[] = [];
    let szs: {
      product_id: string;
      size: string;
      price: number | string;
      sale_price: number | string | null;
      sort_order: number;
    }[] = [];
    let tags: { product_id: string; tag: string }[] = [];
    let colours: {
      product_id: string;
      colour_name: string;
      hex_code: string;
      sort_order: number;
    }[] = [];
    let gends: { product_id: string; gender: string }[] = [];

    if (ids.length) {
      const [i, s, t, co, g] = await Promise.all([
        db
          .from("accessories_product_images")
          .select("product_id, image, is_primary")
          .in("product_id", ids),
        db
          .from("accessories_product_sizes")
          .select("product_id, size, price, sale_price, sort_order")
          .in("product_id", ids)
          .order("sort_order"),
        db
          .from("accessories_product_quality_tags")
          .select("product_id, tag")
          .in("product_id", ids),
        db
          .from("accessories_product_colours")
          .select("product_id, colour_name, hex_code, sort_order")
          .in("product_id", ids)
          .order("sort_order"),
        db
          .from("accessories_product_genders")
          .select("product_id, gender")
          .in("product_id", ids),
      ]);
      imgs = (i.data ?? []) as typeof imgs;
      szs = (s.data ?? []) as typeof szs;
      tags = (t.data ?? []) as typeof tags;
      colours = (co.data ?? []) as typeof colours;
      gends = (g.data ?? []) as typeof gends;
    }

    const primaryByProduct = new Map<string, string>();
    for (const i of imgs) {
      const existing = primaryByProduct.get(i.product_id);
      if (i.is_primary) primaryByProduct.set(i.product_id, i.image);
      else if (!existing) primaryByProduct.set(i.product_id, i.image);
    }
    const sizesByProduct = new Map<string, AccExportSizeRow[]>();
    for (const s of szs) {
      const arr = sizesByProduct.get(s.product_id) ?? [];
      arr.push({
        size: s.size,
        price: Number(s.price),
        sale_price: s.sale_price == null ? null : Number(s.sale_price),
      });
      sizesByProduct.set(s.product_id, arr);
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
    const gendersByProduct = new Map<string, string[]>();
    for (const g of gends) {
      const arr = gendersByProduct.get(g.product_id) ?? [];
      arr.push(g.gender);
      gendersByProduct.set(g.product_id, arr);
    }

    const rows: AccExportProductRow[] = (products ?? []).map((p) => {
      const primaryKey = primaryByProduct.get(p.id) ?? null;
      const primaryFilename = primaryKey ? primaryKey.split("/").pop() ?? primaryKey : null;
      return {
        customer_name: (p as { customer_sees?: string | null }).customer_sees ?? "",
        product_name: p.product_name,
        company_name: p.company_name,
        is_active: p.is_active,
        is_featured: p.is_featured,
        is_deal: p.is_deal,
        is_out_of_stock: p.is_out_of_stock,
        rating: Number(p.rating),
        genders: gendersByProduct.get(p.id) ?? [],
        sizes: sizesByProduct.get(p.id) ?? [],
        quality_tags: tagsByProduct.get(p.id) ?? [],
        colours: coloursByProduct.get(p.id) ?? [],
        description: stripHtml(p.description ?? ""),
        primary_image_filename: primaryFilename,
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
    });

    rows.sort((a, b) => a.customer_name.localeCompare(b.customer_name));

    return {
      category_name: cat?.name ?? "Accessories",
      generated_at: new Date().toISOString(),
      rows,
    };
  });
