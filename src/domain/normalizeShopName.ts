/** Best-effort duplicate key: trim, lowercase, collapse whitespace. */
export function normalizeShopName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
