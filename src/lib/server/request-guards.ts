import "server-only";
import { apiFailure } from "./http";
import { demoTokenIsConfigured } from "./access";

type RateLimitPolicy = { name: string; limit: number; windowMs: number };
const requestTimes = new Map<string, number[]>();

export function mutationGuard(request: Request, policy: RateLimitPolicy) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;
  if ((origin && origin !== expectedOrigin) || (demoTokenIsConfigured() && !origin)) {
    return apiFailure("UNAUTHORIZED", "This request origin is not allowed.", 403);
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const address = request.headers.get("x-real-ip")?.trim() || forwarded || "shared";
  const key = `${policy.name}:${address}`;
  const now = Date.now();
  const recent = (requestTimes.get(key) ?? []).filter((time) => now - time < policy.windowMs);
  if (recent.length >= policy.limit) {
    requestTimes.set(key, recent);
    return apiFailure("RATE_LIMITED", "Too many requests. Wait and try again.", 429, true);
  }
  recent.push(now);
  requestTimes.set(key, recent);

  if (requestTimes.size > 5000) {
    for (const [oldKey, times] of requestTimes) {
      if (times.every((time) => now - time >= policy.windowMs)) requestTimes.delete(oldKey);
    }
  }
  return null;
}
