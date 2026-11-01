import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoBundle } from '@/lib/fixtures/demo';
import { createCase, getCaseBundle, listCases, reviseArtifact, saveTask, transcribeAudio } from '@/lib/frontend/api-client';

const requestId = '00000000-0000-4000-8000-000000000999';
const token = 'local-test-token';

afterEach(() => { vi.unstubAllGlobals(); });

describe('typed UI API adapter', () => {
  it.each([['audio/webm;codecs=opus', 'webm'], ['audio/mp4', 'mp4'], ['audio/mpeg', 'mp3'], ['audio/wav', 'wav'], ['audio/ogg', 'ogg']])('uses the matching upload extension and forwards cancellation for %s', async (mime, extension) => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true, data: { text: 'Test transcript', locale: 'en-US', requiresConfirmation: true }, error: null, requestId }));
    vi.stubGlobal('fetch', fetch);
    const controller = new AbortController();
    await transcribeAudio(token, new Blob(['synthetic test bytes'], { type: mime }), 'en-US', controller.signal);
    const options = fetch.mock.calls[0][1];
    expect(options.signal).toBe(controller.signal);
    expect((options.body as FormData).get('audio')).toMatchObject({ name: 'instruction.' + extension });
  });
  it('loads the real case-list contract with a same-origin session cookie and no caching', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true, data: { cases: [demoBundle.case] }, error: null, requestId,
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);

    const result = await listCases(token);

    expect(result).toEqual([demoBundle.case]);
    expect(fetch).toHaveBeenCalledWith('/api/cases', expect.objectContaining({
      cache: 'no-store', credentials: 'same-origin', headers: expect.not.objectContaining({ Authorization: expect.anything() }),
    }));
  });

  it('creates a case only with the production request shape', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true, data: { caseId: demoBundle.case.id }, error: null, requestId,
    }), { status: 201, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    const result = await createCase(token, {
      sku: demoBundle.case.sku, channel: demoBundle.case.channel,
      feedbackText: demoBundle.case.feedbackText, feedbackLocale: demoBundle.case.feedbackLocale,
      merchantInstruction: demoBundle.case.merchantInstruction, merchantLocale: demoBundle.case.merchantLocale,
      synthetic: true,
    });
    expect(result.caseId).toBe(demoBundle.case.id);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(expect.objectContaining({ sku: 'RL-LAMP-01', synthetic: true }));
  });

  it('rejects an invalid create payload before making a request', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(createCase(token, {
      sku: '', channel: 'shopify_us', feedbackText: 'Report', feedbackLocale: 'en-US',
      merchantInstruction: 'Check this', merchantLocale: 'en-US', synthetic: true,
    } as never)).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('maps the real backend 501 envelope without manufacturing data', async () => {
    const unavailableResponse = () => new Response(JSON.stringify({
      ok: false, data: null,
      error: { code: 'NOT_IMPLEMENTED', message: 'This workflow is not available yet.', retryable: false },
      requestId,
    }), { status: 501, headers: { 'content-type': 'application/json' } });
    const fetch = vi.fn().mockImplementation(unavailableResponse);
    vi.stubGlobal('fetch', fetch);

    await expect(getCaseBundle(token, demoBundle.case.id)).rejects.toMatchObject({ status: 501, code: 'NOT_IMPLEMENTED' });
    const artifactId = '00000000-0000-4000-8000-000000000201';
    for (const promptText of ['Shorten this reply.', 'Keep the test conditions.']) {
      await expect(reviseArtifact(token, artifactId, { promptText, promptLocale: 'en-US', expectedVersion: 1 }))
        .rejects.toMatchObject({ status: 501, code: 'NOT_IMPLEMENTED' });
    }
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('does not report a task as saved when the task route is unavailable', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false, data: null,
      error: { code: 'NOT_IMPLEMENTED', message: 'This workflow is not available yet.', retryable: false },
      requestId,
    }), { status: 501, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    await expect(saveTask(token, demoBundle.case.id, {
      assignedRole: 'qa', kind: 'qa_investigation', title: 'Verify customer report',
      description: 'Check operating conditions; do not infer a defect.', state: 'open', sourceIds: ['SPEC-001'],
    })).rejects.toMatchObject({ status: 501, code: 'NOT_IMPLEMENTED' });
    expect(fetch).toHaveBeenCalledWith(`/api/cases/${demoBundle.case.id}/tasks`, expect.anything());
  });

  it('sends microphone data only to the existing transcription route and preserves its unavailable state', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false, data: null,
      error: { code: 'NOT_IMPLEMENTED', message: 'This workflow is not available yet.', retryable: false },
      requestId,
    }), { status: 501, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    const audio = new Blob(['synthetic binary fixture'], { type: 'audio/webm' });
    await expect(transcribeAudio(token, audio, 'zh-CN')).rejects.toMatchObject({ status: 501, code: 'NOT_IMPLEMENTED' });
    expect(fetch).toHaveBeenCalledWith('/api/transcribe', expect.objectContaining({
      method: 'POST', credentials: 'same-origin', headers: expect.not.objectContaining({ Authorization: expect.anything() }),
    }));
  });
});
