import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { GET, POST } from "@/app/api/access/route";

const originalToken = process.env.DEMO_ACCESS_TOKEN;

afterEach(() => {
  if (originalToken === undefined) delete process.env.DEMO_ACCESS_TOKEN;
  else process.env.DEMO_ACCESS_TOKEN = originalToken;
});

describe("demo access session", () => {
  it("does not require a token for a local, unshared run", async () => {
    delete process.env.DEMO_ACCESS_TOKEN;
    const body = await (await GET(new Request("http://localhost/api/access"))).json();
    expect(body.data).toEqual({ required: false, authenticated: true });
  });

  it("exchanges the configured token for an HttpOnly same-site cookie", async () => {
    const token = "secure-demo-token-".padEnd(40, "x");
    process.env.DEMO_ACCESS_TOKEN = token;
    const response = await POST(new Request("https://demo.example/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://demo.example" },
      body: JSON.stringify({ token }),
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")?.toLowerCase()).toContain("samesite=strict");
    expect(response.headers.get("set-cookie")).toContain("Secure");
  });

  it("rejects weak server tokens and incorrect credentials", async () => {
    process.env.DEMO_ACCESS_TOKEN = "weak";
    const weak = await POST(new Request("http://localhost/api/access", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost" }, body: JSON.stringify({ token: "weak" }),
    }));
    expect(weak.status).toBe(503);
    process.env.DEMO_ACCESS_TOKEN = "x".repeat(32);
    const wrong = await POST(new Request("http://localhost/api/access", {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost" }, body: JSON.stringify({ token: "wrong" }),
    }));
    expect(wrong.status).toBe(401);
  });
});
