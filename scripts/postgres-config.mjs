import { readFile } from "node:fs/promises";

/** Build a certificate-verified connection; never let sslmode=require disable validation.
 * @param {Record<string, string | undefined>} env
 * @param {string | undefined} portOverride
 */
export async function postgresConfig(env, portOverride) {
  const url = new URL(env.DATABASE_URL ?? "");
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.username || !url.password || url.hash) throw new Error("INVALID_DATABASE_URL");
  if (portOverride) {
    if (!["5432", "6543"].includes(portOverride)) throw new Error("INVALID_DATABASE_PORT");
    url.port = portOverride;
  }
  const caFile = env.DATABASE_SSL_CA_FILE || url.searchParams.get("sslrootcert");
  const ca = caFile ? await readFile(caFile, "utf8") : undefined;
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) url.searchParams.delete(key);
  return { connectionString: url.href, ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) }, connectionTimeoutMillis: 10000, query_timeout: 10000 };
}
