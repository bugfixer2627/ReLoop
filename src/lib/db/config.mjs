/** Normalize the project URL, accepting a copied Data API root without duplicating it.
 * @param {string | undefined} value
 */
export function normalizeSupabaseUrl(value) {
  try {
    const url = new URL(value?.trim() ?? "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) || url.username || url.password || url.search || url.hash) return null;
    if (!["", "/", "/rest/v1", "/rest/v1/"].includes(url.pathname)) return null;
    return url.origin;
  } catch { return null; }
}
