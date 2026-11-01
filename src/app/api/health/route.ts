import { getDatabaseClient } from "@/lib/db/client";
import { getAiAdapter, getTranscriptionAdapter } from "@/lib/ai/openai-compatible";
import { apiSuccess } from "@/lib/server/http";
import type { z } from "zod";
import type { healthDataSchema } from "@/lib/contracts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const db = getDatabaseClient();
  let database: z.infer<typeof healthDataSchema>["database"] = "not_configured";
  if (db) {
    try {
      const result = await db.from("products").select("id").limit(1);
      database = result.error ? "unreachable" : "reachable";
    } catch {
      database = "unreachable";
    }
  }
  const transcription = getTranscriptionAdapter() ? "configured" : "not_configured";
  const generation = getAiAdapter() ? "configured" : "not_configured";
  return apiSuccess({
    stage: "foundation", status: database === "reachable" ? "ok" : "degraded",
    database, generation, transcription,
  } satisfies z.infer<typeof healthDataSchema>);
}
