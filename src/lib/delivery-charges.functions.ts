import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function ensureAdmin() {
  const { requireAdmin } = await import("./require-admin.server");
  return requireAdmin();
}

export type DeliveryChargeRow = {
  id: string;
  delivery_charge: number;
  instruction: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const chargeSchema = z.object({
  delivery_charge: z.number().finite().min(0),
  instruction: z.string().trim().max(2000).nullable().optional(),
  is_active: z.boolean().optional().default(true),
});

function normalize(row: any): DeliveryChargeRow {
  return {
    id: row.id,
    delivery_charge: Number(row.delivery_charge),
    instruction: row.instruction ?? null,
    is_active: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/* Admin: list all delivery charges */
export const listDeliveryCharges = createServerFn({ method: "GET" }).handler(
  async (): Promise<DeliveryChargeRow[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data, error } = await db
      .from("delivery_charges" as any)
      .select("*")
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data as any[]) ?? []).map(normalize);
  },
);

/* Admin: create a new delivery charge */
export const createDeliveryCharge = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => chargeSchema.parse(raw))
  .handler(async ({ data }): Promise<DeliveryChargeRow> => {
    await ensureAdmin();
    const db = await getDb();
    if (data.is_active) {
      await db.from("delivery_charges" as any).update({ is_active: false }).eq("is_active", true);
    }
    const { data: inserted, error } = await db
      .from("delivery_charges" as any)
      .insert({
        delivery_charge: data.delivery_charge,
        instruction: data.instruction?.trim() || null,
        is_active: !!data.is_active,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return normalize(inserted);
  });

/* Admin: update a delivery charge */
export const updateDeliveryCharge = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    chargeSchema.extend({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }): Promise<DeliveryChargeRow> => {
    await ensureAdmin();
    const db = await getDb();
    if (data.is_active) {
      await db
        .from("delivery_charges" as any)
        .update({ is_active: false })
        .eq("is_active", true)
        .neq("id", data.id);
    }
    const { data: updated, error } = await db
      .from("delivery_charges" as any)
      .update({
        delivery_charge: data.delivery_charge,
        instruction: data.instruction?.trim() || null,
        is_active: !!data.is_active,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return normalize(updated);
  });

/* Admin: activate a specific record (deactivates others) */
export const activateDeliveryCharge = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    await db
      .from("delivery_charges" as any)
      .update({ is_active: false })
      .eq("is_active", true)
      .neq("id", data.id);
    const { error } = await db
      .from("delivery_charges" as any)
      .update({ is_active: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* Admin: delete */
export const deleteDeliveryCharge = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { error } = await db.from("delivery_charges" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* Checkout: read the currently active delivery charge (requires signed-in user) */
export const getActiveDeliveryCharge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeliveryChargeRow | null> => {
    const { data, error } = await context.supabase
      .from("delivery_charges" as any)
      .select("*")
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? normalize(data) : null;
  });
