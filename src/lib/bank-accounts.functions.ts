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

export type BankAccountRow = {
  id: string;
  bank_name: string;
  account_title: string;
  account_number: string;
  iban_number: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const baseSchema = z.object({
  bank_name: z.string().trim().min(1).max(200),
  account_title: z.string().trim().min(1).max(200),
  account_number: z.string().trim().min(1).max(64),
  iban_number: z.string().trim().max(64).nullable().optional(),
  display_order: z.number().int().min(1).max(9999),
  is_active: z.boolean().optional().default(true),
});

function normalize(row: any): BankAccountRow {
  return {
    id: row.id,
    bank_name: row.bank_name,
    account_title: row.account_title,
    account_number: row.account_number,
    iban_number: row.iban_number ?? null,
    display_order: Number(row.display_order),
    is_active: !!row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapUniqueError(msg: string): string {
  if (msg.toLowerCase().includes("bank_accounts_display_order_unique") ||
      msg.toLowerCase().includes("display_order")) {
    return "Display order must be unique. Please choose a different number.";
  }
  return msg;
}

/* Admin: list all */
export const listBankAccounts = createServerFn({ method: "GET" }).handler(
  async (): Promise<BankAccountRow[]> => {
    await ensureAdmin();
    const db = await getDb();
    const { data, error } = await db
      .from("bank_accounts" as any)
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data as any[]) ?? []).map(normalize);
  },
);

/* Admin: create */
export const createBankAccount = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => baseSchema.parse(raw))
  .handler(async ({ data }): Promise<BankAccountRow> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: inserted, error } = await db
      .from("bank_accounts" as any)
      .insert({
        bank_name: data.bank_name.trim(),
        account_title: data.account_title.trim(),
        account_number: data.account_number.trim(),
        iban_number: data.iban_number?.trim() || null,
        display_order: data.display_order,
        is_active: !!data.is_active,
      })
      .select("*")
      .single();
    if (error) throw new Error(mapUniqueError(error.message));
    return normalize(inserted);
  });

/* Admin: update */
export const updateBankAccount = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    baseSchema.extend({ id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }): Promise<BankAccountRow> => {
    await ensureAdmin();
    const db = await getDb();
    const { data: updated, error } = await db
      .from("bank_accounts" as any)
      .update({
        bank_name: data.bank_name.trim(),
        account_title: data.account_title.trim(),
        account_number: data.account_number.trim(),
        iban_number: data.iban_number?.trim() || null,
        display_order: data.display_order,
        is_active: !!data.is_active,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(mapUniqueError(error.message));
    return normalize(updated);
  });

/* Admin: toggle active */
export const toggleBankAccountActive = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { error } = await db
      .from("bank_accounts" as any)
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* Admin: delete */
export const deleteBankAccount = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { error } = await db.from("bank_accounts" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* Public: list active bank accounts for checkout (RLS restricts to is_active) */
export const listActiveBankAccounts = createServerFn({ method: "GET" }).handler(
  async (): Promise<BankAccountRow[]> => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabasePublic = createClient(process.env.SUPABASE_URL!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data, error } = await supabasePublic
      .from("bank_accounts" as any)
      .select("id, bank_name, account_title, account_number, iban_number, display_order, is_active, created_at, updated_at")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data as any[]) ?? []).map(normalize);
  },
);
