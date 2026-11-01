import { z } from "zod";
import { apiFailure, apiSuccess } from "@/lib/server/http";
import {
  demoTokenIsConfigured,
  demoTokenIsValid,
  readDemoAccessToken,
  setDemoAccessCookie,
} from "@/lib/server/access";
import { mutationGuard } from "@/lib/server/request-guards";

const requestSchema = z.strictObject({ token: z.string().min(1).max(1024) });

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const required = demoTokenIsConfigured();
  const authenticated = !required || demoTokenIsValid(readDemoAccessToken(request));
  return apiSuccess({ required, authenticated });
}

export async function POST(request: Request) {
  if (!demoTokenIsConfigured()) return apiSuccess({ required: false, authenticated: true });
  const rejected = mutationGuard(request, { name: "demo-access", limit: 5, windowMs: 60_000 });
  if (rejected) return rejected;
  if ((process.env.DEMO_ACCESS_TOKEN?.length ?? 0) < 32) {
    return apiFailure("NOT_CONFIGURED", "Demo access is misconfigured.", 503);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return apiFailure("INVALID_REQUEST", "Provide the demo access token.", 400);
  }
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return apiFailure("INVALID_REQUEST", "Provide the demo access token.", 400);
  if (!demoTokenIsValid(parsed.data.token)) return apiFailure("UNAUTHORIZED", "Demo access was denied.", 401);

  return setDemoAccessCookie(apiSuccess({ required: true, authenticated: true }), request, parsed.data.token);
}
