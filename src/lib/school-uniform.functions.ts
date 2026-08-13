import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LOGO_BUCKET = "school-assets";
const SIGNED_URL_TTL = 60 * 60; // 1h

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const collectionSchema = z.enum(["boys", "girls"]);
const nameSchema = z.string().trim().min(1).max(120);
const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format");

const uploadSchema = z
  .object({
    dataUrl: z.string().startsWith("data:").max(4_500_000),
    filename: z.string().min(1).max(200),
  })
  .nullable()
  .optional();

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
  const { data } = await db.storage.from(LOGO_BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? null;
}

async function uploadAsset(
  prefix: string,
  upload: { dataUrl: string; filename: string },
): Promise<string> {
  const db = await getDb();
  const match = upload.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data");
  const contentType = match[1];
  const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
  if (!allowed.includes(contentType)) throw new Error("Unsupported image type");
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  const ext = contentType === "image/svg+xml" ? "svg" : contentType.split("/")[1];
  const key = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db.storage.from(LOGO_BUCKET).upload(key, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return key;
}

async function removeAsset(path: string | null | undefined) {
  if (!path) return;
  const db = await getDb();
  await db.storage.from(LOGO_BUCKET).remove([path]);
}

// ---------- Schools ----------

export type SchoolRow = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  logoUrl: string | null;
  is_active: boolean;
  created_at: string;
  categoryCount: number;
};

async function decorateSchool(s: {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  is_active: boolean;
  created_at: string;
}, categoryCount: number): Promise<SchoolRow> {
  return {
    ...s,
    logoUrl: await signUrl(s.logo),
    categoryCount,
  };
}

export const listSchools = createServerFn({ method: "GET" }).handler(async (): Promise<SchoolRow[]> => {
  await ensureAdmin();
  const db = await getDb();
  const { data, error } = await db
    .from("schools")
    .select("id, name, slug, logo, is_active, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const counts = await Promise.all(
    rows.map((r) =>
      db
        .from("school_categories")
        .select("id", { count: "exact", head: true })
        .eq("school_id", r.id)
        .then((res) => res.count ?? 0),
    ),
  );
  return Promise.all(rows.map((r, i) => decorateSchool(r, counts[i])));
});

export const listSchoolNames = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ id: string; name: string }[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data, error } = await db
      .from("schools")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
);

export const getSchool = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ slug: slugSchema }).parse(raw))
  .handler(async ({ data }): Promise<SchoolRow | null> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: row, error } = await db
      .from("schools")
      .select("id, name, slug, logo, is_active, created_at")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const { count } = await db
      .from("school_categories")
      .select("id", { count: "exact", head: true })
      .eq("school_id", row.id);
    return decorateSchool(row, count ?? 0);
  });

export const createSchool = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        name: nameSchema,
        slug: slugSchema.optional(),
        is_active: z.boolean().default(true),
        upload: uploadSchema,
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const slug = data.slug ?? slugify(data.name);
    if (!slug) throw new Error("Invalid slug");
    const logo = data.upload ? await uploadAsset("schools", data.upload) : null;
    const { data: row, error } = await db
      .from("schools")
      .insert({
        name: data.name,
        slug,
        logo,
        is_active: data.is_active,
      })
      .select("id, slug")
      .single();
    if (error) {
      if (logo) await removeAsset(logo);
      if (error.code === "23505") {
        throw new Error("A school with this name or slug already exists.");
      }
      throw new Error(error.message);
    }
    return row;
  });

export const updateSchool = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: nameSchema,
        slug: slugSchema,
        is_active: z.boolean(),
        upload: uploadSchema,
        removeLogo: z.boolean().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { data: existing, error: fetchErr } = await db
      .from("schools")
      .select("logo")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!existing) throw new Error("School not found");

    let newLogoKey: string | null | undefined = undefined;
    if (data.upload) newLogoKey = await uploadAsset("schools", data.upload);
    else if (data.removeLogo) newLogoKey = null;

    const patch: {
      name: string;
      slug: string;
      is_active: boolean;
      logo?: string | null;
    } = {
      name: data.name,
      slug: data.slug,
      is_active: data.is_active,
    };
    if (newLogoKey !== undefined) patch.logo = newLogoKey;


    const { data: row, error } = await db
      .from("schools")
      .update(patch)
      .eq("id", data.id)
      .select("slug")
      .single();
    if (error) {
      if (newLogoKey) await removeAsset(newLogoKey);
      if (error.code === "23505") {
        throw new Error("A school with this name or slug already exists.");
      }
      throw new Error(error.message);
    }
    if (newLogoKey !== undefined && existing.logo) await removeAsset(existing.logo);
    return row;
  });

export const deleteSchool = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { count } = await db
      .from("school_categories")
      .select("id", { count: "exact", head: true })
      .eq("school_id", data.id);
    if ((count ?? 0) > 0) {
      throw new Error(
        "This school still has categories. Remove all categories (and their products) before deleting the school.",
      );
    }
    const { data: existing } = await db
      .from("schools")
      .select("logo")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await db.from("schools").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (existing?.logo) await removeAsset(existing.logo);
    return { ok: true };
  });

