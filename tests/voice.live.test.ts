import { spawn, execFile, type ChildProcess } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Browser } from "playwright";
import { startLocalSpeech } from "../scripts/lib/local-stt.mjs";
import { AUTH_SESSION_COOKIE, createAuthSession } from "@/lib/server/access";
import { mockGeneratedBundle } from "./fixtures/generation";
vi.mock("server-only", () => ({}));

// Genuine recorded speech -> real browser capture -> real Next transcription
// route -> real CPU Whisper. Only case-read data is a UI fixture. Browser
// recognition uses the actual vendor API, with NO injected recognition events.
const cases = ["api", "browser"].flatMap((mode) => ["zh-CN", "en-US"].flatMap((locale) => ["initial", "revision"].map((context) => [mode, locale, context] as const)));
describe.skipIf(process.env.RELOOP_REAL_VOICE_TESTS !== "1")("eight genuine recorded-speech acceptance combinations", () => {
  let service: Awaited<ReturnType<typeof startLocalSpeech>>;
  let next: ChildProcess;
  let chromium: typeof import("playwright")["chromium"];
  let cookie: string;
  const base = "http://127.0.0.1:" + (process.env.RELOOP_VOICE_TEST_PORT || "3002");
  const durations: Record<string, number> = {};
  const samples: Record<string, string> = {};
  const results: Record<string, unknown>[] = [];
  const folder = new URL("../test-results/", import.meta.url);
  beforeAll(async () => {
    ({ chromium } = await import("playwright"));
    const python = process.env.RELOOP_STT_PYTHON || fileURLToPath(new URL("../.local-reviews/stt-venv/Scripts/python.exe", import.meta.url));
    for (const [locale, name] of [["zh-CN", "recorded-zh-example.wav"], ["en-US", "recorded-en-jfk.flac"]]) {
      const source = fileURLToPath(new URL(name, folder));
      const destination = fileURLToPath(new URL(`real-voice-${locale}.wav`, folder));
      const output = await promisify(execFile)(python, [fileURLToPath(new URL("../scripts/local-stt/prepare_audio.py", import.meta.url)), source, destination], { windowsHide: true });
      durations[locale] = Number(output.stdout.trim());
      samples[locale] = destination;
    }
    service = await startLocalSpeech();
    const key = randomBytes(40).toString("hex");
    const previous = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = key;
    try { cookie = createAuthSession("synthetic-voice-acceptance-session"); }
    finally { if (previous === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previous; }
    const port = new URL(base).port;
    next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port], {
      windowsHide: true, stdio: "ignore",
      env: { ...process.env, ...service.env, SUPABASE_URL: "http://127.0.0.1:9", SUPABASE_SERVICE_ROLE_KEY: key, NODE_ENV: "production", NO_PROXY: "localhost,127.0.0.1" },
    });
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (next.exitCode !== null) throw new Error("Voice test app exited before startup.");
      try { if ((await fetch(base + "/login")).ok) { ready = true; break; } } catch { /* startup */ }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("Voice test app did not start.");
  }, 240000);
  afterAll(async () => {
    next?.kill(); service?.stop();
    await mkdir(folder, { recursive: true });
    await writeFile(new URL(`real-voice-matrix-${Date.now()}.json`, folder), JSON.stringify({ source: "genuine prerecorded human speech via fake capture; no physical microphone claim", caseReads: "UI fixture only", results }, null, 2));
  });
  it.each(cases)("%s / %s / %s", async (mode, locale, instructionContext) => {
    let browser: Browser | undefined;
    let apiCalls = 0;
    let workflowWrites = 0;
    let recognizedText = "";
    let diagnosticPage: import("playwright").Page | undefined;
    try {
      browser = await chromium.launch({ channel: process.env.RELOOP_BROWSER_CHANNEL || "msedge", headless: true,
        args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${samples[locale]}%noloop`],
      });
      const context = await browser.newContext({ permissions: ["microphone"] });
      await context.addCookies([{ name: AUTH_SESSION_COOKIE, value: cookie, url: base, httpOnly: true, sameSite: "Strict" }]);
      const page = await context.newPage();
      diagnosticPage = page;
      if (mode === "browser") await page.addInitScript(() => {
        const scope = window as typeof window & { SpeechRecognition?: new () => EventTarget; webkitSpeechRecognition?: new () => EventTarget; __speechEvents?: unknown[] };
        const Native = scope.SpeechRecognition || scope.webkitSpeechRecognition;
        scope.__speechEvents = [];
        if (Native) {
          const prototype = Native.prototype as EventTarget & { start(): void };
          const original = prototype.start;
          prototype.start = function () {
            for (const name of ["start", "audiostart", "soundstart", "speechstart", "speechend", "audioend", "result", "error", "end"]) this.addEventListener(name, (event) => {
              const detail = event as Event & { error?: string };
              scope.__speechEvents!.push({ event: name, ...(detail.error ? { code: detail.error } : {}) });
            });
            return original.call(this);
          };
        }
      });
      page.setDefaultTimeout(130000);
      const fixture = mockGeneratedBundle;
      await context.route("**/api/**", async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path === "/api/transcribe") { apiCalls++; await route.continue(); return; }
        if (path.startsWith("/api/auth/")) { await route.continue(); return; }
        if (request.method() !== "GET") { workflowWrites++; await route.abort(); return; }
        const data = path === "/api/cases" ? { cases: [fixture.case] } : fixture;
        await route.fulfill({ json: { ok: true, data, error: null, requestId: randomUUID() } });
      });
      await page.goto(base + (instructionContext === "initial" ? "/feedback" : `/cases/${fixture.case.id}/fix`));
      const parent = instructionContext === "initial" ? page.locator("form.card") : page.locator(".artifact-workspace").first();
      const input = instructionContext === "initial" ? page.locator("#merchant-instruction") : parent.locator('textarea[name="promptText"]');
      const voice = parent.locator(".voice-input").first();
      await input.fill("Preserve my typed instruction.");
      if (instructionContext === "initial") await page.locator("#merchant-locale").selectOption(locale);
      else await parent.getByRole("combobox", { name: "Instruction & voice language" }).selectOption(locale);
      await voice.locator("select").selectOption(mode);
      await voice.locator(".mic-button").click();
      // Capture actual recorded speech frames; no event/response substitution.
      await page.waitForTimeout(Math.min(durations[locale] * 1000 + 750, 55000));
      if (await voice.getByRole("button", { name: "Stop & transcribe", exact: true }).isVisible()) await voice.getByRole("button", { name: "Stop & transcribe", exact: true }).click();
      const preview = voice.locator(".voice-transcript textarea");
      await Promise.race([preview.waitFor(), voice.locator(".voice-error").waitFor().then(() => { throw new Error(mode === "browser" ? "BROWSER_NO_USABLE_TRANSCRIPT" : "CONFIGURED_STT_FAILED"); })]);
      const text = await preview.inputValue();
      recognizedText = text;
      expect(text.trim().length).toBeGreaterThan(8);
      expect(locale === "zh-CN" ? /达摩|達摩/.test(text) && /语音|語音|模型/.test(text) : /country/i.test(text) && /ask/i.test(text)).toBe(true);
      expect(await input.inputValue()).toBe("Preserve my typed instruction.");
      expect(workflowWrites).toBe(0);
      await preview.fill(text + " [edited]");
      await voice.getByRole("button", { name: "Use transcript", exact: true }).click();
      expect(await input.inputValue()).toContain(text + " [edited]");
      expect(await input.inputValue()).toContain("Preserve my typed instruction.");
      expect(apiCalls).toBe(mode === "api" ? 1 : 0);
      expect(workflowWrites).toBe(0);
      results.push({ mode, locale, context: instructionContext, status: mode === "api" ? "VERIFIED WITH REAL AUDIO FILE" : "VERIFIED LIVE", transcript: text, apiCalls, workflowWrites });
    } catch (error) {
      const events = diagnosticPage ? await diagnosticPage.evaluate(() => (window as typeof window & { __speechEvents?: unknown[] }).__speechEvents || []).catch(() => []) : [];
      results.push({ mode, locale, context: instructionContext, status: "FAILED", reason: error instanceof Error && /BROWSER_NO_USABLE_TRANSCRIPT|CONFIGURED_STT_FAILED/.test(error.message) ? error.message : "Voice acceptance assertion or browser failure", recognizedText, events, apiCalls, workflowWrites });
      throw error;
    } finally { await browser?.close(); }
  }, 180000);
});
