import { beforeEach, describe, expect, it, vi } from "vitest";
import { transcriptionResponseSchema } from "@/lib/contracts";

vi.mock("server-only", () => ({}));
const { getTranscriptionAdapter } = vi.hoisted(() => ({ getTranscriptionAdapter: vi.fn() }));
vi.mock("@/lib/ai/openai-compatible", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/openai-compatible")>()),
  getTranscriptionAdapter,
}));

import { POST } from "@/app/api/transcribe/route";

function request(locale = "en-US", mimeType = "audio/webm", bytes = new Uint8Array([1, 2, 3])) {
  const form = new FormData();
  form.set("locale", locale);
  form.set("audio", new File([bytes], "sample.webm", { type: mimeType }));
  return new Request("http://localhost/api/transcribe", {
    method: "POST", headers: { Origin: "http://localhost" }, body: form,
  });
}

describe("POST /api/transcribe", () => {
  beforeEach(() => {
    getTranscriptionAdapter.mockReset();
    delete process.env.DEMO_ACCESS_TOKEN;
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

  it("rejects audio over 60 seconds and returns no transcript", async () => {
    getTranscriptionAdapter.mockReturnValue({
      transcribe: vi.fn().mockResolvedValue({ text: "too long", locale: "en-US", durationSeconds: 61 }),
    });
    const response = await POST(request());
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "AUDIO_TOO_LARGE" } });
  });

  it("does not accept a transcript when speech service credentials are missing", async () => {
    getTranscriptionAdapter.mockReturnValue(null);
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "NOT_CONFIGURED" } });
  });

  it("requires the configured demo access cookie", async () => {
    process.env.DEMO_ACCESS_TOKEN = "a".repeat(32);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "UNAUTHORIZED" } });
  });
});
