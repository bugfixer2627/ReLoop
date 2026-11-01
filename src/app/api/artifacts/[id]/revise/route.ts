import { z } from "zod";
import { reviseArtifactRequestSchema } from "@/lib/contracts";
import { getDatabaseClient } from "@/lib/db/client";
import { getCaseBundle } from "@/lib/db/cases";
import { createRevision } from "@/lib/db/workflows";
import { getAiAdapter, ProviderError } from "@/lib/ai/openai-compatible";
import { checkGeneratedContent, checkListingEvidence } from "@/lib/rules/checker";
import { validationStatus } from "@/lib/workflows/generation";
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
  const parsed = reviseArtifactRequestSchema.safeParse(body);
  if (!parsed.success) return apiFailure("INVALID_REQUEST", "Invalid revision details.", 400);
  const db = getDatabaseClient();
  if (!db) return apiFailure("NOT_CONFIGURED", "Database is not configured.", 503);

  try {
    const artifactResult = await db.from("artifacts").select("case_id").eq("id", id).maybeSingle();
    if (artifactResult.error) throw new Error("DATABASE");
    if (!artifactResult.data) return apiFailure("NOT_FOUND", "Artifact not found.", 404);
    const bundle = await getCaseBundle(db, artifactResult.data.case_id as string);
    if (!bundle) return apiFailure("NOT_FOUND", "Case not found.", 404);
    const artifact = bundle.artifacts.find((item) => item.id === id);
    if (!artifact) return apiFailure("NOT_FOUND", "Artifact not found.", 404);
    const current = bundle.versions.find((version) => version.artifactId === id && version.version === parsed.data.expectedVersion);
    if (!current || artifact.latestVersion !== parsed.data.expectedVersion) return apiFailure("CONFLICT", "The artifact changed. Reload and try again.", 409);
    const adapter = getAiAdapter();
    if (!adapter) throw new ProviderError("NOT_CONFIGURED", 503, false);
    const content = await adapter.revise(bundle, current, parsed.data.promptText, parsed.data.promptLocale);
    const listing = artifact.kind === "listing_correction" && artifact.platform
      ? bundle.listings.find((item) => item.platform === artifact.platform)
      : undefined;
    const findings = [
      ...(listing ? checkListingEvidence(bundle, listing.id) : []),
      ...checkGeneratedContent(bundle, content, listing?.id),
    ];
    const saved = await createRevision(db, {
      caseId: bundle.case.id,
      artifactId: id,
      expectedVersion: parsed.data.expectedVersion,
      promptText: parsed.data.promptText,
      promptLocale: parsed.data.promptLocale,
      locale: current.locale,
      languageStatus: current.languageStatus,
      content,
      sourceIds: current.sourceIds,
      validationStatus: validationStatus(bundle, findings),
      findings,
    });
    const updated = await getCaseBundle(db, bundle.case.id);
    if (!updated) throw new Error("DATABASE");
    const nextArtifact = updated.artifacts.find((item) => item.id === id);
    const nextVersion = updated.versions.find((item) => item.id === saved.version_id);
    const revision = updated.revisions.find((item) => item.id === saved.revision_id);
    if (!nextArtifact || !nextVersion || !revision) throw new Error("DATABASE");
    return apiSuccess({ caseId: bundle.case.id, artifact: nextArtifact, version: nextVersion, revision, findings: updated.findings.filter((finding) => finding.artifactVersionId === nextVersion.id) });
  } catch (error) {
    if (error instanceof ProviderError) return apiFailure(error.code, error.code === "NOT_CONFIGURED" ? "AI generation is not configured." : "AI revision failed.", error.status, error.retryable);
    if (error instanceof Error && error.message === "CONFLICT") return apiFailure("CONFLICT", "The artifact changed. Reload and try again.", 409);
    return apiFailure("DATABASE_UNAVAILABLE", "Could not persist the revision.", 503, true);
  }
}
