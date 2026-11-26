import { z } from "zod";
import { manageCaseRequestSchema } from "@/lib/contracts";
import { getDatabaseClient } from "@/lib/db/client";
import { getCaseBundle } from "@/lib/db/cases";
import { checkAccess, readAuthSession } from "@/lib/server/access";
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
    const bundle = await getCaseBundle(db, id, readAuthSession(request)?.userId, true);
    return bundle ? apiSuccess(bundle) : apiFailure("NOT_FOUND", "Case not found.", 404);
  } catch { return apiFailure("DATABASE_UNAVAILABLE", "Could not load case.", 503, true); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = checkAccess(request);
  if (denied) return denied;
  const user = readAuthSession(request);
  if (!user) return apiFailure("UNAUTHORIZED", "Sign in to manage this case.", 401);
  const { id } = await context.params;
  const parsed = manageCaseRequestSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success) return apiFailure("INVALID_REQUEST", "Check the case details.", 400);
  const db = getDatabaseClient();
  if (!db) return apiFailure("NOT_CONFIGURED", "Database is not configured.", 503);
  const input = parsed.data;
  try {
    if (input.action === "reviewer" && input.reviewerUserId) {
      const owned = await db.from("cases").select("id").eq("id", id).eq("owner_user_id", user.userId).maybeSingle();
      if (owned.error) throw new Error("Database query failed");
      if (!owned.data) return apiFailure("NOT_FOUND", "Case not found.", 404);
      if (input.reviewerUserId === user.userId) return apiFailure("INVALID_REQUEST", "Choose another account to review the case.", 400);
      const reviewer = await db.auth.admin.getUserById(input.reviewerUserId);
      if (reviewer.error?.status === 404 || (!reviewer.error && !reviewer.data.user)) return apiFailure("INVALID_REQUEST", "That reviewer account could not be found.", 400);
      if (reviewer.error) throw new Error("Account lookup failed");
    }
    const saved = await db.rpc("reloop_manage_case", {
      p_case_id: id, p_actor_id: user.userId, p_action: input.action,
      p_status: input.action === "status" ? input.status : null,
      p_expected_status: input.action === "status" ? input.expectedStatus : null,
      p_reviewer_id: input.action === "reviewer" ? input.reviewerUserId : null,
      p_note: input.action === "status" ? input.note : null,
    });
    if (!saved.error) return apiSuccess({ caseId: id });
    if (saved.error.message === "NOT_FOUND") return apiFailure("NOT_FOUND", "Case not found.", 404);
    if (saved.error.message === "CONFLICT") return apiFailure("CONFLICT", "Case status changed. Reload and try again.", 409);
    if (saved.error.message === "REVIEW_BLOCKED") return apiFailure("REVIEW_BLOCKED", "Finish open follow-up tasks before resolving the case.", 422);
    if (saved.error.message === "INVALID_REQUEST") return apiFailure("INVALID_REQUEST", "Check the reviewer or case status.", 400);
  } catch { /* Keep database and auth errors private. */ }
  return apiFailure("DATABASE_UNAVAILABLE", "Could not update the case.", 503, true);
}
