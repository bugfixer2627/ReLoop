import { z } from "zod";
import { generationRequestSchema, type CaseBundle } from "@/lib/contracts";
import { getDatabaseClient } from "@/lib/db/client";
import { getCaseBundle } from "@/lib/db/cases";
import { checkAccess } from "@/lib/server/access";
import { apiFailure, apiSuccess } from "@/lib/server/http";
import { ProviderError } from "@/lib/ai/openai-compatible";

function providerFailure(error: ProviderError) {
  const messages: Record<string, string> = {
    NOT_CONFIGURED: "AI generation is not configured.",
    MODEL_TIMEOUT: "AI generation timed out. Try again.",
    RATE_LIMITED: "AI generation is temporarily rate limited. Try again.",
    INVALID_MODEL_OUTPUT: "AI generation returned an invalid structured result.",
    INTERNAL_ERROR: "AI generation is temporarily unavailable.",
  };
  return apiFailure(error.code, messages[error.code] ?? "AI generation failed.", error.status, error.retryable);
}

export async function generationRoute(
  request: Request,
  context: { params: Promise<{ id: string }> },
  generate: (db: NonNullable<ReturnType<typeof getDatabaseClient>>, bundle: CaseBundle) => Promise<CaseBundle>,
) {
  const denied = checkAccess(request);
  if (denied) return denied;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return apiFailure("INVALID_REQUEST", "Invalid case ID.", 400);
  let body: unknown;
  try { body = await request.json(); } catch { return apiFailure("INVALID_REQUEST", "Invalid JSON body.", 400); }
  if (!generationRequestSchema.safeParse(body).success) return apiFailure("INVALID_REQUEST", "This endpoint accepts an empty JSON object.", 400);

  const db = getDatabaseClient();
  if (!db) return apiFailure("NOT_CONFIGURED", "Database is not configured.", 503);
  let bundle: CaseBundle | null;
  try { bundle = await getCaseBundle(db, id); } catch { return apiFailure("DATABASE_UNAVAILABLE", "Could not load the case.", 503, true); }
  if (!bundle) return apiFailure("NOT_FOUND", "Case not found.", 404);

  try {
    const result = await generate(db, bundle);
    return apiSuccess({ caseId: id, artifacts: result.artifacts, versions: result.versions, findings: result.findings });
  } catch (error) {
    if (error instanceof ProviderError) return providerFailure(error);
    const message = error instanceof Error ? error.message : "";
    if (message === "NEEDS_EVIDENCE") return apiFailure("NEEDS_EVIDENCE", "Documented product evidence and test conditions are required before generation.", 422);
    if (message === "NOT_FOUND") return apiFailure("NOT_FOUND", "Artifact or case not found.", 404);
    if (message === "CONFLICT") return apiFailure("CONFLICT", "The artifact changed. Reload and try again.", 409);
    return apiFailure("DATABASE_UNAVAILABLE", "Could not persist the generated result.", 503, true);
  }
}
