import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { demoBundle } from "@/lib/fixtures/demo";
import { sqlClient } from "./helpers/sql-client";
import { caseBundleResponseSchema, generationResponseSchema, revisionResponseSchema, type CaseBundle } from "@/lib/contracts";

// Only the server-only marker and DB transport are substituted. AI HTTP is REAL.
// No hosted database writes. Normal npm test skips this opt-in suite.
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/db/client", () => ({ getDatabaseClient: () => state.client }));
import { POST as create } from "@/app/api/cases/route";
import { GET as load } from "@/app/api/cases/[id]/route";
import { POST as analyze } from "@/app/api/cases/[id]/analyze/route";
import { POST as support } from "@/app/api/cases/[id]/support/route";
import { POST as repair } from "@/app/api/cases/[id]/repair/route";
import { POST as revise } from "@/app/api/artifacts/[id]/revise/route";
import { POST as review } from "@/app/api/artifacts/[id]/review/route";
import { POST as task } from "@/app/api/cases/[id]/tasks/route";

describe.skipIf(process.env.RELOOP_LIVE_PROVIDER_TESTS !== "1")("REAL AI + local SQL workflow replays (not hosted/browser demos)", () => {
  let db: PGlite;
  let originalFetch: typeof fetch;
  type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
  async function call(handler: Handler, id: string, body?: unknown) {
    return handler(new Request("http://localhost/api/live-test/" + id, {
      method: body === undefined ? "GET" : "POST",
      headers: { authorization: "Bearer " + process.env.DEMO_ACCESS_TOKEN, origin: "http://localhost", "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), { params: Promise.resolve({ id }) });
  }
  async function bundle(id: string): Promise<CaseBundle> {
    const response = await call(load, id);
    const parsed = caseBundleResponseSchema.parse(await response.json());
    if (!parsed.ok) throw new Error(parsed.error.code);
    return parsed.data;
  }
  beforeAll(async () => {
    if (!process.env.DEMO_ACCESS_TOKEN) process.env.DEMO_ACCESS_TOKEN = "live-local-test-token-".padEnd(40, "x");
    db = new PGlite();
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    const directory = new URL("../supabase/migrations/", import.meta.url);
    for (const name of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(name, directory), "utf8"));
    state.client = sqlClient(db);
    originalFetch = globalThis.fetch;
    // Observe actual provider responses; do not substitute any response.
    // Only generated content from this synthetic fixture is saved, never headers.
    globalThis.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      if (String(input).startsWith(process.env.LLM_BASE_URL + "/chat/completions")) {
        const raw = await response.clone().json().catch(() => null);
        const folder = new URL("../test-results/", import.meta.url);
        await mkdir(folder, { recursive: true });
        const prompt = JSON.parse(String(init?.body));
        const stage = prompt.messages[0].content.startsWith("Extract") ? "extract" : "generate";
        await writeFile(new URL(`live-response-${stage}-${Date.now()}.json`, folder), JSON.stringify({ status: response.status, choices: raw?.choices, model: raw?.model }, null, 2));
      }
      return response;
    };
  }, 60000);
  afterAll(async () => { if (originalFetch) globalThis.fetch = originalFetch; await db?.close(); });

  it.each(["zh-CN", "en-US"] as const)("performs real extraction/generation/revision from %s input and reloads local saved results", async (locale) => {
    const reset = await readFile(new URL("../supabase/reset.sql", import.meta.url), "utf8");
    const seed = await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8");
    await db.exec(`begin; ${reset} ${seed} commit;`);
    const created = await call(create, "new", {
      sku: "RL-LAMP-01", channel: "shopify_us", feedbackText: demoBundle.case.feedbackText,
      feedbackLocale: "en-US", merchantLocale: locale, synthetic: true,
      merchantInstruction: locale === "zh-CN" ? demoBundle.case.merchantInstruction : "Investigate the customer report, preserve uncertainty and compare all three listing snapshots against documented test conditions.",
    });
    expect(created.status).toBe(201);
    const caseId = (await created.json()).data.caseId as string;
    const attempts: { stage: string; attempt: number; result: string }[] = [];
    for (const [stage, handler] of [["analyze", analyze], ["support", support], ["repair", repair]] as const) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        const response = await call(handler, caseId, {});
        const result = generationResponseSchema.parse(await response.json());
        attempts.push({ stage, attempt, result: result.ok ? "saved" : result.error.code });
        if (result.ok) { expect(response.status).toBe(200); break; }
        if (attempt === 2 || !result.error.retryable) throw new Error("Live " + stage + " failed: " + result.error.code);
        console.log("Retrying transient live provider failure in", stage);
      }
    }
    let saved = await bundle(caseId);
    expect(saved.artifacts).toHaveLength(5);
    expect(saved.artifacts.every((item) => item.caseId === caseId)).toBe(true);
    const summary = saved.versions.find((item) => item.content.format === "investigation_summary")!;
    if (locale === "zh-CN") expect(/[\u3400-\u9fff]/.test(JSON.stringify(summary.content))).toBe(true);
    expect(saved.versions.some((item) => item.content.format === "amazon_listing" && item.content.internalBrief)).toBe(true);
    expect(saved.versions.every((item) => item.sourceIds.includes("SPEC-001"))).toBe(true);
    expect(saved.versions.every((item) => item.validationStatus !== "checked")).toBe(true);
    const artifact = saved.artifacts.find((item) => item.kind === "support_reply")!;
    const original = saved.versions.find((item) => item.artifactId === artifact.id)!.content;
    for (const [expectedVersion, promptLocale, promptText] of [[1, "zh-CN", "请简化英文回复，保留需要客户确认测试条件的要求，不承诺退款或已确认缺陷。"], [2, "en-US", "Make the English reply concise and polite; preserve uncertainty and do not invent commitments."]] as const) {
      const response = await call(revise, artifact.id, { expectedVersion, promptLocale, promptText });
      const result = revisionResponseSchema.parse(await response.json());
      if (!result.ok) throw new Error("Live revision failed: " + result.error.code);
      expect(response.status).toBe(200);
    }
    expect((await call(review, artifact.id, { version: 3, decision: "approved", reviewerRole: "support", comment: "Must remain blocked with unverified rules" })).status).toBe(422);
    expect((await call(review, artifact.id, { version: 3, decision: "changes_requested", reviewerRole: "support", comment: "Verify rule sources" })).status).toBe(200);
    expect((await call(task, caseId, { assignedRole: "qa", kind: "qa_investigation", title: "Check the reported runtime", description: "Confirm operating conditions; no defect is established.", state: "open", sourceIds: ["SPEC-001"] })).status).toBe(200);
    saved = await bundle(caseId);
    expect(saved.versions.filter((item) => item.artifactId === artifact.id)).toHaveLength(3);
    expect(saved.versions.find((item) => item.artifactId === artifact.id && item.version === 1)!.content).toEqual(original);
    expect(saved.revisions).toHaveLength(2);
    expect(saved.tasks).toHaveLength(1);
    expect(saved.audit).toHaveLength(9);
    const results = new URL("../test-results/", import.meta.url);
    await mkdir(results, { recursive: true });
    await writeFile(new URL(`live-ai-${locale}-${Date.now()}.json`, results), JSON.stringify({ provider: new URL(process.env.LLM_BASE_URL!).host, model: process.env.LLM_MODEL, providerCalls: "real", database: "isolated PGlite; no hosted writes", attempts, bundle: saved }, null, 2));
  }, 360000);
});
