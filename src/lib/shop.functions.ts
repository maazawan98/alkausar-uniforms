import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchProductTypesMap } from "@/lib/product-types";

const BUCKET = "school-assets";
const SIGN_TTL = 60 * 60;

const moduleSchema = z.enum(["school", "college", "medical", "accessories"]);
export type ShopModule = z.infer<typeof moduleSchema>;

/** Privileged client — product catalog + private storage reads are admin-only. */
async function adminDb(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/**
 * Storage paths were historically saved as (expiring) signed URLs.
 * Recover the underlying object path so images never break.
 */
function normalizeStoredPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("http://") && !raw.startsWith("https://")) return raw;
  const marker = `/object/sign/${BUCKET}/`;
  const i = raw.indexOf(marker);
  if (i === -1) return null;
  const rest = raw.slice(i + marker.length).split("?")[0];
  try {
    return decodeURIComponent(rest ?? "");
  } catch {
    return rest ?? null;
  }
}

/* Sign a stored path if it's not already a full (non-storage) URL */
async function signImage(
  _db: any,
  raw: string | null | undefined,
): Promise<string | null> {
  if (!raw) return null;
  const path = normalizeStoredPath(raw);
  if (!path) return raw.startsWith("http") ? raw : null;
  const db = await adminDb();
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL);
  return data?.signedUrl ?? null;
}


/* =========================================================
   WISHLIST
   ========================================================= */

export type WishlistItem = {
  id: string;
  module: ShopModule;
  product_id: string;
  category_id: string | null;
  category_name: string | null;
  product_name: string;
  product_image: string | null;
  price_from: number | null;
  sale_price_from: number | null;
  rating: number;
  is_featured: boolean;
  is_deal: boolean;
  is_out_of_stock: boolean;
  quality_tags: string[];
  product_types: string[];
  created_at: string;
  href: string;
};

const productDetailsByModule = (module: ShopModule, id: string) => {
  switch (module) {
    case "school":
      return `/product/school/${id}`;
    case "college":
      return `/product/college/${id}`;
    case "medical":
      return `/product/medical/${id}`;
    case "accessories":
      return `/product/accessories/${id}`;
  }
};

const productTableByModule = (module: ShopModule) => {
  switch (module) {
    case "school":
      return {
        table: "products",
        images: "product_images",
        sizes: "product_sizes",
        tags: "product_quality_tags",
        categories: "school_categories",
        nameCols: "id, name, rating, is_featured, is_deal, is_out_of_stock, category_id",
      };
    case "college":
      return {
        table: "college_products",
        images: "college_product_images",
        sizes: "college_product_sizes",
        tags: "college_product_quality_tags",
        categories: "college_categories",
        nameCols: "id, name, rating, is_featured, is_deal, is_out_of_stock, category_id",
      };
    case "medical":
      return {
        table: "medical_products",
        images: "medical_product_images",
        sizes: "medical_product_sizes",
        tags: "medical_product_quality_tags",
        categories: null,
        nameCols: "id, name, rating, is_featured, is_deal, is_out_of_stock",
      };
    case "accessories":
      return {
        table: "accessories_products",
        images: "accessories_product_images",
        sizes: "accessories_product_sizes",
        tags: "accessories_product_quality_tags",
        categories: "accessories_categories",
        nameCols:
          "id, product_name, company_name, customer_sees, rating, is_featured, is_deal, is_out_of_stock, category_id",
      };
  }
};

function accessoryDisplayName(p: any): string {
  const brandFirst = (p.customer_sees ?? "").toLowerCase().includes("company");
  const parts = brandFirst
    ? [p.company_name, p.product_name]
    : [p.product_name, p.company_name];
  return parts.filter(Boolean).join(" ").trim() || "Product";
}

