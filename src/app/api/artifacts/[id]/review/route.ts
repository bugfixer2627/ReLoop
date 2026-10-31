import { z } from "zod";
import { reviewArtifactRequestSchema } from "@/lib/contracts";
import { getDatabaseClient } from "@/lib/db/client";
import { getCaseBundle } from "@/lib/db/cases";
import { recordReview } from "@/lib/db/workflows";
import { checkAccess } from "@/lib/server/access";
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
    const bundle = await getCaseBundle(db, artifactResult.data.case_id as string);
    if (!bundle) return apiFailure("NOT_FOUND", "Case not found.", 404);
    const artifact = bundle.artifacts.find((item) => item.id === id);
    const version = bundle.versions.find((item) => item.artifactId === id && item.version === parsed.data.version);
    if (!artifact || !version) return apiFailure("NOT_FOUND", "Artifact version not found.", 404);
    if (artifact.latestVersion !== version.version) return apiFailure("CONFLICT", "Only the current artifact version can be reviewed.", 409);
    if (version.validationStatus !== "checked" || bundle.findings.some((finding) => finding.artifactVersionId === version.id && finding.severity === "blocker")) {
      return apiFailure("REVIEW_BLOCKED", "This version still has unresolved evidence or rule checks.", 422);
    }
    const saved = await recordReview(db, {
      caseId: bundle.case.id,
      artifactId: id,
      version: version.version,
      reviewerRole: parsed.data.reviewerRole,
      decision: parsed.data.decision,
      comment: parsed.data.comment,
    });
    const updated = await getCaseBundle(db, bundle.case.id);
    if (!updated) throw new Error("DATABASE");
    const updatedVersion = updated.versions.find((item) => item.id === saved.version_id);
    const auditEvent = updated.audit.find((item) => item.id === saved.audit_id);
    if (!updatedVersion || !auditEvent) throw new Error("DATABASE");
    return apiSuccess({ caseId: bundle.case.id, artifactId: id, version: updatedVersion, auditEvent });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return apiFailure("NOT_FOUND", "Artifact version not found.", 404);
    return apiFailure("DATABASE_UNAVAILABLE", "Could not persist the review.", 503, true);
  }
}
