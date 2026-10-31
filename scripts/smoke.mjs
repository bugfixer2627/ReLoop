import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// HTTP check for preview pages, protected case routes and remaining workflow stubs.
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
  assert.equal(health.data.generation, "not_implemented");
  assert.equal(health.data.transcription, "not_implemented");
  console.log(`PASS health: DB ${health.data.database}; generation/transcription not implemented`);
  const endpoints = [
    ...["support", "repair"].map((name) => ["POST", `/api/cases/${caseId}/${name}`]),
    ["POST", `/api/artifacts/${caseId}/revise`],
    ["POST", "/api/transcribe"],
  ];
  for (const [method, path] of [["GET", "/api/cases"], ["POST", "/api/cases"], ["GET", `/api/cases/${caseId}`], ["POST", `/api/cases/${caseId}/analyze`], ["POST", `/api/cases/${caseId}/tasks`], ["POST", `/api/artifacts/${caseId}/review`]]) {
    const response = await request(path, { method });
    assert.ok([401, 503].includes(response.status), `${path} must require demo access`);
  }
  for (const [method, path] of endpoints) {
    const response = await request(path, { method });
    const body = await response.json();
    assert.equal(response.status, 501, path);
    assert.equal(body.ok, false);
    assert.equal(body.data, null);
    assert.equal(body.error.code, "NOT_IMPLEMENTED");
  }
  console.log(`PASS all ${endpoints.length} business routes explicitly return 501`);
} catch (error) {
  console.error(`Foundation smoke check failed: ${error.message}`);
  process.exitCode = 1;
}