async function enrichWishlistRows(
  db: any,
  rows: Array<{
    id: string;
    module: ShopModule;
    product_id: string;
    category_id: string | null;
    created_at: string;
  }>,
): Promise<WishlistItem[]> {
  if (!rows.length) return [];

  const byModule = new Map<ShopModule, string[]>();
  rows.forEach((r) => {
    const arr = byModule.get(r.module) ?? [];
    arr.push(r.product_id);
    byModule.set(r.module, arr);
  });

  const infoMap = new Map<
    string,
    {
      name: string;
      rating: number;
      is_featured: boolean;
      is_deal: boolean;
      is_out_of_stock: boolean;
      category_id: string | null;
      category_name: string | null;
    }
  >();
  const imgPathMap = new Map<string, string | null>();
  const priceMap = new Map<string, number | null>();
  const salePriceMap = new Map<string, number | null>();
  const tagMap = new Map<string, string[]>();
  const typeMapAll = new Map<string, string[]>();

  for (const [module, ids] of byModule) {
    const cfg = productTableByModule(module);
    const [{ data: prods }, { data: imgs }, { data: sizes }, { data: tags }, types] =
      await Promise.all([
        db.from(cfg.table).select(cfg.nameCols).in("id", ids),
        db
          .from(cfg.images)
          .select("product_id, image, is_primary, sort_order")
          .in("product_id", ids)
          .order("sort_order"),
        db.from(cfg.sizes).select("product_id, price, sale_price").in("product_id", ids),
        db.from(cfg.tags).select("product_id, tag").in("product_id", ids),
        fetchProductTypesMap(db, module, ids),
      ]);

    for (const [pid, names] of types) typeMapAll.set(`${module}:${pid}`, names);

    // Category names (medical has no categories)
    const catNames = new Map<string, string>();
    if (cfg.categories) {
      const catIds = Array.from(
        new Set((prods ?? []).map((p: any) => p.category_id).filter(Boolean)),
      );
      if (catIds.length) {
        const { data: cats } = await db
          .from(cfg.categories)
          .select("id, name")
          .in("id", catIds as string[]);
        (cats ?? []).forEach((c: any) => catNames.set(c.id, c.name));
      }
    }

    (prods ?? []).forEach((p: any) => {
      infoMap.set(`${module}:${p.id}`, {
        name: module === "accessories" ? accessoryDisplayName(p) : (p.name ?? "Product"),
        rating: Number(p.rating ?? 0),
        is_featured: !!p.is_featured,
        is_deal: !!p.is_deal,
        is_out_of_stock: !!p.is_out_of_stock,
        category_id: p.category_id ?? null,
        category_name: p.category_id ? (catNames.get(p.category_id) ?? null) : null,
      });
    });

    (tags ?? []).forEach((t: any) => {
      const key = `${module}:${t.product_id}`;
      const arr = tagMap.get(key) ?? [];
      arr.push(t.tag);
      tagMap.set(key, arr);
    });

    // Primary image per product
    const perProduct = new Map<string, string[]>();
    (imgs ?? []).forEach((i: any) => {
      const key = `${module}:${i.product_id}`;
      const arr = perProduct.get(key) ?? [];
      if (i.is_primary) arr.unshift(i.image);
      else arr.push(i.image);
      perProduct.set(key, arr);
    });
    for (const [k, arr] of perProduct) {
      imgPathMap.set(k, arr[0] ?? null);
    }

    // Min price / min sale price per product
    (sizes ?? []).forEach((s: any) => {
      const key = `${module}:${s.product_id}`;
      if (s.price != null) {
        const p = Number(s.price);
        const existing = priceMap.get(key);
        if (existing == null || p < existing) priceMap.set(key, p);
      }
      if (s.sale_price != null) {
        const sp = Number(s.sale_price);
        const existing = salePriceMap.get(key);
        if (existing == null || sp < existing) salePriceMap.set(key, sp);
      }
    });
  }

  const out: WishlistItem[] = [];
  for (const r of rows) {
    const key = `${r.module}:${r.product_id}`;
    const rawImg = imgPathMap.get(key) ?? null;
    const url = await signImage(db, rawImg);
    const info = infoMap.get(key);
    out.push({
      id: r.id,
      module: r.module,
      product_id: r.product_id,
      category_id: r.category_id ?? info?.category_id ?? null,
      category_name: info?.category_name ?? null,
      product_name: info?.name ?? "Product",
      product_image: url,
      price_from: priceMap.get(key) ?? null,
      sale_price_from: salePriceMap.get(key) ?? null,
      rating: info?.rating ?? 0,
      is_featured: info?.is_featured ?? false,
      is_deal: info?.is_deal ?? false,
      is_out_of_stock: info?.is_out_of_stock ?? false,
      quality_tags: tagMap.get(key) ?? [],
      product_types: typeMapAll.get(key) ?? [],
      created_at: r.created_at,
      href: productDetailsByModule(r.module, r.product_id),
    });
  }
  return out;
}

