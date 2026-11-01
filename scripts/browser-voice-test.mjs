import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

// UI INTEGRATION TEST: fake browser microphone and mocked API/provider responses.
// It cannot establish speech recognition quality or hosted persistence.
const { chromium } = await import(process.env.RELOOP_PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: process.env.RELOOP_BROWSER_CHANNEL || "msedge", headless: true, args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
const fixture = JSON.parse(await readFile(new URL("../src/lib/fixtures/demo.json", import.meta.url), "utf8"));
const base = process.env.RELOOP_BASE_URL || "http://localhost:3000";
const token = "browser-test-only-no-real-credentials";
const success = (data) => ({ ok: true, data, error: null, requestId: randomUUID() });
let stage = "initialization";
let passed = 0;
try {
  for (const locale of ["zh-CN", "en-US"]) {
    for (const mode of ["initial", "revision"]) {
      stage = locale + " " + mode;
      const context = await browser.newContext({ permissions: ["microphone"] });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      const bundle = structuredClone(fixture);
      const artifact = { id: randomUUID(), caseId: bundle.case.id, kind: "support_reply", platform: "shopify_us", market: "US", segment: "b2c", latestVersion: 1 };
      bundle.artifacts = [artifact];
      bundle.versions = [{ id: randomUUID(), artifactId: artifact.id, version: 1, locale: "en-US", languageStatus: "beta", content: { format: "support_reply", subject: "Synthetic browser test", body: "Please confirm test conditions." }, sourceIds: ["SPEC-001"], reviewStatus: "draft", validationStatus: "needs_rule_verification", createdAt: new Date().toISOString() }];
      let speechCalls = 0;
      let workflowCalls = 0;
      let sentPrompt = "";
      let speechMode = "success";
      await context.route("**/api/**", async (route) => {
        const req = route.request();
        const path = new URL(req.url()).pathname;
        let data;
        if (path === "/api/transcribe") {
          speechCalls++;
          assert.equal(req.headers().authorization, "Bearer " + token);
          const form = await new Request(req.url(), { method: "POST", headers: { "content-type": req.headers()["content-type"] }, body: req.postDataBuffer() }).formData();
          assert.equal(form.get("locale"), locale);
          assert.ok(form.get("audio").size > 0);
          assert.ok(form.get("audio").name.endsWith(".webm"));
          if (speechMode === "pending") {
            await new Promise((resolve) => setTimeout(resolve, 1200));
            await route.fulfill({ status: 200, json: success({ text: "Late transcript must be discarded", locale, requiresConfirmation: true }) }).catch(() => {});
            return;
          }
          if (speechMode === "failure") return route.fulfill({ status: 502, json: { ok: false, data: null, error: { code: "TRANSCRIPTION_FAILED", message: "Synthetic transcription failure; typing remains available.", retryable: true }, requestId: randomUUID() } });
          data = { text: locale === "zh-CN" ? "请保留测试条件。" : "Keep the test conditions.", locale, requiresConfirmation: true };
        } else if (path === "/api/cases" && req.method() === "GET") data = { cases: [bundle.case] };
        else if (path === "/api/cases" && req.method() === "POST") {
          workflowCalls++;
          const payload = req.postDataJSON();
          sentPrompt = payload.merchantInstruction;
          assert.equal(payload.merchantLocale, locale);
          data = { caseId: bundle.case.id };
        } else if (path.endsWith("/analyze")) data = { caseId: bundle.case.id, artifacts: [], versions: [], findings: [] };
        else if (path.endsWith("/revise")) {
          workflowCalls++;
          const payload = req.postDataJSON();
          sentPrompt = payload.promptText;
          assert.equal(payload.promptLocale, locale);
          const current = bundle.versions.at(-1);
          const version = { ...current, id: randomUUID(), version: current.version + 1 };
          artifact.latestVersion = version.version;
          bundle.versions.push(version);
          const revision = { id: randomUUID(), caseId: bundle.case.id, artifactId: artifact.id, promptText: sentPrompt, promptLocale: locale, fromVersion: version.version - 1, toVersion: version.version, createdAt: new Date().toISOString() };
          bundle.revisions.push(revision);
          data = { caseId: bundle.case.id, artifact, version, revision, findings: [] };
        } else if (path === "/api/cases/" + bundle.case.id) data = bundle;
        else throw new Error("Unexpected mock API route");
        await route.fulfill({ status: 200, json: success(data) });
      });
      await page.goto(base + "/login");
      await page.locator("#access-token").fill(token);
      await page.getByRole("button", { name: "Enter workspace" }).click();
      await page.waitForURL("**/dashboard");
      if (locale === "zh-CN") await page.getByRole("button", { name: "Switch interface language" }).click();
      // Client navigation preserves the current memory-only workspace session.
      if (mode === "initial") await page.locator('.side-nav a[href="/feedback"]').click();
      else {
        await page.locator('a[href="/cases/' + bundle.case.id + '"]').first().click();
        await page.locator('a[href="/cases/' + bundle.case.id + '/fix"]').first().click();
      }
      const parent = mode === "initial" ? page.locator("form.card") : page.locator(".artifact-workspace").first();
      const input = mode === "initial" ? page.locator("#merchant-instruction") : parent.locator(".artifact-revision > textarea");
      await input.fill("Existing typed instruction.");
      const voice = parent.locator(".voice-input").first();
      await page.evaluate(() => {
        const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        window.__voiceTestDeny = true;
        window.__voiceTestStreams = [];
        navigator.mediaDevices.getUserMedia = async (...args) => {
          if (window.__voiceTestDeny) throw new DOMException("Simulated permission denial", "NotAllowedError");
          const stream = await original(...args);
          window.__voiceTestStreams.push(stream);
          return stream;
        };
      });
      await voice.locator(".mic-button").click();
      await voice.locator(".voice-error").waitFor();
      assert.equal(await input.inputValue(), "Existing typed instruction.");
      await page.evaluate(() => { window.__voiceTestDeny = false; });
      async function record(stop = true) {
        await voice.locator(".mic-button").click();
        await voice.getByText(locale === "zh-CN" ? /正在錄音/ : /Recording…/).waitFor();
        // A real MediaRecorder needs elapsed audio frames before stop.
        await page.waitForTimeout(450);
        await voice.getByRole("button", { name: stop ? (locale === "zh-CN" ? "停止並轉寫" : "Stop & transcribe") : (locale === "zh-CN" ? "取消" : "Cancel"), exact: true }).click();
      }
      await record(false);
      assert.equal(speechCalls, 0, "Cancelled audio must not upload");
      assert.equal(await input.inputValue(), "Existing typed instruction.");
      assert.equal(await page.evaluate(() => window.__voiceTestStreams.every((stream) => stream.getTracks().every((track) => track.readyState === "ended"))), true);
      speechMode = "failure";
      await record();
      await voice.locator(".voice-error").waitFor();
      assert.equal(await input.inputValue(), "Existing typed instruction.");
      speechMode = "success";
      await record();
      await voice.locator(".voice-transcript textarea").waitFor();
      await voice.getByRole("button", { name: locale === "zh-CN" ? "丟棄轉寫" : "Discard transcript" }).click();
      assert.equal(await input.inputValue(), "Existing typed instruction.");
      speechMode = "pending";
      await record();
      await voice.getByRole("button", { name: locale === "zh-CN" ? "取消转写" : "Cancel transcription" }).click();
      assert.equal(await input.inputValue(), "Existing typed instruction.");
      speechMode = "success";
      await record();
      const preview = voice.locator(".voice-transcript textarea");
      await preview.waitFor();
      assert.equal(await input.inputValue(), "Existing typed instruction.");
      assert.equal(workflowCalls, 0, "Recording must not submit a workflow");
      const corrected = locale === "zh-CN" ? "请保留已确认的测试条件。" : "Keep the confirmed test conditions.";
      await preview.fill(corrected);
      await voice.getByRole("button", { name: locale === "zh-CN" ? "使用轉寫文字" : "Use transcript" }).click();
      assert.ok((await input.inputValue()).includes(corrected));
      assert.ok((await input.inputValue()).startsWith("Existing typed instruction."));
      const submitted = page.waitForResponse((response) => mode === "initial" ? new URL(response.url()).pathname === "/api/cases" && response.request().method() === "POST" : response.url().endsWith("/revise"));
      if (mode === "initial") {
        await page.locator("#sku").fill("RL-LAMP-01");
        await page.locator("#customer-feedback").fill("My lamp works for only about 2 hours.");
        await parent.getByRole("button", { name: locale === "zh-CN" ? "保存并分析" : "Save and analyze" }).click();
      } else await parent.getByRole("button", { name: locale === "zh-CN" ? "提交修订" : "Submit revision" }).click();
      await submitted;
      assert.ok(sentPrompt.includes(corrected));
      assert.equal(workflowCalls, 1);
      assert.equal(speechCalls, 4);
      console.log("PASS MOCK speech permission-denial/cancel/failure/discard/abort/confirmation and workflow payload", locale, mode);
      passed++;
      await context.close();
    }
  }
  console.log("Browser voice cases passed:", passed, "(fake microphone + mocked responses; no real recognition or hosted writes)");
} catch {
  // Do not dump browser API headers, credentials or recordings on failure.
  console.error("Browser voice verification failed at:", stage);
  process.exitCode = 1;
} finally { await browser.close(); }
