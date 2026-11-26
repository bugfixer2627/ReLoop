import { apiSuccess } from "@/lib/server/http";
import { readAuthSession } from "@/lib/server/access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = readAuthSession(request);
  return apiSuccess({ authenticated: session !== null, userId: session?.userId ?? null });
}
