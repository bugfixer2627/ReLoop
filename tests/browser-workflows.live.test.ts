import { createServer, type Server } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sqlFetch } from "./helpers/sql-client";
import { createAuthSession, AUTH_SESSION_COOKIE } from "@/lib/server/access";
import { caseBundleResponseSchema } from "@/lib/contracts";
import { demoBundle } from "@/lib/fixtures/demo";
vi.mock("server-only", () => ({}));

// Opt-in integration boundary: actual browser/server/provider and PostgreSQL.
// Supabase HTTP transport and the browser's pre-provisioned test session are
// substitutes. This does not test Supabase Auth login or hosted persistence.
describe.skipIf(process.env.RELOOP_BROWSER_WORKFLOWS !== "1")("real browser workflows with real AI and isolated SQL", () => {
  let db: PGlite;
  let bridge: Server;
  let next: ChildProcess;
  let browser: Awaited<ReturnType<(typeof import("playwright"))["chromium"]["launch"]>>;
  let cookie: string;
  const port = Number(process.env.RELOOP_BROWSER_TEST_PORT || 3001);
  const base = `http://127.0.0.1:${port}`;
  const folder = new URL("../test-results/", import.meta.url);

  beforeAll(async () => {
    const playwrightModule = process.env.RELOOP_PLAYWRIGHT_MODULE || "playwright";
    const { chromium } = await import(/* webpackIgnore: true */ playwrightModule);
    db = new PGlite();
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    const directory = new URL("../supabase/migrations/", import.meta.url);
    for (const name of (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort()) await db.exec(await readFile(new URL(name, directory), "utf8"));
    await db.exec(await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"));
    const localKey = randomBytes(40).toString("hex");
    const transport = sqlFetch(db);
    bridge = createServer(async (req, res) => {
      try {
        if (req.headers.apikey !== localKey || !req.url?.startsWith("/rest/v1/")) { res.writeHead(403).end(); return; }
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 1024 * 1024) { res.writeHead(413).end(); return; } chunks.push(chunk); }
        const response = await transport(new Request("http://127.0.0.1" + req.url, {
          method: req.method, headers: req.headers as Record<string, string>,
          ...(["GET", "HEAD"].includes(req.method!) ? {} : { body: Buffer.concat(chunks) }),
        }));
        res.writeHead(response.status, { "content-type": "application/json" });
        res.end(await response.text());
      } catch { res.writeHead(500).end('{"message":"Local SQL transport failed"}'); }
    });
    await new Promise<void>((resolve) => bridge.listen(0, "127.0.0.1", resolve));
    const address = bridge.address() as { port: number };
    const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = localKey;
    try { cookie = createAuthSession("synthetic-local-browser-test"); }
    finally { if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey; }
    next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
      stdio: "ignore", windowsHide: true,
      env: { ...process.env, NODE_ENV: "production", SUPABASE_URL: `http://127.0.0.1:${address.port}`, SUPABASE_SERVICE_ROLE_KEY: localKey, NO_PROXY: "localhost,127.0.0.1" },
    });
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (next.exitCode !== null) throw new Error("Local test app exited before startup; check the test port.");
      try { if ((await fetch(base + "/api/health")).ok) { ready = true; break; } } catch { /* Wait for startup. */ }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("Local test app did not start.");
    browser = await chromium.launch({ channel: process.env.RELOOP_BROWSER_CHANNEL || "msedge", headless: true });
    await mkdir(folder, { recursive: true });
  }, 60000);
  afterAll(async () => {
    await browser?.close();
    next?.kill();
    if (bridge) { bridge.closeAllConnections(); await new Promise<void>((resolve) => bridge.close(() => resolve())); }
    await db?.close();
  });

  it.each(["zh-CN", "en-US"] as const)("completes typed %s workflows A/B, two listing revisions, review and QA, then reloads", async (locale) => {
    const context = await browser.newContext();
    await context.addCookies([{ name: AUTH_SESSION_COOKIE, value: cookie, url: base, httpOnly: true, sameSite: "Strict" }]);
    const page = await context.newPage();
    page.setDefaultTimeout(180000);
    const pageErrors: string[] = [];
    const attempts: { stage: string; attempt: number; result: string }[] = [];
    page.on("pageerror", () => pageErrors.push("uncaught page error"));
    async function action(stage: string, click: () => Promise<unknown>) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        const [response] = await Promise.all([page.waitForResponse((result) => result.url().endsWith("/" + stage)), click()]);
        const body = await response.json();
        attempts.push({ stage, attempt, result: body.ok ? "saved" : body.error.code });
        if (body.ok) return;
        if (!body.error.retryable || attempt === 2) throw new Error(`Browser ${stage} failed: ${body.error.code}`);
        console.log("Retrying browser action after transient provider failure:", stage, body.error.code);
      }
    }
    try {
      await page.goto(base + "/feedback");
      await page.locator("#merchant-instruction").waitFor();
      await page.locator("#sku").fill("RL-LAMP-01");
      await page.locator("#merchant-locale").selectOption(locale);
      await page.locator("#customer-feedback").fill(demoBundle.case.feedbackText);
      await page.locator("#merchant-instruction").fill(locale === "zh-CN" ? demoBundle.case.merchantInstruction : "Investigate the complaint against documented conditions and compare all three listing snapshots. Preserve uncertainty.");
      const [createdResponse, analysisResponse] = await Promise.all([
        page.waitForResponse((response) => new URL(response.url()).pathname === "/api/cases" && response.request().method() === "POST"),
        page.waitForResponse((response) => response.url().endsWith("/analyze")),
        page.getByRole("button", { name: "Save and analyze", exact: true }).click(),
      ]);
      const created = await createdResponse.json();
      expect(created.ok).toBe(true);
      const caseId = created.data.caseId as string;
      // UI preserves saved case IDs on failure; retry that analysis, never create duplicates.
      const analysis = await analysisResponse.json();
      attempts.push({ stage: "analyze", attempt: 1, result: analysis.ok ? "saved" : analysis.error.code });
      if (!analysis.ok) {
        if (!analysis.error.retryable) throw new Error("Browser analyze failed: " + analysis.error.code);
        await action("analyze", () => page.getByRole("button", { name: "Retry evidence check", exact: true }).click());
      }
      await page.waitForURL(`**/cases/${caseId}`, { timeout: 180000 });
      const summary = await context.request.get(base + `/api/cases/${caseId}`);
      const summaryBody = caseBundleResponseSchema.parse(await summary.json());
      expect(summaryBody.ok && summaryBody.data.versions.some((version) => version.content.format === "investigation_summary")).toBe(true);
      await page.goto(base + `/cases/${caseId}/fix`);
      await action("support", () => page.getByRole("button", { name: "Generate support reply", exact: true }).click());
      await page.locator(".artifact-workspace").first().waitFor();
      await action("repair", () => page.getByRole("button", { name: "Generate three listing corrections", exact: true }).click());
      await page.locator(".artifact-workspace").nth(1).waitFor();
      const platformButtons = page.locator(".platform-toolbar button");
      for (const button of await platformButtons.all()) {
        await button.click();
        await page.locator(".artifact-workspace").nth(1).locator(".artifact-compare").waitFor();
      }
      await platformButtons.first().click();
      for (const [version, prompt] of [[2, "请简化英文商品描述，保留已记录的测试条件和不确定性，不添加新承诺。"], [3, "Make the English listing concise; keep documented conditions and uncertainty. Do not invent product claims."]] as const) {
        const workspace = page.locator(".artifact-workspace").nth(1);
        await workspace.getByRole("combobox", { name: "Instruction & voice language" }).selectOption(version === 2 ? "zh-CN" : "en-US");
        await workspace.locator('textarea[name="promptText"]').fill(prompt);
        await action("revise", () => workspace.getByRole("button", { name: "Submit revision", exact: true }).click());
        await workspace.locator(".card-title-row").first().getByText(new RegExp(`v${version} ·`)).waitFor();
      }
      const listing = page.locator(".artifact-workspace").nth(1);
      await listing.getByRole("combobox", { name: "Review decision" }).selectOption("changes_requested");
      await listing.getByRole("button", { name: "Submit review", exact: true }).click();
      const reviewPromise = page.waitForResponse((response) => response.url().endsWith("/review"));
      await listing.getByRole("button", { name: "Confirm & save", exact: true }).click();
      expect((await reviewPromise).status()).toBe(200);
      const taskPromise = page.waitForResponse((response) => response.url().endsWith("/tasks"));
      await page.getByRole("button", { name: "Create QA follow-up", exact: true }).click();
      expect((await taskPromise).status()).toBe(200);
      await page.reload();
      await page.locator(".artifact-workspace").nth(1).waitFor();
      const loaded = caseBundleResponseSchema.parse(await (await context.request.get(base + `/api/cases/${caseId}`)).json());
      if (!loaded.ok) throw new Error(loaded.error.code);
      expect(loaded.data.artifacts).toHaveLength(5);
      expect(loaded.data.versions).toHaveLength(7);
      expect(loaded.data.revisions).toHaveLength(2);
      expect(loaded.data.tasks).toHaveLength(1);
      expect(loaded.data.audit).toHaveLength(9);
      expect(loaded.data.versions.some((version) => version.version === 3 && version.reviewStatus === "changes_requested")).toBe(true);
      expect(pageErrors).toEqual([]);
      const stamp = Date.now();
      await page.screenshot({ path: fileURLToPath(new URL(`browser-workflow-${locale}-${stamp}.png`, folder)), fullPage: true });
      await writeFile(new URL(`browser-workflow-${locale}-${stamp}.json`, folder), JSON.stringify({ locale, realAI: true, realBrowser: true, database: "isolated PGlite via test-only PostgREST transport", authentication: "synthetic signed test session, not live login", voice: "not tested by this typed workflow", attempts, bundle: loaded.data }, null, 2));
    } finally { await context.close(); }
  }, 600000);
});
