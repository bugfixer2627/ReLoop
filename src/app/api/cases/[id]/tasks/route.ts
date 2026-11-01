import { z } from "zod";
import { upsertTaskRequestSchema } from "@/lib/contracts";
import { getDatabaseClient } from "@/lib/db/client";
import { getCaseBundle } from "@/lib/db/cases";
import { upsertTask } from "@/lib/db/workflows";
import { checkAccess } from "@/lib/server/access";
import { apiFailure, apiSuccess } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = checkAccess(request);
  if (denied) return denied;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return apiFailure("INVALID_REQUEST", "Invalid case ID.", 400);
  let body: unknown;
  try { body = await request.json(); } catch { return apiFailure("INVALID_REQUEST", "Invalid JSON body.", 400); }
  const parsed = upsertTaskRequestSchema.safeParse(body);
  if (!parsed.success) return apiFailure("INVALID_REQUEST", "Invalid task details.", 400);
  const db = getDatabaseClient();
  if (!db) return apiFailure("NOT_CONFIGURED", "Database is not configured.", 503);
  try {
    const bundle = await getCaseBundle(db, id);
    if (!bundle) return apiFailure("NOT_FOUND", "Case not found.", 404);
    const available = new Set([...bundle.evidence, ...bundle.listings, ...bundle.rules].map((source) => source.id));
    if (parsed.data.sourceIds.some((sourceId) => !available.has(sourceId))) {
      return apiFailure("INVALID_REQUEST", "Every task source must belong to this case.", 400);
    }
    const saved = await upsertTask(db, { caseId: id, ...parsed.data });
    const updated = await getCaseBundle(db, id);
    if (!updated) throw new Error("DATABASE");
    const task = updated.tasks.find((item) => item.id === saved.task_id);
    const auditEvent = updated.audit.find((item) => item.id === saved.audit_id);
    if (!task || !auditEvent) throw new Error("DATABASE");
    return apiSuccess({ task, auditEvent });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return apiFailure("NOT_FOUND", "Task not found.", 404);
    return apiFailure("DATABASE_UNAVAILABLE", "Could not persist the task.", 503, true);
  }
}
