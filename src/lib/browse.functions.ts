import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchProductTypesMap, type ProductTypeModule } from "@/lib/product-types";

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

export type BrowseCard = {
  id: string;
  name: string;
  primaryImageUrl: string | null;
  secondaryImageUrl: string | null;
  rating: number;
  is_featured: boolean;
  is_deal: boolean;
  is_out_of_stock: boolean;
  priceFrom: number | null;
  salePriceFrom: number | null;
  quality_tags: string[];
  product_types: string[];
  genders: string[];
  colors: { name: string; hex: string }[];
  sizes: string[];
  classes: string[];
  createdAt: string | null;
};



async function buildCards<T extends { id: string }>(
  rows: T[],
  cfg: {
    nameOf: (r: T) => string;
    imagesTable: string;
    sizesTable: string;
    tagsTable: string;
    gendersTable: string | null;
    coloursTable?: string | null;
    createdAtOf?: (r: T) => string | null;
    rating: (r: T) => number;
    flags: (r: T) => { is_featured: boolean; is_deal: boolean; is_out_of_stock: boolean };
  },
): Promise<BrowseCard[]> {
  if (!rows.length) return [];
  const db = await getDb();
  const ids = rows.map((r) => r.id);
  const moduleForTags: Record<string, ProductTypeModule> = {
    product_quality_tags: "school",
    college_product_quality_tags: "college",
    medical_product_quality_tags: "medical",
    accessories_product_quality_tags: "accessories",
  };
  const typeMap = await fetchProductTypesMap(
    db,
    moduleForTags[cfg.tagsTable] ?? "school",
    ids,
  );
  const [imgs, szs, tags, gnd, cols] = await Promise.all([
    db.from(cfg.imagesTable as any).select("product_id, image, is_primary, sort_order").in("product_id", ids).order("sort_order"),
    db.from(cfg.sizesTable as any).select("product_id, size, price, sale_price, sort_order").in("product_id", ids).order("sort_order"),
    db.from(cfg.tagsTable as any).select("product_id, tag").in("product_id", ids),
    cfg.gendersTable
      ? db.from(cfg.gendersTable as any).select("product_id, gender").in("product_id", ids)
      : Promise.resolve({ data: [] as { product_id: string; gender: string }[] }),
    cfg.coloursTable
      ? db.from(cfg.coloursTable as any).select("product_id, colour_name, hex_code, sort_order").in("product_id", ids).order("sort_order")
      : Promise.resolve({ data: [] as { product_id: string; colour_name: string; hex_code: string }[] }),
  ]);

  const primary = new Map<string, string>();
  const secondary = new Map<string, string>();
  const orderedImgs = new Map<string, string[]>();
  for (const i of (imgs.data ?? []) as any[]) {
    const arr = orderedImgs.get(i.product_id) ?? [];
    if (i.is_primary) arr.unshift(i.image);
    else arr.push(i.image);
    orderedImgs.set(i.product_id, arr);
  }
  for (const [pid, arr] of orderedImgs) {
    if (arr[0]) primary.set(pid, arr[0]);
    if (arr[1]) secondary.set(pid, arr[1]);
  }
  const agg = new Map<string, { priceFrom: number | null; salePriceFrom: number | null; sizes: string[] }>();
  for (const s of (szs.data ?? []) as any[]) {
    const cur = agg.get(s.product_id) ?? { priceFrom: null, salePriceFrom: null, sizes: [] };
    const pr = Number(s.price);
    cur.priceFrom = cur.priceFrom == null ? pr : Math.min(cur.priceFrom, pr);
    if (s.sale_price != null) {
      const sp = Number(s.sale_price);
      cur.salePriceFrom = cur.salePriceFrom == null ? sp : Math.min(cur.salePriceFrom, sp);
    }
    if (s.size && !cur.sizes.includes(s.size)) cur.sizes.push(s.size);
    agg.set(s.product_id, cur);
  }
  const tagMap = new Map<string, string[]>();
  for (const t of (tags.data ?? []) as any[]) {
    const arr = tagMap.get(t.product_id) ?? [];
    arr.push(t.tag);
    tagMap.set(t.product_id, arr);
  }
  const genMap = new Map<string, string[]>();
  for (const g of (gnd.data ?? []) as any[]) {
    const arr = genMap.get(g.product_id) ?? [];
    arr.push(g.gender);
    genMap.set(g.product_id, arr);
  }
  const colMap = new Map<string, { name: string; hex: string }[]>();
  for (const c of (cols.data ?? []) as any[]) {
    const arr = colMap.get(c.product_id) ?? [];
    arr.push({ name: c.colour_name, hex: c.hex_code });
    colMap.set(c.product_id, arr);
  }

  return Promise.all(
    rows.map(async (r) => {
      const f = cfg.flags(r);
      const a = agg.get(r.id);
      return {
        id: r.id,
        name: cfg.nameOf(r),
        primaryImageUrl: await signUrl(primary.get(r.id)),
        secondaryImageUrl: await signUrl(secondary.get(r.id)),
        rating: cfg.rating(r),
        is_featured: f.is_featured,
        is_deal: f.is_deal,
        is_out_of_stock: f.is_out_of_stock,
        priceFrom: a?.priceFrom ?? null,
        salePriceFrom: a?.salePriceFrom ?? null,
        quality_tags: tagMap.get(r.id) ?? [],
        product_types: typeMap.get(r.id) ?? [],
        genders: genMap.get(r.id) ?? [],
        colors: colMap.get(r.id) ?? [],
        sizes: a?.sizes ?? [],
        classes: [],
        createdAt: cfg.createdAtOf ? cfg.createdAtOf(r) : null,

      };
    }),
  );
}


