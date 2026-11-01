import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { loadProjectEnv } from "./load-env.mjs";
import { transcriptionConfig } from "../src/lib/ai/config.mjs";

// Actual provider calls through /api/transcribe; no database writes.
// Use synthetic speech samples only. Raw audio is not copied or saved here.
loadProjectEnv();
const base = new URL(process.env.RELOOP_BASE_URL || "http://localhost:3000");
const args = Object.fromEntries(process.argv.slice(2).filter((arg) => arg.startsWith("--")).map((arg) => { const index = arg.indexOf("="); return [arg.slice(2, index), arg.slice(index + 1)]; }));
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) throw new Error("Use the local app for speech verification.");
if (!transcriptionConfig(process.env)) {
  console.error("Speech is not configured. Set a verified TRANSCRIPTION_BASE_URL, TRANSCRIPTION_MODEL and TRANSCRIPTION_API_KEY locally. Chat compatibility alone does not enable audio.");
  process.exitCode = 1;
} else if (!args.zh || !args.en) {
  console.error('Usage: node scripts/test-live-speech.mjs --zh="Chinese sample path" --en="English sample path" [--zh-expect="expected words"] [--en-expect="expected words"]');
  process.exitCode = 1;
} else {
  const results = [];
  try {
    for (const [name, locale] of [["zh", "zh-CN"], ["en", "en-US"]]) {
      const path = args[name];
      const mime = { ".wav": "audio/wav", ".webm": "audio/webm", ".mp3": "audio/mpeg", ".mp4": "audio/mp4", ".ogg": "audio/ogg" }[extname(path).toLowerCase()];
      if (!mime) throw new Error("UNSUPPORTED_AUDIO");
      const bytes = await readFile(path);
      if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error("AUDIO_TOO_LARGE");
      const form = new FormData();
      form.set("audio", new Blob([bytes], { type: mime }), basename(path));
      form.set("locale", locale);
      const response = await fetch(new URL("/api/transcribe", base), { method: "POST", headers: { Authorization: "Bearer " + process.env.DEMO_ACCESS_TOKEN }, body: form, signal: AbortSignal.timeout(70000) });
      const body = await response.json();
      if (!response.ok || !body.ok || body.data.locale !== locale || !body.data.requiresConfirmation || !body.data.text?.trim()) throw new Error("SPEECH_VERIFICATION_FAILED");
      const expected = args[name + "-expect"];
      const normalize = (text) => text.toLowerCase().replace(/[\s\p{P}]/gu, "");
      const expectedWordsFound = expected ? normalize(body.data.text).includes(normalize(expected)) : null;
      if (expectedWordsFound === false) throw new Error("TRANSCRIPT_WORDS_MISMATCH");
      results.push({ locale, text: body.data.text, requiresConfirmation: true, expectedWordsFound });
      console.log("PASS real speech response and locale:", locale);
    }
    const folder = new URL("../test-results/", import.meta.url);
    await mkdir(folder, { recursive: true });
    await writeFile(new URL(`live-speech-${Date.now()}.json`, folder), JSON.stringify({ realProvider: true, results }, null, 2));
    console.log("Inspect the local transcript artifact to verify accuracy; microphone capture still requires a browser check.");
  } catch {
    console.error("Real speech verification failed; no successful transcription is claimed. Check local configuration, samples, health and provider access.");
    process.exitCode = 1;
  }
}
