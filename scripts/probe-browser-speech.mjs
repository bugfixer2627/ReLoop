import { chromium } from "playwright";
import { access, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Opt-in real vendor speech recognition, using an explicitly supplied test
// WAV via Chromium's fake audio device. Never records the user's microphone.
// No API interception; a failure is reported as a failure, never mocked success.
const audio = resolve(process.env.RELOOP_SPEECH_SAMPLE || "test-results/speech-probe-en.wav");
await access(audio);
const locale = process.env.RELOOP_SPEECH_LOCALE || "en-US";
if (!["zh-CN", "en-US"].includes(locale)) throw new Error("Unsupported probe language.");
const browser = await chromium.launch({ channel: process.env.RELOOP_BROWSER_CHANNEL || "msedge", headless: true,
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-audio-capture=${audio}`],
});
try {
  const context = await browser.newContext({ permissions: ["microphone"] });
  const page = await context.newPage();
  await page.goto(process.env.RELOOP_BASE_URL || "http://localhost:3000/login");
  const result = await page.evaluate((language) => new Promise((resolveResult) => {
    const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Constructor) { resolveResult({ status: "unsupported" }); return; }
    const recognition = new Constructor();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;
    let finished = false;
    const finish = (value) => { if (!finished) { finished = true; clearTimeout(timer); try { recognition.abort(); } catch {} resolveResult(value); } };
    const timer = setTimeout(() => finish({ status: "timeout" }), 20000);
    recognition.onresult = (event) => {
      const text = Array.from(event.results).map((result) => result[0]?.transcript || '').join(' ').trim();
      if (text) finish({ status: "recognized", characterCount: text.length, expectedTopic: /listing|product|test|conditions|country|ask|达摩|達摩|语音|語音|商品|测试|条件/i.test(text) });
    };
    recognition.onerror = (event) => finish({ status: "error", code: event.error });
    recognition.onend = () => finish({ status: "no-result" });
    try { recognition.start(); } catch { finish({ status: "start-failed" }); }
  }), locale);
  const report = { locale, source: "provided test WAV through fake capture device; not physical microphone acceptance", recognition: "real browser vendor service, no response mocks", result };
  await mkdir(new URL("../test-results/", import.meta.url), { recursive: true });
  await writeFile(new URL(`../test-results/browser-speech-${locale}-${Date.now()}.json`, import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  if (result.status !== "recognized" || !result.expectedTopic) process.exitCode = 1;
} finally { await browser.close(); }