export const listWishlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WishlistItem[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("customer_wishlist" as any)
      .select("id, module, product_id, category_id, created_at")
      .eq("customer_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return enrichWishlistRows(await adminDb(), (data as any[]) ?? []);
  });

export const toggleWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        module: moduleSchema,
        productId: z.string().uuid(),
        categoryId: z.string().uuid().nullable().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }): Promise<{ inWishlist: boolean }> => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("customer_wishlist" as any)
      .select("id")
      .eq("customer_id", userId)
      .eq("module", data.module)
      .eq("product_id", data.productId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("customer_wishlist" as any)
        .delete()
        .eq("id", (existing as any).id);
      if (error) throw error;
      return { inWishlist: false };
    }

    const { error } = await supabase.from("customer_wishlist" as any).insert({
      customer_id: userId,
      module: data.module,
      product_id: data.productId,
      category_id: data.categoryId ?? null,
    });
    if (error) throw error;
    return { inWishlist: true };
  });

export const removeWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("customer_wishlist" as any)
      .delete()
      .eq("id", data.id)
      .eq("customer_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

/* =========================================================
   CART
   ========================================================= */

export type CartItem = {
  id: string;
  module: ShopModule;
  product_id: string;
  category_id: string | null;
  quantity: number;
  color: string | null;
  size: string | null;
  gender: string | null;
  class_name: string | null;
  product_type: string | null;
  unit_price: number;
  product_name: string;
  product_image: string | null;
  created_at: string;
  href: string;
};

const cartLineSchema = z.object({
  module: moduleSchema,
  productId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  quantity: z.number().int().min(1).max(99),
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  className: z.string().nullable().optional(),
  productType: z.string().nullable().optional(),
  unitPrice: z.number().min(0),
  productName: z.string().min(1),
  productImagePath: z.string().nullable().optional(),
});
export type CartLineInput = z.infer<typeof cartLineSchema>;


/** Primary image path per `${module}:${productId}`, straight from the product relationship. */
async function resolvePrimaryImagePaths(
  pairs: Array<{ module: ShopModule; product_id: string }>,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!pairs.length) return out;
  const db = await adminDb();
  const byModule = new Map<ShopModule, Set<string>>();
  for (const p of pairs) {
    if (!p.module || !p.product_id) continue;
    const set = byModule.get(p.module) ?? new Set<string>();
    set.add(p.product_id);
    byModule.set(p.module, set);
  }
  for (const [module, idSet] of byModule) {
    const cfg = productTableByModule(module);
    if (!cfg) continue;
    const { data } = await db
      .from(cfg.images)
      .select("product_id, image, is_primary, sort_order")
      .in("product_id", Array.from(idSet))
      .order("sort_order");
    for (const row of (data ?? []) as any[]) {
      const key = `${module}:${row.product_id}`;
      if (!out.has(key) || row.is_primary) {
        if (row.is_primary || !out.has(key)) out.set(key, row.image);
      }
    }
  }
  return out;
}

