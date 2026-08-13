import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchProductTypes } from "@/lib/product-types";

const BUCKET = "school-assets";
const TTL = 60 * 60;

async function getDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function signUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const db = await getDb();
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, TTL);
  return data?.signedUrl ?? null;
}

export type ProductModule = "school" | "college" | "medical" | "accessories";

export type PDImage = { id: string; url: string; is_primary: boolean };
export type PDSize = {
  id: string;
  size: string;
  price: number;
  sale_price: number | null;
  classIds: string[];
};
export type PDColour = { id: string; colour_name: string; hex_code: string };
export type PDBadge = { id: string; label: string };
export type PDSizingGuide = {
  label: string;
  unit: string;
  measurement_labels: string[];
  rows: { size: string; values: (number | null)[] }[];
};
export type PDRelated = {
  id: string;
  name: string;
  primaryImageUrl: string | null;
  rating: number;
  is_featured: boolean;
  is_deal: boolean;
  is_out_of_stock: boolean;
  priceFrom: number | null;
  salePriceFrom: number | null;
};

export type PDBreadcrumbPart = { label: string };

export type ProductDetails = {
  module: ProductModule;
  id: string;
  name: string;
  description: string;
  rating: number;
  is_featured: boolean;
  is_deal: boolean;
  is_out_of_stock: boolean;
  images: PDImage[];
  sizes: PDSize[];
  colours: PDColour[];
  quality_tags: string[];
  product_types: string[];
  genders: string[];
  campuses: PDBadge[];
  classes: PDBadge[];
  category: { id: string; name: string } | null;
  breadcrumbs: PDBreadcrumbPart[];
  sizingGuides: PDSizingGuide[];
  related: PDRelated[];
};

// ---------- Sizing guide matcher (shared) ----------
async function buildSizingGuides(sizeLabels: string[]): Promise<PDSizingGuide[]> {
  if (!sizeLabels.length) return [];
  const db = await getDb();
  // Find sizing rows whose size matches any product size.
  const { data: matched } = await db
    .from("sizings")
    .select("id, size_label, size, measurement_unit")
    .in("size", sizeLabels);
  if (!matched || !matched.length) return [];

  // Group by size_label; pick the label with the most matches (best fit).
  const groups = new Map<string, typeof matched>();
  for (const r of matched) {
    const arr = groups.get(r.size_label) ?? [];
    arr.push(r);
    groups.set(r.size_label, arr);
  }

  const guides: PDSizingGuide[] = [];
  for (const [label, rows] of groups) {
    // Only include guides that cover at least half the product's sizes.
    const covered = rows.filter((r) => sizeLabels.includes(r.size));
    if (covered.length < Math.min(2, sizeLabels.length)) continue;

    const unit = rows[0]?.measurement_unit ?? "in";
    const ids = rows.map((r) => r.id);
    const { data: ms } = await db
      .from("sizing_measurements")
      .select("sizing_id, measurement_label, measurement_value, sort_order")
      .in("sizing_id", ids)
      .order("sort_order");

    const labelSet = new Set<string>();
    const byRow = new Map<string, Map<string, number>>();
    for (const m of ms ?? []) {
      labelSet.add(m.measurement_label);
      const map = byRow.get(m.sizing_id) ?? new Map<string, number>();
      map.set(m.measurement_label, Number(m.measurement_value));
      byRow.set(m.sizing_id, map);
    }
    const measurement_labels = Array.from(labelSet);
    if (!measurement_labels.length) continue;

    const guideRows = covered
      .sort((a, b) => sizeLabels.indexOf(a.size) - sizeLabels.indexOf(b.size))
      .map((r) => ({
        size: r.size,
        values: measurement_labels.map((ml) => byRow.get(r.id)?.get(ml) ?? null),
      }));

    guides.push({ label, unit, measurement_labels, rows: guideRows });
  }
  return guides;
}

async function signImages(rows: { id: string; image: string; is_primary: boolean; sort_order: number }[]): Promise<PDImage[]> {
  const sorted = [...rows].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
  return Promise.all(
    sorted.map(async (r) => ({
      id: r.id,
      url: (await signUrl(r.image)) ?? "",
      is_primary: r.is_primary,
    })),
  );
}


function buildSizeClassMap(
  rows: { product_size_id: string | null; classId: string | null }[],
): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.product_size_id || !r.classId) continue;
    const arr = m.get(r.product_size_id) ?? [];
    if (!arr.includes(r.classId)) arr.push(r.classId);
    m.set(r.product_size_id, arr);
  }
  return m;
}

