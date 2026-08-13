/**
 * Shared image resolution for order/history item snapshots.
 * Snapshots may hold a raw storage path, an old (expired) signed URL, or nothing —
 * in every case we resolve back to the product's primary image.
 */

const BUCKET = "school-assets";
const SIGN_TTL = 60 * 60;

const IMAGE_TABLE: Record<string, string> = {
  school: "product_images",
  college: "college_product_images",
  medical: "medical_product_images",
  accessories: "accessories_product_images",
};

export function normalizeStoredPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) return raw;
  const marker = `/object/sign/${BUCKET}/`;
  const i = raw.indexOf(marker);
  if (i === -1) return null;
  const rest = (raw.slice(i + marker.length).split("?")[0] ?? "");
  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}

export async function signStoredPath(db: any, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL);
  return data?.signedUrl ?? null;
}

/** Map of `${module}:${productId}` -> primary image path. */
export async function primaryImagePathMap(
  db: any,
  pairs: Array<{ module?: string | null; product_id?: string | null }>,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const byModule = new Map<string, Set<string>>();
  for (const p of pairs) {
    if (!p?.module || !p?.product_id || !IMAGE_TABLE[p.module]) continue;
    const set = byModule.get(p.module) ?? new Set<string>();
    set.add(p.product_id);
    byModule.set(p.module, set);
  }
  for (const [module, ids] of byModule) {
    const { data } = await db
      .from(IMAGE_TABLE[module]!)
      .select("product_id, image, is_primary, sort_order")
      .in("product_id", Array.from(ids))
      .order("sort_order");
    for (const row of (data ?? []) as any[]) {
      const key = `${module}:${row.product_id}`;
      if (row.is_primary || !out.has(key)) out.set(key, row.image);
    }
  }
  return out;
}

export async function resolveSnapshotImage(
  db: any,
  stored: string | null | undefined,
  module: string | null | undefined,
  productId: string | null | undefined,
  fallbacks: Map<string, string>,
): Promise<string | null> {
  const path =
    normalizeStoredPath(stored) ??
    (module && productId ? (fallbacks.get(`${module}:${productId}`) ?? null) : null);
  return signStoredPath(db, path);
}