// ---------- Classes ----------

export type SchoolClass = { id: string; name: string; school_id: string; sort_order: number };

export const STANDARD_CLASS_NAMES = [
  "Play Group",
  "Nursery",
  "Prep",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
] as const;

async function nextClassSortOrder(schoolId: string): Promise<number> {
  const db = await getDb();
  const { data } = await db
    .from("school_classes")
    .select("sort_order")
    .eq("school_id", schoolId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? -1) + 1;
}

export const listClasses = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ schoolId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<SchoolClass[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: rows, error } = await db
      .from("school_classes")
      .select("id, name, school_id, sort_order")
      .eq("school_id", data.schoolId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertClass = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        schoolId: z.string().uuid(),
        name: nameSchema,
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    if (data.id) {
      const { error } = await db
        .from("school_classes")
        .update({ name: data.name })
        .eq("id", data.id);
      if (error) {
        if (error.code === "23505")
          throw new Error("A class with this name already exists for this school.");
        throw new Error(error.message);
      }
    } else {
      const sort_order = await nextClassSortOrder(data.schoolId);
      const { error } = await db
        .from("school_classes")
        .insert({ school_id: data.schoolId, name: data.name, sort_order });
      if (error) {
        if (error.code === "23505")
          throw new Error("A class with this name already exists for this school.");
        throw new Error(error.message);
      }
    }
    return { ok: true };
  });

export const addStandardClasses = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ schoolId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { data: existing, error: fetchErr } = await db
      .from("school_classes")
      .select("name")
      .eq("school_id", data.schoolId);
    if (fetchErr) throw new Error(fetchErr.message);
    const taken = new Set((existing ?? []).map((r) => r.name.toLowerCase()));
    const start = await nextClassSortOrder(data.schoolId);
    const toInsert = STANDARD_CLASS_NAMES
      .filter((n) => !taken.has(n.toLowerCase()))
      .map((n, i) => ({ school_id: data.schoolId, name: n, sort_order: start + i }));
    if (toInsert.length === 0) return { inserted: 0 };
    const { error } = await db.from("school_classes").insert(toInsert);
    if (error) throw new Error(error.message);
    return { inserted: toInsert.length };
  });

export const deleteClasses = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { error } = await db.from("school_classes").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { deleted: data.ids.length };
  });

export const reorderClasses = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        schoolId: z.string().uuid(),
        ids: z.array(z.string().uuid()).min(1).max(500),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    await Promise.all(
      data.ids.map((id, i) =>
        db
          .from("school_classes")
          .update({ sort_order: i })
          .eq("id", id)
          .eq("school_id", data.schoolId),
      ),
    );
    return { ok: true };
  });

// ---------- Campuses ----------

export type SchoolCampus = {
  id: string;
  school_id: string;
  country: string;
  city: string;
  area: string;
  campus_name: string | null;
  sort_order: number;
};

const campusFieldsSchema = z.object({
  country: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(120),
  area: z.string().trim().min(1).max(160),
  campus_name: z.string().trim().max(160).optional().nullable(),
});

async function nextCampusSortOrder(schoolId: string): Promise<number> {
  const db = await getDb();
  const { data } = await db
    .from("school_campuses")
    .select("sort_order")
    .eq("school_id", schoolId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? -1) + 1;
}

export const listCampuses = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ schoolId: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<SchoolCampus[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: rows, error } = await db
      .from("school_campuses")
      .select("id, school_id, country, city, area, campus_name, sort_order")
      .eq("school_id", data.schoolId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as SchoolCampus[];
  });

export const upsertCampus = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        schoolId: z.string().uuid(),
      })
      .merge(campusFieldsSchema)
      .parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const country = data.country.trim();
    const city = data.city.trim();
    const area = data.area.trim();
    const campusName = data.campus_name?.trim() || null;

    // Detect other campuses with same country+city+area in this school
    const { data: siblings, error: sibErr } = await db
      .from("school_campuses")
      .select("id, campus_name")
      .eq("school_id", data.schoolId)
      .ilike("country", country)
      .ilike("city", city)
      .ilike("area", area);
    if (sibErr) throw new Error(sibErr.message);
    const others = (siblings ?? []).filter((s) => s.id !== data.id);
    if (others.length > 0 && !campusName) {
      throw new Error(
        "Another campus already exists at this Country + City + Area. Please add a Campus Name to distinguish it.",
      );
    }

    if (data.id) {
      const { error } = await db
        .from("school_campuses")
        .update({ country, city, area, campus_name: campusName })
        .eq("id", data.id);
      if (error) {
        if (error.code === "23505")
          throw new Error(
            "A campus with the same Country, City, Area and Name already exists for this school.",
          );
        throw new Error(error.message);
      }
    } else {
      const sort_order = await nextCampusSortOrder(data.schoolId);
      const { error } = await db.from("school_campuses").insert({
        school_id: data.schoolId,
        country,
        city,
        area,
        campus_name: campusName,
        sort_order,
      });
      if (error) {
        if (error.code === "23505")
          throw new Error(
            "A campus with the same Country, City, Area and Name already exists for this school.",
          );
        throw new Error(error.message);
      }
    }
    return { ok: true };
  });

