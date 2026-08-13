/** Helpers that turn raw contact strings into clickable tel:/mailto:/WhatsApp hrefs. */

const DEFAULT_COUNTRY_CODE = "92";

/** Digits only, in international format (no `+`). e.g. "0317-0022661" -> "923170022661" */
export function toInternationalDigits(raw?: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = DEFAULT_COUNTRY_CODE + d.slice(1);
  return d.length >= 8 ? d : null;
}

export function telHref(raw?: string | null): string | null {
  const d = toInternationalDigits(raw);
  return d ? `tel:+${d}` : null;
}

export function mailtoHref(raw?: string | null): string | null {
  const e = (raw ?? "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? `mailto:${e}` : null;
}

/**
 * WhatsApp chat link. Prefers an explicit URL from business settings,
 * otherwise derives `https://wa.me/<number>` from the phone number.
 */
export function whatsappHref(explicitUrl?: string | null, phone?: string | null): string | null {
  const url = (explicitUrl ?? "").trim();
  if (url) {
    if (/^https?:\/\//i.test(url)) return url;
    const d = toInternationalDigits(url);
    if (d) return `https://wa.me/${d}`;
  }
  const d = toInternationalDigits(phone);
  return d ? `https://wa.me/${d}` : null;
}
