import { apiSuccess } from "@/lib/server/http";
import { readAuthSession } from "@/lib/server/access";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return apiSuccess({ authenticated: readAuthSession(request) !== null });
}
