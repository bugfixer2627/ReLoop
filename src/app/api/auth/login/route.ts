import { z } from "zod";
import { getDatabaseClient } from "@/lib/db/client";
import { apiFailure, apiSuccess } from "@/lib/server/http";
import { setAuthSessionCookie } from "@/lib/server/access";
import { mutationGuard } from "@/lib/server/request-guards";

const loginSchema = z.strictObject({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rejected = mutationGuard(request, { name: "auth-login", limit: 8, windowMs: 60_000 });
  if (rejected) return rejected;
  let input: unknown;
  try { input = await request.json(); }
  catch { return apiFailure("INVALID_REQUEST", "Enter your email and password.", 400); }
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return apiFailure("INVALID_REQUEST", "Enter a valid email and password.", 400);

  const db = getDatabaseClient();
  if (!db) return apiFailure("NOT_CONFIGURED", "Sign-in service is not configured.", 503);
  let data: Awaited<ReturnType<typeof db.auth.signInWithPassword>>["data"];
  let error: Awaited<ReturnType<typeof db.auth.signInWithPassword>>["error"];
  try {
    ({ data, error } = await db.auth.signInWithPassword(parsed.data));
  } catch {
    return apiFailure("NOT_CONFIGURED", "Sign-in service is temporarily unavailable.", 503, true);
  }
  if (error || !data.user?.id || !data.session) {
    return apiFailure("UNAUTHORIZED", "Email or password was not accepted.", 401);
  }
  return setAuthSessionCookie(apiSuccess({ authenticated: true }), request, data.user.id);
}
