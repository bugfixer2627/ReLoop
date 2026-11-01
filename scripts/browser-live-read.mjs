import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadProjectEnv } from "./load-env.mjs";

// Actual app/Supabase reads, with no route interception or hosted writes.
// The microphone is a synthetic browser device; recognition is not claimed.
loadProjectEnv();
const { chromium } = await import(process.env.RELOOP_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.RELOOP_BASE_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname)) throw new Error("Use a local app.");
const fixture = JSON.parse(await readFile(new URL("../src/lib/fixtures/demo.json", import.meta.url), "utf8"));
const browser = await chromium.launch({ channel: process.env.RELOOP_BROWSER_CHANNEL || "msedge", headless: true, args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
let stage = "login";
try {
  const context = await browser.newContext({ permissions: ["microphone"] });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(base + "/login");
  await page.locator("#access-token").fill(process.env.DEMO_ACCESS_TOKEN);
  await page.getByRole("button", { name: "Enter workspace" }).click();
  await page.waitForURL("**/dashboard");
  console.log("PASS LIVE browser login and protected case-list read");
  stage = "seeded case";
  await page.locator('a[href="/cases/' + fixture.case.id + '"]').first().click();
  await page.getByText("SPEC-001", { exact: false }).first().waitFor();
  await page.getByText("3", { exact: true }).first().waitFor();
  console.log("PASS LIVE browser seeded investigation and source reads");
  stage = "speech failure fallback";
  await page.locator('.side-nav a[href="/feedback"]').click();
  await page.locator("#merchant-instruction").fill("Preserve this typed instruction.");
  await page.getByRole("button", { name: "Start voice input" }).click();
  await page.getByText(/Recording…/).waitFor();
  await page.waitForTimeout(450);
  const response = page.waitForResponse((res) => new URL(res.url()).pathname === "/api/transcribe");
  await page.getByRole("button", { name: "Stop & transcribe" }).click();
  const speech = await response;
  assert.equal(speech.status(), 503);
  await page.locator(".voice-error").waitFor();
  assert.equal(await page.locator("#merchant-instruction").inputValue(), "Preserve this typed instruction.");
  console.log("PASS actual speech API reports missing speech configuration and preserves typing (fake microphone; no recognition claimed)");
} catch {
  // Never dump fill arguments, token values or request headers on failure.
  console.error("Live browser read verification failed at:", stage);
  process.exitCode = 1;
} finally { await browser.close(); }
