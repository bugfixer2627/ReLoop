import { loadProjectEnv } from "./load-env.mjs";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import { normalizeSupabaseUrl } from "../src/lib/db/config.mjs";
import { generationConfig, transcriptionConfig } from "../src/lib/ai/config.mjs";
import { postgresConfig } from "./postgres-config.mjs";

// Read-only readiness probe. Never print URLs, keys, connection strings,
// database rows, driver errors or provider response bodies.
const loaded = loadProjectEnv();
const env = process.env;
const supabaseUrl = normalizeSupabaseUrl(env.SUPABASE_URL);
const generation = generationConfig(env);
const speech = transcriptionConfig(env);
const report = {
  localEnvLoaded: loaded.loadedEnvFiles.some((file) => file.path === ".env.local"),
  supabaseUrlValid: Boolean(supabaseUrl),
  supabaseUrlNormalized: Boolean(supabaseUrl && env.SUPABASE_URL?.replace(/\/$/, "") !== supabaseUrl),
  database: "not_configured", postgres: "not_configured", databaseHttpStatus: null,
  fixtureProductAvailable: false, migrationNames: [], rpcNames: [], tables: {},
  caseStatusCompatibility: "not_checked", unsupportedCaseStatuses: [],
  postgresPort: null, projectIdentityMatches: null,
  demoAccessReady: Boolean(env.DEMO_ACCESS_TOKEN && env.DEMO_ACCESS_TOKEN.length >= 32),
  generationConfigured: Boolean(generation),
  transcriptionConfigured: Boolean(speech),
  liveGenerationTested: false, liveSpeechTested: false,
  databaseFailureCategory: null, postgresFailureCategory: null,
};
function failureCategory(error) {
  const code = error?.code ?? error?.cause?.code;
  if (["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ETIMEDOUT", "28P01", "3D000", "42P01", "42501", "PGRST125", "PGRST202", "PGRST205", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN", "CERT_HAS_EXPIRED"].includes(code)) return code;
  const message = String(error?.message ?? "");
  if (/connection terminated|socket closed/i.test(message)) return "connection_closed_before_query";
  if (/timed? ?out/i.test(message)) return "connection_timeout";
  if (/certificate|ssl|tls/i.test(message)) return "certificate_or_tls_failure";
  return "unclassified_failure";
}
if (supabaseUrl && env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const db = createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
    });
    const { data, error, status } = await db.from("products").select("id").eq("sku", "RL-LAMP-01").limit(1);
    report.databaseHttpStatus = status;
    report.database = !error ? "reachable_authenticated" : status === 401 ? "authentication_failed" : status === 403 ? "authorization_failed" : status === 404 ? "schema_or_path_missing" : "read_failed";
    if (error) report.databaseFailureCategory = failureCategory(error);
    report.fixtureProductAvailable = Boolean(!error && data?.length);
    const tables = ["products", "evidence_sources", "platform_listings", "cases", "rules", "artifacts", "artifact_versions", "findings", "revision_events", "artifact_reviews", "tasks", "audit_events"];
    const tableResults = await Promise.all(tables.map(async (table) => {
      const result = await db.from(table).select("id").limit(1);
      return [table, result.error ? failureCategory(result.error) : "readable"];
    }));
    report.tables = Object.fromEntries(tableResults);
    const statuses = await db.from("cases").select("status");
    if (!statuses.error) {
      const accepted = new Set(["open", "investigating", "pending_review", "closed"]);
      report.unsupportedCaseStatuses = [...new Set(statuses.data.map((row) => row.status).filter((value) => !accepted.has(value) && /^[a-z_]{1,40}$/.test(value)))];
      report.caseStatusCompatibility = report.unsupportedCaseStatuses.length ? "contract_mismatch" : "compatible";
    }
    const migrations = await db.from("reloop_schema_migrations").select("name");
    if (!migrations.error) report.migrationNames = migrations.data.map((row) => row.name).filter((name) => /^\d{12}_[a-z_]+\.sql$/.test(name));
    const schemaResponse = await fetch(supabaseUrl + "/rest/v1/", { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY }, signal: AbortSignal.timeout(10000) });
    if (schemaResponse.ok) {
      const schema = await schemaResponse.json();
      report.rpcNames = Object.keys(schema.paths ?? {}).filter((path) => /^\/rpc\/reloop_[a-z_]+$/.test(path)).map((path) => path.slice(5));
    }
  } catch (error) { report.database = "unreachable_or_denied"; report.databaseFailureCategory = failureCategory(error); }
}
if (env.DATABASE_URL) {
  let client;
  try {
    const url = new URL(env.DATABASE_URL);
    const portOverride = process.argv.find((arg) => arg.startsWith("--postgres-port="))?.split("=")[1];
    report.postgresPort = portOverride || url.port || "5432";
    const project = supabaseUrl && new URL(supabaseUrl).hostname.split(".")[0];
    report.projectIdentityMatches = Boolean(project && (url.hostname === "db." + project + ".supabase.co" || decodeURIComponent(url.username) === "postgres." + project));
    // No fallback to plaintext or rejectUnauthorized:false.
    client = new pg.Client(await postgresConfig(env, portOverride));
    client.on("error", () => {});
    await client.connect();
    await client.query("begin read only");
    await client.query("set local statement_timeout = '10s'");
    report.postgres = "reachable_read_only";
    report.rpcNames = (await client.query("select distinct p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'reloop_%' order by p.proname")).rows.map((row) => row.proname);
    const ledger = await client.query("select to_regclass('public.reloop_schema_migrations') is not null as present");
    if (ledger.rows[0].present) report.migrationNames = (await client.query("select name from public.reloop_schema_migrations order by name")).rows.map((row) => row.name);
    await client.query("rollback");
  } catch (error) { report.postgres = "unreachable_or_probe_failed"; report.postgresFailureCategory = failureCategory(error); }
  finally { await client?.end().catch(() => {}); }
}
if (process.argv.includes("--providers")) {
  report.providerChecks = {};
  for (const [name, config] of [["generation", generation], ["transcription", speech]]) {
    if (!config) { report.providerChecks[name] = { status: "not_configured" }; continue; }
    try {
      const response = await fetch(config.baseUrl + "/models", { headers: { Authorization: "Bearer " + config.apiKey }, signal: AbortSignal.timeout(15000) });
      const body = await response.json().catch(() => ({}));
      report.providerChecks[name] = {
        httpStatus: response.status,
        authentication: response.status === 401 ? "rejected" : response.ok ? "accepted" : "unconfirmed",
        errorCode: ["invalid_api_key", "insufficient_quota", "rate_limit_exceeded"].includes(body.error?.code) ? body.error.code : null,
        configuredModelListed: Boolean(response.ok && body.data?.some((item) => item.id === config.model)),
      };
    } catch (error) { report.providerChecks[name] = { failure: failureCategory(error) }; }
  }
}
console.log(JSON.stringify(report, null, 2));
