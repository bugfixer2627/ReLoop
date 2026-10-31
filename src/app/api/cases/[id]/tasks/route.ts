import { z } from "zod";
import { auditEventSchema, taskSchema, upsertTaskRequestSchema } from "@/lib/contracts";
import { getDatabaseClient } from "@/lib/db/client";
import { mapRow } from "@/lib/db/cases";
import { checkAccess } from "@/lib/server/access";
import { apiFailure, apiSuccess } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = checkAccess(request); if (denied) return denied;
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return apiFailure("INVALID_REQUEST", "Invalid case ID.", 400);
  let body: unknown;
  try { body = await request.json(); } catch { return apiFailure("INVALID_REQUEST", "Invalid JSON body.", 400); }
  const parsed = upsertTaskRequestSchema.safeParse(body);
  if (!parsed.success) return apiFailure("INVALID_REQUEST", "Invalid task details.", 400);
  const db = getDatabaseClient();
  if (!db) return apiFailure("NOT_CONFIGURED", "Database is not configured.", 503);
  try {
    const result = await db.rpc("reloop_upsert_task", { p_case_id: id, p_task: parsed.data });
    if (result.error?.code === "P0002") return apiFailure("NOT_FOUND", "Case or task not found.", 404);
    if (result.error?.code === "22023") return apiFailure("INVALID_REQUEST", "Invalid source reference.", 400);
    if (result.error) throw new Error("Save failed");
    return apiSuccess({ task: taskSchema.parse(mapRow(result.data.task)), auditEvent: auditEventSchema.parse(mapRow(result.data.audit, { payload_json: "payload" })) });
  } catch { return apiFailure("DATABASE_UNAVAILABLE", "Could not save task.", 503, true); }
}
