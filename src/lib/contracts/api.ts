import { z } from "zod";
import {
  artifactSchema, artifactVersionSchema, auditEventSchema, caseSchema, channelSchema,
  evidenceSourceSchema, findingSchema, inputLocaleSchema, listingSchema, localeSchema,
  productSchema, revisionEventSchema, reviewDecisionSchema, businessRoleSchema, platformSchema, numericClaimSchema, caseStatusSchema,
  ruleSchema, taskSchema,
} from "./domain";

function validateArtifactContext(
  artifacts: z.infer<typeof artifactSchema>[], versions: z.infer<typeof artifactVersionSchema>[],
  caseId: string, ctx: z.RefinementCtx,
) {
  for (const artifact of artifacts) {
    if (artifact.caseId !== caseId) ctx.addIssue({ code: "custom", message: "Artifact belongs to a different case." });
  }
  for (const version of versions) {
    const artifact = artifacts.find((entry) => entry.id === version.artifactId);
    if (!artifact) {
      ctx.addIssue({ code: "custom", message: "Version must reference an included artifact." });
      continue;
    }
    const expected = artifact.kind !== "listing_correction" ? artifact.kind : {
      shopify_us: "shopify_description", amazon_de: "amazon_listing", alibaba_intl: "alibaba_b2b",
    }[artifact.platform!];
    if (version.content.format !== expected) ctx.addIssue({ code: "custom", message: "Content format must match its artifact kind/platform." });
    if (artifact.kind !== "investigation_summary" && artifact.platform !== "amazon_de" && version.locale !== "en-US") {
      ctx.addIssue({ code: "custom", message: "Shopify US and Alibaba outputs must be English in this MVP." });
    }
    if (version.content.format === "amazon_listing") {
      if (!(["en-US", "de-DE"].includes(version.locale)) || version.content.internalBrief !== (version.locale === "en-US")) {
        ctx.addIssue({ code: "custom", message: "English Amazon content must be an internal brief; German content must be localized." });
      }
    }
  }
}

export const errorCodeSchema = z.enum([
  "INVALID_REQUEST", "UNAUTHORIZED", "NOT_FOUND", "UNKNOWN_SKU", "CONFLICT",
  "NOT_CONFIGURED", "NOT_IMPLEMENTED", "DATABASE_UNAVAILABLE", "MODEL_TIMEOUT",
  "INVALID_MODEL_OUTPUT", "RATE_LIMITED", "NEEDS_EVIDENCE", "NEEDS_RULE_VERIFICATION",
  "REVIEW_BLOCKED", "AUDIO_TOO_LARGE", "UNSUPPORTED_AUDIO", "TRANSCRIPTION_FAILED",
  "INTERNAL_ERROR",
]);

export const apiErrorSchema = z.object({
  code: errorCodeSchema, message: z.string().min(1), retryable: z.boolean(),
});

export function responseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), data: dataSchema, error: z.null(), requestId: z.uuid() }),
    z.object({ ok: z.literal(false), data: z.null(), error: apiErrorSchema, requestId: z.uuid() }),
  ]);
}

export const createCaseRequestSchema = z.strictObject({
  sku: z.string().trim().min(1).max(100), channel: channelSchema,
  feedbackText: z.string().trim().min(1).max(10000), feedbackLocale: localeSchema,
  merchantInstruction: z.string().trim().min(1).max(4000), merchantLocale: inputLocaleSchema,
  synthetic: z.literal(true).optional(),
});

export const caseIdResponseSchema = responseSchema(z.object({ caseId: z.uuid() }));
export const caseListQuerySchema = z.object({
  q: z.string().trim().max(200).default(""), status: caseStatusSchema.optional(), channel: platformSchema.optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"), page: z.coerce.number().int().min(1).max(100_000).default(1),
});
export const caseListResponseSchema = responseSchema(z.object({
  cases: z.array(caseSchema), page: z.number().int().positive().optional(), pageSize: z.number().int().positive().optional(),
  total: z.number().int().nonnegative().optional(),
  counts: z.record(caseStatusSchema, z.number().int().nonnegative()).optional(),
  intake: z.array(z.object({ date: z.iso.date(), count: z.number().int().nonnegative() })).optional(),
}));

const sourceText = z.string().trim().min(1).max(10_000);
const sourceVersion = z.string().trim().min(1).max(100);
const sourceUrl = z.url().refine((url) => url.startsWith("https://")).max(2048);

export const createProductRequestSchema = z.strictObject({
  sku: z.string().trim().min(1).max(100), name: z.string().trim().min(1).max(200),
  sourceVersion,
});
export const productResponseSchema = responseSchema(productSchema);
export const addSourceRequestSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.enum(["specification", "support_policy"]), content: sourceText,
    provenance: z.string().trim().min(1).max(500), sourceVersion, numericClaim: numericClaimSchema.nullable().default(null) }),
  z.strictObject({ kind: z.literal("listing"), platform: platformSchema, locale: localeSchema,
    title: z.string().trim().min(1).max(500), content: sourceText, sourceVersion, numericClaim: numericClaimSchema.nullable().default(null) }),
  z.strictObject({ kind: z.literal("rule"), platform: platformSchema, category: z.enum(["market_law", "platform_rule"]),
    sourceUrl, excerpt: sourceText, applicability: z.string().trim().min(1).max(2000), checkedDate: z.iso.date() }),
]);
export const sourceResponseSchema = responseSchema(z.object({ sourceId: z.string().min(1) }));
export const manageCaseRequestSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("status"), status: caseStatusSchema, expectedStatus: caseStatusSchema,
    note: z.string().trim().min(1).max(2000) }),
  z.strictObject({ action: z.literal("reviewer"), reviewerUserId: z.uuid().nullable() }),
]);

