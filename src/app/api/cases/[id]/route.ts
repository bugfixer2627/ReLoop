import { z } from "zod";
import { getDatabaseClient } from "@/lib/db/client";
import { getCaseBundle } from "@/lib/db/cases";
import { checkAccess } from "@/lib/server/access";
import { apiFailure, apiSuccess } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = checkAccess(request);
  if (denied) return denied;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return apiFailure("INVALID_REQUEST", "Invalid case ID.", 400);
  const db = getDatabaseClient();
  if (!db) return apiFailure("NOT_CONFIGURED", "Database is not configured.", 503);
  try {
    const bundle = await getCaseBundle(db, id);
    return bundle ? apiSuccess(bundle) : apiFailure("NOT_FOUND", "Case not found.", 404);
  } catch { return apiFailure("DATABASE_UNAVAILABLE", "Could not load case.", 503, true); }
}
