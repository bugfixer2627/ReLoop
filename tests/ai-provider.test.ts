import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoBundle } from "@/lib/fixtures/demo";
import { createOpenAICompatibleAdapters, ProviderError } from "@/lib/ai/openai-compatible";

vi.mock("server-only", () => ({}));

function response(content: unknown, status = 200) {
  return new Response(JSON.stringify(content), { status, headers: { "Content-Type": "application/json" } });
}

describe("OpenAI-compatible provider adapter", () => {
  const fetcher = vi.fn<typeof fetch>();
  const adapter = () => createOpenAICompatibleAdapters({
    apiKey: "test-key",
    baseUrl: "https://provider.example/v1",
    model: "test-model",
    fetcher,
  });

  beforeEach(() => fetcher.mockReset());

  it("translates only the supplied text and preserves a separate translation prompt", async () => {
    fetcher.mockResolvedValueOnce(response({ choices: [{ message: { content: JSON.stringify({ text: "电池可使用2小时。" }) } }] }));
    expect(await adapter().ai.translate("Battery lasts 2 hours.", "en-US", "zh-CN")).toBe("电池可使用2小时。");
    const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
    expect(body.messages[0].content).toContain("Translate");
    expect(JSON.parse(body.messages[1].content)).toEqual({ text: "Battery lasts 2 hours." });
  });

  it("extracts only a validated structure and sends the configured model", async () => {
    fetcher.mockResolvedValueOnce(response({
      choices: [{ message: { content: JSON.stringify({ issue: "Short runtime", customerClaim: null, unknowns: ["conditions"] }) } }],
    }));
    const result = await adapter().ai.extract(demoBundle);
    expect(result.issue).toBe("Short runtime");
    const [, init] = fetcher.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toMatchObject({ model: "test-model", response_format: { type: "json_object" } });
    expect(JSON.stringify(init?.body)).not.toContain("test-key");
    const payload = JSON.parse(String(init?.body));
    expect(JSON.parse(payload.messages[1].content)).toEqual({ feedbackText: demoBundle.case.feedbackText, feedbackLocale: demoBundle.case.feedbackLocale });
  });

  it("rejects content that does not match the platform-specific schema", async () => {
    fetcher.mockResolvedValueOnce(response({
      choices: [{ message: { content: JSON.stringify({ format: "support_reply", subject: "Wrong format", body: "Not a listing." }) } }],
    }));
    await expect(adapter().ai.generateListing(demoBundle, "alibaba_intl")).rejects.toMatchObject({ code: "INVALID_MODEL_OUTPUT" });
  });

  it("validates JSON inside the organizer gateway's exact escape envelope", async () => {
    fetcher.mockResolvedValueOnce(response({ choices: [{ message: { content: '<escape>{"issue":"Short runtime","customerClaim":null,"unknowns":["conditions"]}</escape>' } }] }));
    expect((await adapter().ai.extract(demoBundle)).issue).toBe("Short runtime");
  });

  it.each(['prefix <escape>{"issue":"test","customerClaim":null,"unknowns":[]}</escape>', '<escape>{"issue":42}</escape>', '<escape><escape>{"issue":"test"}</escape></escape>'])("does not salvage prose or invalid schemas from gateway output", async (content) => {
    fetcher.mockResolvedValueOnce(response({ choices: [{ message: { content } }] }));
    await expect(adapter().ai.extract(demoBundle)).rejects.toMatchObject({ code: "INVALID_MODEL_OUTPUT" });
  });

  it("maps provider throttling without exposing provider response text", async () => {
    fetcher.mockResolvedValueOnce(response({ error: { message: "private provider detail" } }, 429));
    const error = await adapter().ai.extract(demoBundle).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toMatchObject({ code: "RATE_LIMITED", status: 429, retryable: true });
    expect((error as Error).message).not.toContain("private");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403])("maps rejected credentials (%s) to configuration failure without exposing provider details", async (status) => {
    fetcher.mockResolvedValueOnce(response({ error: { message: "private credential information" } }, status));
    await expect(adapter().ai.extract(demoBundle)).rejects.toMatchObject({ code: "NOT_CONFIGURED", status: 503, retryable: false });
  });

  it("uses verbose speech output and returns measured duration", async () => {
    fetcher.mockImplementationOnce(async (_input, init) => {
      const form = init?.body as FormData;
      expect(form.get("language")).toBe("zh");
      expect(form.get("response_format")).toBe("verbose_json");
      expect((form.get("file") as File).name).toBe("reloop-audio.webm");
      return response({ text: "请核对测试条件。", duration: 8.25 });
    });
    const result = await adapter().transcription.transcribe(new Uint8Array([1, 2, 3]), "audio/webm", "zh-CN");
    expect(result).toEqual({ text: "请核对测试条件。", locale: "zh-CN", durationSeconds: 8.25 });
  });
});
