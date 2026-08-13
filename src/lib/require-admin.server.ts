import { getRequestHeader } from "@tanstack/react-start/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "alk_admin_session";

function secretKey() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET not configured");
  return new TextEncoder().encode(s);
}

function readCookie(name: string) {
  const cookie = getRequestHeader("cookie") ?? "";
  const m = cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export async function requireAdmin(): Promise<{ adminId: string; email: string }> {
  const token = readCookie(COOKIE_NAME);
  if (!token) throw new Error("Unauthorized");
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      adminId: payload.sub as string,
      email: payload.email as string,
    };
  } catch {
    throw new Error("Unauthorized");
  }
}
