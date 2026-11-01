'use client';

import {
  caseBundleResponseSchema, caseIdResponseSchema, caseListResponseSchema,
  createCaseRequestSchema, generationRequestSchema, generationResponseSchema,
  reviseArtifactRequestSchema, revisionResponseSchema, reviewArtifactRequestSchema,
  reviewResponseSchema, taskResponseSchema, transcriptionResponseSchema,
  upsertTaskRequestSchema, MAX_AUDIO_BYTES, AUDIO_MIME_TYPES,
  translationRequestSchema, translationResponseSchema,
} from '@/lib/contracts';
import type {
  CaseBundle, InputLocale, Platform,
} from '@/lib/contracts';
import type { z } from 'zod';
import { platformLabel } from '@/lib/config/platforms';

type ResponseData<S extends z.ZodType> = Extract<z.infer<S>, { ok: true }> extends { data: infer Data } ? Data : never;

type Success<T> = { ok: true; data: T; error: null; requestId: string };
type Failure = { ok: false; data: null; error: { code: string; message: string; retryable: boolean }; requestId: string };

export class ApiRequestError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly retryable: boolean) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(path: string, token: string, schema: z.ZodType<Success<T> | Failure>, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: 'no-store',
      credentials: token ? 'same-origin' : 'omit',
      headers: {
        Accept: 'application/json',
        ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', 'Could not reach ReLoop. Check the connection and retry.', true);
  }

  let body: unknown;
  try { body = await response.json(); }
  catch { throw new ApiRequestError(response.status, 'INVALID_RESPONSE', 'ReLoop returned an unreadable response.', false); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiRequestError(response.status, 'INVALID_RESPONSE', 'ReLoop returned data that does not match the current API contract.', false);
  if (!parsed.data.ok) {
    const failure = parsed.data;
    throw new ApiRequestError(response.status, failure.error.code, failure.error.message, failure.error.retryable);
  }
  if (!response.ok) throw new ApiRequestError(response.status, 'HTTP_ERROR', 'ReLoop could not complete that request.', response.status >= 500);
  return parsed.data.data;
}

const jsonBody = (value: unknown) => JSON.stringify(value);

export async function listCases(token: string) {
  const result = await request<ResponseData<typeof caseListResponseSchema>>('/api/cases', token, caseListResponseSchema);
  return result.cases;
}

export async function createCase(token: string, input: z.input<typeof createCaseRequestSchema>) {
  const valid = createCaseRequestSchema.parse(input);
  return request<ResponseData<typeof caseIdResponseSchema>>('/api/cases', token, caseIdResponseSchema, { method: 'POST', body: jsonBody(valid) });
}

export async function getCaseBundle(token: string, caseId: string) {
  return request<CaseBundle>(`/api/cases/${encodeURIComponent(caseId)}`, token, caseBundleResponseSchema);
}

export async function analyzeCase(token: string, caseId: string) {
  const body = generationRequestSchema.parse({});
  return request<ResponseData<typeof generationResponseSchema>>(`/api/cases/${encodeURIComponent(caseId)}/analyze`, token, generationResponseSchema, { method: 'POST', body: jsonBody(body) });
}

export async function generateSupport(token: string, caseId: string) {
  const body = generationRequestSchema.parse({});
  return request<ResponseData<typeof generationResponseSchema>>(`/api/cases/${encodeURIComponent(caseId)}/support`, token, generationResponseSchema, { method: 'POST', body: jsonBody(body) });
}

export async function repairListings(token: string, caseId: string) {
  const body = generationRequestSchema.parse({});
  return request<ResponseData<typeof generationResponseSchema>>(`/api/cases/${encodeURIComponent(caseId)}/repair`, token, generationResponseSchema, { method: 'POST', body: jsonBody(body) });
}

export async function reviseArtifact(token: string, artifactId: string, input: {
  promptText: string; promptLocale: InputLocale; expectedVersion: number;
}) {
  const body = reviseArtifactRequestSchema.parse(input);
  return request<ResponseData<typeof revisionResponseSchema>>(`/api/artifacts/${encodeURIComponent(artifactId)}/revise`, token, revisionResponseSchema, { method: 'POST', body: jsonBody(body) });
}

export async function reviewArtifact(token: string, artifactId: string, input: {
  version: number; decision: 'approved' | 'changes_requested' | 'rejected';
  reviewerRole: 'support' | 'marketing' | 'qa' | 'compliance'; comment: string;
}) {
  const body = reviewArtifactRequestSchema.parse(input);
  return request<ResponseData<typeof reviewResponseSchema>>(`/api/artifacts/${encodeURIComponent(artifactId)}/review`, token, reviewResponseSchema, { method: 'POST', body: jsonBody(body) });
}

export async function saveTask(token: string, caseId: string, input: z.input<typeof upsertTaskRequestSchema>) {
  const body = upsertTaskRequestSchema.parse(input);
  return request<ResponseData<typeof taskResponseSchema>>(`/api/cases/${encodeURIComponent(caseId)}/tasks`, token, taskResponseSchema, { method: 'POST', body: jsonBody(body) });
}

export async function transcribeAudio(token: string, audio: Blob, locale: InputLocale, signal?: AbortSignal) {
  if (audio.size > MAX_AUDIO_BYTES) throw new ApiRequestError(413, 'AUDIO_TOO_LARGE', 'Recording exceeds the 10 MiB limit.', false);
  const mimeType = audio.type.split(';')[0].trim().toLowerCase();
  if (!(AUDIO_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw new ApiRequestError(415, 'UNSUPPORTED_AUDIO', 'This recording format is not supported.', false);
  }
  const form = new FormData();
  const extension = { 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg' }[mimeType];
  form.set('audio', audio, `instruction.${extension}`);
  form.set('locale', locale);
  return request<ResponseData<typeof transcriptionResponseSchema>>('/api/transcribe', token, transcriptionResponseSchema, { method: 'POST', body: form, signal });
}

export async function translateText(token: string, text: string, sourceLocale: InputLocale, targetLocale: InputLocale) {
  const body = translationRequestSchema.parse({ text, sourceLocale, targetLocale });
  return request<ResponseData<typeof translationResponseSchema>>('/api/translate', token, translationResponseSchema, { method: 'POST', body: jsonBody(body) });
}

export function isUnavailable(error: unknown) {
  return error instanceof ApiRequestError && error.code === 'NOT_IMPLEMENTED';
}

export function isAccessDenied(error: unknown) {
  return error instanceof ApiRequestError && ['UNAUTHORIZED', 'NOT_CONFIGURED'].includes(error.code);
}

export function casePlatformLabel(platform: Platform, locale = 'en-US') {
  return platformLabel(platform, locale);
}
