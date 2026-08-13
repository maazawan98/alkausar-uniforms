export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\s,]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function sanitizeSlugLive(input: string): string {
  // Preserve trailing hyphen while typing so admin can keep editing naturally.
  const trailing = /-+$/.test(input) && !/^-+$/.test(input);
  const cleaned = input
    .toLowerCase()
    .replace(/[\s,]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 80);
  if (trailing && !cleaned.endsWith("-") && cleaned.length > 0 && cleaned.length < 80) {
    return cleaned + "-";
  }
  return cleaned;
}

export const SLUG_HELP =
  "Slug may only contain lowercase letters (a-z), numbers (0-9), and hyphens (-).";

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}
