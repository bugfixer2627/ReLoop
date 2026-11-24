import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { demoBundle } from "@/lib/fixtures/demo";
import { mockGeneratedBundle } from "./fixtures/generation";
import { sqlClient } from "./helpers/sql-client";
import { caseBundleResponseSchema, generationResponseSchema, revisionResponseSchema, reviewResponseSchema, taskResponseSchema } from "@/lib/contracts";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/db/client", () => ({ getDatabaseClient: () => state.client }));
import { GET as list, POST as create } from "@/app/api/cases/route";
import { GET as load } from "@/app/api/cases/[id]/route";
import { POST as analyze } from "@/app/api/cases/[id]/analyze/route";
import { POST as support } from "@/app/api/cases/[id]/support/route";
import { POST as repair } from "@/app/api/cases/[id]/repair/route";
import { POST as revise } from "@/app/api/artifacts/[id]/revise/route";
import { POST as review } from "@/app/api/artifacts/[id]/review/route";
import { POST as task } from "@/app/api/cases/[id]/tasks/route";
import { AUTH_SESSION_COOKIE, createAuthSession } from "@/lib/server/access";

let db: PGlite;
let seed: string;
let reset: string;
let failure = "";
const token = "integration-test-token-".padEnd(40, "x");
type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
async function call(handler: Handler, id: string, body?: unknown, userId?: string) {
  const headers = new Headers({ origin: "http://localhost", "content-type": "application/json" });
  if (userId) headers.set("cookie", `${AUTH_SESSION_COOKIE}=${createAuthSession(userId)}`);
  else headers.set("authorization", `Bearer ${token}`);
  return handler(new Request(`http://localhost/api/test/${id}`, {
    method: body === undefined ? "GET" : "POST",
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), { params: Promise.resolve({ id }) });
}
async function bundle(id: string, userId?: string) {
  const response = await call(load, id, undefined, userId);
  expect(response.status).toBe(200);
  const parsed = caseBundleResponseSchema.parse(await response.json());
  if (!parsed.ok) throw new Error(parsed.error.code);
  return parsed.data;
}
async function newCase(locale = "zh-CN", sku = "RL-LAMP-01", userId?: string) {
  const response = await call(create, "new", { sku, channel: "shopify_us", feedbackText: demoBundle.case.feedbackText, feedbackLocale: "en-US", merchantInstruction: locale === "zh-CN" ? demoBundle.case.merchantInstruction : "Investigate the complaint and compare documented conditions.", merchantLocale: locale, synthetic: true }, userId);
  return { response, body: await response.json() };
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  const directory = new URL("../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(name, directory), "utf8"));
  seed = await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8");
  reset = await readFile(new URL("../supabase/reset.sql", import.meta.url), "utf8");
  await db.exec(seed);
}, 60000);
beforeEach(async () => {
  failure = "";
  state.client = sqlClient(db);
  vi.stubEnv("DEMO_ACCESS_TOKEN", token);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "embedded-test-signing-key");
  vi.stubEnv("LLM_PROVIDER", "openai_compatible");
  vi.stubEnv("LLM_BASE_URL", "https://provider-test.invalid/v1");
  vi.stubEnv("LLM_API_KEY", "test-only");
  vi.stubEnv("LLM_MODEL", "mock-http-model");
  vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
    const prompt = JSON.parse(String(init?.body));
    const instruction = prompt.messages[0].content as string;
    if (failure === "timeout") throw new DOMException("Test timeout", "TimeoutError");
    if (failure === "rate") return Response.json({}, { status: 429 });
    if (failure === "invalid") return Response.json({ choices: [{ message: { content: "invalid-json" } }] });
    if (failure === "amazon" && instruction.includes("Draft only the amazon_de")) return Response.json({}, { status: 500 });
    let content: unknown;
    if (instruction.startsWith("Extract")) content = { issue: "Short runtime", customerClaim: null, unknowns: ["operating conditions"] };
    else if (instruction.includes("Revise only")) {
      const current = JSON.parse(prompt.messages[1].content).current;
      const revisedText = failure === "unsafe" ? "We will provide a guaranteed refund; up to 12 hours." : "Please share operating conditions. No defect has been established.";
      content = current.format === "support_reply" ? { ...current, body: revisedText } : { ...current, description: revisedText };
    } else if (instruction.includes("investigation_summary")) content = { format: "investigation_summary", summary: "规格记录四小时；客户观察尚未验证。", unknowns: ["客户测试条件"] };
    else if (instruction.includes("Draft only")) {
      const platform = instruction.includes("amazon_de") ? "amazon_de" : instruction.includes("alibaba_intl") ? "alibaba_intl" : "shopify_us";
      const artifact = mockGeneratedBundle.artifacts.find((item) => item.platform === platform && item.kind === "listing_correction")!;
      content = mockGeneratedBundle.versions.find((item) => item.artifactId === artifact.id)!.content;
    } else content = mockGeneratedBundle.versions[0].content;
    return Response.json({ choices: [{ message: { content: JSON.stringify(content) } }] });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
afterAll(async () => { await db.close(); });

describe("real local SQL + actual API handlers + MOCK provider HTTP", () => {
  it.each(["zh-CN", "en-US"])("replays connected workflows after isolated reset: %s", async (locale) => {
    await db.exec(`begin; ${reset} ${seed} commit;`);
    const created = await newCase(locale);
    expect(created.response.status).toBe(201);
    const id = created.body.data.caseId;
    for (const handler of [analyze, support, repair]) {
      const response = await call(handler, id, {});
      expect(response.status).toBe(200);
      expect(generationResponseSchema.parse(await response.json()).ok).toBe(true);
    }
    let saved = await bundle(id);
    expect(saved.artifacts).toHaveLength(5);
    expect(saved.artifacts.every((item) => item.caseId === id)).toBe(true);
    expect(saved.findings.some((item) => item.category === "market_law")).toBe(true);
    expect(saved.findings.some((item) => item.category === "platform_rule")).toBe(true);
    const artifact = saved.artifacts.find((item) => item.kind === "support_reply")!;
    const original = saved.versions.find((item) => item.artifactId === artifact.id)!.content;
    failure = "unsafe";
    let result = await call(revise, artifact.id, { promptText: "请保留证据并修改回复", promptLocale: "zh-CN", expectedVersion: 1 });
    expect(result.status).toBe(200);
    expect(revisionResponseSchema.parse(await result.json()).ok).toBe(true);
    saved = await bundle(id);
    expect(saved.versions.find((item) => item.artifactId === artifact.id && item.version === 2)!.validationStatus).toBe("needs_evidence");
    failure = "";
    result = await call(revise, artifact.id, { promptText: "Remove unsupported commitments and shorten.", promptLocale: "en-US", expectedVersion: 2 });
    expect(result.status).toBe(200);
    expect(revisionResponseSchema.parse(await result.json()).ok).toBe(true);
    saved = await bundle(id);
    expect(saved.versions.filter((item) => item.artifactId === artifact.id).map((item) => item.version).sort()).toEqual([1, 2, 3]);
    expect(saved.versions.find((item) => item.artifactId === artifact.id && item.version === 1)!.content).toEqual(original);
    expect(saved.versions.find((item) => item.artifactId === artifact.id && item.version === 3)!.validationStatus).toBe("needs_rule_verification");
    expect(saved.revisions).toHaveLength(2);
    expect((await call(revise, artifact.id, { promptText: "Stale edit", promptLocale: "en-US", expectedVersion: 1 })).status).toBe(409);
    failure = "timeout";
    expect((await call(revise, artifact.id, { promptText: "Fail safely", promptLocale: "en-US", expectedVersion: 3 })).status).toBe(504);
    expect((await bundle(id)).artifacts.find((item) => item.id === artifact.id)!.latestVersion).toBe(3);
    failure = "";
    expect((await call(review, artifact.id, { version: 3, decision: "approved", reviewerRole: "support", comment: "Not yet verified" })).status).toBe(422);
    expect((await call(review, artifact.id, { version: 3, decision: "rejected", reviewerRole: "marketing", comment: "Wrong role" })).status).toBe(400);
    result = await call(review, artifact.id, { version: 3, decision: "changes_requested", reviewerRole: "support", comment: "Verify rule sources" });
    expect(result.status).toBe(200);
    expect(reviewResponseSchema.parse(await result.json()).ok).toBe(true);
    result = await call(task, id, { assignedRole: "qa", kind: "qa_investigation", title: "Investigate reported runtime", description: "Confirm conditions; no defect is established.", state: "open", sourceIds: ["SPEC-001"] });
    expect(result.status).toBe(200);
    expect(taskResponseSchema.parse(await result.json()).ok).toBe(true);
    saved = await bundle(id);
    expect(saved.tasks).toHaveLength(1);
    expect(saved.audit.some((item) => item.action === "artifact_reviewed")).toBe(true);
    expect(saved.audit.filter((item) => item.action === "artifact_generated")).toHaveLength(5);
    expect(saved.audit.filter((item) => item.action === "artifact_revised")).toHaveLength(2);
    expect(saved.audit.some((item) => item.action === "task_upserted")).toBe(true);
    expect(saved.versions.find((item) => item.artifactId === artifact.id && item.version === 3)!.reviewStatus).toBe("changes_requested");
  });

  it("retries a partial platform generation without duplicating saved outputs", async () => {
    const { body } = await newCase();
    const id = body.data.caseId;
    failure = "amazon";
    expect((await call(repair, id, {})).status).toBe(502);
    expect((await bundle(id)).artifacts).toHaveLength(1);
    failure = "";
    expect((await call(repair, id, {})).status).toBe(200);
    expect((await bundle(id)).artifacts).toHaveLength(3);
    expect((await call(repair, id, {})).status).toBe(200);
    expect((await bundle(id)).versions).toHaveLength(3);
  });

  it.each([["invalid", 502], ["rate", 429], ["timeout", 504]] as const)("preserves saved data on provider %s", async (mode, status) => {
    const { body } = await newCase();
    const id = body.data.caseId;
    failure = mode;
    expect((await call(support, id, {})).status).toBe(status);
    expect((await bundle(id)).versions).toHaveLength(0);
  });

  it("rejects an unknown SKU and sanitizes an actual SQL transport failure", async () => {
    expect((await newCase("en-US", "UNKNOWN")).response.status).toBe(404);
    const { body } = await newCase();
    state.client = { from: () => { throw new Error("private database connection"); } };
    const response = await call(load, body.data.caseId);
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("private database");
  });

  it("refuses generation without product evidence or documented test conditions", async () => {
    await db.query("insert into products(sku, name, attributes_json, source_version, synthetic) values ('EMPTY-PRODUCT', 'Test only', '{}', 'test', true)");
    const { body } = await newCase("en-US", "EMPTY-PRODUCT");
    const response = await call(analyze, body.data.caseId, {});
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "NEEDS_EVIDENCE" } });
    expect((await bundle(body.data.caseId)).versions).toHaveLength(0);
  });

  it("persists two listing revisions and keeps a rejected draft after reload", async () => {
    const { body } = await newCase();
    const id = body.data.caseId;
    expect((await call(repair, id, {})).status).toBe(200);
    let saved = await bundle(id);
    const artifact = saved.artifacts.find((item) => item.platform === "shopify_us")!;
    const original = saved.versions.find((item) => item.artifactId === artifact.id)!.content;
    for (const [expectedVersion, promptLocale, promptText] of [[1, "zh-CN", "请保留测试条件"], [2, "en-US", "Shorten the description"]] as const) {
      expect((await call(revise, artifact.id, { expectedVersion, promptLocale, promptText })).status).toBe(200);
    }
    expect((await call(review, artifact.id, { version: 3, decision: "rejected", reviewerRole: "marketing", comment: "Rule checks pending" })).status).toBe(200);
    saved = await bundle(id);
    const versions = saved.versions.filter((item) => item.artifactId === artifact.id);
    expect(versions).toHaveLength(3);
    expect(versions.find((item) => item.version === 1)!.content).toEqual(original);
    expect(versions.find((item) => item.version === 3)!.reviewStatus).toBe("rejected");
    expect(saved.revisions.filter((item) => item.artifactId === artifact.id)).toHaveLength(2);
  });

  it("persists an approved decision only on an explicitly checked local test fixture", async () => {
    // Local DB fixture only: no real rule verification or live approval claimed.
    const { body } = await newCase();
    const id = body.data.caseId;
    expect((await call(support, id, {})).status).toBe(200);
    const artifact = (await bundle(id)).artifacts[0];
    await expect(state.client && (state.client as ReturnType<typeof sqlClient>).rpc("reloop_record_review", { p_case_id: id, p_artifact_id: artifact.id, p_version: 1, p_reviewer_role: "support", p_decision: "approved", p_comment: "Must fail" })).resolves.toMatchObject({ error: { message: "REVIEW_BLOCKED" } });
    await db.query("update artifact_versions set validation_status = 'checked' where artifact_id = $1", [artifact.id]);
    expect((await call(review, artifact.id, { version: 1, decision: "approved", reviewerRole: "support", comment: "Local checked fixture only" })).status).toBe(200);
    expect((await bundle(id)).versions[0].reviewStatus).toBe("approved");
  });

  it("returns one artifact/version/audit for repeated initial RPC allocation", async () => {
    const { body } = await newCase();
    const args = { p_case_id: body.data.caseId, p_kind: "support_reply", p_platform: "shopify_us", p_market: "US", p_segment: "b2c", p_locale: "en-US", p_language_status: "beta", p_content: mockGeneratedBundle.versions[0].content, p_source_ids: ["SPEC-001"], p_validation_status: "needs_rule_verification", p_findings: [] };
    const client = state.client as ReturnType<typeof sqlClient>;
    const [first, second] = await Promise.all([client.rpc("reloop_create_artifact_version", args), client.rpc("reloop_create_artifact_version", args)]);
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data).toEqual(second.data);
    const saved = await bundle(body.data.caseId);
    expect(saved.artifacts).toHaveLength(1);
    expect(saved.versions).toHaveLength(1);
    expect(saved.audit.filter((item) => item.action === "artifact_generated")).toHaveLength(1);
  });
});

