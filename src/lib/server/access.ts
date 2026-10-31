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
  return Boolean(process.env.DEMO_ACCESS_TOKEN);
}

export function demoTokenIsValid(token: string) {
  const expected = process.env.DEMO_ACCESS_TOKEN;
  if (!expected || expected.length < 32 || !token) return false;
  return tokenMatches(expected, token);
}

export function demoAccessFailure(request: Request) {
  const expected = process.env.DEMO_ACCESS_TOKEN;
  if (!expected) return null;
  if (expected.length < 32) {
    return apiFailure("NOT_CONFIGURED", "Demo access is misconfigured.", 503);
  }
  if (demoTokenIsValid(readDemoAccessToken(request))) return null;
  return apiFailure("UNAUTHORIZED", "Demo access is required.", 401);
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
