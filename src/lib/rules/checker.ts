import type { ArtifactContent, CaseBundle } from "@/lib/contracts";
import type { WorkflowFinding } from "@/lib/db/workflows";
import { compareListingEvidence } from "./evidence";

export function checkListingEvidence(bundle: CaseBundle, listingId?: string): WorkflowFinding[] {
  const specification = bundle.evidence.find((source) => source.kind === "specification" && source.numericClaim);
  const listings = bundle.listings.filter((listing) => !listingId || listing.id === listingId);
  const findings: WorkflowFinding[] = [];

  for (const listing of listings) {
    const claim = listing.numericClaim;
    if (!claim) continue;
    const candidates = bundle.evidence.filter((source) => source.kind === "specification" && source.numericClaim?.metric === claim.metric);
    const compared = candidates.map((source) => ({ source, status: compareListingEvidence(listing, source) }));
    const match = compared.find((entry) => entry.status === "documented_mismatch") ?? compared.find((entry) => entry.status === "supported");
    const source = match?.source ?? specification;
    if (match?.status === "documented_mismatch" && source?.numericClaim) {
      findings.push({
        listing_id: listing.id,
        category: "evidence",
        severity: "warning",
        code: "DOCUMENTED_RUNTIME_MISMATCH",
        evidence_status: "documented_mismatch",
        source_ids: [source.id, listing.id],
        original_span: JSON.stringify(claim),
        proposed_span: JSON.stringify(source.numericClaim),
        explanation_zh: `在相同测试条件下，${listing.platform}快照记录${claim.value}${claim.unit}，规格记录${source.numericClaim.value}${source.numericClaim.unit}；需要人工确认。`,
        explanation_en: `Under matching test conditions, the ${listing.platform} snapshot records ${claim.value} ${claim.unit} while the specification records ${source.numericClaim.value} ${source.numericClaim.unit}; confirm before publishing.`,
      });
    } else if (!match) {
      findings.push({
        listing_id: listing.id,
        category: "evidence",
        severity: "info",
        code: "RUNTIME_NEEDS_COMPARABLE_EVIDENCE",
        evidence_status: "needs_evidence",
        source_ids: [...(source ? [source.id] : []), listing.id],
        original_span: JSON.stringify(claim),
        proposed_span: null,
        explanation_zh: `${listing.platform}的运行时间条件与规格条件不完全一致，不能直接判定差异。`,
        explanation_en: `The runtime conditions for ${listing.platform} do not match the specification conditions, so the difference cannot be established.`,
      });
    }
  }

  for (const listing of listings) {
    for (const rule of bundle.rules.filter((candidate) => candidate.category !== "merchant_policy" && (candidate.platform === listing.platform || (candidate.platform === null && candidate.market === listing.market)))) {
      findings.push({
        listing_id: listing.id,
        category: rule.category === "platform_rule" ? "platform_rule" : "market_law",
        severity: "info",
        code: "RULE_REQUIRES_VERIFICATION",
        rule_id: rule.id,
        rule_status: rule.status,
        source_ids: [listing.id, rule.id],
        original_span: null,
        proposed_span: null,
        explanation_zh: "该法律或平台规则仍需使用官方文本和日期核验，不能视为已确认违规。",
        explanation_en: "This law or platform rule still requires verification against current official text and date; it is not a confirmed violation.",
      });
    }
  }
  return findings;
}

export function checkGeneratedContent(bundle: CaseBundle, content: ArtifactContent, listingId?: string): WorkflowFinding[] {
  const specification = bundle.evidence.find((source) => source.kind === "specification" && source.numericClaim);
  const policy = bundle.evidence.find((source) => source.kind === "support_policy");
  const text = JSON.stringify(content);
  const findings: WorkflowFinding[] = [];
  // Inspect every candidate, including Chinese revision output. Checking only
  // the first number lets a later unsupported promise escape revalidation.
  const runtimes = [
    ...text.matchAll(/\b(?:up\s*to|up-to|maximum|max|lasts?(?:\s+for)?)\s*(\d+(?:\.\d+)?)\s*(?:hours?|h)\b/gi),
    ...text.matchAll(/(?:续航|运行时间|电池寿命|最长|长达|最多)\s*(?:可达|为|：|:)?\s*(\d+(?:\.\d+)?)\s*(?:个)?小时/g),
  ];
  for (const runtime of runtimes) {
    if (!specification?.numericClaim || Number(runtime[1]) <= specification.numericClaim.value) continue;
    findings.push({
      listing_id: listingId ?? null,
      category: "evidence",
      severity: "warning",
      code: "UNSUPPORTED_RUNTIME_CLAIM",
      evidence_status: "needs_evidence",
      source_ids: [specification.id],
      original_span: null,
      proposed_span: runtime[0],
      explanation_zh: `生成内容包含${runtime[1]}小时运行时间，但现有规格仅记录${specification.numericClaim.value}小时；需要在相同测试条件下补充证据。`,
      explanation_en: `The generated content claims ${runtime[1]} hours while the available specification records ${specification.numericClaim.value} hours; comparable evidence is required.`,
    });
  }

  const unsupportedCommitment = /\b(?:we\s+will|we\s+can\s+provide|eligible\s+for|includes|guaranteed|certified)\b[^.!?]{0,80}\b(?:refund|replacement|warranty|certification|certificate|price)\b/i.exec(text)
    ?? /\b(?:refund|replacement|warranty|certification|certificate|price)\b[^.!?]{0,80}\b(?:guaranteed|included|approved|will)\b/i.exec(text);
  if (unsupportedCommitment) {
    findings.push({
      listing_id: listingId ?? null,
      category: "evidence",
      severity: "blocker",
      code: "UNSUPPORTED_COMMERCIAL_COMMITMENT",
      evidence_status: "needs_evidence",
      source_ids: policy ? [policy.id] : [specification?.id ?? bundle.evidence[0]?.id ?? "generated-content"],
      original_span: null,
      proposed_span: unsupportedCommitment[0],
      explanation_zh: "生成内容包含退款、替换、保修、认证、价格或类似承诺，现有证据不足以支持该表述。",
      explanation_en: "The generated content contains a refund, replacement, warranty, certification, price, or similar commitment that the retrieved evidence does not support.",
    });
  }
  return findings;
}
