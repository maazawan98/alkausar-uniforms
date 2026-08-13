/**
 * Shared helpers for the optional per-product "Product Types" feature
 * (Half Sleeves, Slim Fit, Pack of 3, ...). One table backs all modules.
 */

export type ProductTypeModule = "school" | "college" | "medical" | "accessories";

type AnyDb = any;

export function normalizeProductTypes(names: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of names) {
    const t = (raw ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** All type names for a single product, ordered. */
export async function fetchProductTypes(
  db: AnyDb,
  module: ProductTypeModule,
  productId: string,
): Promise<string[]> {
  const { data } = await db
    .from("product_types")
    .select("type_name, display_order")
    .eq("module", module)
    .eq("product_id", productId)
    .order("display_order");
  return ((data ?? []) as { type_name: string }[]).map((r) => r.type_name);
}

/** Batched lookup: productId -> type names. */
export async function fetchProductTypesMap(
  db: AnyDb,
  module: ProductTypeModule,
  productIds: readonly string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!productIds.length) return map;
  const { data } = await db
    .from("product_types")
    .select("product_id, type_name, display_order")
    .eq("module", module)
    .in("product_id", productIds as string[])
    .order("display_order");
  for (const r of (data ?? []) as { product_id: string; type_name: string }[]) {
    const arr = map.get(r.product_id) ?? [];
    arr.push(r.type_name);
    map.set(r.product_id, arr);
  }
  return map;
}

/** Replace the full type list for a product (delete + insert). */
export async function replaceProductTypes(
  db: AnyDb,
  module: ProductTypeModule,
  productId: string,
  names: readonly string[],
): Promise<void> {
  await db.from("product_types").delete().eq("module", module).eq("product_id", productId);
  const clean = normalizeProductTypes(names);
  if (!clean.length) return;
  const { error } = await db.from("product_types").insert(
    clean.map((type_name, i) => ({
      product_id: productId,
      module,
      type_name,
      display_order: i,
    })),
  );
  if (error) throw new Error(error.message);
}
