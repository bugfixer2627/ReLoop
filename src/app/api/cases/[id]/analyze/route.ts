import { z } from "zod";
import { findingSchema, generationRequestSchema } from "@/lib/contracts";
import { getDatabaseClient } from "@/lib/db/client";
import { getCaseBundle } from "@/lib/db/cases";
import { compareListingEvidence } from "@/lib/rules/evidence";
import { checkAccess } from "@/lib/server/access";
import { apiFailure, apiSuccess } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = checkAccess(request); if (denied) return denied;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return apiFailure("INVALID_REQUEST", "Invalid case ID.", 400);
  let body: unknown;
  try { body = await request.json(); } catch { return apiFailure("INVALID_REQUEST", "Invalid JSON body.", 400); }
  if (!generationRequestSchema.safeParse(body).success) return apiFailure("INVALID_REQUEST", "Invalid request.", 400);
  const db = getDatabaseClient();
  if (!db) return apiFailure("NOT_CONFIGURED", "Database is not configured.", 503);
  try {
    const bundle = await getCaseBundle(db, id);
    if (!bundle) return apiFailure("NOT_FOUND", "Case not found.", 404);
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
    const saved = await db.rpc("reloop_save_evidence_findings", { p_case_id: id, p_findings: items });
    if (saved.error) throw new Error("Save failed");
    const updated = await getCaseBundle(db, id);
    if (!updated) throw new Error("Case disappeared");
    return apiSuccess({ caseId: id, artifacts: [], versions: [], findings: updated.findings.filter((f) => f.category === "evidence" && f.artifactVersionId === null).map((f) => findingSchema.parse(f)) });
  } catch { return apiFailure("DATABASE_UNAVAILABLE", "Could not analyze case.", 503, true); }
}