// ============ SCHOOL ============
export const getSchoolProductDetails = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<ProductDetails | null> => {
    const db = await getDb();
    const { data: p, error } = await db
      .from("products")
      .select(
        "id, school_id, category_id, collection_type, name, description, rating, is_featured, is_deal, is_out_of_stock, is_active",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p || !p.is_active) return null;

    const [imgs, szs, cols, tags, camps, pcls, cat, school] = await Promise.all([
      db.from("product_images").select("id, image, is_primary, sort_order").eq("product_id", p.id),
      db.from("product_sizes").select("id, size, price, sale_price, sort_order").eq("product_id", p.id).order("sort_order"),
      db.from("product_colours").select("id, colour_name, hex_code, sort_order").eq("product_id", p.id).order("sort_order"),
      db.from("product_quality_tags").select("tag").eq("product_id", p.id),
      db.from("product_campuses").select("campus_id").eq("product_id", p.id),
      db.from("product_classes").select("school_class_id, product_size_id").eq("product_id", p.id),
      db.from("school_categories").select("id, name").eq("id", p.category_id).maybeSingle(),
      db.from("schools").select("id, name, slug").eq("id", p.school_id).maybeSingle(),
    ]);

    const campusIds = Array.from(new Set((camps.data ?? []).map((c) => c.campus_id)));
    const classIds = Array.from(new Set((pcls.data ?? []).map((c) => c.school_class_id).filter(Boolean) as string[]));

    const [campusRows, classRows, related] = await Promise.all([
      campusIds.length
        ? db.from("school_campuses").select("id, city, area, campus_name").in("id", campusIds)
        : Promise.resolve({ data: [] as { id: string; city: string; area: string; campus_name: string | null }[] }),
      classIds.length
        ? db.from("school_classes").select("id, name, sort_order").in("id", classIds).order("sort_order")
        : Promise.resolve({ data: [] as { id: string; name: string; sort_order: number }[] }),
      // related = same category, same school, not current
      db
        .from("products")
        .select("id, name, is_featured, is_deal, is_out_of_stock, rating")
        .eq("school_id", p.school_id)
        .eq("category_id", p.category_id)
        .eq("is_active", true)
        .neq("id", p.id)
        .limit(4),
    ]);

    const relatedIds = (related.data ?? []).map((r) => r.id);
    const [relImgs, relSizes] = relatedIds.length
      ? await Promise.all([
          db.from("product_images").select("product_id, image, is_primary, sort_order").in("product_id", relatedIds),
          db.from("product_sizes").select("product_id, price, sale_price").in("product_id", relatedIds),
        ])
      : [{ data: [] as any[] }, { data: [] as any[] }];

    const relPrimary = new Map<string, string>();
    for (const i of relImgs.data ?? []) {
      if (i.is_primary) relPrimary.set(i.product_id, i.image);
      else if (!relPrimary.has(i.product_id)) relPrimary.set(i.product_id, i.image);
    }
    const relAgg = new Map<string, { priceFrom: number | null; salePriceFrom: number | null }>();
    for (const s of relSizes.data ?? []) {
      const cur = relAgg.get(s.product_id) ?? { priceFrom: null, salePriceFrom: null };
      const pr = Number(s.price);
      cur.priceFrom = cur.priceFrom == null ? pr : Math.min(cur.priceFrom, pr);
      if (s.sale_price != null) {
        const sp = Number(s.sale_price);
        cur.salePriceFrom = cur.salePriceFrom == null ? sp : Math.min(cur.salePriceFrom, sp);
      }
      relAgg.set(s.product_id, cur);
    }

    const sizeLabels = (szs.data ?? []).map((s) => s.size);
    const guides = await buildSizingGuides(sizeLabels);
    const sizeClassMap = buildSizeClassMap(
      ((pcls.data ?? []) as { product_size_id: string | null; school_class_id: string | null }[]).map((r) => ({
        product_size_id: r.product_size_id,
        classId: r.school_class_id,
      })),
    );

    const relatedOut: PDRelated[] = await Promise.all(
      (related.data ?? []).map(async (r) => {
        const a = relAgg.get(r.id);
        return {
          id: r.id,
          name: r.name,
          primaryImageUrl: await signUrl(relPrimary.get(r.id)),
          rating: Number(r.rating),
          is_featured: r.is_featured,
          is_deal: r.is_deal,
          is_out_of_stock: r.is_out_of_stock,
          priceFrom: a?.priceFrom ?? null,
          salePriceFrom: a?.salePriceFrom ?? null,
        };
      }),
    );

    return {
      module: "school",
      product_types: await fetchProductTypes(db, "school", data.id),
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      rating: Number(p.rating),
      is_featured: p.is_featured,
      is_deal: p.is_deal,
      is_out_of_stock: p.is_out_of_stock,
      images: await signImages((imgs.data ?? []) as any),
      sizes: (szs.data ?? []).map((s) => ({
        id: s.id as string,
        size: s.size as string,
        price: Number(s.price),
        sale_price: s.sale_price == null ? null : Number(s.sale_price),
        classIds: sizeClassMap.get(s.id as string) ?? [],
      })),
      colours: (cols.data ?? []).map((c) => ({ id: c.id, colour_name: c.colour_name, hex_code: c.hex_code })),
      quality_tags: (tags.data ?? []).map((t) => t.tag),
      genders: [],
      campuses: (campusRows.data ?? []).map((c) => ({
        id: c.id,
        label: [c.campus_name, c.area, c.city].filter(Boolean).join(" · ") || c.city,
      })),
      classes: (classRows.data ?? []).map((c) => ({ id: c.id, label: c.name })),
      category: cat.data ? { id: cat.data.id, name: cat.data.name } : null,
      breadcrumbs: [
        { label: "School Uniforms" },
        ...(school.data ? [{ label: school.data.name }] : []),
        { label: p.collection_type === "girls" ? "Girls" : "Boys" },
        ...(cat.data ? [{ label: cat.data.name }] : []),
      ],
      sizingGuides: guides,
      related: relatedOut,
    };
  });