async function resolveItemImage(
  stored: string | null | undefined,
  module: ShopModule | null | undefined,
  productId: string | null | undefined,
  fallbacks: Map<string, string>,
): Promise<string | null> {
  const path =
    normalizeStoredPath(stored) ??
    (module && productId ? (fallbacks.get(`${module}:${productId}`) ?? null) : null);
  if (!path) return null;
  return signImage(null, path);
}

async function signCartRows(db: any, rows: any[]): Promise<CartItem[]> {
  const fallbacks = await resolvePrimaryImagePaths(
    rows.map((r) => ({ module: r.module as ShopModule, product_id: r.product_id })),
  );
  const out: CartItem[] = [];
  for (const r of rows) {
    out.push({
      id: r.id,
      module: r.module,
      product_id: r.product_id,
      category_id: r.category_id,
      quantity: r.quantity,
      color: r.color,
      size: r.size,
      gender: r.gender,
      class_name: r.class_name,
      product_type: r.product_type ?? null,
      unit_price: Number(r.unit_price),
      product_name: r.product_name,
      product_image: await resolveItemImage(r.product_image, r.module, r.product_id, fallbacks),
      created_at: r.created_at,
      href: productDetailsByModule(r.module as ShopModule, r.product_id),
    });
  }
  return out;
}

export const listCart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CartItem[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("customer_cart" as any)
      .select("*")
      .eq("customer_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return signCartRows(supabase as any, (data as any[]) ?? []);
  });

export const addToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => cartLineSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Find existing with same variant tuple
    const { data: existing } = await supabase
      .from("customer_cart" as any)
      .select("id, quantity")
      .eq("customer_id", userId)
      .eq("module", data.module)
      .eq("product_id", data.productId)
      .filter("color", data.color ? "eq" : "is", data.color ?? null)
      .filter("size", data.size ? "eq" : "is", data.size ?? null)
      .filter("gender", data.gender ? "eq" : "is", data.gender ?? null)
      .filter("class_name", data.className ? "eq" : "is", data.className ?? null)
      .filter("product_type", data.productType ? "eq" : "is", data.productType ?? null)
      .maybeSingle();

    if (existing) {
      const newQty = Math.min(999, (existing as any).quantity + data.quantity);
      const { error } = await supabase
        .from("customer_cart" as any)
        .update({ quantity: newQty, unit_price: data.unitPrice })
        .eq("id", (existing as any).id);
      if (error) throw error;
      return { ok: true, id: (existing as any).id };
    }

    const { data: inserted, error } = await supabase
      .from("customer_cart" as any)
      .insert({
        customer_id: userId,
        module: data.module,
        product_id: data.productId,
        category_id: data.categoryId ?? null,
        quantity: data.quantity,
        color: data.color ?? null,
        size: data.size ?? null,
        gender: data.gender ?? null,
        class_name: data.className ?? null,
        product_type: data.productType ?? null,
        unit_price: data.unitPrice,
        product_name: data.productName,
        product_image: data.productImagePath ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, id: (inserted as any).id };
  });

export const updateCartQty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), quantity: z.number().int().min(1).max(99) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("customer_cart" as any)
      .update({ quantity: data.quantity })
      .eq("id", data.id)
      .eq("customer_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const removeCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("customer_cart" as any)
      .delete()
      .eq("id", data.id)
      .eq("customer_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

/* =========================================================
   CHECKOUT / ORDERS
   ========================================================= */

export type CustomerProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
};

export const getCustomerProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CustomerProfile> => {
    const { supabase, userId, claims } = context;
    const { data } = await supabase
      .from("customers")
      .select("id, full_name, email")
      .eq("id", userId)
      .maybeSingle();
    return {
      id: userId,
      full_name: (data as any)?.full_name ?? "",
      email: (data as any)?.email ?? (claims?.email as string) ?? "",
      phone: null,
    };
  });

const shippingSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(3).max(40),
  country: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().min(1).max(1000),
  deliveryNote: z.string().trim().max(1000).optional().nullable(),
});

