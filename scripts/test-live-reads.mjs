import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadProjectEnv } from "./load-env.mjs";

// Actual local Next server + hosted Supabase READS ONLY. Never mutate hosted data.
loadProjectEnv();
const base = new URL(process.env.RELOOP_BASE_URL || "http://localhost:3000");
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) throw new Error("Use a local Next.js server for this check.");
const fixture = JSON.parse(await readFile(new URL("../src/lib/fixtures/demo.json", import.meta.url), "utf8"));
try {
  const headers = { Authorization: "Bearer " + process.env.DEMO_ACCESS_TOKEN };
  const health = await (await fetch(new URL("/api/health", base))).json();
  assert.equal(health.ok, true);
  assert.equal(health.data.database, "reachable");
  const cases = await (await fetch(new URL("/api/cases", base), { headers })).json();
  assert.equal(cases.ok, true);
  const found = cases.data.cases.some((item) => item.id === fixture.case.id && item.synthetic);
  assert.equal(found, true);
  const loaded = await (await fetch(new URL("/api/cases/" + fixture.case.id, base), { headers })).json();
  assert.equal(loaded.ok, true);
  assert.equal(loaded.data.case.id, fixture.case.id);
  assert.equal(loaded.data.case.synthetic, true);
  assert.equal(loaded.data.listings.length, 3);
  const report = { health: "reachable", protectedCaseList: "passed", seededCaseSchemaAndReads: "passed", evidenceCount: loaded.data.evidence.length, listingCount: loaded.data.listings.length, verifiedRuleCount: loaded.data.rules.filter((item) => item.status === "verified").length, hostedWrites: 0 };
  console.log(JSON.stringify(report, null, 2));
} catch {
  console.error("Read-only API checks failed. Run verify-services.mjs for sanitized diagnostics.");
  process.exitCode = 1;
}
