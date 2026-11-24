import { z } from "zod";
import { reviewArtifactRequestSchema } from "@/lib/contracts";
import { getDatabaseClient } from "@/lib/db/client";
import { getCaseBundle } from "@/lib/db/cases";
import { recordOwnedReview, recordReview } from "@/lib/db/workflows";
import { checkGeneratedContent } from "@/lib/rules/checker";
import { checkAccess, readAuthSession } from "@/lib/server/access";
import { apiFailure, apiSuccess } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = checkAccess(request);
  if (denied) return denied;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return apiFailure("INVALID_REQUEST", "Invalid artifact ID.", 400);
  let body: unknown;
  try { body = await request.json(); } catch { return apiFailure("INVALID_REQUEST", "Invalid JSON body.", 400); }
  const parsed = reviewArtifactRequestSchema.safeParse(body);
  if (!parsed.success) return apiFailure("INVALID_REQUEST", "Invalid review details.", 400);
  const db = getDatabaseClient();
  if (!db) return apiFailure("NOT_CONFIGURED", "Database is not configured.", 503);
  try {
    const artifactResult = await db.from("artifacts").select("case_id").eq("id", id).maybeSingle();
    if (artifactResult.error) throw new Error("DATABASE");
    if (!artifactResult.data) return apiFailure("NOT_FOUND", "Artifact not found.", 404);
    const ownerUserId = readAuthSession(request)?.userId;
    const bundle = await getCaseBundle(db, artifactResult.data.case_id as string, ownerUserId);
    if (!bundle) return apiFailure("NOT_FOUND", "Case not found.", 404);
    const artifact = bundle.artifacts.find((item) => item.id === id);
    const version = bundle.versions.find((item) => item.artifactId === id && item.version === parsed.data.version);
    if (!artifact || !version) return apiFailure("NOT_FOUND", "Artifact version not found.", 404);
    if (artifact.latestVersion !== version.version) return apiFailure("CONFLICT", "Only the current artifact version can be reviewed.", 409);
    const { decision, reviewerRole, comment, ruleChecks } = parsed.data;
    if (ruleChecks && (!ownerUserId || decision !== "approved" || artifact.kind !== "listing_correction" || artifact.platform !== "shopify_us" || !comment)) {
      return apiFailure("INVALID_REQUEST", "Source checks require a signed-in Shopify US draft owner and a review rationale.", 400);
    }
    if (ruleChecks && checkGeneratedContent(bundle, version.content).some((finding) => finding.severity === "blocker" || finding.evidence_status === "needs_evidence")) {
      return apiFailure("REVIEW_BLOCKED", "This version still has unresolved evidence checks.", 422);
    }
    const input = {
      caseId: bundle.case.id,
      artifactId: id,
      version: version.version,
      decision,
      comment,
    };
    let saved;
    if (ownerUserId) {
      saved = await recordOwnedReview(db, { ...input, ownerUserId, ruleChecks });
    } else {
      const roleAllowed = artifact.kind === "support_reply"
        ? reviewerRole === "support"
        : artifact.kind === "listing_correction" && ["marketing", "compliance"].includes(reviewerRole);
      if (!roleAllowed) return apiFailure("INVALID_REQUEST", "This reviewer role cannot review this artifact kind.", 400);
      if (decision === "approved" && (version.validationStatus !== "checked" || bundle.findings.some((finding) => finding.artifactVersionId === version.id && (finding.severity === "blocker" || finding.evidenceStatus === "needs_evidence" || finding.ruleStatus === "needs_rule_verification")))) {
        return apiFailure("REVIEW_BLOCKED", "This version still has unresolved evidence or rule checks.", 422);
      }
      saved = await recordReview(db, { ...input, reviewerRole });
    }
    const updated = await getCaseBundle(db, bundle.case.id, ownerUserId);
    if (!updated) throw new Error("DATABASE");
    const updatedVersion = updated.versions.find((item) => item.id === saved.version_id);
    const auditEvent = updated.audit.find((item) => item.id === saved.audit_id);
    if (!updatedVersion || !auditEvent) throw new Error("DATABASE");
    return apiSuccess({ caseId: bundle.case.id, artifactId: id, version: updatedVersion, auditEvent });
  } catch (error) {
    if (error instanceof Error && error.message === "REVIEW_BLOCKED") return apiFailure("REVIEW_BLOCKED", "This version still has unresolved evidence or rule checks.", 422);
    if (error instanceof Error && error.message === "INVALID_REQUEST") return apiFailure("INVALID_REQUEST", "This reviewer role cannot review this artifact kind.", 400);
    if (error instanceof Error && error.message === "NOT_FOUND") return apiFailure("NOT_FOUND", "Artifact version not found.", 404);
    if (error instanceof Error && error.message === "CONFLICT") return apiFailure("CONFLICT", "Only the current artifact version can be reviewed.", 409);
    return apiFailure("DATABASE_UNAVAILABLE", "Could not persist the review.", 503, true);
  }
}
