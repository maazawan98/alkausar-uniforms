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

const labelSchema = z.string().trim().min(1).max(120);
const unitSchema = z.string().trim().min(1).max(40);
const sizeSchema = z.string().trim().min(1).max(40);

const measurementInput = z.object({
  id: z.string().uuid().optional(),
  measurement_label: z.string().trim().min(1).max(120),
  measurement_value: z.number().finite(),
});

export type SizingMeasurement = {
  id: string;
  sizing_id: string;
  measurement_label: string;
  measurement_value: number;
  sort_order: number;
};

export type SizingRow = {
  id: string;
  size_label: string;
  size: string;
  measurement_unit: string;
  created_at: string;
  measurement_count: number;
};

export type SizingDetail = {
  id: string;
  size_label: string;
  size: string;
  measurement_unit: string;
  created_at: string;
  updated_at: string;
  measurements: SizingMeasurement[];
};

function ensureUniqueLabels(items: { measurement_label: string }[]) {
  const seen = new Set<string>();
  for (const m of items) {
    const key = m.measurement_label.trim().toLowerCase();
    if (seen.has(key))
      throw new Error(`Duplicate measurement label: "${m.measurement_label}"`);
    seen.add(key);
  }
}

export const listSizings = createServerFn({ method: "GET" }).handler(
  async (): Promise<SizingRow[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data, error } = await db
      .from("sizings")
      .select("id, size_label, size, measurement_unit, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const counts = await Promise.all(
      rows.map((r) =>
        db
          .from("sizing_measurements")
          .select("id", { count: "exact", head: true })
          .eq("sizing_id", r.id)
          .then((res) => res.count ?? 0),
      ),
    );
    return rows.map((r, i) => ({ ...r, measurement_count: counts[i] }));
  },
);

export const getSizing = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }): Promise<SizingDetail | null> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: row, error } = await db
      .from("sizings")
      .select("id, size_label, size, measurement_unit, created_at, updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const { data: ms, error: mErr } = await db
      .from("sizing_measurements")
      .select("id, sizing_id, measurement_label, measurement_value, sort_order")
      .eq("sizing_id", data.id)
      .order("sort_order", { ascending: true });
    if (mErr) throw new Error(mErr.message);
    return {
      ...row,
      measurements: (ms ?? []).map((m) => ({
        ...m,
        measurement_value: Number(m.measurement_value),
      })),
    };
  });

export const createSizing = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        size_label: labelSchema,
        size: sizeSchema,
        measurement_unit: unitSchema,
        measurements: z.array(measurementInput).min(1),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    ensureUniqueLabels(data.measurements);
    const db = await getDb();
    const { data: row, error } = await db
      .from("sizings")
      .insert({
        size_label: data.size_label.trim(),
        size: data.size.trim(),
        measurement_unit: data.measurement_unit.trim(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const toInsert = data.measurements.map((m, i) => ({
      sizing_id: row.id,
      measurement_label: m.measurement_label.trim(),
      measurement_value: m.measurement_value,
      sort_order: i,
    }));
    const { error: mErr } = await db
      .from("sizing_measurements")
      .insert(toInsert);
    if (mErr) {
      await db.from("sizings").delete().eq("id", row.id);
      throw new Error(mErr.message);
    }
    return { id: row.id };
  });

export const updateSizing = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        size_label: labelSchema,
        size: sizeSchema,
        measurement_unit: unitSchema,
        measurements: z.array(measurementInput).min(1),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    ensureUniqueLabels(data.measurements);
    const db = await getDb();

    const { error: uErr } = await db
      .from("sizings")
      .update({
        size_label: data.size_label.trim(),
        size: data.size.trim(),
        measurement_unit: data.measurement_unit.trim(),
      })
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);

    const { data: existing, error: eErr } = await db
      .from("sizing_measurements")
      .select("id")
      .eq("sizing_id", data.id);
    if (eErr) throw new Error(eErr.message);
    const keepIds = new Set(
      data.measurements.map((m) => m.id).filter(Boolean) as string[],
    );
    const toDelete = (existing ?? [])
      .map((r) => r.id)
      .filter((id) => !keepIds.has(id));
    if (toDelete.length) {
      const { error: dErr } = await db
        .from("sizing_measurements")
        .delete()
        .in("id", toDelete);
      if (dErr) throw new Error(dErr.message);
    }

    // Two-pass to avoid unique(label) collisions during reorder/rename
    for (let i = 0; i < data.measurements.length; i++) {
      const m = data.measurements[i];
      if (m.id) {
        const { error } = await db
          .from("sizing_measurements")
          .update({
            measurement_label: `__tmp_${i}_${m.id.slice(0, 8)}`,
            sort_order: 10000 + i,
          })
          .eq("id", m.id);
        if (error) throw new Error(error.message);
      }
    }
    for (let i = 0; i < data.measurements.length; i++) {
      const m = data.measurements[i];
      if (m.id) {
        const { error } = await db
          .from("sizing_measurements")
          .update({
            measurement_label: m.measurement_label.trim(),
            measurement_value: m.measurement_value,
            sort_order: i,
          })
          .eq("id", m.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db.from("sizing_measurements").insert({
          sizing_id: data.id,
          measurement_label: m.measurement_label.trim(),
          measurement_value: m.measurement_value,
          sort_order: i,
        });
        if (error) throw new Error(error.message);
      }
    }
    return { ok: true };
  });

export const deleteSizing = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { error } = await db.from("sizings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMeasurementUnits = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data, error } = await db
      .from("sizings")
      .select("measurement_unit");
    if (error) throw new Error(error.message);
    const seen = new Set<string>();
    for (const r of data ?? []) {
      const u = r.measurement_unit?.trim();
      if (u) seen.add(u);
    }
    return Array.from(seen).sort();
  },
);
