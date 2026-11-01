import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Uses a locally installed Playwright module/browser; no hosted writes or keys.
const { chromium } = await import(process.env.RELOOP_PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: process.env.RELOOP_BROWSER_CHANNEL || "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", () => errors.push("pageerror"));
  const base = process.env.RELOOP_BASE_URL || "http://localhost:3000";
  const paths = ["/", "/login", "/dashboard", "/feedback", "/cases/00000000-0000-4000-8000-000000000101", "/cases/00000000-0000-4000-8000-000000000101/fix"];
  await mkdir(new URL("../test-results/", import.meta.url), { recursive: true });
  for (const path of paths) {
    const response = await page.goto(new URL(path, base).href);
    assert.equal(response.status(), 200);
    await page.waitForLoadState("networkidle");
    if (path === "/") await page.screenshot({ path: fileURLToPath(new URL("../test-results/h14h18-landing.png", import.meta.url)), fullPage: true });
    if (path.includes("dashboard") || path.includes("feedback") || path.includes("cases")) await page.getByText("Workspace sign-in required").waitFor();
    console.log("PASS browser route", path);
  }
  await page.goto(new URL("/login", base).href);
  await page.locator("#login-email").waitFor();
  await page.locator("#login-password").waitFor();
  console.log("PASS current login UI renders (no credential submission)");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(widths.document <= widths.viewport + 1, "Mobile landing overflow");
  assert.equal(errors.length, 0, "Browser JavaScript errors");
  console.log("PASS mobile landing and zero uncaught page errors");
} finally { await browser.close(); }
