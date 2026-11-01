import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { getDatabaseClient, signInWithPassword } = vi.hoisted(() => ({ getDatabaseClient: vi.fn(), signInWithPassword: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ getDatabaseClient }));

import { POST } from "@/app/api/auth/login/route";
import { GET } from "@/app/api/auth/session/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { checkAccess } from "@/lib/server/access";
import { mutationGuard } from "@/lib/server/request-guards";

const userId = "00000000-0000-4000-8000-000000000001";
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

beforeEach(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key-that-is-long-enough";
  signInWithPassword.mockReset();
  getDatabaseClient.mockReturnValue({ auth: { signInWithPassword } });
});
afterEach(() => {
  if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
});

function login(body: unknown) {
  return POST(new Request("http://localhost/api/auth/login", {
    method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify(body),
  }));
}

describe("Supabase email sign-in", () => {
  it("sets an HttpOnly session cookie after Supabase accepts credentials", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { id: userId }, session: { access_token: "provider-token" } }, error: null });
    const response = await login({ email: "merchant@example.com", password: "correct horse" });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")?.toLowerCase()).toContain("samesite=strict");
    expect(response.headers.get("set-cookie")).not.toContain("provider-token");
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    const request = new Request("http://localhost/api/cases", { headers: { cookie } });
    expect(checkAccess(request)).toBeNull();
  });

  it("returns a generic credential error without setting a cookie", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: new Error("private auth detail") });
    const response = await login({ email: "merchant@example.com", password: "wrong" });
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(JSON.stringify(await response.json())).not.toContain("private auth detail");
  });

  it("rejects malformed and cross-origin login requests", async () => {
    expect((await login({ email: "bad", password: "x" })).status).toBe(400);
    const response = await POST(new Request("http://localhost/api/auth/login", {
      method: "POST", headers: { origin: "https://elsewhere.example", "content-type": "application/json" }, body: JSON.stringify({ email: "merchant@example.com", password: "x" }),
    }));
    expect(response.status).toBe(403);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("accepts only the configured network host as a development origin", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RELOOP_DEV_ORIGINS", "10.30.0.95");
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST", headers: { origin: "http://10.30.0.95:3000" },
    });
    expect(mutationGuard(request, { name: "origin-test", limit: 5, windowMs: 60_000 })).toBeNull();
    const foreign = new Request("http://localhost:3000/api/auth/login", {
      method: "POST", headers: { origin: "http://other.example:3000" },
    });
    expect(mutationGuard(foreign, { name: "origin-test", limit: 5, windowMs: 60_000 })?.status).toBe(403);
    vi.unstubAllEnvs();
  });

  it("reports cookie session state and clears it on sign-out", async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { id: userId }, session: { access_token: "provider-token" } }, error: null });
    const response = await login({ email: "merchant@example.com", password: "correct horse" });
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    expect((await GET(new Request("http://localhost/api/auth/session", { headers: { cookie } }))).status).toBe(200);
    const signedOut = await logout(new Request("http://localhost/api/auth/logout", { method: "POST", headers: { origin: "http://localhost", cookie } }));
    expect(signedOut.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(checkAccess(new Request("http://localhost/api/cases", { headers: { cookie: signedOut.headers.get("set-cookie")!.split(";")[0] } }))?.status).toBe(401);
  });
});