export const caseBundleSchema = z.object({
  case: caseSchema, product: productSchema, evidence: z.array(evidenceSourceSchema),
  listings: z.array(listingSchema), rules: z.array(ruleSchema), artifacts: z.array(artifactSchema),
  versions: z.array(artifactVersionSchema), findings: z.array(findingSchema),
  revisions: z.array(revisionEventSchema), tasks: z.array(taskSchema), audit: z.array(auditEventSchema),
  access: z.object({ role: z.enum(["owner", "reviewer"]), reviewerUserId: z.uuid().nullable() }).optional(),
}).superRefine((bundle, ctx) => {
  validateArtifactContext(bundle.artifacts, bundle.versions, bundle.case.id, ctx);
  if (bundle.case.productId !== bundle.product.id || bundle.case.sku !== bundle.product.sku
    || bundle.evidence.some((source) => source.productId !== bundle.product.id)
    || bundle.listings.some((listing) => listing.productId !== bundle.product.id)) {
    ctx.addIssue({ code: "custom", message: "Case and source product identities must agree." });
  }
  const sourceIds = new Set([...bundle.evidence, ...bundle.listings, ...bundle.rules].map((source) => source.id));
  for (const version of bundle.versions) {
    if (version.sourceIds.some((id) => !sourceIds.has(id))) ctx.addIssue({ code: "custom", message: "Version citations must reference retrieved sources." });
  }
});
export const caseBundleResponseSchema = responseSchema(caseBundleSchema);

export const generationRequestSchema = z.strictObject({});
export const generationDataSchema = z.object({
  caseId: z.uuid(), artifacts: z.array(artifactSchema), versions: z.array(artifactVersionSchema),
  findings: z.array(findingSchema),
}).superRefine((data, ctx) => validateArtifactContext(data.artifacts, data.versions, data.caseId, ctx));
export const generationResponseSchema = responseSchema(generationDataSchema);

export const reviseArtifactRequestSchema = z.strictObject({
  promptText: z.string().trim().min(1).max(4000), promptLocale: inputLocaleSchema,
  expectedVersion: z.number().int().positive(), outputLocale: z.literal("de-DE").optional(),
});
export const revisionResponseSchema = responseSchema(z.object({
  caseId: z.uuid(), artifact: artifactSchema, version: artifactVersionSchema,
  revision: revisionEventSchema, findings: z.array(findingSchema),
}));

export const reviewArtifactRequestSchema = z.strictObject({
  version: z.number().int().positive(), decision: reviewDecisionSchema,
  reviewerRole: businessRoleSchema, comment: z.string().trim().max(2000),
  ruleChecks: z.array(z.strictObject({
    ruleId: z.string().min(1).max(200),
    sourceUrl: z.url().refine((url) => url.startsWith("https://")),
  })).min(1).optional(),
});
export const reviewResponseSchema = responseSchema(z.object({
  caseId: z.uuid(), artifactId: z.uuid(), version: artifactVersionSchema, auditEvent: auditEventSchema,
}));

export const upsertTaskRequestSchema = z.strictObject({
  taskId: z.uuid().optional(), assignedRole: businessRoleSchema,
  kind: z.enum(["qa_investigation", "compliance_review"]),
  title: z.string().trim().min(1).max(200), description: z.string().trim().min(1).max(4000),
  state: z.enum(["open", "in_progress", "done"]), sourceIds: z.array(z.string().min(1)).min(1),
});
export const taskResponseSchema = responseSchema(z.object({ task: taskSchema, auditEvent: auditEventSchema }));

export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_SECONDS = 60;
export const AUDIO_MIME_TYPES = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"] as const;
export const transcriptionResponseSchema = responseSchema(z.object({
  text: z.string().min(1), locale: inputLocaleSchema, requiresConfirmation: z.literal(true),
}));

export const translationRequestSchema = z.strictObject({
  text: z.string().trim().min(1).max(10000),
  sourceLocale: inputLocaleSchema,
  targetLocale: inputLocaleSchema,
}).refine((input) => input.sourceLocale !== input.targetLocale, {
  message: "Source and target languages must differ.",
});
export const translationResponseSchema = responseSchema(z.object({
  text: z.string().min(1), sourceLocale: inputLocaleSchema, targetLocale: inputLocaleSchema,
}));

export const healthDataSchema = z.object({
  stage: z.literal("foundation"), status: z.enum(["ok", "degraded"]),
  database: z.enum(["not_configured", "reachable", "unreachable"]),
  generation: z.enum(["not_implemented", "not_configured", "configured"]),
  transcription: z.enum(["not_implemented", "not_configured", "configured"]),
});
export const healthResponseSchema = responseSchema(healthDataSchema);
export type ApiErrorCode = z.infer<typeof errorCodeSchema>;
export type CaseBundle = z.infer<typeof caseBundleSchema>;
