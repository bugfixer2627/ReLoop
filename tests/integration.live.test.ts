import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it, type TestContext } from 'vitest';
import { z } from 'zod';
import {
  caseBundleResponseSchema, caseIdResponseSchema, caseListResponseSchema,
  createCaseRequestSchema, generationResponseSchema, healthResponseSchema,
  responseSchema, reviewArtifactRequestSchema, taskResponseSchema,
  type Case, type CaseBundle,
} from '@/lib/contracts';

// Opt-in HTTP verification only. Never loads .env.local or applies migrations.
// Start the real app first, then explicitly supply its loopback origin and token.
// Synthetic writes additionally require RELOOP_INTEGRATION_WRITES=1.
const baseInput = process.env.RELOOP_INTEGRATION_BASE_URL;
const accessToken = process.env.RELOOP_INTEGRATION_TOKEN;
const enabled = Boolean(baseInput && accessToken);
const writesAllowed = process.env.RELOOP_INTEGRATION_WRITES === '1';
const live = enabled ? describe.sequential : describe.skip;
const envelopeSchema = responseSchema(z.unknown());
type Observation = { test: string; status: 'PASS' | 'FAIL' | 'BLOCKED'; detail: string };
const observations: Observation[] = [];
const requests: { path: string; method: string; status: number; errorCode: string | null }[] = [];
let base: URL;
let databaseBlock: string | null = 'Health has not been checked.';
let cases: Case[] = [];
let sourceBundle: CaseBundle | null = null;
let createdBundle: CaseBundle | null = null;
let createdCaseId: string | null = null;
let createdTaskId: string | null = null;
let evidenceFindingCount = 0;

function blocked(context: TestContext, test: string, detail: string): never {
  observations.push({ test, status: 'BLOCKED', detail });
  console.info(`BLOCKED: ${test}: ${detail}`);
  return context.skip();
}

async function verify(test: string, operation: () => Promise<void>) {
  try {
    await operation();
    observations.push({ test, status: 'PASS', detail: 'Real HTTP responses matched the expected shared contracts.' });
  } catch {
    // Assertion/provider bodies may contain operational data. Do not print them.
    observations.push({ test, status: 'FAIL', detail: 'HTTP verification failed; inspect the recorded statuses and server diagnostics without exposing credentials.' });
    throw new Error(`${test} failed. See local .local-reviews/integration-evidence/live-http.json for sanitized HTTP observations.`);
  }
}

async function request(path: string, init: RequestInit = {}, authenticated = true) {
  let response: Response;
  try {
    response = await fetch(new URL(path, base), {
      ...init,
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: 'application/json',
        ...(authenticated ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init.method && !['GET', 'HEAD'].includes(init.method) ? { Origin: base.origin } : {}),
        ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new Error('Could not reach the loopback integration server.');
  }
  let body: unknown;
  try { body = await response.json(); }
  catch { throw new Error('Integration server returned a non-JSON response.'); }
  const envelope = envelopeSchema.safeParse(body);
  if (!envelope.success) throw new Error('Integration server returned an invalid API envelope.');
  requests.push({
    path, method: init.method ?? 'GET', status: response.status,
    errorCode: envelope.data.ok ? null : envelope.data.error.code,
  });
  return { response, body, envelope: envelope.data };
}

function parse<S extends z.ZodType>(schema: S, body: unknown): z.infer<S> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new Error('Integration response does not match its shared contract.');
  return parsed.data;
}

function json(value: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(value) };
}

async function loadBundle(caseId: string) {
  const result = await request(`/api/cases/${caseId}`);
  expect(result.response.status).toBe(200);
  const parsed = parse(caseBundleResponseSchema, result.body);
  if (!parsed.ok) throw new Error('Saved case could not be reloaded.');
  expect(parsed.data.case.id).toBe(caseId);
  return parsed.data;
}

