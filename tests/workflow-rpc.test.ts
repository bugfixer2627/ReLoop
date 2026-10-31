import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { recordReview } from "@/lib/db/workflows";

describe("PostgREST error mapping", () => {
  it.each(["CONFLICT", "NOT_FOUND", "REVIEW_BLOCKED", "INVALID_REQUEST"])("maps plain-object %s without losing the error code", async (code) => {
    const db = { rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "P0001", message: code } }) };
    await expect(recordReview(db as never, { caseId: "test", artifactId: "test", version: 1, reviewerRole: "support", decision: "approved", comment: "" })).rejects.toThrow(code);
  });
});
