import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Foundation-only HTTP check. Update with real workflow assertions as APIs land.
const base = process.env.RELOOP_BASE_URL ?? "http://127.0.0.1:3000";
const fixture = JSON.parse(await readFile(new URL("../src/lib/fixtures/demo.json", import.meta.url), "utf8"));
const caseId = fixture.case.id;

async function request(path, options) {
  return fetch(new URL(path, base), { ...options, signal: AbortSignal.timeout(10000) });
}

try {
  const pages = [["/", "从一条反馈开始"], [`/cases/${caseId}`, "先核对证据"], [`/cases/${caseId}/fix`, "协同修订"]];
  for (const [path, phrase] of pages) {
    const response = await request(path);
    const html = await response.text();
    assert.equal(response.status, 200, path);
    assert.ok(html.includes(phrase), `Missing Chinese text on ${path}`);
    assert.ok(html.includes("DEMO / FICTIONAL"), `Missing fixture disclosure on ${path}`);
    assert.ok(!html.includes("\uFFFD"), `Broken encoding on ${path}`);
    console.log(`PASS page ${path}`);
  }
  assert.equal((await request("/cases/00000000-0000-4000-8000-000000009999")).status, 404, "Unknown case must return 404");
  assert.equal((await request("/cases/00000000-0000-4000-8000-000000009999/fix")).status, 404, "Unknown case fix screen must return 404");
  console.log("PASS unknown-case screens return 404");
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
    ["POST", "/api/transcribe", 400, "INVALID_REQUEST"],
  ];
  for (const [method, path, expectedStatus = 501, expectedCode = "NOT_IMPLEMENTED"] of endpoints) {
    const response = await request(path, { method });
    const body = await response.json();
    assert.equal(response.status, expectedStatus, path);
    assert.equal(body.ok, false);
    assert.equal(body.data, null);
    assert.equal(body.error.code, expectedCode);
  }
  console.log(`PASS ${endpoints.length - 1} foundation routes remain explicit 501 stubs; speech validates requests`);
} catch (error) {
  console.error(`Foundation smoke check failed: ${error.message}`);
  process.exitCode = 1;
}
