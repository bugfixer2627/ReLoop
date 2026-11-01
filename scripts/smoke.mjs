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
    ["/", "Clearer Product Claims"], ["/login", "Demo access token"],
    ["/dashboard", "Workspace access required"], ["/feedback", "Workspace access required"],
    [`/cases/${caseId}`, "Workspace access required"], [`/cases/${caseId}/fix`, "Workspace access required"],
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
  console.log("PASS landing, login and four protected workspace routes");
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
  console.log(`PASS all ${endpoints.length} incomplete generation/revision/STT routes explicitly return 501`);
} catch (error) {
  console.error(`Integration smoke check failed: ${error.message}`);
  process.exitCode = 1;
}
