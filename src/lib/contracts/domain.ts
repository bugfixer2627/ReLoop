import { z } from "zod";

export const platformSchema = z.enum(["shopify_us", "amazon_de", "alibaba_intl"]);
export const localeSchema = z.enum(["zh-CN", "en-US", "de-DE", "ar-AE"]);
export const inputLocaleSchema = z.enum(["zh-CN", "en-US"]);
export const languageStatusSchema = z.enum(["ready", "beta", "unavailable"]);
export const businessRoleSchema = z.enum(["support", "marketing", "qa", "compliance"]);
export const findingCategorySchema = z.enum(["evidence", "market_law", "platform_rule"]);
export const severitySchema = z.enum(["info", "warning", "blocker"]);
export const evidenceStatusSchema = z.enum([
  "supported", "documented_mismatch", "needs_evidence", "unverified_observation",
]);
export const ruleStatusSchema = z.enum(["verified", "needs_rule_verification"]);
export const reviewStatusSchema = z.enum([
  "draft", "pending_review", "approved", "changes_requested", "rejected", "blocked",
]);
export const reviewDecisionSchema = z.enum(["approved", "changes_requested", "rejected"]);
export const artifactKindSchema = z.enum([
  "investigation_summary", "support_reply", "listing_correction",
]);
export const channelSchema = platformSchema;
export const sourceIdsSchema = z.array(z.string().min(1)).min(1);
export const timestampSchema = z.iso.datetime({ offset: true });
export const conditionsSchema = z.record(z.string(), z.string().min(1));

export const productSchema = z.object({
  id: z.uuid(), sku: z.string().min(1), name: z.string().min(1),
  sourceVersion: z.string().min(1), attributes: z.record(z.string(), z.unknown()),
  synthetic: z.boolean(),
});

export const numericClaimSchema = z.object({
  metric: z.literal("battery_runtime"), value: z.number().nonnegative(),
  unit: z.literal("hours"), qualifier: z.enum(["maximum", "up_to", "reported"]),
  conditions: conditionsSchema,
});

export const feedbackExtractionSchema = z.object({
  issue: z.string().min(1), customerClaim: numericClaimSchema.nullable(),
  unknowns: z.array(z.string().min(1)),
});

export const evidenceSourceSchema = z.object({
  id: z.string().min(1), productId: z.uuid(),
  kind: z.enum(["specification", "support_policy"]), content: z.string().min(1),
  numericClaim: numericClaimSchema.nullable(), testConditions: conditionsSchema,
  sourceVersion: z.string().min(1), provenance: z.string().min(1),
  verificationStatus: z.enum(["documented", "needs_evidence"]), synthetic: z.boolean(),
});

export const listingSchema = z.object({
  id: z.string().min(1), productId: z.uuid(), platform: platformSchema,
  market: z.string().min(1), locale: localeSchema, segment: z.enum(["b2c", "b2b"]),
  fields: z.record(z.string(), z.unknown()), numericClaim: numericClaimSchema.nullable(),
  snapshotVersion: z.string().min(1), synthetic: z.boolean(),
}).superRefine((listing, ctx) => {
  const contexts = { shopify_us: ["US", "b2c"], amazon_de: ["DE", "b2c"], alibaba_intl: ["global_b2b", "b2b"] } as const;
  const [market, segment] = contexts[listing.platform];
  if (listing.market !== market || listing.segment !== segment) {
    ctx.addIssue({ code: "custom", message: "Listing market and B2B/B2C segment must match its platform." });
  }
});

export const ruleSchema = z.object({
  id: z.string().min(1), category: z.enum(["market_law", "platform_rule", "merchant_policy"]),
  market: z.string().min(1), platform: platformSchema.nullable(),
  segment: z.enum(["b2c", "b2b", "all"]), sourceUrl: z.url().refine((url) => url.startsWith("https://"), "Official sources must use HTTPS."),
  excerpt: z.string().nullable(), checkedAt: timestampSchema.nullable(),
  applicability: z.string().min(1), status: ruleStatusSchema,
}).superRefine((rule, ctx) => {
  if (rule.status === "verified" && (!rule.excerpt?.trim() || !rule.checkedAt)) {
    ctx.addIssue({ code: "custom", message: "Verified rules require an excerpt and checked date." });
  }
  if (rule.category === "platform_rule" && !rule.platform) {
    ctx.addIssue({ code: "custom", message: "Platform rules require an explicit platform." });
  }
});

const notesSchema = z.array(z.string().min(1));
export const artifactContentSchema = z.discriminatedUnion("format", [
  z.object({ format: z.literal("investigation_summary"), summary: z.string().min(1), unknowns: notesSchema }),
  z.object({ format: z.literal("support_reply"), subject: z.string().min(1), body: z.string().min(1) }),
  z.object({ format: z.literal("shopify_description"), title: z.string().min(1), description: z.string().min(1), faq: notesSchema }),
  z.object({ format: z.literal("amazon_listing"), title: z.string().min(1), bullets: notesSchema.min(1), description: z.string().min(1), internalBrief: z.boolean() }),
  z.object({ format: z.literal("alibaba_b2b"), title: z.string().min(1), specifications: z.record(z.string(), z.string()), benefits: notesSchema, moq: z.string().nullable(), leadTime: z.string().nullable(), claimsNotes: notesSchema }),
]);

