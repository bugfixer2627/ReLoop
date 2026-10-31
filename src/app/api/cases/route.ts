import { createCaseRequestSchema } from "@/lib/contracts";
import { getDatabaseClient } from "@/lib/db/client";
import { createCase, listCases } from "@/lib/db/cases";
import { checkAccess } from "@/lib/server/access";
import { apiFailure, apiSuccess } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = checkAccess(request);
  if (denied) return denied;
  const db = getDatabaseClient();
  if (!db) return apiFailure("NOT_CONFIGURED", "Database is not configured.", 503);
  try { return apiSuccess({ cases: await listCases(db) }); }
  catch { return apiFailure("DATABASE_UNAVAILABLE", "Could not load cases.", 503, true); }
}

export async function POST(request: Request) {
  const denied = checkAccess(request);
  if (denied) return denied;
  let body: unknown;
  try { body = await request.json(); }
  catch { return apiFailure("INVALID_REQUEST", "Invalid JSON body.", 400); }
  const parsed = createCaseRequestSchema.safeParse(body);
  if (!parsed.success) return apiFailure("INVALID_REQUEST", "Invalid case details.", 400);
  const db = getDatabaseClient();
  if (!db) return apiFailure("NOT_CONFIGURED", "Database is not configured.", 503);
  try {
    const id = await createCase(db, parsed.data);
    return id ? apiSuccess({ caseId: id }, 201) : apiFailure("UNKNOWN_SKU", "Product not found.", 404);
  } catch { return apiFailure("DATABASE_UNAVAILABLE", "Could not create case.", 503, true); }
}
