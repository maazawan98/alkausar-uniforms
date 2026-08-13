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

export type QueryType = "Newsletter" | "Contact";
export type QueryStatus = "New" | "Read" | "Replied";

export type CustomerQueryRow = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  query_type: QueryType;
  subject: string | null;
  message: string;
  status: QueryStatus;
  created_at: string;
  updated_at: string;
};

/* ---------------- CUSTOMER: Newsletter ---------------- */

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims?.email as string) || "";

    // Fetch customer profile for name/email
    const { data: customer } = await supabase
      .from("customers" as any)
      .select("id, full_name, email")
      .eq("id", userId)
      .maybeSingle();

    const name = (customer as any)?.full_name?.trim() || "";
    const finalEmail = ((customer as any)?.email || email || "").toLowerCase();

    if (!finalEmail) throw new Error("Missing email on your account.");

    // Check duplicate by customer_id OR email
    const { data: existing } = await supabase
      .from("customer_query" as any)
      .select("id")
      .eq("query_type", "Newsletter")
      .or(`customer_id.eq.${userId},customer_email.eq.${finalEmail}`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return { status: "already" as const };
    }

    const { error } = await supabase.from("customer_query" as any).insert({
      customer_id: userId,
      customer_name: name || finalEmail.split("@")[0],
      customer_email: finalEmail,
      query_type: "Newsletter",
      message: "Newsletter Subscription",
      status: "New",
    });
    if (error) {
      // Unique violation → already subscribed
      if ((error as any).code === "23505") return { status: "already" as const };
      throw new Error(error.message);
    }
    return { status: "ok" as const };
  });

/* ---------------- CUSTOMER: Contact ---------------- */

const contactSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Invalid email").max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  subject: z.string().trim().max(200).optional().nullable(),
  message: z.string().trim().min(3, "Message is too short").max(4000),
});

export const submitContactQuery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => contactSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("customer_query" as any).insert({
      customer_id: userId,
      customer_name: data.full_name,
      customer_email: data.email.toLowerCase(),
      customer_phone: data.phone || null,
      query_type: "Contact",
      subject: data.subject || null,
      message: data.message,
      status: "New",
    });
    if (error) throw new Error(error.message);
    return { status: "ok" as const };
  });

/* ---------------- ADMIN ---------------- */

export const adminListQueries = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ type: z.enum(["Newsletter", "Contact"]) }).parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { data: rows, error } = await db
      .from("customer_query" as any)
      .select("*")
      .eq("query_type", data.type)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as CustomerQueryRow[];
  });

export const adminQueryCounts = createServerFn({ method: "GET" }).handler(async () => {
  await ensureAdmin();
  const db = await getDb();
  const [nl, ct, ctNew] = await Promise.all([
    db.from("customer_query" as any).select("id", { count: "exact", head: true }).eq("query_type", "Newsletter"),
    db.from("customer_query" as any).select("id", { count: "exact", head: true }).eq("query_type", "Contact"),
    db.from("customer_query" as any).select("id", { count: "exact", head: true }).eq("query_type", "Contact").eq("status", "New"),
  ]);
  return {
    newsletter_total: nl.count ?? 0,
    contact_total: ct.count ?? 0,
    contact_new: ctNew.count ?? 0,
  };
});

export const adminUpdateQueryStatus = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["New", "Read", "Replied"]),
    }).parse(raw),
  )
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { error } = await db
      .from("customer_query" as any)
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteQuery = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    await ensureAdmin();
    const db = await getDb();
    const { error } = await db.from("customer_query" as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