export const artifactSchema = z.object({
  id: z.uuid(), caseId: z.uuid(), kind: artifactKindSchema,
  platform: platformSchema.nullable(), market: z.string().min(1),
  segment: z.enum(["b2c", "b2b", "internal"]), latestVersion: z.number().int().positive(),
}).superRefine((artifact, ctx) => {
  if (artifact.kind === "investigation_summary") {
    if (artifact.platform !== null || artifact.segment !== "internal") ctx.addIssue({ code: "custom", message: "Investigation summaries are internal." });
    return;
  }
  if (artifact.platform === null) {
    ctx.addIssue({ code: "custom", message: "Support and listing artifacts require a platform." });
    return;
  }
  const contexts = { shopify_us: ["US", "b2c"], amazon_de: ["DE", "b2c"], alibaba_intl: ["global_b2b", "b2b"] } as const;
  const [market, segment] = contexts[artifact.platform];
  if (artifact.market !== market || artifact.segment !== segment || (artifact.kind === "support_reply" && artifact.platform !== "shopify_us")) {
    ctx.addIssue({ code: "custom", message: "Artifact platform, market, segment and kind are inconsistent." });
  }
});

export const artifactVersionSchema = z.object({
  id: z.uuid(), artifactId: z.uuid(), version: z.number().int().positive(),
  locale: localeSchema, languageStatus: languageStatusSchema, content: artifactContentSchema,
  sourceIds: sourceIdsSchema, reviewStatus: reviewStatusSchema,
  validationStatus: z.enum(["pending", "checked", "needs_evidence", "needs_rule_verification", "blocked"]),
  createdAt: timestampSchema,
});

export const findingSchema = z.object({
  id: z.uuid(), caseId: z.uuid(), artifactVersionId: z.uuid().nullable(),
  listingId: z.string().nullable(), category: findingCategorySchema,
  severity: severitySchema, code: z.string().min(1), sourceIds: sourceIdsSchema,
  ruleId: z.string().nullable(), ruleStatus: ruleStatusSchema.nullable(),
  evidenceStatus: evidenceStatusSchema.nullable(),
  originalSpan: z.string().nullable(), proposedSpan: z.string().nullable(),
  explanationZh: z.string().min(1), explanationEn: z.string().min(1),
}).superRefine((finding, ctx) => {
  if (finding.category !== "evidence" && (!finding.ruleId || !finding.ruleStatus)) {
    ctx.addIssue({ code: "custom", message: "Law/platform findings require a rule ID and verification state." });
  }
  if (finding.category === "evidence" && !finding.evidenceStatus) {
    ctx.addIssue({ code: "custom", message: "Evidence findings require an evidence status." });
  }
});

export const caseSchema = z.object({
  id: z.uuid(), productId: z.uuid(), sku: z.string().min(1), channel: channelSchema,
  feedbackText: z.string().min(1), feedbackLocale: localeSchema,
  merchantInstruction: z.string().min(1), merchantLocale: inputLocaleSchema,
  status: z.enum(["open", "pending_review", "clear"]),
  synthetic: z.boolean(), createdAt: timestampSchema,
});

export const revisionEventSchema = z.object({
  id: z.uuid(), caseId: z.uuid(), artifactId: z.uuid(),
  promptText: z.string().min(1), promptLocale: inputLocaleSchema,
  fromVersion: z.number().int().positive(), toVersion: z.number().int().positive(),
  createdAt: timestampSchema,
}).refine((event) => event.toVersion === event.fromVersion + 1, {
  message: "A revision must advance exactly one version.",
});

export const taskSchema = z.object({
  id: z.uuid(), caseId: z.uuid(), assignedRole: businessRoleSchema,
  kind: z.enum(["qa_investigation", "compliance_review"]), title: z.string().min(1),
  description: z.string().min(1), state: z.enum(["open", "in_progress", "done"]),
  sourceIds: sourceIdsSchema, createdAt: timestampSchema,
});

export const auditEventSchema = z.object({
  id: z.uuid(), caseId: z.uuid(), actorRole: businessRoleSchema,
  action: z.string().min(1), entityId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()), createdAt: timestampSchema,
});

export type Platform = z.infer<typeof platformSchema>;
export type Locale = z.infer<typeof localeSchema>;
export type InputLocale = z.infer<typeof inputLocaleSchema>;
export type Case = z.infer<typeof caseSchema>;
export type ArtifactContent = z.infer<typeof artifactContentSchema>;
export type ArtifactVersion = z.infer<typeof artifactVersionSchema>;
export type Rule = z.infer<typeof ruleSchema>;
