import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

// Read-only readiness probe. Never print URLs, keys, connection strings,
// database rows, driver errors or provider response bodies.
const env = { ...process.env };
try {
  const local = parseEnv(await readFile(new URL("../.env.local", import.meta.url), "utf8"));
  for (const [key, value] of Object.entries(local)) env[key] ??= value;
} catch (error) {
  if (error.code !== "ENOENT") throw new Error("Could not read local configuration.");
}
const report = {
  database: "not_configured", postgres: "not_configured",
  fixtureProductAvailable: false, migrationNames: [], rpcNames: [],
  demoAccessReady: Boolean(env.DEMO_ACCESS_TOKEN && env.DEMO_ACCESS_TOKEN.length >= 32),
  generationConfigured: Boolean(env.LLM_PROVIDER === "openai_compatible" && env.LLM_API_KEY && env.LLM_MODEL),
  transcriptionConfigured: Boolean((env.TRANSCRIPTION_PROVIDER || env.LLM_PROVIDER) === "openai_compatible" && (env.TRANSCRIPTION_API_KEY || env.LLM_API_KEY)),
  liveGenerationTested: false, liveSpeechTested: false,
  databaseFailureCategory: null, postgresFailureCategory: null,
};
function failureCategory(error) {
  const code = error?.code ?? error?.cause?.code;
  if (["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ETIMEDOUT", "28P01", "3D000", "42P01", "PGRST205", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN", "CERT_HAS_EXPIRED"].includes(code)) return code;
  return "connection_or_configuration_error";
}
if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
    });
    const { data, error } = await db.from("products").select("id").eq("sku", "RL-LAMP-01").limit(1);
    report.database = error ? "unreachable_or_denied" : "reachable";
    if (error) report.databaseFailureCategory = failureCategory(error);
    report.fixtureProductAvailable = Boolean(!error && data?.length);
  } catch (error) { report.database = "unreachable_or_denied"; report.databaseFailureCategory = failureCategory(error); }
}
if (env.DATABASE_URL) {
  const client = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 10000, query_timeout: 10000 });
  client.on("error", () => {});
  try {
    await client.connect();
    await client.query("begin read only");
    await client.query("set local statement_timeout = '10s'");
    report.postgres = "reachable_read_only";
    report.rpcNames = (await client.query("select distinct p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'reloop_%' order by p.proname")).rows.map((row) => row.proname);
    const ledger = await client.query("select to_regclass('public.reloop_schema_migrations') is not null as present");
    if (ledger.rows[0].present) report.migrationNames = (await client.query("select name from public.reloop_schema_migrations order by name")).rows.map((row) => row.name);
    await client.query("rollback");
  } catch (error) { report.postgres = "unreachable_or_probe_failed"; report.postgresFailureCategory = failureCategory(error); }
  finally { await client.end().catch(() => {}); }
}
console.log(JSON.stringify(report, null, 2));
