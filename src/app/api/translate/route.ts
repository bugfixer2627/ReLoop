import { translationRequestSchema, translationResponseSchema } from "@/lib/contracts";
import { getAiAdapter, ProviderError } from "@/lib/ai/openai-compatible";
import { checkAccess } from "@/lib/server/access";
import { apiFailure, apiSuccess } from "@/lib/server/http";
import { mutationGuard } from "@/lib/server/request-guards";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rejected = mutationGuard(request, { name: "translate", limit: 20, windowMs: 60_000 });
  if (rejected) return rejected;
  const denied = checkAccess(request);
  if (denied) return denied;

  let input: unknown;
  try { input = await request.json(); }
  catch { return apiFailure("INVALID_REQUEST", "Provide text and different source and target languages.", 400); }
  const parsed = translationRequestSchema.safeParse(input);
  if (!parsed.success) return apiFailure("INVALID_REQUEST", "Provide text and different supported languages.", 400);
  const adapter = getAiAdapter();
  if (!adapter) return apiFailure("NOT_CONFIGURED", "AI translation is not configured.", 503);

  try {
    const text = await adapter.translate(parsed.data.text, parsed.data.sourceLocale, parsed.data.targetLocale);
    const result = translationResponseSchema.safeParse({
      ok: true,
      data: { text, sourceLocale: parsed.data.sourceLocale, targetLocale: parsed.data.targetLocale },
      error: null,
      requestId: crypto.randomUUID(),
    });
    if (!result.success) throw new ProviderError("INVALID_MODEL_OUTPUT", 502, false);
    return apiSuccess(result.data.data);
  } catch (error) {
    if (error instanceof ProviderError) return apiFailure(error.code, error.code === "NOT_CONFIGURED" ? "AI translation is not configured." : "Translation failed.", error.status, error.retryable);
    return apiFailure("INTERNAL_ERROR", "Translation failed.", 500);
  }
}
