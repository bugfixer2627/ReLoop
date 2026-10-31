import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoBundle } from "@/lib/fixtures/demo";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  getAiAdapter: vi.fn(),
  createArtifactVersion: vi.fn(),
  getCaseBundle: vi.fn(),
}));
vi.mock("@/lib/ai/openai-compatible", () => ({ getAiAdapter: mocks.getAiAdapter }));
vi.mock("@/lib/db/workflows", () => ({ createArtifactVersion: mocks.createArtifactVersion }));
vi.mock("@/lib/db/cases", () => ({ getCaseBundle: mocks.getCaseBundle }));

import { generateAnalysis, generateRepair, generateSupport, validationStatus } from "@/lib/workflows/generation";

const db = {} as never;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getCaseBundle.mockResolvedValue(demoBundle);
  mocks.createArtifactVersion.mockImplementation(async (_db, input) => ({
    artifact_id: "00000000-0000-4000-8000-000000000901",
    version_id: "00000000-0000-4000-8000-000000000902",
    version: 1,
    input,
  }));
  mocks.getAiAdapter.mockReturnValue({
    extract: vi.fn().mockResolvedValue({ issue: "续航问题", customerClaim: null, unknowns: ["brightness"] }),
    summarize: vi.fn().mockResolvedValue({ format: "investigation_summary", summary: "Documented evidence is separated from testimony.", unknowns: ["brightness"] }),
    generateSupport: vi.fn().mockResolvedValue({ format: "support_reply", subject: "Investigation details", body: "Please share the order number and test conditions." }),
    generateListing: vi.fn((context, platform) => Promise.resolve(
      platform === "shopify_us"
        ? { format: "shopify_description", title: "Lamp", description: "Documented description", faq: ["Runtime depends on conditions."] }
        : platform === "amazon_de"
          ? { format: "amazon_listing", title: "Internal review brief", bullets: ["Remove unsupported runtime claim."], description: "English internal brief.", internalBrief: true }
          : { format: "alibaba_b2b", title: "Lamp wholesale", specifications: { runtime: "Documented conditions only" }, benefits: ["Rechargeable"], moq: null, leadTime: null, claimsNotes: ["Verify before use."] },
    )),
    revise: vi.fn(),
  });
});

describe("persisted workflow acceptance paths", () => {
  it("does not mark missing rules or source-only verification as a completed rule check", () => {
    const bundle = structuredClone(demoBundle);
    bundle.rules = [];
    expect(validationStatus(bundle)).toBe("needs_rule_verification");
    bundle.rules = demoBundle.rules.map((rule) => ({ ...rule, status: "verified", excerpt: "Test fixture only", checkedAt: "2026-11-01T00:00:00Z" }));
    expect(validationStatus(bundle)).toBe("needs_rule_verification");
    expect(validationStatus(bundle, [{ category: "market_law", rule_status: "verified", code: "RULE_REQUIRES_VERIFICATION" }])).toBe("needs_rule_verification");
  });
  it("keeps one case ID and preserves Chinese analysis output locale", async () => {
    await generateAnalysis(db, demoBundle);
    const input = mocks.createArtifactVersion.mock.calls[0][1];
    expect(input.caseId).toBe(demoBundle.case.id);
    expect(input.locale).toBe("zh-CN");
    expect(input.kind).toBe("investigation_summary");
    expect(input.sourceIds).toEqual(expect.arrayContaining(["SPEC-001", "LIST-SHOP-001", "LAW-US-FTC-001"]));
  });

  it("generates the English support path with shared case and source IDs", async () => {
    await generateSupport(db, demoBundle);
    const input = mocks.createArtifactVersion.mock.calls[0][1];
    expect(input.caseId).toBe(demoBundle.case.id);
    expect(input.locale).toBe("en-US");
    expect(input.content.format).toBe("support_reply");
    expect(input.sourceIds).toEqual(expect.arrayContaining(demoBundle.evidence.map((source) => source.id)));
  });

  it("creates distinct Shopify, Amazon DE internal brief, and Alibaba B2B outputs", async () => {
    await generateRepair(db, demoBundle);
    const inputs = mocks.createArtifactVersion.mock.calls.map((call) => call[1]);
    expect(inputs).toHaveLength(3);
    expect(inputs.map((input) => input.platform)).toEqual(["shopify_us", "amazon_de", "alibaba_intl"]);
    expect(inputs.map((input) => input.content.format)).toEqual(["shopify_description", "amazon_listing", "alibaba_b2b"]);
    expect(inputs.every((input) => input.caseId === demoBundle.case.id)).toBe(true);
    expect(inputs[1].content.internalBrief).toBe(true);
    expect(inputs.every((input) => input.sourceIds.length >= 3)).toBe(true);
  });
});
