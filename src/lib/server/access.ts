import "server-only";
import { timingSafeEqual } from "node:crypto";
import { apiFailure } from "./http";

export function checkAccess(request: Request) {
  const token = process.env.DEMO_ACCESS_TOKEN;
  if (!token) return apiFailure("NOT_CONFIGURED", "Demo access is not configured.", 503);
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expectedBytes = Buffer.from(token);
  const actualBytes = Buffer.from(supplied);
  if (expectedBytes.length !== actualBytes.length || !timingSafeEqual(expectedBytes, actualBytes)) {
    return apiFailure("UNAUTHORIZED", "Demo access is required.", 401);
  }
  const origin = request.headers.get("origin");
  if (request.method !== "GET" && origin) {
    try {
      const requestUrl = new URL(request.url);
      const host = request.headers.get("host") ?? requestUrl.host;
      const expectedOrigin = new URL(requestUrl.protocol + "//" + host).origin;
      if (origin !== expectedOrigin) return apiFailure("UNAUTHORIZED", "Request origin is not allowed.", 403);
    } catch {
      return apiFailure("UNAUTHORIZED", "Request origin is not allowed.", 403);
    }
  }
  return null;
}
