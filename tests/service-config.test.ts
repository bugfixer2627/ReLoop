import { describe, expect, it, vi } from "vitest";
import { generationConfig, transcriptionConfig } from "@/lib/ai/config.mjs";
import { normalizeSupabaseUrl } from "@/lib/db/config.mjs";
import { postgresConfig } from "../scripts/postgres-config.mjs";

describe("service configuration regressions", () => {
  it.each(["https://example.supabase.co", "https://example.supabase.co/", "https://example.supabase.co/rest/v1", "https://example.supabase.co/rest/v1/"])("uses the project origin for copied Supabase URL %s", (url) => {
    expect(normalizeSupabaseUrl(url)).toBe("https://example.supabase.co");
  });
  it.each(["https://example.supabase.co/rest/v1/products", "https://user:pass@example.supabase.co", "https://example.supabase.co?key=test", "http://remote.example", "not-a-url"])("rejects ambiguous or insecure Supabase URL %s", (url) => {
    expect(normalizeSupabaseUrl(url)).toBeNull();
  });
  it("supports the existing standard OpenAI key name with documented models", () => {
    const env = { OPENAI_API_KEY: "test-only-key" };
    expect(generationConfig(env)).toEqual({ apiKey: "test-only-key", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" });
    expect(transcriptionConfig(env)).toEqual({ apiKey: "test-only-key", baseUrl: "https://api.openai.com/v1", model: "whisper-1" });
  });
  it("does not forward the OpenAI fallback key to an unrelated provider", () => {
    const env = { OPENAI_API_KEY: "test-only-key", LLM_BASE_URL: "https://other.example/v1", LLM_MODEL: "custom" };
    expect(generationConfig(env)).toBeNull();
    expect(transcriptionConfig({ ...env, TRANSCRIPTION_MODEL: "speech" })).toBeNull();
  });
  it("does not forward the generation key to a different speech provider", () => {
    expect(transcriptionConfig({ LLM_API_KEY: "generation-test", LLM_BASE_URL: "https://chat.example/v1", TRANSCRIPTION_BASE_URL: "https://speech.example/v1", TRANSCRIPTION_MODEL: "speech" })).toBeNull();
  });
  it("preserves explicit compatible provider configuration", () => {
    const env = { OPENAI_API_KEY: "fallback-test", LLM_API_KEY: "explicit-test", LLM_BASE_URL: "https://chat.example/v1", LLM_MODEL: "custom", TRANSCRIPTION_API_KEY: "speech-test", TRANSCRIPTION_BASE_URL: "https://speech.example/v1", TRANSCRIPTION_MODEL: "custom-speech" };
    expect(generationConfig(env)?.apiKey).toBe("explicit-test");
    expect(transcriptionConfig(env)?.apiKey).toBe("speech-test");
  });
  it("enforces certificate validation even when the connection string says sslmode=require", async () => {
    const config = await postgresConfig({ DATABASE_URL: "postgresql://test:encoded%40password@pooler.example:5432/postgres?sslmode=require" }, "6543");
    expect(config.ssl.rejectUnauthorized).toBe(true);
    expect(new URL(config.connectionString).port).toBe("6543");
    expect(new URL(config.connectionString).searchParams.has("sslmode")).toBe(false);
  });
});

vi.mock("server-only", () => ({}));
import { getDatabaseClient } from "@/lib/db/client";
it("the actual SDK reaches /rest/v1/products once when a REST root was copied", async () => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co/rest/v1/");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
  const fetcher = vi.fn().mockResolvedValue(Response.json([]));
  vi.stubGlobal("fetch", fetcher);
  try {
    await getDatabaseClient()!.from("products").select("id");
    expect(new URL(fetcher.mock.calls[0][0]).pathname).toBe("/rest/v1/products");
  } finally { vi.unstubAllEnvs(); vi.unstubAllGlobals(); }
});