describe("separate demo accounts and Shopify draft sign-off", () => {
  const merchant = "10000000-0000-4000-8000-000000000001";
  const otherMerchant = "10000000-0000-4000-8000-000000000002";

  it("keeps each account's cases and their workflow records private", async () => {
    const first = await newCase("en-US", "RL-LAMP-01", merchant);
    const second = await newCase("en-US", "RL-LAMP-01", otherMerchant);
    expect(first.response.status).toBe(201);
    expect(second.response.status).toBe(201);
    const firstId = first.body.data.caseId as string;
    const secondId = second.body.data.caseId as string;
    const ownList = await call(list, "list", undefined, merchant);
    expect(ownList.status).toBe(200);
    const ownCases = (await ownList.json()).data.cases as { id: string }[];
    expect(ownCases.map(({ id }) => id)).toContain(firstId);
    expect(ownCases.map(({ id }) => id)).not.toContain(secondId);
    expect((await call(load, secondId, undefined, merchant)).status).toBe(404);
    expect((await call(load, firstId)).status).toBe(404);
    expect((await call(analyze, secondId, {}, merchant)).status).toBe(404);
    expect((await call(analyze, firstId, {}, merchant)).status).toBe(200);
    const draft = (await bundle(firstId, merchant)).artifacts[0];
    expect((await call(revise, draft.id, { expectedVersion: 1, promptText: "Revise", promptLocale: "en-US" }, otherMerchant)).status).toBe(404);
    expect((await call(review, draft.id, { version: 1, decision: "rejected", reviewerRole: "support", comment: "" }, otherMerchant)).status).toBe(404);
  });

  it("records an applicable source review for only the current supported draft", async () => {
    const created = await newCase("en-US", "RL-LAMP-01", merchant);
    const id = created.body.data.caseId as string;
    expect((await call(repair, id, {}, merchant)).status).toBe(200);
    const draft = await bundle(id, merchant);
    const artifact = draft.artifacts.find((item) => item.kind === "listing_correction" && item.platform === "shopify_us")!;
    const ruleChecks = draft.rules
      .filter((rule) => rule.market === "US" && rule.category === "market_law")
      .map(({ id, sourceUrl }) => ({ ruleId: id, sourceUrl }));
    const input = { version: 1, decision: "approved", reviewerRole: "marketing", comment: "Reviewed the attached sources and the supported runtime claim." };
    expect((await call(review, artifact.id, input, merchant)).status).toBe(422);
    expect((await call(review, artifact.id, { ...input, ruleChecks: [{ ...ruleChecks[0], sourceUrl: "https://wrong.example" }] }, merchant)).status).toBe(422);
    expect((await call(review, artifact.id, { ...input, ruleChecks }, otherMerchant)).status).toBe(404);

    const accepted = await call(review, artifact.id, { ...input, ruleChecks }, merchant);
    expect(accepted.status).toBe(200);
    expect((await accepted.json()).data).toMatchObject({
      version: { version: 1, reviewStatus: "approved", validationStatus: "checked" },
      auditEvent: { actorRole: "compliance", payload: { reviewerUserId: merchant, ruleChecks, rationale: input.comment } },
    });

    failure = "unsafe";
    const revision = await call(revise, artifact.id, { expectedVersion: 1, promptText: "Make a stronger claim.", promptLocale: "en-US" }, merchant);
    expect(revision.status).toBe(200);
    expect((await call(review, artifact.id, { ...input, ruleChecks }, merchant)).status).toBe(409);
    expect((await call(review, artifact.id, { ...input, version: 2, ruleChecks }, merchant)).status).toBe(422);
    const reloaded = await bundle(id, merchant);
    expect(reloaded.versions.find((version) => version.artifactId === artifact.id && version.version === 1)?.reviewStatus).toBe("approved");
    expect(reloaded.versions.find((version) => version.artifactId === artifact.id && version.version === 2)?.reviewStatus).toBe("draft");
  });
});
