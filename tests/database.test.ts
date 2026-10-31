import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { demoBundle } from "@/lib/fixtures/demo";
import { generateSeed } from "../scripts/seed-data.mjs";

let db: PGlite;
const caseId = demoBundle.case.id;
const supportId = "00000000-0000-4000-8000-000000000201";
const listingId = "00000000-0000-4000-8000-000000000202";
let seed: string;
let reset: string;

async function createArtifact(id = supportId, kind = "support_reply") {
  await db.query("insert into artifacts(id, case_id, kind, platform, market, segment) values ($1, $2, $3, 'shopify_us', 'US', 'b2c')", [id, caseId, kind]);
  await addVersion(id, 1);
}

async function addVersion(id: string, version: number) {
  return db.query<{ id: string }>(`insert into artifact_versions(artifact_id, case_id, version, locale, language_status, content_json, source_ids)
    values ($1, $2, $3, 'en-US', 'beta', '{"format":"support_reply","subject":"Fixture","body":"Contract test only"}', array['SPEC-001']) returning id`, [id, caseId, version]);
}

beforeAll(async () => {
  db = new PGlite();
  const migration = await readFile(new URL("../supabase/migrations/202610310001_foundation.sql", import.meta.url), "utf8");
  const skuMigration = await readFile(new URL("../supabase/migrations/202610310002_generate_product_sku.sql", import.meta.url), "utf8");
  seed = await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8");
  reset = await readFile(new URL("../supabase/reset.sql", import.meta.url), "utf8");
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  await db.exec(`begin; ${migration} ${skuMigration} ${seed} commit;`);
}, 60000);

beforeEach(async () => { await db.exec("begin"); });
afterEach(async () => { await db.exec("rollback"); });
afterAll(async () => { await db?.close(); });

