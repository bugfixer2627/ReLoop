import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoBundle } from "@/lib/fixtures/demo";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ getDatabaseClient: vi.fn(), listCases: vi.fn(), createCase: vi.fn(), getCaseBundle: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getDatabaseClient: mocks.getDatabaseClient }));
vi.mock("@/lib/db/cases", () => ({ listCases: mocks.listCases, createCase: mocks.createCase, getCaseBundle: mocks.getCaseBundle }));
import { GET, POST } from "@/app/api/cases/route";
import { GET as getCase } from "@/app/api/cases/[id]/route";

const payload = { sku: "RL-LAMP-01", channel: "shopify_us", feedbackText: "Battery lasts 2 hours.", feedbackLocale: "en-US", merchantInstruction: "Please investigate", merchantLocale: "en-US", synthetic: true };
const demoToken = "demo-test-token-012345678901234567890";
function request(method = "GET", body?: unknown, token = demoToken) {
  return new Request("http://localhost/api/cases", { method, headers: { authorization: "Bearer " + token, "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
beforeEach(() => { vi.resetAllMocks(); process.env.DEMO_ACCESS_TOKEN = demoToken; mocks.getDatabaseClient.mockReturnValue({}); });
afterEach(() => { delete process.env.DEMO_ACCESS_TOKEN; });

describe("database-backed case routes", () => {
  it("requires a configured token and rejects incorrect tokens", async () => {
    expect((await GET(request("GET", undefined, "wrong"))).status).toBe(401);
    delete process.env.DEMO_ACCESS_TOKEN;
    expect((await GET(request())).status).toBe(503);
    expect(mocks.getDatabaseClient).not.toHaveBeenCalled();
  });
  it("returns the case list", async () => {
    mocks.listCases.mockResolvedValue([demoBundle.case]);
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect((await response.json()).data.cases).toHaveLength(1);
  });
  it("validates inputs and reports an unknown product", async () => {
    expect((await POST(request("POST", {}))).status).toBe(400);
    mocks.createCase.mockResolvedValue(null);
    expect((await POST(request("POST", payload))).status).toBe(404);
  });
  it("creates a case and returns its ID", async () => {
    mocks.createCase.mockResolvedValue(demoBundle.case.id);
    const response = await POST(request("POST", payload));
    expect(response.status).toBe(201);
    expect((await response.json()).data.caseId).toBe(demoBundle.case.id);
  });
  it("rejects cross-origin writes", async () => {
    const req = new Request("http://localhost/api/cases", { method: "POST", headers: { authorization: `Bearer ${demoToken}`, origin: "https://other.example" }, body: JSON.stringify(payload) });
    expect((await POST(req)).status).toBe(403);
    expect(mocks.createCase).not.toHaveBeenCalled();
  });
  it("validates case IDs and loads a case bundle", async () => {
    expect((await getCase(request(), { params: Promise.resolve({ id: "bad" }) })).status).toBe(400);
    mocks.getCaseBundle.mockResolvedValue(demoBundle);
    const response = await getCase(request(), { params: Promise.resolve({ id: demoBundle.case.id }) });
    expect(response.status).toBe(200);
    expect((await response.json()).data.product.id).toBe(demoBundle.product.id);
  });
  it("does not expose database errors", async () => {
    mocks.listCases.mockRejectedValue(new Error("secret database error"));
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("secret database error");
  });
});