// ============ COLLEGE ============
export const getCollegeProductDetails = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<ProductDetails | null> => {
    const db = await getDb();
    const { data: p, error } = await db
      .from("college_products")
      .select(
        "id, college_id, category_id, collection_type, name, description, rating, is_featured, is_deal, is_out_of_stock, is_active",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p || !p.is_active) return null;

    const [imgs, szs, cols, tags, camps, pcls, cat, college] = await Promise.all([
      db.from("college_product_images").select("id, image, is_primary, sort_order").eq("product_id", p.id),
      db.from("college_product_sizes").select("id, size, price, sale_price, sort_order").eq("product_id", p.id).order("sort_order"),
      db.from("college_product_colours").select("id, colour_name, hex_code, sort_order").eq("product_id", p.id).order("sort_order"),
      db.from("college_product_quality_tags").select("tag").eq("product_id", p.id),
      db.from("college_product_campuses").select("campus_id").eq("product_id", p.id),
      db.from("college_product_classes").select("college_class_id, product_size_id").eq("product_id", p.id),
      db.from("college_categories").select("id, name").eq("id", p.category_id).maybeSingle(),
      db.from("colleges").select("id, name, slug").eq("id", p.college_id).maybeSingle(),
    ]);

    const campusIds = Array.from(new Set((camps.data ?? []).map((c) => c.campus_id)));
    const classIds = Array.from(new Set((pcls.data ?? []).map((c) => c.college_class_id).filter(Boolean) as string[]));

    const [campusRows, classRows, related] = await Promise.all([
      campusIds.length
        ? db.from("college_campuses").select("id, city, area, campus_name").in("id", campusIds)
        : Promise.resolve({ data: [] as { id: string; city: string; area: string; campus_name: string | null }[] }),
      classIds.length
        ? db.from("college_classes").select("id, name, sort_order").in("id", classIds).order("sort_order")
        : Promise.resolve({ data: [] as { id: string; name: string; sort_order: number }[] }),
      db
        .from("college_products")
        .select("id, name, is_featured, is_deal, is_out_of_stock, rating")
        .eq("college_id", p.college_id)
        .eq("category_id", p.category_id)
        .eq("is_active", true)
        .neq("id", p.id)
        .limit(4),
    ]);

    const relatedIds = (related.data ?? []).map((r) => r.id);
    const [relImgs, relSizes] = relatedIds.length
      ? await Promise.all([
          db.from("college_product_images").select("product_id, image, is_primary, sort_order").in("product_id", relatedIds),
          db.from("college_product_sizes").select("product_id, price, sale_price").in("product_id", relatedIds),
        ])
      : [{ data: [] as any[] }, { data: [] as any[] }];

    const relPrimary = new Map<string, string>();
    for (const i of relImgs.data ?? []) {
      if (i.is_primary) relPrimary.set(i.product_id, i.image);
      else if (!relPrimary.has(i.product_id)) relPrimary.set(i.product_id, i.image);
    }
    const relAgg = new Map<string, { priceFrom: number | null; salePriceFrom: number | null }>();
    for (const s of relSizes.data ?? []) {
      const cur = relAgg.get(s.product_id) ?? { priceFrom: null, salePriceFrom: null };
      const pr = Number(s.price);
      cur.priceFrom = cur.priceFrom == null ? pr : Math.min(cur.priceFrom, pr);
      if (s.sale_price != null) {
        const sp = Number(s.sale_price);
        cur.salePriceFrom = cur.salePriceFrom == null ? sp : Math.min(cur.salePriceFrom, sp);
      }
      relAgg.set(s.product_id, cur);
    }

    const sizeLabels = (szs.data ?? []).map((s) => s.size);
    const guides = await buildSizingGuides(sizeLabels);
    const sizeClassMap = buildSizeClassMap(
      ((pcls.data ?? []) as { product_size_id: string | null; college_class_id: string | null }[]).map((r) => ({
        product_size_id: r.product_size_id,
        classId: r.college_class_id,
      })),
    );

    const relatedOut: PDRelated[] = await Promise.all(
      (related.data ?? []).map(async (r) => {
        const a = relAgg.get(r.id);
        return {
          id: r.id,
          name: r.name,
          primaryImageUrl: await signUrl(relPrimary.get(r.id)),
          rating: Number(r.rating),
          is_featured: r.is_featured,
          is_deal: r.is_deal,
          is_out_of_stock: r.is_out_of_stock,
          priceFrom: a?.priceFrom ?? null,
          salePriceFrom: a?.salePriceFrom ?? null,
        };
      }),
    );

    return {
      module: "college",
      product_types: await fetchProductTypes(db, "college", data.id),
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      rating: Number(p.rating),
      is_featured: p.is_featured,
      is_deal: p.is_deal,
      is_out_of_stock: p.is_out_of_stock,
      images: await signImages((imgs.data ?? []) as any),
      sizes: (szs.data ?? []).map((s) => ({
        id: s.id as string,
        size: s.size as string,
        price: Number(s.price),
        sale_price: s.sale_price == null ? null : Number(s.sale_price),
        classIds: sizeClassMap.get(s.id as string) ?? [],
      })),
      colours: (cols.data ?? []).map((c) => ({ id: c.id, colour_name: c.colour_name, hex_code: c.hex_code })),
      quality_tags: (tags.data ?? []).map((t) => t.tag),
      genders: [],
      campuses: (campusRows.data ?? []).map((c) => ({
        id: c.id,
        label: [c.campus_name, c.area, c.city].filter(Boolean).join(" · ") || c.city,
      })),
      classes: (classRows.data ?? []).map((c) => ({ id: c.id, label: c.name })),
      category: cat.data ? { id: cat.data.id, name: cat.data.name } : null,
      breadcrumbs: [
        { label: "Colleges" },
        ...(college.data ? [{ label: college.data.name }] : []),
        { label: p.collection_type === "girls" ? "Girls" : "Boys" },
        ...(cat.data ? [{ label: cat.data.name }] : []),
      ],
      sizingGuides: guides,
      related: relatedOut,
    };
  });