const orderItemSchema = z.object({
  module: moduleSchema,
  productId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  productName: z.string().min(1),
  productImagePath: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  className: z.string().nullable().optional(),
  productType: z.string().nullable().optional(),
  quantity: z.number().int().min(1).max(99),
  unitPrice: z.number().min(0),
});

const placeOrderSchema = z.object({
  shipping: shippingSchema,
  items: z.array(orderItemSchema).min(1).max(50),
  paymentMethod: z.enum(["cod", "online"]),
  paymentScreenshot: z.string().trim().min(1).max(500).nullable().optional(),
  source: z.enum(["cart", "buynow"]),
  couponCode: z.string().trim().max(60).nullable().optional(),
});

const ALLOWED_SCREENSHOT_EXT = ["jpg", "jpeg", "png", "webp", "pdf"] as const;
const uploadScreenshotSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.string().trim().min(1).max(120),
  dataBase64: z.string().min(1),
});

export const uploadPaymentScreenshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => uploadScreenshotSchema.parse(raw))
  .handler(async ({ data, context }): Promise<{ path: string }> => {
    const { userId } = context;
    const ext = (data.fileName.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_SCREENSHOT_EXT.includes(ext as any)) {
      throw new Error("Unsupported file type. Use JPG, PNG, WEBP, or PDF.");
    }
    const buf = Buffer.from(data.dataBase64, "base64");
    if (buf.byteLength > 5 * 1024 * 1024) {
      throw new Error("File is larger than 5 MB.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `payment-proofs/${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buf, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);
    return { path };
  });

const resubmitSchema = z.object({
  orderId: z.string().uuid(),
  screenshotPath: z.string().trim().min(1).max(500),
});

export const resubmitPaymentScreenshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => resubmitSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("customer_orders" as any)
      .select("id, customer_id, payment_method, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!row) throw new Error("Order not found.");
    const r: any = row;
    if (r.customer_id !== userId) throw new Error("Not allowed.");
    if (r.payment_method !== "online") throw new Error("This order is not an online payment.");
    if (r.payment_status !== "rejected") {
      throw new Error("You can only resubmit a payment that was rejected.");
    }
    const { error } = await supabaseAdmin
      .from("customer_orders" as any)
      .update({
        payment_screenshot: data.screenshotPath,
        payment_status: "pending_verification",
        payment_verified_at: null,
      })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });



export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => placeOrderSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.paymentMethod === "online" && !data.paymentScreenshot) {
      throw new Error("Please upload your payment screenshot before placing the order.");
    }

    const items = data.items.map((it) => ({
      module: it.module,
      product_id: it.productId,
      category_id: it.categoryId ?? null,
      product_name: it.productName,
      product_image: it.productImagePath ?? null,
      color: it.color ?? null,
      size: it.size ?? null,
      gender: it.gender ?? null,
      class_name: it.className ?? null,
      product_type: it.productType ?? null,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      total_price: it.unitPrice * it.quantity,
    }));
    const subtotal = items.reduce((sum, it) => sum + it.total_price, 0);

    // Load active delivery charge snapshot server-side (trusted)
    const { data: activeDelivery } = await supabase
      .from("delivery_charges" as any)
      .select("delivery_charge, instruction")
      .eq("is_active", true)
      .maybeSingle();
    const deliveryCharge = Number((activeDelivery as any)?.delivery_charge ?? 0);
    const deliveryInstruction = ((activeDelivery as any)?.instruction as string | null) ?? null;

    // Optional coupon re-validation server-side (trusted)
    let couponId: string | null = null;
    let couponCode: string | null = null;
    let couponDiscountType: string | null = null;
    let couponDiscountValue: number | null = null;
    let couponDiscount = 0;
    if (data.couponCode) {
      const { applyCouponServerSide } = await import("./coupons.functions");
      const modules = Array.from(new Set(items.map((i) => i.module))) as any;
      const res = await applyCouponServerSide(userId, {
        code: data.couponCode,
        subtotal,
        modules,
      });
      if (!res.ok || !res.coupon) throw new Error(res.error ?? "Invalid coupon");
      couponId = res.coupon.id;
      couponCode = res.coupon.code;
      couponDiscountType = res.coupon.discount_type;
      couponDiscountValue = res.coupon.discount_value;
      couponDiscount = res.coupon.discount_amount;
    }

    const grandTotal = Math.max(0, subtotal - couponDiscount) + deliveryCharge;

    // Atomic per-day sequence via SECURITY DEFINER function
    const { data: orderNumber, error: rpcError } = await supabase.rpc(
      "next_order_number" as any,
    );
    if (rpcError || !orderNumber) {
      throw rpcError ?? new Error("Failed to generate order number.");
    }

    const { data: inserted, error } = await supabase
      .from("customer_orders" as any)
      .insert({
        customer_id: userId,
        order_number: orderNumber as unknown as string,
        status: "pending",
        full_name: data.shipping.fullName,
        email: data.shipping.email,
        phone: data.shipping.phone,
        country: data.shipping.country,
        city: data.shipping.city,
        postal_code: data.shipping.postalCode ?? null,
        address: data.shipping.address,
        delivery_note: data.shipping.deliveryNote ?? null,
        payment_method: data.paymentMethod,
        payment_status: data.paymentMethod === "online" ? "pending_verification" : "not_applicable",
        payment_screenshot: data.paymentMethod === "online" ? (data.paymentScreenshot ?? null) : null,
        items,
        subtotal,
        delivery_charge: deliveryCharge,
        delivery_instruction: deliveryInstruction,
        coupon_id: couponId,
        coupon_code: couponCode,
        coupon_discount_type: couponDiscountType,
        coupon_discount_value: couponDiscountValue,
        coupon_discount: couponDiscount,
        total: grandTotal,
      })
      .select("id, order_number")
      .single();
    if (error) throw error;
    const orderRow: any = inserted;

    if (couponId) {
      const { data: usageId, error: finalizeErr } = await supabase.rpc(
        "finalize_coupon_usage" as any,
        {
          p_order_id: orderRow.id,
          p_coupon_id: couponId,
          p_customer_id: userId,
          p_order_number: orderRow.order_number,
          p_coupon_code: couponCode,
          p_discount_type: couponDiscountType,
          p_discount_value: couponDiscountValue,
          p_discount_amount: couponDiscount,
          p_subtotal: subtotal,
          p_delivery_charge: deliveryCharge,
          p_grand_total: grandTotal,
        } as any,
      );
      if (finalizeErr || !usageId) {
        // Roll back the order so we never leave a partially-saved record.
        await supabase.from("customer_orders" as any).delete().eq("id", orderRow.id);
        throw finalizeErr ?? new Error("Failed to record coupon usage.");
      }
    }


    // Cleanup: remove matching cart + wishlist rows
    const pairs = items.map((it) => ({ module: it.module, product_id: it.product_id }));
    for (const p of pairs) {
      await supabase
        .from("customer_cart" as any)
        .delete()
        .eq("customer_id", userId)
        .eq("module", p.module)
        .eq("product_id", p.product_id);
      await supabase
        .from("customer_wishlist" as any)
        .delete()
        .eq("customer_id", userId)
        .eq("module", p.module)
        .eq("product_id", p.product_id);
    }

    return { orderId: orderRow.id as string, orderNumber: orderRow.order_number as string };
  });

