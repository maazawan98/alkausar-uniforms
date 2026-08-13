import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "alk_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours

function secretKey() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET not configured");
  return new TextEncoder().encode(s);
}

async function signToken(adminId: string, email: string) {
  return await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secretKey());
  return { adminId: payload.sub as string, email: payload.email as string };
}

function readCookie(name: string) {
  const cookie = getRequestHeader("cookie") ?? "";
  const m = cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name: string, value: string, maxAge: number) {
  // SameSite=None + Secure is required so the cookie is sent back from the
  // preview iframe (cross-origin third-party context). It also works fine in
  // published, same-origin HTTPS deployments.
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=None",
    "Secure",
    `Max-Age=${maxAge}`,
  ];
  setResponseHeader("set-cookie", parts.join("; "));
}


async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const emailSchema = z.string().trim().toLowerCase().email().max(255);

export type EmailCheckResult =
  | { status: "not_admin" }
  | { status: "locked"; disabledUntil: string }
  | { status: "password_required"; email: string };

export const checkEmail = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => z.object({ email: emailSchema }).parse(raw))
  .handler(async ({ data }): Promise<EmailCheckResult> => {
    const db = await getAdmin();
    const { data: admin } = await db
      .from("admins")
      .select("id, email, disabled_until")
      .eq("email", data.email)
      .maybeSingle();
    if (!admin) return { status: "not_admin" };
    if (admin.disabled_until && new Date(admin.disabled_until) > new Date()) {
      return { status: "locked", disabledUntil: admin.disabled_until };
    }
    return { status: "password_required", email: admin.email };
  });

export type AdminSessionInfo = { email: string; adminId: string };

export type AdminLoginResult =
  | { status: "success"; session: AdminSessionInfo }
  | { status: "not_admin" }
  | { status: "locked"; disabledUntil: string }
  | { status: "wrong_password"; attemptsRemaining: number }
  | { status: "now_locked"; disabledUntil: string };

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        email: emailSchema,
        password: z.string().min(1).max(200),
      })
      .parse(raw),
  )
  .handler(async ({ data }): Promise<AdminLoginResult> => {
    const db = await getAdmin();
    const { data: admin } = await db
      .from("admins")
      .select("id, email, password_hash, failed_attempts, disabled_until")
      .eq("email", data.email)
      .maybeSingle();
    if (!admin) return { status: "not_admin" };

    if (admin.disabled_until && new Date(admin.disabled_until) > new Date()) {
      return { status: "locked", disabledUntil: admin.disabled_until };
    }

    const ok = await bcrypt.compare(data.password, admin.password_hash);
    if (ok) {
      await db
        .from("admins")
        .update({ failed_attempts: 0, disabled_until: null })
        .eq("id", admin.id);
      const token = await signToken(admin.id, admin.email);
      setCookie(COOKIE_NAME, token, SESSION_MAX_AGE);
      return { status: "success", session: { email: admin.email, adminId: admin.id } };
    }

    const newAttempts = (admin.failed_attempts ?? 0) + 1;
    if (newAttempts >= 3) {
      const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await db
        .from("admins")
        .update({ failed_attempts: newAttempts, disabled_until: until })
        .eq("id", admin.id);
      return { status: "now_locked", disabledUntil: until };
    }

    await db
      .from("admins")
      .update({ failed_attempts: newAttempts })
      .eq("id", admin.id);
    return { status: "wrong_password", attemptsRemaining: 3 - newAttempts };
  });


export const getAdminSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ email: string; adminId: string } | null> => {
    const token = readCookie(COOKIE_NAME);
    if (!token) return null;
    try {
      const { adminId, email } = await verifyToken(token);
      const db = await getAdmin();
      const { data: admin } = await db
        .from("admins")
        .select("id, email")
        .eq("id", adminId)
        .maybeSingle();
      if (!admin) return null;
      return { email, adminId };
    } catch {
      return null;
    }
  },
);

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  setCookie(COOKIE_NAME, "", 0);
  return { ok: true };
});
