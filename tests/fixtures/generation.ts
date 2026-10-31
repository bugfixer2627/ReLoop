import { caseBundleSchema } from "@/lib/contracts";
import { demoBundle } from "@/lib/fixtures/demo";

// CONTRACT MOCK ONLY. Never show this as a real model result.
const artifactIds = [
  "00000000-0000-4000-8000-000000000201", "00000000-0000-4000-8000-000000000202",
  "00000000-0000-4000-8000-000000000203", "00000000-0000-4000-8000-000000000204",
];

export const mockGeneratedBundle = caseBundleSchema.parse({
  ...demoBundle,
  artifacts: [
    { id: artifactIds[0], caseId: demoBundle.case.id, kind: "support_reply", platform: "shopify_us", market: "US", segment: "b2c", latestVersion: 1 },
    { id: artifactIds[1], caseId: demoBundle.case.id, kind: "listing_correction", platform: "shopify_us", market: "US", segment: "b2c", latestVersion: 1 },
    { id: artifactIds[2], caseId: demoBundle.case.id, kind: "listing_correction", platform: "amazon_de", market: "DE", segment: "b2c", latestVersion: 1 },
    { id: artifactIds[3], caseId: demoBundle.case.id, kind: "listing_correction", platform: "alibaba_intl", market: "global_b2b", segment: "b2b", latestVersion: 1 },
  ],
  versions: [
    { id: "00000000-0000-4000-8000-000000000301", artifactId: artifactIds[0], content: { format: "support_reply", subject: "Your lamp runtime question", body: "Thank you for letting us know. Please share your order number, brightness setting and charging details so we can investigate." }, sourceIds: ["SPEC-001", "POLICY-MERCHANT-001"] },
    { id: "00000000-0000-4000-8000-000000000302", artifactId: artifactIds[1], content: { format: "shopify_description", title: "Rechargeable desk lamp", description: "Maximum 4 hours at maximum brightness, fully charged, 23°C; fictional DEMO-RUNTIME-v1 test.", faq: ["Runtime depends on documented operating conditions."] }, sourceIds: ["SPEC-001", "LIST-SHOP-001"] },
    { id: "00000000-0000-4000-8000-000000000303", artifactId: artifactIds[2], content: { format: "amazon_listing", title: "Internal correction brief — rechargeable desk lamp", bullets: ["Remove the unsupported 12-hour statement."], description: "English internal brief only; German localization and Amazon DE rule verification remain pending.", internalBrief: true }, sourceIds: ["SPEC-001", "LIST-AMZ-001"] },
    { id: "00000000-0000-4000-8000-000000000304", artifactId: artifactIds[3], content: { format: "alibaba_b2b", title: "Rechargeable desk lamp — wholesale specification", specifications: { runtime: "Maximum 4h at maximum brightness, fully charged, 23°C; fictional DEMO-RUNTIME-v1" }, benefits: ["Rechargeable lighting for wholesale review."], moq: "100 units", leadTime: "15 business days", claimsNotes: ["Fictional wholesale values from SPEC-001; not actual supplier commitments."] }, sourceIds: ["SPEC-001", "LIST-ALI-001"] },
  ].map((version) => ({ ...version, version: 1, locale: "en-US", languageStatus: "beta", reviewStatus: "pending_review", validationStatus: "needs_rule_verification", createdAt: "2026-10-31T00:01:00Z" })),
});
