import { describe, expect, it } from "vitest";
import {
  artifactSchema, caseBundleSchema, createCaseRequestSchema, findingSchema,
  generationResponseSchema, healthResponseSchema, listingSchema, responseSchema,
  revisionEventSchema, reviseArtifactRequestSchema, reviewArtifactRequestSchema,
  ruleSchema, transcriptionResponseSchema,
} from "@/lib/contracts";
import { z } from "zod";
import { demoBundle } from "@/lib/fixtures/demo";
import { mockGeneratedBundle } from "./fixtures/generation";

const requestId = "00000000-0000-4000-8000-000000000999";
const request = {
  sku: "RL-LAMP-01", channel: "shopify_us", feedbackText: demoBundle.case.feedbackText,
  feedbackLocale: "en-US", merchantInstruction: demoBundle.case.merchantInstruction,
  merchantLocale: "zh-CN", synthetic: true,
};

describe("shared team contracts", () => {
  it.each(["zh-CN", "en-US"])("accepts %s merchant input", (locale) => {
    expect(createCaseRequestSchema.safeParse({ ...request, merchantLocale: locale }).success).toBe(true);
  });
  it.each(["de-DE", "ar-AE"])("does not claim %s as a core instruction locale", (locale) => {
    expect(createCaseRequestSchema.safeParse({ ...request, merchantLocale: locale }).success).toBe(false);
  });
  it("rejects blank instructions and unexpected privileged fields", () => {
    expect(createCaseRequestSchema.safeParse({ ...request, merchantInstruction: "  " }).success).toBe(false);
    expect(createCaseRequestSchema.safeParse({ ...request, approved: true }).success).toBe(false);
  });
  it("requires synthetic inputs for this demo-only MVP", () => {
    expect(createCaseRequestSchema.safeParse({ ...request, synthetic: false }).success).toBe(false);
  });
  it("keeps the original fixture free of fabricated generation or reviews", () => {
    expect(caseBundleSchema.parse(demoBundle).artifacts).toEqual([]);
    expect(demoBundle.audit).toEqual([]);
    expect(demoBundle.listings.map((listing) => listing.platform).sort()).toEqual(["alibaba_intl", "amazon_de", "shopify_us"]);
    expect(demoBundle.rules.every((rule) => rule.status === "needs_rule_verification")).toBe(true);
  });
  it("requires B2B context for Alibaba", () => {
    expect(listingSchema.safeParse({ ...demoBundle.listings[2], segment: "b2c" }).success).toBe(false);
    expect(artifactSchema.safeParse({ ...mockGeneratedBundle.artifacts[3], market: "DE" }).success).toBe(false);
  });
  it("requires a platform for listing correction artifacts", () => {
    expect(artifactSchema.safeParse({ ...mockGeneratedBundle.artifacts[1], platform: null }).success).toBe(false);
  });
  it("requires excerpt and checked date before a rule is verified", () => {
    expect(ruleSchema.safeParse({ ...demoBundle.rules[0], status: "verified" }).success).toBe(false);
    expect(ruleSchema.safeParse({ ...demoBundle.rules[0], status: "verified", excerpt: " ", checkedAt: "2026-10-31T00:00:00Z" }).success).toBe(false);
  });
  it("requires a platform for platform rules", () => {
    expect(ruleSchema.safeParse({ ...demoBundle.rules[2], platform: null }).success).toBe(false);
  });
  it("does not accept unsourced law findings", () => {
    const finding = { id: requestId, caseId: demoBundle.case.id, artifactVersionId: null, listingId: null, category: "market_law", severity: "warning", code: "CLAIM_RISK", sourceIds: ["SPEC-001"], ruleId: null, ruleStatus: null, evidenceStatus: null, originalSpan: "12h", proposedSpan: null, explanationZh: "需要核验", explanationEn: "Needs verification" };
    expect(findingSchema.safeParse(finding).success).toBe(false);
  });
  it.each(["support_reply", "listing_correction"])("uses the same revision contract for %s", (kind) => {
    const artifact = mockGeneratedBundle.artifacts.find((entry) => entry.kind === kind)!;
    const next = reviseArtifactRequestSchema.parse({ promptText: "请缩短内容，保留测试条件。", promptLocale: "zh-CN", expectedVersion: 1 });
    expect(next.expectedVersion).toBe(1);
    const event = { id: requestId, caseId: artifact.caseId, artifactId: artifact.id, promptText: next.promptText, promptLocale: next.promptLocale, fromVersion: 1, toVersion: 3, createdAt: "2026-10-31T00:00:00Z" };
    expect(revisionEventSchema.safeParse(event).success).toBe(false);
    expect(revisionEventSchema.safeParse({ ...event, toVersion: 2 }).success).toBe(true);
  });
  it("requires version-bound review, including explicit rejection", () => {
    const review = { decision: "rejected", reviewerRole: "compliance", comment: "Missing source" };
    expect(reviewArtifactRequestSchema.safeParse(review).success).toBe(false);
    expect(reviewArtifactRequestSchema.safeParse({ ...review, version: 2 }).success).toBe(true);
  });
  it("does not allow a failure envelope to carry a successful draft", () => {
    const schema = responseSchema(z.object({ draft: z.string() }));
    expect(schema.safeParse({ ok: false, data: { draft: "fake" }, error: { code: "MODEL_TIMEOUT", message: "Try again", retryable: true }, requestId }).success).toBe(false);
  });
  it("validates the three distinct listing formats and support contract mock", () => {
    const { artifacts, versions } = mockGeneratedBundle;
    const response = generationResponseSchema.parse({ ok: true, data: { caseId: demoBundle.case.id, artifacts, versions, findings: [] }, error: null, requestId });
    expect(response.ok).toBe(true);
    expect(new Set(versions.map((version) => version.content.format)).size).toBe(4);
  });
  it("rejects a Shopify-format version substituted into an Alibaba artifact", () => {
    const bundle = structuredClone(mockGeneratedBundle);
    bundle.versions[3].content = bundle.versions[1].content;
    expect(caseBundleSchema.safeParse(bundle).success).toBe(false);
  });
  it("rejects an English Amazon draft mislabeled as publication-ready localized content", () => {
    const bundle = structuredClone(mockGeneratedBundle);
    if (bundle.versions[2].content.format === "amazon_listing") bundle.versions[2].content.internalBrief = false;
    expect(caseBundleSchema.safeParse(bundle).success).toBe(false);
  });
  it("rejects versions citing sources not present in the retrieved context", () => {
    const bundle = structuredClone(mockGeneratedBundle);
    bundle.versions[0].sourceIds = ["INVENTED-SOURCE"];
    expect(caseBundleSchema.safeParse(bundle).success).toBe(false);
  });
  it("requires transcription confirmation before workflow submission", () => {
    const result = { ok: true, data: { text: "请分析这条投诉", locale: "zh-CN", requiresConfirmation: false }, error: null, requestId };
    expect(transcriptionResponseSchema.safeParse(result).success).toBe(false);
    expect(transcriptionResponseSchema.safeParse({ ...result, data: { ...result.data, requiresConfirmation: true } }).success).toBe(true);
  });
  it("reports missing services honestly in the health contract", () => {
    expect(healthResponseSchema.safeParse({ ok: true, data: { stage: "foundation", status: "degraded", database: "not_configured", generation: "not_configured", transcription: "not_configured" }, error: null, requestId }).success).toBe(true);
  });
});
