import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { apiFailure } from "./http";

export const DEMO_ACCESS_COOKIE = "reloop_demo_access";

function tokenMatches(expected: string, supplied: string) {
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

export function readDemoAccessToken(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== DEMO_ACCESS_COOKIE) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return "";
    }
  }
  return "";
}

export function demoTokenIsConfigured() {
  return Boolean(process.env.DEMO_ACCESS_TOKEN) || process.env.NODE_ENV === "production";
}

export function demoTokenIsValid(token: string) {
  const expected = process.env.DEMO_ACCESS_TOKEN;
  if (!expected || expected.length < 32 || !token) return false;
  return tokenMatches(expected, token);
}

export function demoAccessFailure(request: Request) {
  const expected = process.env.DEMO_ACCESS_TOKEN;
  if (!expected) {
    return process.env.NODE_ENV === "production"
      ? apiFailure("NOT_CONFIGURED", "Demo access is not configured.", 503)
      : null;
  }
  if (expected.length < 32) {
    return apiFailure("NOT_CONFIGURED", "Demo access is misconfigured.", 503);
  }
  if (demoTokenIsValid(readDemoAccessToken(request))) return null;
  return apiFailure("UNAUTHORIZED", "Demo access is required.", 401);
}

function bearerToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match?.[1]?.trim() ?? "";
}

/**
 * Business routes use the same server-side demo gate as the access endpoint.
 * Accept the documented bearer form for API clients and the HttpOnly cookie
 * issued by /api/access for browser sessions. An unset or weak shared token
 * fails closed so a deployment cannot accidentally expose case data.
 */
export function checkAccess(request: Request) {
  const expected = process.env.DEMO_ACCESS_TOKEN;
  if (!expected) return apiFailure("NOT_CONFIGURED", "Demo access is not configured.", 503);
  if (expected.length < 32) return apiFailure("NOT_CONFIGURED", "Demo access is misconfigured.", 503);

  const supplied = bearerToken(request) || readDemoAccessToken(request);
  if (!demoTokenIsValid(supplied)) return apiFailure("UNAUTHORIZED", "Demo access is required.", 401);

  if (request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    const expectedOrigin = new URL(request.url).origin;
    if (origin && !sameLocalOrigin(origin, expectedOrigin)) {
      return apiFailure("UNAUTHORIZED", "This request origin is not allowed.", 403);
    }
  }
  return null;
}

function sameLocalOrigin(actual: string, expected: string) {
  try {
    const left = new URL(actual);
    const right = new URL(expected);
    if (left.protocol !== right.protocol || left.port !== right.port) return false;
    const local = new Set(["localhost", "127.0.0.1", "[::1]"]);
    if (local.has(left.hostname) && local.has(right.hostname)) return true;
    return left.hostname === right.hostname;
  } catch {
    return false;
  }
}

export function setDemoAccessCookie(response: NextResponse, request: Request, token: string) {
  const url = new URL(request.url);
  response.cookies.set(DEMO_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: url.protocol === "https:" || process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return response;
}
