import { mutationGuard } from "@/lib/server/request-guards";
import { clearAuthSessionCookie } from "@/lib/server/access";
import { apiSuccess } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rejected = mutationGuard(request, { name: "auth-logout", limit: 20, windowMs: 60_000 });
  if (rejected) return rejected;
  return clearAuthSessionCookie(apiSuccess({ authenticated: false }), request);
}
