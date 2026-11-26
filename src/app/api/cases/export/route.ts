import { caseListQuerySchema } from "@/lib/contracts";
import { getDatabaseClient } from "@/lib/db/client";
import { pageCases } from "@/lib/db/cases";
import { casesCsv } from "@/lib/frontend/case-list";
import { checkAccess, readAuthSession } from "@/lib/server/access";
import { apiFailure } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = checkAccess(request);
  if (denied) return denied;
  const db = getDatabaseClient();
  if (!db) return apiFailure("NOT_CONFIGURED", "Database is not configured.", 503);
  const inputs = caseListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!inputs.success) return apiFailure("INVALID_REQUEST", "Invalid case filters.", 400);
  const userId = readAuthSession(request)?.userId ?? null;
  const options = { size: 250, summary: false };
  const fetchPage = (page: number) => pageCases(db, userId, { ...inputs.data, page }, options);
  let first;
  try { first = await fetchPage(1); }
  catch { return apiFailure("DATABASE_UNAVAILABLE", "Could not load cases for export.", 503, true); }

  const encoder = new TextEncoder();
  let page = 1;
  const csv = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (request.signal.aborted) { controller.close(); return; }
      const result = page === 1 ? first : await fetchPage(page);
      const text = casesCsv(result.cases, page === 1);
      if (text) controller.enqueue(encoder.encode((page === 1 ? "" : "\r\n") + text));
      if (result.cases.length < options.size) controller.close();
      page++;
    },
  });
  return new Response(csv, { headers: {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": 'attachment; filename="reloop-cases.csv"',
    "cache-control": "private, no-store",
  } });
}
