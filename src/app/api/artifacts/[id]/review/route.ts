import { z } from "zod";
import { artifactVersionSchema, auditEventSchema, reviewArtifactRequestSchema } from "@/lib/contracts";
import { getDatabaseClient } from "@/lib/db/client";
import { mapRow } from "@/lib/db/cases";
import { checkAccess } from "@/lib/server/access";
import { apiFailure, apiSuccess } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = checkAccess(request); if (denied) return denied;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return apiFailure("INVALID_REQUEST", "Invalid artifact ID.", 400);
  let body: unknown;
  try { body = await request.json(); } catch { return apiFailure("INVALID_REQUEST", "Invalid JSON body.", 400); }
  const parsed = reviewArtifactRequestSchema.safeParse(body);
  if (!parsed.success) return apiFailure("INVALID_REQUEST", "Invalid review details.", 400);
  const db = getDatabaseClient();
  if (!db) return apiFailure("NOT_CONFIGURED", "Database is not configured.", 503);
  try {
    const result = await db.rpc("reloop_review_artifact", { p_artifact_id: id, p_review: parsed.data });
    if (result.error?.code === "P0002") return apiFailure("NOT_FOUND", "Artifact not found.", 404);
    if (result.error?.code === "40001") return apiFailure("CONFLICT", "Artifact version changed.", 409);
    if (result.error?.code === "P0001") return apiFailure("REVIEW_BLOCKED", "Resolve validation findings before approval.", 422);
    if (result.error?.code === "22023") return apiFailure("INVALID_REQUEST", "Reviewer role is not allowed.", 400);
    if (result.error) throw new Error("Save failed");
    return apiSuccess({ caseId: result.data.caseId, artifactId: result.data.artifactId,
      version: artifactVersionSchema.parse(mapRow(result.data.version, { content_json: "content" })),
      auditEvent: auditEventSchema.parse(mapRow(result.data.audit, { payload_json: "payload" })) });
  } catch { return apiFailure("DATABASE_UNAVAILABLE", "Could not save review.", 503, true); }
}
