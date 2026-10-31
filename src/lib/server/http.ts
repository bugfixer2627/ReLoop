import "server-only";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { ApiErrorCode } from "@/lib/contracts";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data, error: null, requestId: randomUUID() }, {
    status, headers: { "Cache-Control": "no-store" },
  });
}

export function apiFailure(code: ApiErrorCode, message: string, status: number, retryable = false) {
  return NextResponse.json({ ok: false, data: null, error: { code, message, retryable }, requestId: randomUUID() }, {
    status, headers: { "Cache-Control": "no-store" },
  });
}

export function notImplemented() {
  return apiFailure("NOT_IMPLEMENTED", "This workflow is not available yet.", 501);
}
