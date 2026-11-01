import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoBundle } from "@/lib/fixtures/demo";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ client: vi.fn(), bundle: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getDatabaseClient: mocks.client }));
vi.mock("@/lib/db/cases", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/cases")>();
  return { ...actual, getCaseBundle: mocks.bundle };
});
import { POST as analyze } from "@/app/api/cases/[id]/analyze/route";
import { POST as tasks } from "@/app/api/cases/[id]/tasks/route";
import { POST as review } from "@/app/api/artifacts/[id]/review/route";

const context = { params: Promise.resolve({ id: demoBundle.case.id }) };
const testToken = "operation-route-test-secret".padEnd(40, "x");
function req(body: unknown, token = testToken) {
  return new Request("http://localhost/api/test", { method: "POST", headers: { authorization: "Bearer " + token }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.resetAllMocks(); process.env.DEMO_ACCESS_TOKEN = testToken;
  mocks.client.mockReturnValue({ rpc: mocks.rpc });
  mocks.bundle.mockResolvedValue(demoBundle);
  mocks.rpc.mockResolvedValue({ error: null, data: null });
});
afterEach(() => { delete process.env.DEMO_ACCESS_TOKEN; });

describe("analysis, task, and review endpoints", () => {
  it("saves comparable listing findings without inventing an AI summary", async () => {
    const response = await analyze(req({}), context);
    expect(response.status).toBe(200);
    const params = mocks.rpc.mock.calls[0][1];
    expect(params.p_findings).toHaveLength(3);
    expect(params.p_findings[0].status).toBe("documented_mismatch");
    expect((await response.json()).data.artifacts).toEqual([]);
  });
  it("rejects unauthorized requests before accessing the database", async () => {
    expect((await analyze(req({}, "incorrect"), context)).status).toBe(401);
    expect((await tasks(req({}, "incorrect"), context)).status).toBe(401);
    expect((await review(req({}, "incorrect"), context)).status).toBe(401);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it("rejects invalid tasks and maps stale reviews to conflicts", async () => {
    expect((await tasks(req({}), context)).status).toBe(400);
    mocks.rpc.mockResolvedValue({ error: { code: "40001" } });
    expect((await review(req({ version: 1, decision: "approved", reviewerRole: "support", comment: "" }), context)).status).toBe(409);
  });
});