/* ============ MEDICAL ============ */
export const listMedicalCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<BrowseCard[]> => {
    const db = await getDb();
    const { data, error } = await db
      .from("medical_products")
      .select("id, name, rating, is_featured, is_deal, is_out_of_stock, created_at")
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return buildCards(data ?? [], {
      nameOf: (r) => r.name,
      imagesTable: "medical_product_images",
      sizesTable: "medical_product_sizes",
      tagsTable: "medical_product_quality_tags",
      gendersTable: "medical_product_genders",
      coloursTable: "medical_product_colours",
      createdAtOf: (r) => r.created_at,
      rating: (r) => Number(r.rating),
      flags: (r) => ({
        is_featured: r.is_featured,
        is_deal: r.is_deal,
        is_out_of_stock: r.is_out_of_stock,
      }),
    });
  },
);

/* ============ ACCESSORIES ============ */
export type AccessoriesCategoryCard = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  productCount: number;
};

export const listAccessoriesCatalogCategories = createServerFn({ method: "GET" }).handler(
  async (): Promise<AccessoriesCategoryCard[]> => {
    const db = await getDb();
    const { data, error } = await db
      .from("accessories_categories")
      .select("id, name, slug, image, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const counts = await Promise.all(
      rows.map((r) =>
        db
          .from("accessories_products")
          .select("id", { count: "exact", head: true })
          .eq("category_id", r.id)
          .eq("is_active", true)
          .then((res) => res.count ?? 0),
      ),
    );
    return Promise.all(
      rows.map(async (r, i) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        imageUrl: await signUrl(r.image),
        productCount: counts[i],
      })),
    );
  },
);

export type AccessoriesCategoryPage = {
  category: { id: string; name: string; slug: string; imageUrl: string | null };
  products: BrowseCard[];
};

export const getAccessoriesCategoryPage = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ slug: z.string().trim().min(1).max(80) }).parse(raw))
  .handler(async ({ data }): Promise<AccessoriesCategoryPage | null> => {
    const db = await getDb();
    const { data: cat, error: cErr } = await db
      .from("accessories_categories")
      .select("id, name, slug, image, is_active")
      .eq("slug", data.slug)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!cat || !cat.is_active) return null;

    const { data: prods, error: pErr } = await db
      .from("accessories_products")
      .select("id, customer_sees, product_name, company_name, rating, is_featured, is_deal, is_out_of_stock")
      .eq("category_id", cat.id)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
    if (pErr) throw new Error(pErr.message);

    const cards = await buildCards(prods ?? [], {
      nameOf: (r) =>
        (r.customer_sees && r.customer_sees.trim()) ||
        (r.product_name && r.product_name.trim()) ||
        (r.company_name && r.company_name.trim()) ||
        "Product",
      imagesTable: "accessories_product_images",
      sizesTable: "accessories_product_sizes",
      tagsTable: "accessories_product_quality_tags",
      gendersTable: "accessories_product_genders",
      rating: (r) => Number(r.rating),
      flags: (r) => ({
        is_featured: r.is_featured,
        is_deal: r.is_deal,
        is_out_of_stock: r.is_out_of_stock,
      }),
    });

    const ids = (prods ?? []).map((p) => p.id);
    let classesByProduct = new Map<string, string[]>();
    if (ids.length) {
      const { data: pcRows } = await db
        .from("accessories_product_classes")
        .select("accessory_product_id, accessories_classes(name)")
        .in("accessory_product_id", ids);
      for (const row of (pcRows ?? []) as any[]) {
        const name = row.accessories_classes?.name;
        if (!name) continue;
        const arr = classesByProduct.get(row.accessory_product_id) ?? [];
        if (!arr.includes(name)) arr.push(name);
        classesByProduct.set(row.accessory_product_id, arr);
      }
    }
    for (const c of cards) c.classes = classesByProduct.get(c.id) ?? [];

    return {
      category: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        imageUrl: await signUrl(cat.image),
      },
      products: cards,
    };
  });

/* ============ HOMEPAGE FEEDS (Featured / Deal / Latest) ============ */

export type HomeFeed = { featured: BrowseCard[]; deal: BrowseCard[]; latest: BrowseCard[] };

