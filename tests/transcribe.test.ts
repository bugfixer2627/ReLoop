import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { transcriptionResponseSchema } from "@/lib/contracts";

vi.mock("server-only", () => ({}));
const { getTranscriptionAdapter } = vi.hoisted(() => ({ getTranscriptionAdapter: vi.fn() }));
vi.mock("@/lib/ai/openai-compatible", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/openai-compatible")>()),
  getTranscriptionAdapter,
}));

import { POST } from "@/app/api/transcribe/route";
import { ProviderError } from "@/lib/ai/openai-compatible";
let requestNumber = 0;
const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const testToken = "transcription-test-token".padEnd(40, "x");

function request(locale = "en-US", mimeType = "audio/webm", bytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0]), authenticated = true) {
  const form = new FormData();
  form.set("locale", locale);
  form.set("audio", new File([bytes], "sample.webm", { type: mimeType }));
  return new Request("http://localhost/api/transcribe", {
    method: "POST", headers: { Origin: "http://localhost", "x-real-ip": String(++requestNumber), ...(authenticated ? { authorization: `Bearer ${testToken}` } : {}) }, body: form,
  });
}

function wav(seconds: number) {
  const sampleRate = 1000;
  const channels = 1;
  const bits = 8;
  const dataSize = sampleRate * seconds;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);
  for (const [offset, value] of [[0, "RIFF"], [8, "WAVE"], [12, "fmt "], [36, "data"]] as const) {
    for (let index = 0; index < value.length; index += 1) bytes[offset + index] = value.charCodeAt(index);
  }
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, bits, true);
  view.setUint32(40, dataSize, true);
  return bytes;
}

describe("POST /api/transcribe", () => {
  afterEach(() => {
    delete process.env.DEMO_ACCESS_TOKEN;
    if (originalServiceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
  });
  beforeEach(() => {
    getTranscriptionAdapter.mockReset();
    process.env.DEMO_ACCESS_TOKEN = testToken;
  });

  it("returns an editable Chinese transcript requiring confirmation", async () => {
    getTranscriptionAdapter.mockReturnValue({
      transcribe: vi.fn().mockResolvedValue({ text: "请核对证据条件。", locale: "zh-CN", durationSeconds: 12 }),
    });
    const response = await POST(request("zh-CN"));
    const body = transcriptionResponseSchema.parse(await response.json());
    expect(response.status).toBe(200);
    expect(body.ok && body.data).toMatchObject({ text: "请核对证据条件。", locale: "zh-CN", requiresConfirmation: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects unsupported audio before calling a provider", async () => {
    getTranscriptionAdapter.mockReturnValue({ transcribe: vi.fn() });
    const response = await POST(request("en-US", "application/octet-stream"));
    expect(response.status).toBe(415);
    expect(getTranscriptionAdapter).not.toHaveBeenCalled();
  });

  it.each(["audio/webm", "audio/wav", "audio/mp4", "audio/mpeg", "audio/ogg"])("rejects bytes mislabeled as %s before provider use", async (mimeType) => {
    expect((await POST(request("en-US", mimeType, new Uint8Array([1, 2, 3])))).status).toBe(415);
    expect(getTranscriptionAdapter).not.toHaveBeenCalled();
  });

  it("accepts the signed email-auth session cookie", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "transcription-test-service-key";
    const audioRequest = request();
    audioRequest.headers.delete("authorization");
    const { createAuthSession, AUTH_SESSION_COOKIE } = await import("@/lib/server/access");
    audioRequest.headers.set("cookie", `${AUTH_SESSION_COOKIE}=${createAuthSession("00000000-0000-4000-8000-000000000001")}`);
    getTranscriptionAdapter.mockReturnValue({ transcribe: vi.fn().mockResolvedValue({ text: "Keep test conditions.", locale: "en-US", durationSeconds: 3 }) });
    expect((await POST(audioRequest)).status).toBe(200);
  });

  it("rejects an empty request as invalid input", async () => {
    const response = await POST(new Request("http://localhost/api/transcribe", {
      method: "POST", headers: { Origin: "http://localhost", authorization: `Bearer ${testToken}` },
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "INVALID_REQUEST" } });
  });

  it("rejects audio over 60 seconds and returns no transcript", async () => {
    getTranscriptionAdapter.mockReturnValue({
      transcribe: vi.fn().mockResolvedValue({ text: "too long", locale: "en-US", durationSeconds: 61 }),
    });
    const response = await POST(request());
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "AUDIO_TOO_LARGE" } });
  });

  it("rejects an oversized WAV before calling a provider", async () => {
    getTranscriptionAdapter.mockReturnValue({ transcribe: vi.fn() });
    const response = await POST(request("en-US", "audio/wav", wav(61)));
    expect(response.status).toBe(413);
    expect(getTranscriptionAdapter).not.toHaveBeenCalled();
  });

  it("does not accept a transcript when speech service credentials are missing", async () => {
    getTranscriptionAdapter.mockReturnValue(null);
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "NOT_CONFIGURED" } });
  });

  it("requires the configured demo access cookie", async () => {
    process.env.DEMO_ACCESS_TOKEN = testToken;
    const response = await POST(request("en-US", "audio/webm", undefined, false));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
  });

  it.each(["zh-CN", "en-US"])("accepts the frontend bearer flow without a cookie: %s", async (locale) => {
    process.env.DEMO_ACCESS_TOKEN = "b".repeat(32);
    const audioRequest = request(locale);
    audioRequest.headers.set("authorization", "Bearer " + process.env.DEMO_ACCESS_TOKEN);
    audioRequest.headers.delete("origin");
    getTranscriptionAdapter.mockReturnValue({ transcribe: vi.fn().mockResolvedValue({ text: locale === "zh-CN" ? "请保留测试条件。" : "Keep the test conditions.", locale, durationSeconds: 3 }) });
    const response = await POST(audioRequest);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, data: { locale, requiresConfirmation: true } });
  });

  it("rejects cross-origin bearer uploads before provider use", async () => {
    process.env.DEMO_ACCESS_TOKEN = "b".repeat(32);
    const audioRequest = request();
    audioRequest.headers.set("authorization", "Bearer " + process.env.DEMO_ACCESS_TOKEN);
    audioRequest.headers.set("origin", "https://other.invalid");
    expect((await POST(audioRequest)).status).toBe(403);
    expect(getTranscriptionAdapter).not.toHaveBeenCalled();
  });

  it.each([["MODEL_TIMEOUT", 504], ["TRANSCRIPTION_FAILED", 502]] as const)("returns a sanitized %s without transcript", async (code, status) => {
    getTranscriptionAdapter.mockReturnValue({ transcribe: vi.fn().mockRejectedValue(new ProviderError(code, status, true)) });
    const response = await POST(request());
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ ok: false, data: null, error: { code } });
  });

  it("rejects uploads with a declared body larger than 10 MiB", async () => {
    const audioRequest = request();
    audioRequest.headers.set("content-length", String(11 * 1024 * 1024));
    expect((await POST(audioRequest)).status).toBe(413);
    expect(getTranscriptionAdapter).not.toHaveBeenCalled();
  });
});
