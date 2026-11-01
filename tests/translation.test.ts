import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { translationResponseSchema } from "@/lib/contracts";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ translate: vi.fn(), getAiAdapter: vi.fn() }));
vi.mock("@/lib/ai/openai-compatible", async (original) => ({
  ...(await original<typeof import("@/lib/ai/openai-compatible")>()), getAiAdapter: state.getAiAdapter,
}));
import { POST } from "@/app/api/translate/route";
import { ProviderError } from "@/lib/ai/openai-compatible";

const token = "translation-unit-test".padEnd(40, "x");
let requestId = 0;
const input = { text: "Battery lasts 2 hours.", sourceLocale: "en-US", targetLocale: "zh-CN" };
function request(body: unknown, bearer = token, origin = "http://localhost") {
  return new Request("http://localhost/api/translate", {
    method: "POST", headers: { authorization: `Bearer ${bearer}`, origin, "content-type": "application/json", "x-real-ip": String(++requestId) }, body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.stubEnv("DEMO_ACCESS_TOKEN", token);
  state.translate.mockReset(); state.getAiAdapter.mockReset();
  state.getAiAdapter.mockReturnValue({ translate: state.translate });
});
afterEach(() => vi.unstubAllEnvs());

describe("text translation is separate from speech", () => {
  it.each([["en-US", "zh-CN", "电池可使用2小时。"], ["zh-CN", "en-US", "Please confirm the test conditions."]])("translates %s to %s without changing input", async (sourceLocale, targetLocale, text) => {
    state.translate.mockResolvedValue(text);
    const body = { ...input, sourceLocale, targetLocale };
    const response = await POST(request(body));
    expect(response.status).toBe(200);
    const result = translationResponseSchema.parse(await response.json());
    expect(result.ok && result.data).toEqual({ text, sourceLocale, targetLocale });
    expect(body.text).toBe(input.text);
    expect(state.translate).toHaveBeenCalledWith(input.text, sourceLocale, targetLocale);
  });
  it.each([{ ...input, text: " " }, { ...input, targetLocale: "de-DE" }, { ...input, targetLocale: "en-US" }, { ...input, text: "x".repeat(10001) }])("rejects unsupported or invalid input", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(state.translate).not.toHaveBeenCalled();
  });
  it("blocks unauthorized and foreign-origin requests before provider calls", async () => {
    expect((await POST(request(input, "bad"))).status).toBe(401);
    expect((await POST(request(input, token, "https://other.example"))).status).toBe(403);
    expect(state.translate).not.toHaveBeenCalled();
  });
  it("does not fabricate translation when the provider is absent or fails", async () => {
    state.getAiAdapter.mockReturnValue(null);
    expect((await POST(request(input))).status).toBe(503);
    state.getAiAdapter.mockReturnValue({ translate: state.translate });
    state.translate.mockRejectedValue(new ProviderError("MODEL_TIMEOUT", 504, true));
    const response = await POST(request(input));
    expect(response.status).toBe(504);
    expect(await response.json()).toMatchObject({ ok: false, data: null, error: { code: "MODEL_TIMEOUT" } });
    state.translate.mockResolvedValue("");
    expect((await POST(request(input))).status).toBe(502);
  });
});
