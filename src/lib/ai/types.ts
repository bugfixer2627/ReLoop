import type { z } from "zod";
import type { ArtifactContent, ArtifactVersion, CaseBundle, InputLocale, Platform } from "@/lib/contracts";
import type { feedbackExtractionSchema } from "@/lib/contracts";

export type ExtractedFeedback = z.infer<typeof feedbackExtractionSchema>;

// Interface only: Person 2 supplies one real, server-side provider implementation.
// Every provider result is untrusted until parsed by Zod and checked against sources.
export interface AiAdapter {
  extract(context: CaseBundle): Promise<ExtractedFeedback>;
  summarize(context: CaseBundle, locale: InputLocale): Promise<ArtifactContent>;
  generateSupport(context: CaseBundle): Promise<ArtifactContent>;
  generateListing(context: CaseBundle, platform: Platform): Promise<ArtifactContent>;
  revise(context: CaseBundle, current: ArtifactVersion, prompt: string, locale: InputLocale): Promise<ArtifactContent>;
}

export interface TranscriptionAdapter {
  transcribe(audio: Uint8Array, mimeType: string, locale: InputLocale): Promise<{
    text: string;
    locale: InputLocale;
    durationSeconds: number;
  }>;
}
