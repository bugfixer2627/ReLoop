import { beforeEach, describe, expect, it, vi } from "vitest";
import { healthResponseSchema } from "@/lib/contracts";

vi.mock("server-only", () => ({}));
const { getDatabaseClient } = vi.hoisted(() => ({ getDatabaseClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getDatabaseClient }));

import { GET as health } from "@/app/api/health/route";
import { POST as support } from "@/app/api/cases/[id]/support/route";
import { POST as repair } from "@/app/api/cases/[id]/repair/route";
import { POST as revise } from "@/app/api/artifacts/[id]/revise/route";
import { POST as transcribe } from "@/app/api/transcribe/route";

beforeEach(() => { getDatabaseClient.mockReset(); });

describe("foundation routes", () => {
  it("reports an unconfigured DB without exposing credentials", async () => {
    getDatabaseClient.mockReturnValue(null);
    const response = await health();
    const body = healthResponseSchema.parse(await response.json());
    expect(response.status).toBe(200);
    expect(body.ok && body.data.database).toBe("not_configured");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it.each(["reachable", "unreachable"])("actually checks the configured database: %s", async (state) => {
    const limit = vi.fn().mockResolvedValue({ error: state === "reachable" ? null : { message: "Secret provider failure" } });
    getDatabaseClient.mockReturnValue({ from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ limit }) }) });
    const body = await (await health()).json();
    expect(limit).toHaveBeenCalledWith(1);
    expect(body.data.database).toBe(state);
    expect(JSON.stringify(body)).not.toContain("Secret provider failure");
  });
  it("handles thrown database connection failures", async () => {
    getDatabaseClient.mockReturnValue({ from: () => { throw new Error("Secret URI"); } });
    const body = await (await health()).json();
    expect(body.data.database).toBe("unreachable");
    expect(JSON.stringify(body)).not.toContain("Secret URI");
  });
  it.each([support, repair, revise, transcribe])("does not simulate an unimplemented workflow", async (route) => {
    const response = await route();
    const body = await response.json();
    expect(response.status).toBe(501);
    expect(body).toMatchObject({ ok: false, data: null, error: { code: "NOT_IMPLEMENTED", retryable: false } });
  });
});