export type OrderItemSnapshot = {
  module: ShopModule;
  product_id: string;
  category_id: string | null;
  product_name: string;
  product_image: string | null;
  color: string | null;
  size: string | null;
  gender: string | null;
  class_name: string | null;
  product_type: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type Order = {
  id: string;
  order_number: string;
  status: string;
  full_name: string;
  email: string;
  phone: string | null;
  country: string;
  city: string;
  postal_code: string | null;
  address: string;
  delivery_note: string | null;
  payment_method: string;
  payment_status: string | null;
  payment_screenshot: string | null;
  items: OrderItemSnapshot[];
  subtotal: number;
  delivery_charge: number;
  delivery_instruction: string | null;
  coupon_id: string | null;
  coupon_usage_id: string | null;
  coupon_code: string | null;
  coupon_discount_type: string | null;
  coupon_discount_value: number | null;
  coupon_discount: number;
  total: number;
  created_at: string;

};

async function hydrateOrderItemImages(db: any, order: Order): Promise<Order> {
  const fallbacks = await resolvePrimaryImagePaths(
    (order.items ?? []).map((it: any) => ({
      module: it.module as ShopModule,
      product_id: it.product_id,
    })),
  );
  const items = await Promise.all(
    (order.items ?? []).map(async (it: any) => ({
      ...it,
      product_image: await resolveItemImage(
        it.product_image,
        it.module,
        it.product_id,
        fallbacks,
      ),
    })),
  );
  const payment_screenshot = await signImage(db, order.payment_screenshot);
  return { ...order, items, payment_screenshot };
}

function historyRowToOrder(h: any): Order {
  return {
    id: h.id, // history row id (used as fallback when order is deleted)
    order_number: h.order_number,
    status: h.order_status,
    full_name: h.customer_name,
    email: h.customer_email,
    phone: h.customer_phone ?? null,
    country: h.country ?? "",
    city: h.city ?? "",
    postal_code: h.postal_code ?? null,
    address: h.address ?? "",
    delivery_note: h.delivery_note ?? null,
    payment_method: h.payment_method ?? "",
    payment_status: h.payment_status ?? null,
    payment_screenshot: h.payment_screenshot ?? null,
    items: (h.items as OrderItemSnapshot[]) ?? [],
    subtotal: Number(h.subtotal ?? 0),
    delivery_charge: Number(h.delivery_charge ?? 0),
    delivery_instruction: null,
    coupon_id: h.coupon_id ?? null,
    coupon_usage_id: null,
    coupon_code: h.coupon_code ?? null,
    coupon_discount_type: h.coupon_discount_type ?? null,
    coupon_discount_value: h.coupon_discount_value ?? null,
    coupon_discount: Number(h.coupon_discount ?? 0),
    total: Number(h.grand_total ?? 0),
    created_at: h.order_date ?? h.created_at,
  };
}

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Order[]> => {
    const { supabase, userId } = context;
    // Live orders — hide cancelled (rejected by admin) from customer view.
    const { data: liveRows, error } = await supabase
      .from("customer_orders" as any)
      .select("*")
      .eq("customer_id", userId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    if (error) throw error;

    // History rows whose live order was permanently deleted by admin (order_id IS NULL).
    const { data: histRows, error: histErr } = await supabase
      .from("customer_history" as any)
      .select("*")
      .eq("customer_id", userId)
      .is("order_id", null)
      .order("order_date", { ascending: false });
    if (histErr) throw histErr;

    const merged: Order[] = [];
    for (const r of (liveRows as any[]) ?? []) {
      merged.push(await hydrateOrderItemImages(supabase as any, r as unknown as Order));
    }
    for (const h of (histRows as any[]) ?? []) {
      merged.push(await hydrateOrderItemImages(supabase as any, historyRowToOrder(h)));
    }
    merged.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return merged;
  });

export const getMyOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }): Promise<Order | null> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("customer_orders" as any)
      .select("*")
      .eq("id", data.id)
      .eq("customer_id", userId)
      .neq("status", "cancelled")
      .maybeSingle();
    if (error) throw error;
    if (row) return hydrateOrderItemImages(supabase as any, row as unknown as Order);

    // Fallback: history-only record (admin deleted the operational order)
    const { data: hist, error: hErr } = await supabase
      .from("customer_history" as any)
      .select("*")
      .eq("id", data.id)
      .eq("customer_id", userId)
      .is("order_id", null)
      .maybeSingle();
    if (hErr) throw hErr;
    if (!hist) return null;
    return hydrateOrderItemImages(supabase as any, historyRowToOrder(hist));
  });

