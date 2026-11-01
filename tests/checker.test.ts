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
});
