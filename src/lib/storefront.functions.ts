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

export type PublicSchool = { id: string; name: string; slug: string; logoUrl: string | null };
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

export const listStorefrontSchools = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicSchool[]> => {
    const db = await getDb();
    const { data, error } = await db
      .from("schools")
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
  .inputValidator((raw: unknown) => z.object({ schoolId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<PublicCampus[]> => {
    const db = await getDb();
    const { data: rows, error } = await db
      .from("school_campuses")
      .select("id, country, city, area, campus_name, sort_order")
      .eq("school_id", data.schoolId)
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
  .inputValidator((raw: unknown) => z.object({ schoolId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<PublicClass[]> => {
    const db = await getDb();
    const { data: rows, error } = await db
      .from("school_classes")
      .select("id, name, sort_order")
      .eq("school_id", data.schoolId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({ id: r.id, name: r.name }));
  });

export const findStorefrontProducts = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        schoolId: z.string().uuid(),
        classId: z.string().uuid(),
        campusId: z.string().uuid().optional().nullable(),
        collection: z.enum(["boys", "girls"]).optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data }): Promise<StorefrontProduct[]> => {
    const db = await getDb();

    // 1. Products in this school that have any size mapped to the chosen class.
    const { data: mapped, error: mapErr } = await db
      .from("product_classes")
      .select("product_id")
      .eq("school_class_id", data.classId);
    if (mapErr) throw new Error(mapErr.message);
    const candidateIds = Array.from(new Set((mapped ?? []).map((m) => m.product_id)));
    if (!candidateIds.length) return [];

    let query = db
      .from("products")
      .select(
        "id, name, category_id, collection_type, rating, is_featured, is_deal, is_out_of_stock",
      )
      .eq("school_id", data.schoolId)
      .eq("is_active", true)
      .in("id", candidateIds);
    if (data.collection) query = query.eq("collection_type", data.collection);
    const { data: products, error: pErr } = await query
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (pErr) throw new Error(pErr.message);
    let rows = products ?? [];
    if (!rows.length) return [];


    // 2. Optional campus filter — a product with no campus rows means "all campuses".
    if (data.campusId) {
      const { data: pcs, error: pcErr } = await db
        .from("product_campuses")
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
        .from("product_images")
        .select("product_id, image, is_primary, sort_order")
        .in("product_id", ids)
        .order("sort_order", { ascending: true }),
      db
        .from("product_sizes")
        .select("product_id, size, price, sale_price, sort_order")
        .in("product_id", ids)
        .order("sort_order", { ascending: true }),
      db.from("school_categories").select("id, name").in("id", catIds),
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

    const typeMap = await fetchProductTypesMap(db, "school", rows.map((r) => r.id));

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

export type HomepageCategory = {
  id: string;
  name: string;
  collection_type: "boys" | "girls";
  imageUrl: string | null;
  school_id: string;
  school_slug: string;
};

export const listHomepageCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomepageCategory[]> => {
    const db = await getDb();
    const { data, error } = await db
      .from("school_categories")
      .select("id, name, collection_type, image, school_id, schools!inner(slug, is_active)")
      .eq("show_on_homepage", true)
      .eq("schools.is_active", true)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return Promise.all(
      (data ?? []).map(async (r: any) => ({
        id: r.id,
        name: r.name,
        collection_type: r.collection_type,
        imageUrl: await signUrl(r.image),
        school_id: r.school_id,
        school_slug: r.schools?.slug ?? "",
      })),
    );
  },
);

export type HomepageMedicalProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
};

export const listHomepageMedicalProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomepageMedicalProduct[]> => {
    const db = await getDb();
    const { data, error } = await db
      .from("medical_products")
      .select("id, name")
      .eq("show_on_homepage", true)
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const { data: imgs } = await db
      .from("medical_product_images")
      .select("product_id, image, is_primary, sort_order")
      .in("product_id", ids)
      .order("sort_order");
    const primary = new Map<string, string>();
    for (const i of imgs ?? []) {
      const cur = primary.get(i.product_id);
      if (i.is_primary) primary.set(i.product_id, i.image);
      else if (!cur) primary.set(i.product_id, i.image);
    }
    return Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        name: r.name,
        imageUrl: await signUrl(primary.get(r.id)),
      })),
    );
  },
);

export type HomepageAccessoryCategory = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
};

export const listHomepageAccessoryCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomepageAccessoryCategory[]> => {
    const db = await getDb();
    const { data, error } = await db
      .from("accessories_categories")
      .select("id, name, slug, image")
      .eq("show_on_homepage", true)
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return Promise.all(
      (data ?? []).map(async (r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        imageUrl: await signUrl(r.image),
      })),
    );
  },
);


export type HomepagePartner = {
  key: string;
  name: string;
  logoUrl: string | null;
  school: { id: string; slug: string } | null;
  college: { id: string; slug: string } | null;
};

export const listHomepagePartners = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomepagePartner[]> => {
    const db = await getDb();
    const [schoolsRes, collegesRes] = await Promise.all([
      db.from("schools").select("id, name, slug, logo").eq("is_active", true),
      db.from("colleges").select("id, name, slug, logo").eq("is_active", true),
    ]);
    if (schoolsRes.error) throw new Error(schoolsRes.error.message);
    if (collegesRes.error) throw new Error(collegesRes.error.message);

    const map = new Map<string, HomepagePartner & { _schoolLogo?: string | null; _collegeLogo?: string | null }>();
    const norm = (n: string) => n.trim().toLowerCase();

    for (const s of schoolsRes.data ?? []) {
      const k = norm(s.name);
      map.set(k, {
        key: k,
        name: s.name.trim(),
        logoUrl: null,
        school: { id: s.id, slug: s.slug },
        college: null,
        _schoolLogo: s.logo,
      });
    }
    for (const c of collegesRes.data ?? []) {
      const k = norm(c.name);
      const existing = map.get(k);
      if (existing) {
        existing.college = { id: c.id, slug: c.slug };
        existing._collegeLogo = c.logo;
      } else {
        map.set(k, {
          key: k,
          name: c.name.trim(),
          logoUrl: null,
          school: null,
          college: { id: c.id, slug: c.slug },
          _collegeLogo: c.logo,
        });
      }
    }

    const partners = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    return Promise.all(
      partners.map(async (p) => ({
        key: p.key,
        name: p.name,
        school: p.school,
        college: p.college,
        logoUrl: await signUrl(p._schoolLogo || p._collegeLogo || null),
      })),
    );
  },
);
