import type { SupabaseClient } from "@supabase/supabase-js";
import type { CaseBundle } from "@/lib/contracts";
import { compareListingEvidence } from "@/lib/rules/evidence";

// Preserve the merged Person 3 evidence-only persistence before AI analysis.
export async function saveEvidenceAnalysis(db: SupabaseClient, bundle: CaseBundle) {
  const items = bundle.listings.filter((listing) => listing.numericClaim).map((listing) => {
    const candidates = bundle.evidence.filter((source) => source.kind === "specification" && source.numericClaim?.metric === listing.numericClaim?.metric);
    const statuses = candidates.map((source) => ({ source, status: compareListingEvidence(listing, source) }));
    const match = statuses.find((entry) => entry.status === "documented_mismatch") ?? statuses.find((entry) => entry.status === "supported");
    const status = match?.status ?? "needs_evidence";
    return { listingId: listing.id, status, code: "BATTERY_RUNTIME_" + status.toUpperCase(),
      severity: status === "supported" ? "info" : "warning",
      sourceIds: [listing.id, ...(match ? [match.source.id] : [])],
      explanationZh: status === "documented_mismatch" ? "商品描述与产品证据不一致。" : status === "supported" ? "商品描述与记录的产品证据一致。" : "缺少可比较的产品证据。",
      explanationEn: status === "documented_mismatch" ? "The listing conflicts with documented product evidence." : status === "supported" ? "The listing matches documented product evidence." : "Comparable product evidence is missing." };
  });
  const saved = await db.rpc("reloop_save_evidence_findings", { p_case_id: bundle.case.id, p_findings: items });
  if (saved.error) throw new Error("Database evidence write failed");
}
