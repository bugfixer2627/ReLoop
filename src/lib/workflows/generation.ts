import type { SupabaseClient } from "@supabase/supabase-js";
import { getCaseBundle } from "@/lib/db/cases";
import { createArtifactVersion } from "@/lib/db/workflows";
import type { CaseBundle, Platform } from "@/lib/contracts";
import { checkGeneratedContent, checkListingEvidence } from "@/lib/rules/checker";
import { getAiAdapter, ProviderError } from "@/lib/ai/openai-compatible";

const platforms: Platform[] = ["shopify_us", "amazon_de", "alibaba_intl"];

function sourceIds(bundle: CaseBundle) {
  return [...new Set([
    ...bundle.evidence.map((source) => source.id),
    ...bundle.listings.map((listing) => listing.id),
    ...bundle.rules.map((rule) => rule.id),
  ])];
}

export function validationStatus(bundle: CaseBundle, findings: { category: string; evidence_status?: string | null }[] = []) {
  if (findings.some((finding) => finding.category === "evidence" && ["needs_evidence", "unverified_observation"].includes(finding.evidence_status ?? ""))) return "needs_evidence" as const;
  return bundle.rules.some((rule) => rule.status === "needs_rule_verification")
    ? "needs_rule_verification" as const
    : "checked" as const;
}

async function reload(db: SupabaseClient, caseId: string) {
  const bundle = await getCaseBundle(db, caseId);
  if (!bundle) throw new Error("Case disappeared after workflow write");
  return bundle;
}

export async function generateAnalysis(db: SupabaseClient, bundle: CaseBundle) {
  const existing = bundle.artifacts.find((artifact) => artifact.kind === "investigation_summary");
  if (existing) return bundle;
  const adapter = getAiAdapter();
  if (!adapter) throw new ProviderError("NOT_CONFIGURED", 503, false);
  await adapter.extract(bundle);
  const content = await adapter.summarize(bundle, bundle.case.merchantLocale);
  const findings = [...checkListingEvidence(bundle), ...checkGeneratedContent(bundle, content)];
  await createArtifactVersion(db, {
    caseId: bundle.case.id,
    kind: "investigation_summary",
    platform: null,
    market: "internal",
    segment: "internal",
    locale: bundle.case.merchantLocale,
    languageStatus: "beta",
    content,
    sourceIds: sourceIds(bundle),
    validationStatus: validationStatus(bundle, findings),
    findings,
  });
  return reload(db, bundle.case.id);
}

export async function generateSupport(db: SupabaseClient, bundle: CaseBundle) {
  const existing = bundle.artifacts.find((artifact) => artifact.kind === "support_reply");
  if (existing) return bundle;
  const adapter = getAiAdapter();
  if (!adapter) throw new ProviderError("NOT_CONFIGURED", 503, false);
  const content = await adapter.generateSupport(bundle);
  const findings = checkGeneratedContent(bundle, content);
  await createArtifactVersion(db, {
    caseId: bundle.case.id,
    kind: "support_reply",
    platform: "shopify_us",
    market: "US",
    segment: "b2c",
    locale: "en-US",
    languageStatus: "beta",
    content,
    sourceIds: sourceIds(bundle),
    validationStatus: validationStatus(bundle, findings),
    findings,
  });
  return reload(db, bundle.case.id);
}

export async function generateRepair(db: SupabaseClient, bundle: CaseBundle) {
  const adapter = getAiAdapter();
  if (!adapter) throw new ProviderError("NOT_CONFIGURED", 503, false);
  for (const platform of platforms) {
    if (bundle.artifacts.some((artifact) => artifact.kind === "listing_correction" && artifact.platform === platform)) continue;
    const content = await adapter.generateListing(bundle, platform);
    const listing = bundle.listings.find((item) => item.platform === platform);
    if (!listing) throw new Error("Listing snapshot is missing");
    await createArtifactVersion(db, {
      caseId: bundle.case.id,
      kind: "listing_correction",
      platform,
      market: listing.market,
      segment: listing.segment,
      locale: platform === "amazon_de" ? "en-US" : "en-US",
      languageStatus: "beta",
      content,
      sourceIds: [listing.id, ...bundle.evidence.map((source) => source.id), ...bundle.rules.map((rule) => rule.id)],
      validationStatus: validationStatus(bundle, [...checkListingEvidence(bundle, listing.id), ...checkGeneratedContent(bundle, content, listing.id)]),
      findings: [...checkListingEvidence(bundle, listing.id), ...checkGeneratedContent(bundle, content, listing.id)],
    });
  }
  return reload(db, bundle.case.id);
}