function splitFeed(cards: BrowseCard[]): HomeFeed {
  return {
    featured: cards.filter((c) => c.is_featured).slice(0, 8),
    deal: cards.filter((c) => c.is_deal).slice(0, 8),
    latest: cards.slice(0, 8),
  };
}

export const listHomeSchoolFeed = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeFeed> => {
    const db = await getDb();
    const { data, error } = await db
      .from("products")
      .select("id, name, collection_type, rating, is_featured, is_deal, is_out_of_stock, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const cards = await buildCards(rows, {
      nameOf: (r) => r.name,
      imagesTable: "product_images",
      sizesTable: "product_sizes",
      tagsTable: "product_quality_tags",
      gendersTable: null,
      coloursTable: "product_colours",
      createdAtOf: (r) => r.created_at,
      rating: (r) => Number(r.rating),
      flags: (r) => ({ is_featured: r.is_featured, is_deal: r.is_deal, is_out_of_stock: r.is_out_of_stock }),
    });
    const byId = new Map(rows.map((r) => [r.id, r] as const));
    for (const c of cards) {
      const r = byId.get(c.id);
      if (r?.collection_type) c.genders = [r.collection_type === "boys" ? "Boys" : "Girls"];
    }
    return splitFeed(cards);
  },
);

export const listHomeCollegeFeed = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeFeed> => {
    const db = await getDb();
    const { data, error } = await db
      .from("college_products")
      .select("id, name, collection_type, rating, is_featured, is_deal, is_out_of_stock, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const cards = await buildCards(rows, {
      nameOf: (r) => r.name,
      imagesTable: "college_product_images",
      sizesTable: "college_product_sizes",
      tagsTable: "college_product_quality_tags",
      gendersTable: null,
      coloursTable: "college_product_colours",
      createdAtOf: (r) => r.created_at,
      rating: (r) => Number(r.rating),
      flags: (r) => ({ is_featured: r.is_featured, is_deal: r.is_deal, is_out_of_stock: r.is_out_of_stock }),
    });
    const byId = new Map(rows.map((r) => [r.id, r] as const));
    for (const c of cards) {
      const r = byId.get(c.id);
      if (r?.collection_type) c.genders = [r.collection_type === "boys" ? "Boys" : "Girls"];
    }
    return splitFeed(cards);
  },
);

export const listHomeMedicalFeed = createServerFn({ method: "GET" }).handler(
  async (): Promise<HomeFeed> => {
    const db = await getDb();
    const { data, error } = await db
      .from("medical_products")
      .select("id, name, rating, is_featured, is_deal, is_out_of_stock, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    const cards = await buildCards(data ?? [], {
      nameOf: (r) => r.name,
      imagesTable: "medical_product_images",
      sizesTable: "medical_product_sizes",
      tagsTable: "medical_product_quality_tags",
      gendersTable: "medical_product_genders",
      coloursTable: "medical_product_colours",
      createdAtOf: (r) => r.created_at,
      rating: (r) => Number(r.rating),
      flags: (r) => ({ is_featured: r.is_featured, is_deal: r.is_deal, is_out_of_stock: r.is_out_of_stock }),
    });
    return splitFeed(cards);
  },
);

export type AccessoriesHomeCard = BrowseCard & { categoryId: string | null };
export type AccessoriesHomeFeed = {
  featured: AccessoriesHomeCard[];
  deal: AccessoriesHomeCard[];
  latest: AccessoriesHomeCard[];
};

export const listHomeAccessoriesFeed = createServerFn({ method: "GET" }).handler(
  async (): Promise<AccessoriesHomeFeed> => {
    const db = await getDb();
    const { data, error } = await db
      .from("accessories_products")
      .select("id, customer_sees, product_name, company_name, category_id, rating, is_featured, is_deal, is_out_of_stock, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const cards = await buildCards(rows, {
      nameOf: (r) =>
        (r.customer_sees && r.customer_sees.trim()) ||
        (r.product_name && r.product_name.trim()) ||
        (r.company_name && r.company_name.trim()) ||
        "Product",
      imagesTable: "accessories_product_images",
      sizesTable: "accessories_product_sizes",
      tagsTable: "accessories_product_quality_tags",
      gendersTable: "accessories_product_genders",
      createdAtOf: (r) => r.created_at,
      rating: (r) => Number(r.rating),
      flags: (r) => ({ is_featured: r.is_featured, is_deal: r.is_deal, is_out_of_stock: r.is_out_of_stock }),
    });
    const catById = new Map(rows.map((r) => [r.id, r.category_id ?? null] as const));
    const enriched: AccessoriesHomeCard[] = cards.map((c) => ({ ...c, categoryId: catById.get(c.id) ?? null }));
    return {
      featured: enriched.filter((c) => c.is_featured).slice(0, 8),
      deal: enriched.filter((c) => c.is_deal).slice(0, 8),
      latest: enriched.slice(0, 8),
    };
  },
);


