import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// HTTP check for approved UI routes, API access guards and unavailable workflows.
const base = process.env.RELOOP_BASE_URL ?? "http://127.0.0.1:3000";
const fixture = JSON.parse(await readFile(new URL("../src/lib/fixtures/demo.json", import.meta.url), "utf8"));
const caseId = fixture.case.id;

async function request(path, options) {
  return fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(10000) });
}

try {
  const pages = [
    ["/", "Clearer Product Claims"], ["/login", "Email address"],
    ["/dashboard", "Checking workspace session"], ["/feedback", "Checking workspace session"],
    ["/cases", "Checking workspace session"], ["/settings", "Checking workspace session"], ["/rules", "Checking workspace session"],
    [`/cases/${caseId}/detail`, "Checking workspace session"],
    [`/cases/${caseId}`, "Checking workspace session"], [`/cases/${caseId}/fix`, "Checking workspace session"],
  ];
  for (const [path, phrase] of pages) {
    const response = await request(path);
    const html = await response.text();
    assert.equal(response.status, 200, path);
    assert.ok(html.includes(phrase), `Missing expected page content on ${path}`);
    assert.ok(!html.includes("Jasmine Li"), `Prototype identity leaked into ${path}`);
    assert.ok(!html.includes("\uFFFD"), `Broken encoding on ${path}`);
    console.log(`PASS page ${path}`);
  }
  console.log(`PASS all ${pages.length} public and protected frontend routes`);
  const healthResponse = await request("/api/health");
  assert.equal(healthResponse.status, 200);
  const health = await healthResponse.json();
  assert.equal(health.ok, true);
  assert.ok(["not_implemented", "not_configured", "configured"].includes(health.data.generation));
  assert.ok(["not_implemented", "not_configured", "configured"].includes(health.data.transcription));
  console.log(`PASS health: DB ${health.data.database}; generation ${health.data.generation}; transcription ${health.data.transcription}`);
  const endpoints = [
    ["GET", "/api/cases"], ["POST", "/api/cases"], ["GET", `/api/cases/${caseId}`],
    ...["analyze", "support", "repair", "tasks"].map((name) => ["POST", `/api/cases/${caseId}/${name}`]),
    ...["revise", "review"].map((name) => ["POST", `/api/artifacts/${caseId}/${name}`]),
  ];
  for (const [method, path] of endpoints) {
    const response = await request(path, { method });
    const body = await response.json();
    assert.ok([401, 503].includes(response.status), `${path} must require authenticated access`);
    assert.equal(body.ok, false);
    assert.equal(body.data, null);
    assert.ok(["NOT_CONFIGURED", "UNAUTHORIZED"].includes(body.error.code), path);
  }
  const speech = await request("/api/transcribe", { method: "POST" });
  const speechBody = await speech.json();
  assert.ok([400, 403, 503].includes(speech.status));
  assert.ok(["INVALID_REQUEST", "UNAUTHORIZED", "NOT_CONFIGURED"].includes(speechBody.error.code));
  console.log(`PASS protected case/workflow routes reject unavailable configuration; speech validates requests`);
} catch (error) {
  console.error(`Integration smoke check failed: ${error.message}`);
  process.exitCode = 1;
}