describe("PostgreSQL foundation migration and persistence invariants", () => {
  it("keeps the generated SQL seed in sync with the typed fixture", () => {
    expect(seed).toBe(generateSeed(demoBundle));
  });
  it("seeds the product, all three platforms, Chinese instruction and unverified rules", async () => {
    expect((await db.query("select id from products")).rows).toHaveLength(1);
    expect((await db.query("select id from platform_listings")).rows).toHaveLength(3);
    expect((await db.query("select id from rules where verification_status = 'verified'")).rows).toHaveLength(0);
    const result = await db.query<{ merchant_instruction: string }>("select merchant_instruction from cases where id = $1", [caseId]);
    expect(result.rows[0].merchant_instruction).toBe(demoBundle.case.merchantInstruction);
  });
  it("generates an internal SKU when seller input omits one", async () => {
    const result = await db.query<{ sku: string }>(
      `insert into products(name, attributes_json, source_version, synthetic)
       values ('Seller product without SKU', '{}', 'test-v1', true)
       returning sku`,
    );
    expect(result.rows[0].sku).toMatch(/^RL-[A-F0-9]{32}$/);
  });
  it("has RLS enabled on all twelve business tables", async () => {
    const result = await db.query("select relname from pg_class join pg_namespace on pg_class.relnamespace = pg_namespace.oid where nspname = 'public' and relkind = 'r' and relrowsecurity");
    expect(result.rows).toHaveLength(12);
  });
  it("denies direct anonymous table reads", async () => {
    await db.exec("set local role anon");
    await expect(db.query("select * from products")).rejects.toThrow(/permission denied/i);
  });
  it("allows the server service role to read through RLS", async () => {
    await db.exec("set local role service_role");
    expect((await db.query("select id from products")).rows).toHaveLength(1);
  });
  it("can run the seed repeatedly without duplicating inputs", async () => {
    await db.exec(seed);
    expect((await db.query("select id from cases")).rows).toHaveLength(1);
    expect((await db.query("select id from evidence_sources")).rows).toHaveLength(2);
  });
  it("rejects a verified rule with no excerpt or checked date", async () => {
    await expect(db.query("update rules set verification_status = 'verified' where id = 'LAW-US-FTC-001'")).rejects.toThrow(/check constraint/i);
  });
  it("rejects a listing that mislabels Alibaba as B2C", async () => {
    await expect(db.query(`insert into platform_listings(id, product_id, platform, market, locale, segment, fields_json, snapshot_version)
      values ('BAD-ALI', $1, 'alibaba_intl', 'global_b2b', 'en-US', 'b2c', '{}', 'test')`, [demoBundle.product.id])).rejects.toThrow(/check constraint/i);
  });
  it("requires a concrete platform for listing artifacts", async () => {
    await expect(db.query("insert into artifacts(case_id, kind, platform, market, segment) values ($1, 'listing_correction', null, 'US', 'b2c')", [caseId])).rejects.toThrow(/check constraint/i);
  });
  it("does not permit a head without a stored version", async () => {
    await db.query("insert into artifacts(id, case_id, kind, platform, market, segment) values ($1, $2, 'support_reply', 'shopify_us', 'US', 'b2c')", [supportId, caseId]);
    await expect(db.exec("set constraints artifacts_head_version_fk immediate")).rejects.toThrow(/foreign key constraint/i);
  });
  it.each([[supportId, "support_reply"], [listingId, "listing_correction"]])("persists v1 → v2 → v3 for %s (%s)", async (id, kind) => {
    await createArtifact(id, kind);
    for (const version of [2, 3]) {
      await addVersion(id, version);
      await db.query("insert into revision_events(case_id, artifact_id, prompt_text, prompt_locale, from_version, to_version) values ($1, $2, '请保留测试条件', 'zh-CN', $3, $4)", [caseId, id, version - 1, version]);
    }
    await db.query("update artifacts set latest_version = 3 where id = $1", [id]);
    await db.exec("set constraints artifacts_head_version_fk immediate");
    const versions = await db.query<{ version: number; review_status: string }>("select version, review_status from artifact_versions where artifact_id = $1 order by version", [id]);
    expect(versions.rows.map((version) => version.version)).toEqual([1, 2, 3]);
    expect(versions.rows.every((version) => version.review_status === "draft")).toBe(true);
    expect((await db.query("select id from revision_events where artifact_id = $1", [id])).rows).toHaveLength(2);
  });
  it("rejects duplicate version numbers", async () => {
    await createArtifact();
    await expect(addVersion(supportId, 1)).rejects.toThrow(/unique constraint/i);
  });
  it("does not overwrite old generated content", async () => {
    await createArtifact();
    await expect(db.query("update artifact_versions set content_json = '{}' where artifact_id = $1", [supportId])).rejects.toThrow(/immutable/i);
  });
  it("keeps original evidence and listing snapshots immutable", async () => {
    await expect(db.query("update evidence_sources set content = 'Changed' where id = 'SPEC-001'")).rejects.toThrow(/append-only/i);
  });
  it("rejects revisions that skip a version", async () => {
    await createArtifact();
    await addVersion(supportId, 3);
    await expect(db.query("insert into revision_events(case_id, artifact_id, prompt_text, prompt_locale, from_version, to_version) values ($1, $2, 'Shorten', 'en-US', 1, 3)", [caseId, supportId])).rejects.toThrow(/check constraint/i);
  });
  it("does not carry approval into a new version", async () => {
    await createArtifact();
    await db.query("update artifact_versions set review_status = 'approved' where artifact_id = $1 and version = 1", [supportId]);
    await addVersion(supportId, 2);
    const result = await db.query<{ review_status: string }>("select review_status from artifact_versions where artifact_id = $1 and version = 2", [supportId]);
    expect(result.rows[0].review_status).toBe("draft");
  });
  it("binds review decisions to an actual artifact version", async () => {
    await createArtifact();
    const version = (await db.query<{ id: string }>("select id from artifact_versions where artifact_id = $1", [supportId])).rows[0];
    await expect(db.query("insert into artifact_reviews(case_id, artifact_id, artifact_version_id, version, reviewer_role, decision) values ($1, $2, $3, 2, 'support', 'approved')", [caseId, supportId, version.id])).rejects.toThrow(/foreign key constraint/i);
  });
  it("rejects findings linked to a version in another case", async () => {
    await createArtifact();
    const version = (await db.query<{ id: string }>("select id from artifact_versions where artifact_id = $1", [supportId])).rows[0];
    const secondCase = await db.query<{ id: string }>("insert into cases(product_id, channel, feedback_text, feedback_locale, merchant_instruction, merchant_locale) values ($1, 'shopify_us', 'Fixture', 'en-US', 'Investigate', 'en-US') returning id", [demoBundle.product.id]);
    await expect(db.query("insert into findings(case_id, artifact_version_id, category, severity, code, evidence_status, source_ids, explanation_zh, explanation_en) values ($1, $2, 'evidence', 'warning', 'TEST', 'needs_evidence', array['SPEC-001'], '需要证据', 'Needs evidence')", [secondCase.rows[0].id, version.id])).rejects.toThrow(/foreign key constraint/i);
  });
  it("keeps audit history append-only", async () => {
    await db.query("insert into audit_events(case_id, actor_role, action, entity_id) values ($1, 'support', 'test', 'test')", [caseId]);
    await expect(db.query("delete from audit_events")).rejects.toThrow(/append-only/i);
  });
  it("resets twice while preserving the same inputs and human-checked rule records", async () => {
    await createArtifact();
    await db.query("update rules set verification_status = 'verified', excerpt = 'Test fixture excerpt, not an actual source verification', checked_at = now() where id = 'LAW-US-FTC-001'");
    for (let run = 0; run < 2; run++) {
      await db.exec(reset);
      await db.exec(seed);
      expect((await db.query("select id from artifacts")).rows).toHaveLength(0);
      expect((await db.query("select id from cases")).rows).toHaveLength(1);
      expect((await db.query("select id from platform_listings")).rows).toHaveLength(3);
      expect((await db.query("select id from rules where verification_status = 'verified'")).rows).toHaveLength(1);
    }
  });
  it("refuses demo reset if non-synthetic records are present", async () => {
    await db.query("update cases set synthetic = false where id = $1", [caseId]);
    await expect(db.exec(reset)).rejects.toThrow(/Reset refused/i);
  });
});