// ============ MEDICAL ============
export const getMedicalProductDetails = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<ProductDetails | null> => {
    const db = await getDb();
    const { data: p, error } = await db
      .from("medical_products")
      .select("id, name, description, rating, is_featured, is_deal, is_out_of_stock, is_active")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p || !p.is_active) return null;

    const [imgs, szs, cols, tags, genders, related] = await Promise.all([
      db.from("medical_product_images").select("id, image, is_primary, sort_order").eq("product_id", p.id),
      db.from("medical_product_sizes").select("id, size, price, sale_price, sort_order").eq("product_id", p.id).order("sort_order"),
      db.from("medical_product_colours").select("id, colour_name, hex_code, sort_order").eq("product_id", p.id).order("sort_order"),
      db.from("medical_product_quality_tags").select("tag").eq("product_id", p.id),
      db.from("medical_product_genders").select("gender").eq("product_id", p.id),
      db
        .from("medical_products")
        .select("id, name, is_featured, is_deal, is_out_of_stock, rating")
        .eq("is_active", true)
        .neq("id", p.id)
        .limit(4),
    ]);

    const relatedIds = (related.data ?? []).map((r) => r.id);
    const [relImgs, relSizes] = relatedIds.length
      ? await Promise.all([
          db.from("medical_product_images").select("product_id, image, is_primary, sort_order").in("product_id", relatedIds),
          db.from("medical_product_sizes").select("product_id, price, sale_price").in("product_id", relatedIds),
        ])
      : [{ data: [] as any[] }, { data: [] as any[] }];

    const relPrimary = new Map<string, string>();
    for (const i of relImgs.data ?? []) {
      if (i.is_primary) relPrimary.set(i.product_id, i.image);
      else if (!relPrimary.has(i.product_id)) relPrimary.set(i.product_id, i.image);
    }
    const relAgg = new Map<string, { priceFrom: number | null; salePriceFrom: number | null }>();
    for (const s of relSizes.data ?? []) {
      const cur = relAgg.get(s.product_id) ?? { priceFrom: null, salePriceFrom: null };
      const pr = Number(s.price);
      cur.priceFrom = cur.priceFrom == null ? pr : Math.min(cur.priceFrom, pr);
      if (s.sale_price != null) {
        const sp = Number(s.sale_price);
        cur.salePriceFrom = cur.salePriceFrom == null ? sp : Math.min(cur.salePriceFrom, sp);
      }
      relAgg.set(s.product_id, cur);
    }

    const sizeLabels = (szs.data ?? []).map((s) => s.size);
    const guides = await buildSizingGuides(sizeLabels);
    const sizeClassMap = new Map<string, string[]>();

    const relatedOut: PDRelated[] = await Promise.all(
      (related.data ?? []).map(async (r) => {
        const a = relAgg.get(r.id);
        return {
          id: r.id,
          name: r.name,
          primaryImageUrl: await signUrl(relPrimary.get(r.id)),
          rating: Number(r.rating),
          is_featured: r.is_featured,
          is_deal: r.is_deal,
          is_out_of_stock: r.is_out_of_stock,
          priceFrom: a?.priceFrom ?? null,
          salePriceFrom: a?.salePriceFrom ?? null,
        };
      }),
    );

    return {
      module: "medical",
      product_types: await fetchProductTypes(db, "medical", data.id),
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      rating: Number(p.rating),
      is_featured: p.is_featured,
      is_deal: p.is_deal,
      is_out_of_stock: p.is_out_of_stock,
      images: await signImages((imgs.data ?? []) as any),
      sizes: (szs.data ?? []).map((s) => ({
        id: s.id as string,
        size: s.size as string,
        price: Number(s.price),
        sale_price: s.sale_price == null ? null : Number(s.sale_price),
        classIds: sizeClassMap.get(s.id as string) ?? [],
      })),
      colours: (cols.data ?? []).map((c) => ({ id: c.id, colour_name: c.colour_name, hex_code: c.hex_code })),
      quality_tags: (tags.data ?? []).map((t) => t.tag),
      genders: (genders.data ?? []).map((g) => g.gender),
      campuses: [],
      classes: [],
      category: null,
      breadcrumbs: [{ label: "Medical" }],
      sizingGuides: guides,
      related: relatedOut,
    };
  });