export const deleteCampus = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { error } = await db.from("school_campuses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderCampuses = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        schoolId: z.string().uuid(),
        ids: z.array(z.string().uuid()).min(1).max(500),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    await Promise.all(
      data.ids.map((id, i) =>
        db
          .from("school_campuses")
          .update({ sort_order: i })
          .eq("id", id)
          .eq("school_id", data.schoolId),
      ),
    );
    return { ok: true };
  });


// ---------- Categories ----------

export type SchoolCategory = {
  id: string;
  school_id: string;
  collection_type: "boys" | "girls";
  name: string;
  image: string | null;
  imageUrl: string | null;
  show_on_homepage: boolean;
  productCount: number;
};

export const listCategories = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        schoolId: z.string().uuid(),
        collection: collectionSchema,
      })
      .parse(raw),
  )
  .handler(async ({ data }): Promise<SchoolCategory[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: rows, error } = await db
      .from("school_categories")
      .select("id, school_id, collection_type, name, image, show_on_homepage")
      .eq("school_id", data.schoolId)
      .eq("collection_type", data.collection)
      .order("name");
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r) => r.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: prods, error: pErr } = await db
        .from("products")
        .select("category_id")
        .eq("school_id", data.schoolId)
        .eq("collection_type", data.collection)
        .in("category_id", ids);
      if (pErr) throw new Error(pErr.message);
      for (const p of prods ?? []) {
        counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
      }
    }
    return Promise.all(
      (rows ?? []).map(async (r) => ({
        ...r,
        imageUrl: await signUrl(r.image),
        productCount: counts.get(r.id) ?? 0,
      })),
    );
  });

export const getCategory = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }): Promise<SchoolCategory | null> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: row, error } = await db
      .from("school_categories")
      .select("id, school_id, collection_type, name, image, show_on_homepage")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const { count } = await db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", row.id);
    return { ...row, imageUrl: await signUrl(row.image), productCount: count ?? 0 };
  });

export const listCategorySuggestions = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data, error } = await db
      .from("school_categories")
      .select("name");
    if (error) throw new Error(error.message);
    const unique = Array.from(new Set((data ?? []).map((r) => r.name))).sort();
    return unique;
  },
);

export const createCategories = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        schoolId: z.string().uuid(),
        collection: collectionSchema,
        names: z.array(nameSchema).min(1).max(50),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const uniqueNames = Array.from(new Set(data.names.map((n) => n.trim()))).filter(Boolean);
    const { data: existing } = await db
      .from("school_categories")
      .select("name")
      .eq("school_id", data.schoolId)
      .eq("collection_type", data.collection);
    const taken = new Set((existing ?? []).map((r) => r.name.toLowerCase()));
    const toInsert = uniqueNames
      .filter((n) => !taken.has(n.toLowerCase()))
      .map((n) => ({
        school_id: data.schoolId,
        collection_type: data.collection,
        name: n,
      }));
    if (toInsert.length === 0) return { inserted: 0, skipped: uniqueNames.length };
    const { error } = await db.from("school_categories").insert(toInsert);
    if (error) throw new Error(error.message);
    return { inserted: toInsert.length, skipped: uniqueNames.length - toInsert.length };
  });

export const updateCategory = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: nameSchema,
        upload: uploadSchema,
        removeImage: z.boolean().optional(),
        show_on_homepage: z.boolean().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { data: existing, error: fetchErr } = await db
      .from("school_categories")
      .select("image")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!existing) throw new Error("Category not found");

    let newImageKey: string | null | undefined = undefined;
    if (data.upload) newImageKey = await uploadAsset("categories", data.upload);
    else if (data.removeImage) newImageKey = null;

    const patch: {
      name: string;
      image?: string | null;
      show_on_homepage?: boolean;
    } = { name: data.name };
    if (newImageKey !== undefined) patch.image = newImageKey;
    if (data.show_on_homepage !== undefined) patch.show_on_homepage = data.show_on_homepage;

    const { error } = await db.from("school_categories").update(patch).eq("id", data.id);
    if (error) {
      if (newImageKey) await removeAsset(newImageKey);
      if (error.code === "23505")
        throw new Error("A category with this name already exists in this collection.");
      throw new Error(error.message);
    }
    if (newImageKey !== undefined && existing.image) await removeAsset(existing.image);
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { data: existing } = await db
      .from("school_categories")
      .select("image")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await db.from("school_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (existing?.image) await removeAsset(existing.image);
    return { ok: true };
  });
