import { z } from "zod";
import { reviseArtifactRequestSchema } from "@/lib/contracts";
import { getDatabaseClient } from "@/lib/db/client";
import { getCaseBundle } from "@/lib/db/cases";
import { createRevision } from "@/lib/db/workflows";
import { getAiAdapter, ProviderError } from "@/lib/ai/openai-compatible";
import { checkGeneratedContent, checkListingEvidence } from "@/lib/rules/checker";
import { sourceIds, validationStatus } from "@/lib/workflows/generation";
import { applicableReviewRules } from "@/lib/rules/review";
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
  const parsed = reviseArtifactRequestSchema.safeParse(body);
  if (!parsed.success) return apiFailure("INVALID_REQUEST", "Invalid revision details.", 400);
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
    if (!artifact) return apiFailure("NOT_FOUND", "Artifact not found.", 404);
    const current = bundle.versions.find((version) => version.artifactId === id && version.version === parsed.data.expectedVersion);
    if (!current || artifact.latestVersion !== parsed.data.expectedVersion) return apiFailure("CONFLICT", "The artifact changed. Reload and try again.", 409);
    const adapter = getAiAdapter();
    if (!adapter) throw new ProviderError("NOT_CONFIGURED", 503, false);
    const outputLocale = parsed.data.outputLocale;
    if (outputLocale && (artifact.platform !== "amazon_de" || artifact.kind !== "listing_correction")) {
      return apiFailure("INVALID_REQUEST", "German localization is available for Amazon DE drafts.", 400);
    }
    const listing = artifact.kind === "listing_correction" && artifact.platform
      ? bundle.listings.find((item) => item.platform === artifact.platform)
      : undefined;
    const draftContext = listing ? { ...bundle, listings: [listing], rules: applicableReviewRules(bundle.rules, listing, bundle.case.synthetic) } : bundle;
    const content = await adapter.revise(draftContext, current, parsed.data.promptText, parsed.data.promptLocale, outputLocale);
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
      locale: outputLocale ?? current.locale,
      languageStatus: current.languageStatus,
      content,
      sourceIds: sourceIds(draftContext),
      validationStatus: validationStatus(bundle, findings),
      findings,
    });
    const updated = await getCaseBundle(db, bundle.case.id, ownerUserId);
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