live('opt-in real application HTTP integration', () => {
  beforeAll(() => {
    try { base = new URL(baseInput!); }
    catch { throw new Error('RELOOP_INTEGRATION_BASE_URL must be a valid loopback origin.'); }
    if (!['http:', 'https:'].includes(base.protocol)
      || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)
      || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
      throw new Error('RELOOP_INTEGRATION_BASE_URL must be a loopback HTTP(S) origin without credentials, query or path.');
    }
  });

  afterAll(async () => {
    await mkdir(new URL('../.local-reviews/integration-evidence/', import.meta.url), { recursive: true });
    const report = {
      recordedAt: new Date().toISOString(),
      environment: 'Real HTTP against the explicitly configured loopback application server; persistence is its configured service.',
      baseOrigin: base?.origin ?? null,
      syntheticWritesAuthorized: writesAllowed,
      mocksUsed: false,
      schemaChangesApplied: false,
      observations, requests,
      persisted: { createdCaseId, createdTaskId, evidenceFindingCount },
      notVerified: [
        'Real AI generation, two generated revisions and STT remain unavailable while their HTTP routes return 501.',
        'Positive artifact review is not exercised without a legitimately generated artifact; no artifact is manufactured or inserted directly.',
        'Browser voice permissions and authenticated UI interaction require separate browser verification.',
      ],
    };
    await writeFile(new URL('../.local-reviews/integration-evidence/live-http.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
  });

  it('reports health and enforces authentication and request validation', async () => {
    await verify('health, authentication and invalid input', async () => {
      const health = await request('/api/health', {}, false);
      expect(health.response.status).toBe(200);
      const parsed = parse(healthResponseSchema, health.body);
      if (!parsed.ok) throw new Error('Health endpoint failed.');
      databaseBlock = parsed.data.database === 'reachable' ? null : `Database health is ${parsed.data.database}.`;

      const unauthorized = await request('/api/cases', {}, false);
      expect(unauthorized.response.status).toBe(401);
      expect(unauthorized.envelope.ok).toBe(false);
      const invalid = await request('/api/cases', json({}));
      expect(invalid.response.status).toBe(400);
      expect(!invalid.envelope.ok && invalid.envelope.error.code).toBe('INVALID_REQUEST');
      const forbidden = await request('/api/cases', {
        ...json({}), headers: { Origin: 'https://integration-invalid.example' },
      });
      expect(forbidden.response.status).toBe(403);
    });
  }, 60000);

  it('loads actual saved cases and their source context', async (context) => {
    const result = await request('/api/cases');
    if (databaseBlock) {
      await verify('database failure response', async () => {
        expect(result.response.status).toBe(503);
        expect(!result.envelope.ok && result.envelope.error.code).toBe('DATABASE_UNAVAILABLE');
      });
      blocked(context, 'case list and source bundle', databaseBlock);
    }
    if (result.response.status === 503) {
      databaseBlock = 'Case API returned 503 despite the health check; database/configuration requires inspection.';
      blocked(context, 'case list and source bundle', databaseBlock);
    }
    await verify('case list and source bundle', async () => {
      expect(result.response.status).toBe(200);
      const parsed = parse(caseListResponseSchema, result.body);
      if (!parsed.ok) throw new Error('Case list failed.');
      cases = parsed.data.cases;
      const source = cases.find((item) => item.synthetic);
      if (source) sourceBundle = await loadBundle(source.id);
    });
  }, 45000);

  it('rejects an unknown SKU without creating a case', async (context) => {
    if (!writesAllowed) blocked(context, 'unknown SKU', 'Set RELOOP_INTEGRATION_WRITES=1 only after synthetic write authorization.');
    if (databaseBlock) blocked(context, 'unknown SKU', databaseBlock);
    await verify('unknown SKU', async () => {
      const result = await request('/api/cases', json({
        sku: `INTEGRATION-UNKNOWN-${randomUUID()}`, channel: 'shopify_us',
        feedbackText: 'Synthetic integration check; no real customer information.', feedbackLocale: 'en-US',
        merchantInstruction: '仅验证未知 SKU 的错误处理。', merchantLocale: 'zh-CN', synthetic: true,
      }));
      expect(result.response.status).toBe(404);
      expect(!result.envelope.ok && result.envelope.error.code).toBe('UNKNOWN_SKU');
    });
  }, 30000);

  it('creates, reloads and analyzes a synthetic case using persisted evidence', async (context) => {
    if (!writesAllowed) blocked(context, 'case create, reload and evidence analysis', 'Synthetic write authorization flag is absent.');
    if (databaseBlock) blocked(context, 'case create, reload and evidence analysis', databaseBlock);
    if (!sourceBundle) blocked(context, 'case create, reload and evidence analysis', 'No saved synthetic case supplies an existing SKU; no product or source record will be invented.');
    await verify('case create, reload and evidence analysis', async () => {
      const input = createCaseRequestSchema.parse({
        sku: sourceBundle!.product.sku, channel: sourceBundle!.case.channel,
        feedbackText: 'Synthetic integration verification: customer-reported performance is unverified.',
        feedbackLocale: 'en-US', merchantInstruction: '请核对已有商品证据。客户描述尚未核验，不代表已确认缺陷。',
        merchantLocale: 'zh-CN', synthetic: true,
      });
      const result = await request('/api/cases', json(input));
      expect(result.response.status).toBe(201);
      const parsed = parse(caseIdResponseSchema, result.body);
      if (!parsed.ok) throw new Error('Create case failed.');
      createdCaseId = parsed.data.caseId;
      createdBundle = await loadBundle(createdCaseId);
      expect(createdBundle.case).toMatchObject(input);
      expect(createdBundle.product.id).toBe(sourceBundle!.product.id);

      const analysis = await request(`/api/cases/${createdCaseId}/analyze`, json({}));
      expect(analysis.response.status).toBe(200);
      const generated = parse(generationResponseSchema, analysis.body);
      if (!generated.ok) throw new Error('Evidence analysis failed.');
      expect(generated.data.caseId).toBe(createdCaseId);
      expect(generated.data.artifacts).toEqual([]);
      expect(generated.data.versions).toEqual([]);
      expect(generated.data.findings.length).toBeGreaterThan(0);
      createdBundle = await loadBundle(createdCaseId);
      expect(createdBundle.case).toMatchObject(input);
      const sourceIds = new Set([...createdBundle.evidence, ...createdBundle.listings].map((source) => source.id));
      for (const finding of generated.data.findings) {
        expect(finding.category).toBe('evidence');
        expect(finding.caseId).toBe(createdCaseId);
        expect(finding.artifactVersionId).toBeNull();
        expect(finding.sourceIds.every((id) => sourceIds.has(id))).toBe(true);
        expect(createdBundle.findings.some((saved) => saved.id === finding.id)).toBe(true);
      }
      evidenceFindingCount = generated.data.findings.length;
    });
  }, 60000);

  it('saves a real QA task and reloads its audit event', async (context) => {
    if (!writesAllowed) blocked(context, 'task and audit persistence', 'Synthetic write authorization flag is absent.');
    if (databaseBlock) blocked(context, 'task and audit persistence', databaseBlock);
    if (!createdCaseId || !createdBundle) blocked(context, 'task and audit persistence', 'A newly created synthetic case is required; existing merchant cases will not be modified.');
    const source = createdBundle.evidence[0] ?? createdBundle.listings[0];
    if (!source) blocked(context, 'task and audit persistence', 'The new case has no valid evidence or listing citation.');
    await verify('task and audit persistence', async () => {
      const task = {
        assignedRole: 'qa', kind: 'qa_investigation', title: 'Synthetic integration verification',
        description: 'Verify operating conditions; this is not a confirmed product defect.', state: 'open', sourceIds: [source.id],
      };
      const result = await request(`/api/cases/${createdCaseId}/tasks`, json(task));
      expect(result.response.status).toBe(200);
      const parsed = parse(taskResponseSchema, result.body);
      if (!parsed.ok) throw new Error('Task save failed.');
      createdTaskId = parsed.data.task.id;
      expect(parsed.data.task).toMatchObject({ ...task, caseId: createdCaseId });
      const loaded = await loadBundle(createdCaseId!);
      expect(loaded.tasks.some((saved) => saved.id === createdTaskId && saved.state === 'open')).toBe(true);
      expect(loaded.audit.some((event) => event.id === parsed.data.auditEvent.id && event.caseId === createdCaseId)).toBe(true);
    });
  }, 45000);

  it('reports unimplemented generation, revision and transcription honestly', async (context) => {
    if (!writesAllowed) blocked(context, 'unimplemented AI and speech endpoints', 'Synthetic write authorization flag is absent.');
    await verify('unimplemented AI and speech endpoints', async () => {
      const caseId = createdCaseId ?? randomUUID();
      const artifactId = randomUUID();
      for (const path of [`/api/cases/${caseId}/support`, `/api/cases/${caseId}/repair`, `/api/artifacts/${artifactId}/revise`]) {
        const result = await request(path, json(path.endsWith('/revise')
          ? { promptText: 'Shorten the draft.', promptLocale: 'en-US', expectedVersion: 1 } : {}));
        expect(result.response.status).toBe(501);
        expect(!result.envelope.ok && result.envelope.error.code).toBe('NOT_IMPLEMENTED');
      }
      const form = new FormData();
      form.set('locale', 'zh-CN');
      form.set('audio', new Blob(['Synthetic non-speech route check; not a real transcript.'], { type: 'audio/webm' }), 'integration.webm');
      const transcription = await request('/api/transcribe', { method: 'POST', body: form });
      expect(transcription.response.status).toBe(501);
      expect(!transcription.envelope.ok && transcription.envelope.error.code).toBe('NOT_IMPLEMENTED');
    });
  }, 60000);

  it('rejects review of a nonexistent artifact without manufacturing output', async (context) => {
    if (!writesAllowed) blocked(context, 'missing artifact review', 'Synthetic write authorization flag is absent.');
    if (databaseBlock) blocked(context, 'missing artifact review', databaseBlock);
    await verify('missing artifact review', async () => {
      const input = reviewArtifactRequestSchema.parse({
        version: 1, decision: 'changes_requested', reviewerRole: 'support', comment: 'Synthetic negative review check.',
      });
      const result = await request(`/api/artifacts/${randomUUID()}/review`, json(input));
      expect(result.response.status).toBe(404);
      expect(!result.envelope.ok && result.envelope.error.code).toBe('NOT_FOUND');
    });
  }, 30000);
});
