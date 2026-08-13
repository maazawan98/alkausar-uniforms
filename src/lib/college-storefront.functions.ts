import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchProductTypesMap } from "@/lib/product-types";

const BUCKET = "school-assets";
const SIGNED_URL_TTL = 60 * 60;

async function getDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function signUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const db = await getDb();
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

export type PublicCollege = { id: string; name: string; slug: string; logoUrl: string | null };
export type PublicCampus = {
  id: string;
  country: string;
  city: string;
  area: string;
  campus_name: string | null;
  label: string;
};
export type PublicClass = { id: string; name: string };

export type StorefrontProduct = {
  id: string;
  name: string;
  category_name: string;
  collection_type: "boys" | "girls";
  rating: number;
  is_featured: boolean;
  is_deal: boolean;
  is_out_of_stock: boolean;
  primaryImageUrl: string | null;
  sizes: string[];
  priceFrom: number | null;
  salePriceFrom: number | null;
  product_types: string[];
};

export const listStorefrontColleges = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicCollege[]> => {
    const db = await getDb();
    const { data, error } = await db
      .from("colleges")
      .select("id, name, slug, logo")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return Promise.all(
      (data ?? []).map(async (s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        logoUrl: await signUrl(s.logo),
      })),
    );
  },
);

export const listStorefrontCampuses = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ collegeId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<PublicCampus[]> => {
    const db = await getDb();
    const { data: rows, error } = await db
      .from("college_campuses")
      .select("id, country, city, area, campus_name, sort_order")
      .eq("college_id", data.collegeId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => {
      const parts = [r.campus_name, r.area, r.city].filter(Boolean).join(" · ");
      return {
        id: r.id,
        country: r.country,
        city: r.city,
        area: r.area,
        campus_name: r.campus_name,
        label: parts || r.city,
      };
    });
  });

export const listStorefrontClasses = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ collegeId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<PublicClass[]> => {
    const db = await getDb();
    const { data: rows, error } = await db
      .from("college_classes")
      .select("id, name, sort_order")
      .eq("college_id", data.collegeId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({ id: r.id, name: r.name }));
  });

export const findStorefrontProducts = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        collegeId: z.string().uuid(),
        classId: z.string().uuid(),
        campusId: z.string().uuid().optional().nullable(),
        collection: z.enum(["boys", "girls"]).optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data }): Promise<StorefrontProduct[]> => {
    const db = await getDb();

    // 1. Products in this college that have any size mapped to the chosen class.
    const { data: mapped, error: mapErr } = await db
      .from("college_product_classes")
      .select("product_id")
      .eq("college_class_id", data.classId);
    if (mapErr) throw new Error(mapErr.message);
    const candidateIds = Array.from(new Set((mapped ?? []).map((m) => m.product_id)));
    if (!candidateIds.length) return [];

    let q = db
      .from("college_products")
      .select(
        "id, name, category_id, collection_type, rating, is_featured, is_deal, is_out_of_stock",
      )
      .eq("college_id", data.collegeId)
      .eq("is_active", true)
      .in("id", candidateIds);
    if (data.collection) q = q.eq("collection_type", data.collection);
    const { data: products, error: pErr } = await q
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (pErr) throw new Error(pErr.message);
    let rows = products ?? [];
    if (!rows.length) return [];

    // 2. Optional campus filter — a product with no campus rows means "all campuses".
    if (data.campusId) {
      const { data: pcs, error: pcErr } = await db
        .from("college_product_campuses")
        .select("product_id, campus_id")
        .in(
          "product_id",
          rows.map((r) => r.id),
        );
      if (pcErr) throw new Error(pcErr.message);
      const byProduct = new Map<string, Set<string>>();
      for (const r of pcs ?? []) {
        const s = byProduct.get(r.product_id) ?? new Set<string>();
        s.add(r.campus_id);
        byProduct.set(r.product_id, s);
      }
      rows = rows.filter((p) => {
        const set = byProduct.get(p.id);
        if (!set || set.size === 0) return true; // all-campus product
        return set.has(data.campusId as string);
      });
      if (!rows.length) return [];
    }

    const ids = rows.map((r) => r.id);
    const catIds = Array.from(new Set(rows.map((r) => r.category_id)));

    const [{ data: imgs }, { data: szs }, { data: cats }] = await Promise.all([
      db
        .from("college_product_images")
        .select("product_id, image, is_primary, sort_order")
        .in("product_id", ids)
        .order("sort_order", { ascending: true }),
      db
        .from("college_product_sizes")
        .select("product_id, size, price, sale_price, sort_order")
        .in("product_id", ids)
        .order("sort_order", { ascending: true }),
      db.from("college_categories").select("id, name").in("id", catIds),
    ]);

    const primaryByProduct = new Map<string, string>();
    for (const i of imgs ?? []) {
      if (i.is_primary) primaryByProduct.set(i.product_id, i.image);
      else if (!primaryByProduct.has(i.product_id)) primaryByProduct.set(i.product_id, i.image);
    }

    const sizeAgg = new Map<
      string,
      { sizes: string[]; priceFrom: number | null; salePriceFrom: number | null }
    >();
    for (const s of szs ?? []) {
      const cur = sizeAgg.get(s.product_id) ?? {
        sizes: [],
        priceFrom: null,
        salePriceFrom: null,
      };
      cur.sizes.push(s.size);
      const p = Number(s.price);
      cur.priceFrom = cur.priceFrom == null ? p : Math.min(cur.priceFrom, p);
      if (s.sale_price != null) {
        const sp = Number(s.sale_price);
        cur.salePriceFrom = cur.salePriceFrom == null ? sp : Math.min(cur.salePriceFrom, sp);
      }
      sizeAgg.set(s.product_id, cur);
    }

    const catName = new Map<string, string>();
    for (const c of cats ?? []) catName.set(c.id, c.name);

    const typeMap = await fetchProductTypesMap(db, "college", rows.map((r) => r.id));

    return Promise.all(
      rows.map(async (r) => {
        const agg = sizeAgg.get(r.id);
        return {
          id: r.id,
          name: r.name,
          category_name: catName.get(r.category_id) ?? "",
          collection_type: r.collection_type as "boys" | "girls",
          rating: Number(r.rating),
          is_featured: r.is_featured,
          is_deal: r.is_deal,
          is_out_of_stock: r.is_out_of_stock,
          primaryImageUrl: await signUrl(primaryByProduct.get(r.id)),
          sizes: agg?.sizes ?? [],
          priceFrom: agg?.priceFrom ?? null,
          salePriceFrom: agg?.salePriceFrom ?? null,
          product_types: typeMap.get(r.id) ?? [],
        };
      }),
    );
  });

export type HomepageCollegeCategory = {
  id: string;
  name: string;
  collection_type: "boys" | "girls";
  imageUrl: string | null;
  college_id: string;
  college_slug: string;
};

export const listHomepageCollegeCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomepageCollegeCategory[]> => {
    const db = await getDb();
    const { data, error } = await db
      .from("college_categories")
      .select("id, name, collection_type, image, college_id, colleges!inner(slug, is_active)")
      .eq("show_on_homepage", true)
      .eq("colleges.is_active", true)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return Promise.all(
      (data ?? []).map(async (r: any) => ({
        id: r.id,
        name: r.name,
        collection_type: r.collection_type,
        imageUrl: await signUrl(r.image),
        college_id: r.college_id,
        college_slug: r.colleges?.slug ?? "",
      })),
    );
  },
);
