import {
  AUDIO_MIME_TYPES,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_SECONDS,
  inputLocaleSchema,
  transcriptionResponseSchema,
} from "@/lib/contracts";
import { getTranscriptionAdapter, ProviderError } from "@/lib/ai/openai-compatible";
import { apiFailure, apiSuccess } from "@/lib/server/http";
import { demoAccessFailure } from "@/lib/server/access";
import { mutationGuard } from "@/lib/server/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MULTIPART_OVERHEAD = 64 * 1024;

async function readBoundedBody(request: Request, maxBytes: number) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function providerFailure(error: ProviderError) {
  const message = {
    NOT_CONFIGURED: "Speech transcription is not configured.",
    MODEL_TIMEOUT: "Speech transcription timed out. Try again.",
    RATE_LIMITED: "Speech transcription is temporarily rate limited. Try again.",
    INVALID_MODEL_OUTPUT: "Speech transcription returned an invalid result.",
    TRANSCRIPTION_FAILED: "Speech transcription failed. You can type the instruction instead.",
    AUDIO_TOO_LARGE: "Audio must be no longer than 60 seconds.",
    UNSUPPORTED_AUDIO: "This audio format is not supported.",
    INTERNAL_ERROR: "Speech transcription is temporarily unavailable.",
  }[error.code];
  return apiFailure(error.code, message, error.status, error.retryable);
}

export async function POST(request: Request) {
  const rejected = mutationGuard(request, { name: "transcribe", limit: 10, windowMs: 60_000 });
  if (rejected) return rejected;
  const accessFailure = demoAccessFailure(request);
  if (accessFailure) return accessFailure;

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_AUDIO_BYTES + MAX_MULTIPART_OVERHEAD)) {
    return apiFailure("AUDIO_TOO_LARGE", "Audio must be no larger than 10 MiB.", 413);
  }

  const body = await readBoundedBody(request, MAX_AUDIO_BYTES + MAX_MULTIPART_OVERHEAD);
  if (!body) return apiFailure("AUDIO_TOO_LARGE", "Audio must be no larger than 10 MiB.", 413);

  let form: FormData;
  try {
    form = await new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body,
    }).formData();
  } catch {
    return apiFailure("INVALID_REQUEST", "Provide audio and a supported language.", 400);
  }

  const locale = inputLocaleSchema.safeParse(form.get("locale"));
  const audio = form.get("audio");
  if (!locale.success || !(audio instanceof File)) {
    return apiFailure("INVALID_REQUEST", "Provide audio and a supported language.", 400);
  }
  if (audio.size === 0) return apiFailure("INVALID_REQUEST", "The recording is empty.", 400);
  if (audio.size > MAX_AUDIO_BYTES) return apiFailure("AUDIO_TOO_LARGE", "Audio must be no larger than 10 MiB.", 413);

  const mimeType = audio.type.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (!(AUDIO_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return apiFailure("UNSUPPORTED_AUDIO", "Use WebM, MP4, MP3, WAV or Ogg audio.", 415);
  }

  const transcription = getTranscriptionAdapter();
  if (!transcription) return apiFailure("NOT_CONFIGURED", "Speech transcription is not configured.", 503);

  try {
    const result = await transcription.transcribe(new Uint8Array(await audio.arrayBuffer()), mimeType, locale.data);
    if (result.durationSeconds > MAX_AUDIO_SECONDS) {
      return apiFailure("AUDIO_TOO_LARGE", "Audio must be no longer than 60 seconds.", 413);
    }
    const response = transcriptionResponseSchema.safeParse({
      ok: true,
      data: { text: result.text, locale: result.locale, requiresConfirmation: true },
      error: null,
      requestId: crypto.randomUUID(),
    });
    if (!response.success) throw new ProviderError("TRANSCRIPTION_FAILED", 502, false);
    return apiSuccess(response.data.data);
  } catch (error) {
    if (error instanceof ProviderError) return providerFailure(error);
    return apiFailure("TRANSCRIPTION_FAILED", "Speech transcription failed. You can type the instruction instead.", 502);
  }
}
