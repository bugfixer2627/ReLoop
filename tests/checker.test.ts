import { describe, expect, it } from "vitest";
import { demoBundle } from "@/lib/fixtures/demo";
import { checkGeneratedContent, checkListingEvidence } from "@/lib/rules/checker";

describe("deterministic evidence checker", () => {
  it("flags comparable documented listing mismatches without diagnosing the customer", () => {
    const findings = checkListingEvidence(demoBundle, "LIST-SHOP-001");
    expect(findings.some((finding) => finding.code === "DOCUMENTED_RUNTIME_MISMATCH" && finding.evidence_status === "documented_mismatch")).toBe(true);
    expect(findings.every((finding) => finding.category !== "market_law" || finding.rule_status === "needs_rule_verification")).toBe(true);
  });

  it("does not establish a mismatch when test conditions differ", () => {
    const changed = structuredClone(demoBundle);
    changed.listings[0].numericClaim!.conditions.brightness = "low brightness";
    const findings = checkListingEvidence(changed, "LIST-SHOP-001");
    expect(findings.some((finding) => finding.code === "DOCUMENTED_RUNTIME_MISMATCH")).toBe(false);
    expect(findings.some((finding) => finding.code === "RUNTIME_NEEDS_COMPARABLE_EVIDENCE")).toBe(true);
  });

  it("flags generated claims that exceed evidence or make unsupported commitments", () => {
    const findings = checkGeneratedContent(demoBundle, {
      format: "support_reply",
      subject: "Resolution",
      body: "We will provide a guaranteed refund and the lamp runs up to 12 hours.",
    });
    expect(findings.map((finding) => finding.code)).toEqual([
      "UNSUPPORTED_RUNTIME_CLAIM",
      "UNSUPPORTED_COMMERCIAL_COMMITMENT",
    ]);
    expect(findings.every((finding) => finding.category === "evidence" && finding.evidence_status === "needs_evidence")).toBe(true);
    expect(findings.some((finding) => finding.severity === "blocker")).toBe(true);
  });

  it.each(["missing_conditions", "wrong_product", "wrong_version", "unverified", "lower_claim", "missing_source"])("does not infer a documented mismatch from %s", (kind) => {
    const changed = structuredClone(demoBundle);
    const source = changed.evidence.find((item) => item.kind === "specification")!;
    if (kind === "missing_conditions") { source.numericClaim!.conditions = {}; changed.listings[0].numericClaim!.conditions = {}; }
    if (kind === "wrong_product") source.productId = "00000000-0000-4000-8000-000000000999";
    if (kind === "wrong_version") source.sourceVersion += "-other";
    if (kind === "unverified") source.verificationStatus = "needs_evidence";
    if (kind === "lower_claim") changed.listings[0].numericClaim!.value = 2;
    if (kind === "missing_source") changed.evidence = [];
    const findings = checkListingEvidence(changed, changed.listings[0].id);
    expect(findings.some((finding) => finding.evidence_status === "documented_mismatch")).toBe(false);
    expect(findings.some((finding) => finding.evidence_status === "needs_evidence")).toBe(true);
    expect(findings.some((finding) => finding.category === "market_law")).toBe(true);
  });
  it.each(["Runtime is up to 4 hours. Premium mode lasts 12 hours.", "续航4小时，最长12小时。"])("revalidates later unsupported runtime claims: %s", (body) => {
    const findings = checkGeneratedContent(demoBundle, { format: "support_reply", subject: "Draft", body });
    expect(findings.some((finding) => finding.code === "UNSUPPORTED_RUNTIME_CLAIM" && finding.proposed_span?.includes("12"))).toBe(true);
  });
});
