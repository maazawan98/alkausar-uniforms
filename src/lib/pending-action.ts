/* Pending action: something the user tried to do while signed out.
   After sign-in we replay it and navigate back to where they were. */

import type { ShopModule, CartLineInput } from "@/lib/shop.functions";

export type PendingAction =
  | { kind: "wishlist"; module: ShopModule; productId: string; categoryId: string | null }
  | { kind: "cart"; line: CartLineInput }
  | { kind: "buynow"; line: CartLineInput }
  | { kind: "newsletter" }
  | {
      kind: "contact";
      payload: {
        full_name: string;
        email: string;
        phone?: string | null;
        subject?: string | null;
        message: string;
      };
    };

type Stored = { action: PendingAction; returnTo: string };

const KEY = "alk_pending_action";
const RETURN_KEY = "alk_return_path";

export function setPendingAction(action: PendingAction, returnTo?: string) {
  try {
    const path =
      returnTo ?? window.location.pathname + window.location.search;
    sessionStorage.setItem(KEY, JSON.stringify({ action, returnTo: path } as Stored));
    sessionStorage.setItem(RETURN_KEY, path);
  } catch {}
}

export function consumePendingAction(): Stored | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as Stored;
  } catch {
    return null;
  }
}

export function peekPendingAction(): Stored | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

/* Buy Now selection storage (bridges product page → /checkout?mode=buynow) */

const BUYNOW_KEY = "alk_buynow_line";

export function setBuyNowLine(line: CartLineInput) {
  try {
    sessionStorage.setItem(BUYNOW_KEY, JSON.stringify(line));
  } catch {}
}
export function readBuyNowLine(): CartLineInput | null {
  try {
    const raw = sessionStorage.getItem(BUYNOW_KEY);
    return raw ? (JSON.parse(raw) as CartLineInput) : null;
  } catch {
    return null;
  }
}
export function clearBuyNowLine() {
  try {
    sessionStorage.removeItem(BUYNOW_KEY);
  } catch {}
}