// ============ ACCESSORIES ============
export const getAccessoriesProductDetails = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<ProductDetails | null> => {
    const db = await getDb();
    const { data: p, error } = await db
      .from("accessories_products")
      .select(
        "id, category_id, customer_sees, product_name, company_name, description, rating, is_featured, is_deal, is_out_of_stock, is_active",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p || !p.is_active) return null;

    const [imgs, szs, cols, tags, genders, cat] = await Promise.all([
      db.from("accessories_product_images").select("id, image, is_primary, sort_order").eq("product_id", p.id),
      db.from("accessories_product_sizes").select("id, size, price, sale_price, sort_order").eq("product_id", p.id).order("sort_order"),
      db.from("accessories_product_colours").select("id, colour_name, hex_code, sort_order").eq("product_id", p.id).order("sort_order"),
      db.from("accessories_product_quality_tags").select("tag").eq("product_id", p.id),
      db.from("accessories_product_genders").select("gender").eq("product_id", p.id),
      db.from("accessories_categories").select("id, name, slug").eq("id", p.category_id).maybeSingle(),
    ]);

    const { data: related } = await db
      .from("accessories_products")
      .select("id, customer_sees, product_name, company_name, rating, is_featured, is_deal, is_out_of_stock")
      .eq("category_id", p.category_id)
      .eq("is_active", true)
      .neq("id", p.id)
      .limit(4);

    const relatedIds = (related ?? []).map((r) => r.id);
    const [relImgs, relSizes] = relatedIds.length
      ? await Promise.all([
          db.from("accessories_product_images").select("product_id, image, is_primary, sort_order").in("product_id", relatedIds),
          db.from("accessories_product_sizes").select("product_id, price, sale_price").in("product_id", relatedIds),
        ])
      : [{ data: [] as any[] }, { data: [] as any[] }];

    const relPrimary = new Map<string, string>();
    for (const i of relImgs.data ?? []) {
      if (i.is_primary) relPrimary.set(i.product_id, i.image);
      else if (!relPrimary.has(i.product_id)) relPrimary.set(i.product_id, i.image);
    }
    const relAgg = new Map<string, { priceFrom: number | null; salePriceFrom: number | null }>();
    for (const s of relSizes.data ?? []) {
      const cur = relAgg.get(s.product_id) ?? { priceFrom: null, salePriceFrom: null };
      const pr = Number(s.price);
      cur.priceFrom = cur.priceFrom == null ? pr : Math.min(cur.priceFrom, pr);
      if (s.sale_price != null) {
        const sp = Number(s.sale_price);
        cur.salePriceFrom = cur.salePriceFrom == null ? sp : Math.min(cur.salePriceFrom, sp);
      }
      relAgg.set(s.product_id, cur);
    }

    const displayName =
      (p.customer_sees && p.customer_sees.trim()) ||
      (p.product_name && p.product_name.trim()) ||
      (p.company_name && p.company_name.trim()) ||
      "Product";

    const relatedOut: PDRelated[] = await Promise.all(
      (related ?? []).map(async (r) => {
        const a = relAgg.get(r.id);
        return {
          id: r.id,
          name:
            (r.customer_sees && r.customer_sees.trim()) ||
            (r.product_name && r.product_name.trim()) ||
            (r.company_name && r.company_name.trim()) ||
            "Product",
          primaryImageUrl: await signUrl(relPrimary.get(r.id)),
          rating: Number(r.rating),
          is_featured: r.is_featured,
          is_deal: r.is_deal,
          is_out_of_stock: r.is_out_of_stock,
          priceFrom: a?.priceFrom ?? null,
          salePriceFrom: a?.salePriceFrom ?? null,
        };
      }),
    );

    const sizeLabels = (szs.data ?? []).map((s) => s.size);
    const guides = await buildSizingGuides(sizeLabels);

    const { data: apcls } = await db
      .from("accessories_product_classes")
      .select("product_size_id, accessory_class_id")
      .eq("accessory_product_id", p.id);
    const sizeClassMap = buildSizeClassMap(
      ((apcls ?? []) as { product_size_id: string | null; accessory_class_id: string | null }[]).map((r) => ({
        product_size_id: r.product_size_id,
        classId: r.accessory_class_id,
      })),
    );
    const accClassIds = Array.from(
      new Set(Array.from(sizeClassMap.values()).flat()),
    );
    const accClasses = accClassIds.length
      ? (
          await db
            .from("accessories_classes")
            .select("id, name, sort_order")
            .in("id", accClassIds)
            .order("sort_order")
        ).data ?? []
      : [];

    return {
      module: "accessories",
      product_types: await fetchProductTypes(db, "accessories", data.id),
      id: p.id,
      name: displayName,
      description: p.description ?? "",
      rating: Number(p.rating),
      is_featured: p.is_featured,
      is_deal: p.is_deal,
      is_out_of_stock: p.is_out_of_stock,
      images: await signImages((imgs.data ?? []) as any),
      sizes: (szs.data ?? []).map((s) => ({
        id: s.id as string,
        size: s.size as string,
        price: Number(s.price),
        sale_price: s.sale_price == null ? null : Number(s.sale_price),
        classIds: sizeClassMap.get(s.id as string) ?? [],
      })),
      colours: (cols.data ?? []).map((c) => ({ id: c.id, colour_name: c.colour_name, hex_code: c.hex_code })),
      quality_tags: (tags.data ?? []).map((t) => t.tag),
      genders: (genders.data ?? []).map((g) => g.gender),
      campuses: [],
      classes: accClasses.map((c) => ({ id: c.id, label: c.name })),
      category: cat.data ? { id: cat.data.id, name: cat.data.name } : null,
      breadcrumbs: [
        { label: "Accessories" },
        ...(cat.data ? [{ label: cat.data.name }] : []),
      ],
      sizingGuides: guides,
      related: relatedOut,
    };
  });
