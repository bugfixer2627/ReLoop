import { z } from "zod";
import { addSourceRequestSchema } from "@/lib/contracts";
import { addCaseSource } from "@/lib/db/catalog";
import { getDatabaseClient } from "@/lib/db/client";
import { checkAccess, readAuthSession } from "@/lib/server/access";
import { apiFailure, apiSuccess } from "@/lib/server/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = checkAccess(request);
  if (denied) return denied;
  const user = readAuthSession(request);
  if (!user) return apiFailure("UNAUTHORIZED", "Sign in to add sources.", 401);
  const { id } = await context.params;
  const input = addSourceRequestSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !input.success) return apiFailure("INVALID_REQUEST", "Check the case and source details.", 400);
  const db = getDatabaseClient();
  if (!db) return apiFailure("NOT_CONFIGURED", "Database is not configured.", 503);
  try {
    return apiSuccess({ sourceId: await addCaseSource(db, user.userId, id, input.data) }, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_REQUEST") return apiFailure("INVALID_REQUEST", "The source checked date must be today or earlier.", 400);
      if (error.message === "NOT_FOUND") return apiFailure("NOT_FOUND", "Case not found.", 404);
      if (error.message === "CONFLICT") return apiFailure("CONFLICT", "Demo product sources are read-only, and listing snapshot versions must be unique.", 409);
    }
    return apiFailure("DATABASE_UNAVAILABLE", "Could not save the source.", 503, true);
  }
}
