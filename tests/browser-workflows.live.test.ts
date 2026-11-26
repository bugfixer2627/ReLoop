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
import { mockGeneratedBundle } from "./fixtures/generation";
vi.mock("server-only", () => ({}));

const mode = process.env.RELOOP_BROWSER_WORKFLOWS;
const fixture = mode === "fixture";

// Browser and database are real. Supabase transport and sign-in are simulated.
describe.skipIf(mode !== "1" && !fixture)(`browser workflows with ${fixture ? "fixture" : "real"} AI and isolated SQL`, () => {
  let db: PGlite;
  let bridge: Server;
  let next: ChildProcess;
  let browser: Awaited<ReturnType<(typeof import("playwright"))["chromium"]["launch"]>>;
  let cookie: string;
  let reviewerCookie: string;
  const reviewerId = "10000000-0000-4000-8000-000000000009";
  let failNextAmazon = false;
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
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of req) { size += chunk.length; if (size > 1024 * 1024) { res.writeHead(413).end(); return; } chunks.push(chunk); }
        if (fixture && req.url === "/v1/chat/completions" && req.headers.authorization === `Bearer ${localKey}`) {
          const { messages } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          const instruction = messages[0].content as string;
          if (failNextAmazon && instruction.includes("Draft only the amazon_de")) {
            failNextAmazon = false;
            res.writeHead(500, { "content-type": "application/json" }).end("{}");
            return;
          }
          let content: unknown;
          if (instruction.startsWith("Extract")) content = { issue: "Battery runtime", customerClaim: null, unknowns: ["Operating conditions"] };
          else if (instruction.includes("Revise only")) content = JSON.parse(messages[1].content).current;
          else if (instruction.includes("investigation_summary")) content = { format: "investigation_summary", summary: "Compare the reported runtime with documented test conditions.", unknowns: [] };
          else {
            const platform = ["shopify_us", "amazon_de", "alibaba_intl"].find((id) => instruction.includes(`Draft only the ${id}`));
            const artifact = mockGeneratedBundle.artifacts.find((item) => platform ? item.platform === platform && item.kind === "listing_correction" : item.kind === "support_reply");
            const draft = mockGeneratedBundle.versions.find((item) => item.artifactId === artifact?.id)?.content;
            content = draft?.format === "amazon_listing" && instruction.includes("internalBrief:false")
              ? { ...draft, internalBrief: false, title: "Schreibtischlampe", description: "Eine Lampe für den Schreibtisch.", bullets: ["Wiederaufladbar"] }
              : draft;
          }
          res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }));
          return;
        }
        if (req.headers.apikey !== localKey) { res.writeHead(403).end(); return; }
        if (fixture && req.url === "/auth/v1/admin/users/" + reviewerId) {
          res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ id: reviewerId, aud: "authenticated", app_metadata: {}, user_metadata: {} }));
          return;
        }
        if (!req.url?.startsWith("/rest/v1/")) { res.writeHead(403).end(); return; }
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
    try { cookie = createAuthSession("10000000-0000-4000-8000-000000000001"); reviewerCookie = createAuthSession(reviewerId); }
    finally { if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey; }
    next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
      stdio: "ignore", windowsHide: true,
      env: { ...process.env, NODE_ENV: "production", SUPABASE_URL: `http://127.0.0.1:${address.port}`, SUPABASE_SERVICE_ROLE_KEY: localKey, NO_PROXY: "localhost,127.0.0.1",
        ...(fixture && { LLM_PROVIDER: "openai_compatible", LLM_BASE_URL: `http://127.0.0.1:${address.port}/v1`, LLM_API_KEY: localKey, LLM_MODEL: "workflow-fixture" }),
      },
    });
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (next.exitCode !== null) throw new Error("Local test app exited before startup; check the test port.");
      try { if ((await fetch(base + "/api/health")).ok) { ready = true; break; } } catch { /* Wait for startup. */ }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error("Local test app did not start.");
    const channel = process.env.RELOOP_BROWSER_CHANNEL || (fixture ? undefined : "msedge");
    browser = await chromium.launch({ channel, headless: true });
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
      if (fixture) {
        await page.locator('[data-nav="file"]').click();
        await page.waitForURL("**/cases");
        await page.locator('[data-nav="inbox"]').click();
        await page.waitForURL("**/feedback");
        expect(await page.locator("#customer-feedback").inputValue()).toBe(demoBundle.case.feedbackText);
      }
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
      if (fixture) {
        failNextAmazon = true;
        const [partial] = await Promise.all([
          page.waitForResponse((response) => response.url().endsWith("/repair")),
          page.getByRole("button", { name: "Generate three listing corrections", exact: true }).click(),
        ]);
        expect(partial.ok()).toBe(false);
        await page.locator(".artifact-workspace").nth(1).waitFor();
        await action("repair", () => page.getByRole("button", { name: "Generate remaining corrections", exact: true }).click());
      } else await action("repair", () => page.getByRole("button", { name: "Generate three listing corrections", exact: true }).click());
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
      await writeFile(new URL(`browser-workflow-${locale}-${stamp}.json`, folder), JSON.stringify({ locale, realAI: !fixture, realBrowser: true, database: "isolated PGlite via test-only PostgREST transport", authentication: "synthetic signed test session, not live login", voice: "not tested by this typed workflow", attempts, bundle: loaded.data }, null, 2));
    } finally { await context.close(); }
  }, 600000);

  it.skipIf(!fixture)("registers a private product and takes a German listing from missing evidence to reviewer sign-off on mobile", async () => {
    const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const reviewerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ownerContext.addCookies([{ name: AUTH_SESSION_COOKIE, value: cookie, url: base, httpOnly: true, sameSite: "Strict" }]);
    await reviewerContext.addCookies([{ name: AUTH_SESSION_COOKIE, value: reviewerCookie, url: base, httpOnly: true, sameSite: "Strict" }]);
    const page = await ownerContext.newPage();
    const reviewer = await reviewerContext.newPage();
    page.setDefaultTimeout(12000);
    reviewer.setDefaultTimeout(12000);

    async function submit(target: typeof page, path: string, button: string, method = "POST") {
      const [response] = await Promise.all([
        target.waitForResponse((result) => new URL(result.url()).pathname.endsWith(path) && result.request().method() === method),
        target.getByRole("button", { name: button, exact: true }).click(),
      ]);
      return response;
    }
    async function mobileFits(target: typeof page) {
      expect(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }

    try {
      await page.goto(base + "/feedback");
      await page.getByText("Register a product", { exact: true }).click();
      const product = page.locator(".workflow-form");
      await product.getByLabel("Product SKU").fill("BROWSER-PILOT-01");
      await product.getByLabel("Product name").fill("Browser pilot lamp");
      await product.getByLabel("Product version").fill("v1");
      expect((await submit(page, "/products", "Save product")).status()).toBe(201);
      await page.locator("#customer-feedback").fill("Synthetic browser fixture complaint");
      await page.locator("#merchant-instruction").fill("Compare the supplied listing to the product documentation.");
      await page.locator("#channel").selectOption("amazon_de");
      expect((await submit(page, "/cases", "Save and add sources")).status()).toBe(201);
      await page.waitForURL("**/rules?caseId=*");
      const caseId = new URL(page.url()).searchParams.get("caseId")!;
      await page.getByText("Add a source", { exact: true }).click();
      await page.getByLabel("Provenance or document reference").fill("Synthetic lab documentation");
      await page.getByLabel("Source version").fill("v1");
      await page.getByLabel("Source text").fill("Rechargeable desk lamp. Product specifications are documented.");
      expect((await submit(page, "/sources", "Save source")).status()).toBe(201);
      await page.getByLabel("Source type").selectOption("listing");
      await page.getByLabel("Listing title").fill("Schreibtischlampe");
      await page.getByLabel("Source version").fill("v1");
      await page.getByLabel("Source text").fill("Wiederaufladbare Schreibtischlampe.");
      expect((await submit(page, "/sources", "Save source")).status()).toBe(201);
      await page.getByLabel("Source type").selectOption("rule");
      for (const category of ["market_law", "platform_rule"]) {
        await page.getByLabel("Rule category").selectOption(category);
        await page.getByLabel("Official source URL").fill("https://example.test/" + category);
        await page.getByLabel("Date checked").fill("2025-01-01");
        await page.getByLabel("Where the rule applies").fill("Applies to the synthetic browser listing.");
        await page.getByLabel("Relevant source excerpt").fill("Synthetic mock source excerpt.");
        expect((await submit(page, "/sources", "Save source")).status()).toBe(201);
      }
      await mobileFits(page);
      await page.getByRole("link", { name: "Back to investigation" }).click();
      expect((await submit(page, "/analyze", "Run investigation")).status()).toBe(200);
      await page.getByText("Manage case", { exact: true }).click();
      await page.getByLabel("Reviewer account ID").fill(reviewerId);
      const assigned = await submit(page, "/cases/" + caseId, "Save reviewer", "PATCH");
      expect(assigned.status(), await assigned.text()).toBe(200);
      await page.getByRole("link", { name: "Open fix workspace" }).click();
      expect((await submit(page, "/repair", "Generate listing corrections")).status()).toBe(200);
      await page.getByRole("button", { name: "Amazon Germany", exact: true }).click();
      await page.getByRole("heading", { name: "Schreibtischlampe", exact: true }).waitFor();
      expect(await page.getByRole("button", { name: "Submit review" }).count()).toBe(0);

      await reviewer.goto(base + "/cases/" + caseId + "/fix");
      await reviewer.getByRole("button", { name: "Amazon Germany", exact: true }).click();
      await reviewer.getByRole("checkbox", { name: /I checked the listed sources/ }).check();
      await reviewer.getByRole("textbox", { name: "Review rationale" }).fill("Checked the German listing against both fixture sources.");
      await reviewer.getByRole("button", { name: "Submit review", exact: true }).click();
      expect((await submit(reviewer, "/review", "Confirm & save")).status()).toBe(200);
      await reviewer.locator(".artifact-review").getByText("approved", { exact: true }).waitFor();
      expect(await reviewer.getByRole("button", { name: "Submit revision" }).count()).toBe(0);
      await mobileFits(reviewer);
      await reviewer.evaluate(() => scrollTo(0, 0));
      await reviewer.screenshot({ path: fileURLToPath(new URL("browser-pilot-review-mobile.png", folder)), fullPage: true });

      await page.getByText("Manage case", { exact: true }).click();
      await page.getByLabel("Case status", { exact: true }).selectOption("clear");
      await page.getByLabel("Status change note").fill("Pilot case reviewed and resolved.");
      expect((await submit(page, "/cases/" + caseId, "Update status", "PATCH")).status()).toBe(200);
      const latest = caseBundleResponseSchema.parse(await (await ownerContext.request.get(base + "/api/cases/" + caseId)).json());
      expect(latest.ok && latest.data.case.status).toBe("clear");
      expect(latest.ok && latest.data.versions.some((version) => version.locale === "de-DE" && version.reviewStatus === "approved")).toBe(true);
    } finally {
      await reviewerContext.close();
      await ownerContext.close();
    }
  }, 120000);
});
