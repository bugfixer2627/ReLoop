import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { apiFailure } from "./http";
import { isAllowedOrigin } from "./origin";

export const AUTH_SESSION_COOKIE = "reloop_auth_session";
export const AUTH_SESSION_SECONDS = 8 * 60 * 60;

type AuthSession = { userId: string; expiresAt: number };

function tokenMatches(expected: string, supplied: string) {
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

function sessionSignature(payload: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createHmac("sha256", key).update(`reloop-auth-v1:${payload}`).digest("base64url");
}

export function createAuthSession(userId: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt: Math.floor(now / 1000) + AUTH_SESSION_SECONDS } satisfies AuthSession)).toString("base64url");
  const signature = sessionSignature(payload);
  if (!signature) throw new Error("AUTH_NOT_CONFIGURED");
  return `${payload}.${signature}`;
}

export function readAuthSession(request: Request, now = Date.now()): AuthSession | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const value = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${AUTH_SESSION_COOKIE}=`))?.slice(AUTH_SESSION_COOKIE.length + 1);
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;
  const payload = value.slice(0, separator);
  const actual = Buffer.from(value.slice(separator + 1));
  const expected = Buffer.from(sessionSignature(payload) ?? "");
  if (!expected.length || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthSession;
    if (typeof parsed.userId !== "string" || !parsed.userId || !Number.isInteger(parsed.expiresAt) || parsed.expiresAt <= Math.floor(now / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setAuthSessionCookie(response: NextResponse, request: Request, userId: string) {
  response.cookies.set(AUTH_SESSION_COOKIE, createAuthSession(userId), {
    httpOnly: true, secure: new URL(request.url).protocol === "https:" || process.env.NODE_ENV === "production",
    sameSite: "strict", path: "/", maxAge: AUTH_SESSION_SECONDS,
  });
  return response;
}

export function clearAuthSessionCookie(response: NextResponse, request: Request) {
  response.cookies.set(AUTH_SESSION_COOKIE, "", { httpOnly: true, secure: new URL(request.url).protocol === "https:" || process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}

export function demoTokenIsValid(token: string) {
  const expected = process.env.DEMO_ACCESS_TOKEN;
  if (!expected || expected.length < 32 || !token) return false;
  return tokenMatches(expected, token);
}

function bearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match?.[1]?.trim() ?? "";
}

/**
 * Browser requests use the signed Auth session cookie. An optional legacy
 * bearer token remains available for trusted API clients during migration.
 */
export function checkAccess(request: Request) {
  const expected = process.env.DEMO_ACCESS_TOKEN;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !expected) return apiFailure("NOT_CONFIGURED", "Sign-in service is not configured.", 503);
  if (expected && expected.length < 32) return apiFailure("NOT_CONFIGURED", "Legacy API access is misconfigured.", 503);

  const hasSession = readAuthSession(request) !== null;
  const supplied = bearerToken(request);
  if (!hasSession && !(expected && demoTokenIsValid(supplied))) return apiFailure("UNAUTHORIZED", "Workspace sign-in is required.", 401);

  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    const expectedOrigin = new URL(request.url).origin;
    if ((origin && !isAllowedOrigin(origin, expectedOrigin)) || (!origin && !bearerToken(request))) {
      return apiFailure("UNAUTHORIZED", "This request origin is not allowed.", 403);
    }
  }
  return null;
}
