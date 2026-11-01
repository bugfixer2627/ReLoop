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
  const operationsMigration = await readFile(new URL("../supabase/migrations/202610310003_case_operations.sql", import.meta.url), "utf8");
  seed = await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8");
  reset = await readFile(new URL("../supabase/reset.sql", import.meta.url), "utf8");
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  await db.exec(`begin; ${migration} ${skuMigration} ${operationsMigration} ${seed} commit;`);
}, 60000);

beforeEach(async () => { await db.exec("begin"); });
afterEach(async () => { await db.exec("rollback"); });
afterAll(async () => { await db?.close(); });

describe("PostgreSQL foundation migration and persistence invariants", () => {
  it("saves evidence findings idempotently and rejects unrelated sources", async () => {
    const finding = [{ listingId: "LIST-SHOP-001", code: "BATTERY_RUNTIME_DOCUMENTED_MISMATCH", severity: "warning", status: "documented_mismatch", sourceIds: ["LIST-SHOP-001", "SPEC-001"], explanationZh: "不一致", explanationEn: "Mismatch" }];
    await db.query("select reloop_save_evidence_findings($1, $2::jsonb)", [caseId, JSON.stringify(finding)]);
    await db.query("select reloop_save_evidence_findings($1, $2::jsonb)", [caseId, JSON.stringify(finding)]);
    expect((await db.query("select id from findings where case_id = $1", [caseId])).rows).toHaveLength(1);
    finding[0].sourceIds = ["invented"];
    await expect(db.query("select reloop_save_evidence_findings($1, $2::jsonb)", [caseId, JSON.stringify(finding)])).rejects.toThrow(/invalid source/);
  });
  it("saves and updates tasks with audit history", async () => {
    const task = { assignedRole: "qa", kind: "qa_investigation", title: "Investigate", description: "Check conditions", state: "open", sourceIds: ["SPEC-001"] };
    const first = await db.query<{ result: { task: { id: string } } }>("select reloop_upsert_task($1, $2::jsonb) as result", [caseId, JSON.stringify(task)]);
    await db.query("select reloop_upsert_task($1, $2::jsonb)", [caseId, JSON.stringify({ ...task, taskId: first.rows[0].result.task.id, state: "done" })]);
    expect((await db.query("select id from audit_events where case_id = $1", [caseId])).rows).toHaveLength(2);
    expect((await db.query<{ state: string }>("select state from tasks where id = $1", [first.rows[0].result.task.id])).rows[0].state).toBe("done");
  });
  it("saves a revision atomically and blocks stale or unvalidated approval", async () => {
    await createArtifact();
    const revision = { expectedVersion: 1, promptText: "Shorten", promptLocale: "en-US" };
    const version = { locale: "en-US", languageStatus: "beta", content: { format: "support_reply", subject: "Updated", body: "Updated reply" }, sourceIds: ["SPEC-001"], validationStatus: "pending" };
    await db.query("select reloop_save_revision($1, $2::jsonb, $3::jsonb, $4::jsonb)", [supportId, JSON.stringify(revision), JSON.stringify(version), "[]"]);
    expect((await db.query("select id from artifact_versions where artifact_id = $1", [supportId])).rows).toHaveLength(2);
    await expect(db.query("select reloop_review_artifact($1, $2::jsonb)", [supportId, JSON.stringify({ version: 2, decision: "approved", reviewerRole: "support", comment: "" })])).rejects.toThrow(/review blocked/);
  });
  it("reviews the exact checked version and creates an audit event", async () => {
    await createArtifact();
    await db.query("update artifact_versions set validation_status = 'checked' where artifact_id = $1", [supportId]);
    await db.query("select reloop_review_artifact($1, $2::jsonb)", [supportId, JSON.stringify({ version: 1, decision: "approved", reviewerRole: "support", comment: "OK" })]);
    expect((await db.query<{ review_status: string }>("select review_status from artifact_versions where artifact_id = $1", [supportId])).rows[0].review_status).toBe("approved");
    expect((await db.query("select id from artifact_reviews where artifact_id = $1", [supportId])).rows).toHaveLength(1);
    expect((await db.query("select id from audit_events where case_id = $1", [caseId])).rows).toHaveLength(1);
  });
  it("allows requests for changes and rejection while blocking unverified approval, invalid roles and stale reviews", async () => {
    await createArtifact();
    await db.query("update artifact_versions set validation_status = 'needs_rule_verification' where artifact_id = $1", [supportId]);
    const review = (decision: string, reviewerRole = "support", version = 1) => db.query(
      "select reloop_review_artifact($1, $2::jsonb)",
      [supportId, JSON.stringify({ version, decision, reviewerRole, comment: "Rule source needs verification." })],
    );

    await db.exec("savepoint before_blocked_approval");
    await expect(review("approved")).rejects.toThrow(/review blocked/);
    await db.exec("rollback to savepoint before_blocked_approval");

    for (const decision of ["changes_requested", "rejected"]) {
      await review(decision);
      expect((await db.query<{ review_status: string }>(
        "select review_status from artifact_versions where artifact_id = $1 and version = 1", [supportId],
      )).rows[0].review_status).toBe(decision);
    }

    await db.exec("savepoint before_invalid_review");
    await expect(review("rejected", "qa")).rejects.toThrow(/review role not allowed/);
    await db.exec("rollback to savepoint before_invalid_review");
    await expect(review("rejected", "support", 2)).rejects.toThrow(/stale version/);
    await db.exec("rollback to savepoint before_invalid_review");

    expect((await db.query("select id from artifact_reviews where artifact_id = $1", [supportId])).rows).toHaveLength(2);
    expect((await db.query("select id from audit_events where case_id = $1", [caseId])).rows).toHaveLength(2);
  });
  it("rejects stale revisions and rolls back invalid source writes", async () => {
    await createArtifact();
    const revision = { expectedVersion: 1, promptText: "Shorten", promptLocale: "en-US" };
    const version = { locale: "en-US", languageStatus: "beta", content: { format: "support_reply", subject: "Updated", body: "Updated reply" }, sourceIds: ["SPEC-001"], validationStatus: "checked" };
    await db.query("select reloop_save_revision($1, $2::jsonb, $3::jsonb, $4::jsonb)", [supportId, JSON.stringify(revision), JSON.stringify(version), "[]"]);
    await db.exec("savepoint before_failure");
    await expect(db.query("select reloop_save_revision($1, $2::jsonb, $3::jsonb, $4::jsonb)", [supportId, JSON.stringify(revision), JSON.stringify(version), "[]"])).rejects.toThrow(/stale version/);
    await db.exec("rollback to savepoint before_failure");
    await expect(db.query("select reloop_save_revision($1, $2::jsonb, $3::jsonb, $4::jsonb)", [supportId, JSON.stringify({ ...revision, expectedVersion: 2 }), JSON.stringify({ ...version, sourceIds: ["invented"] }), "[]"])).rejects.toThrow(/invalid source/);
    await db.exec("rollback to savepoint before_failure");
    expect((await db.query<{ latest_version: number }>("select latest_version from artifacts where id = $1", [supportId])).rows[0].latest_version).toBe(2);
    expect((await db.query("select id from artifact_versions where artifact_id = $1", [supportId])).rows).toHaveLength(2);
  });
  it("denies anonymous execution of transactional operations", async () => {
    await db.exec("set local role anon");
    await expect(db.query("select reloop_upsert_task($1, '{}'::jsonb)", [caseId])).rejects.toThrow(/permission denied/i);
  });
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
