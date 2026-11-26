# Shared API contract v1

**Canonical shapes:** `src/lib/contracts/domain.ts` and `api.ts`. Case creation, AI investigation, support, listing correction, revision, review and task persistence are implemented and have passed real-provider/hosted-Supabase HTTP checks. Text translation is separate from speech transcription. The incoming speech implementation supports a separately launched local CPU service or an external transcription provider, plus an independent browser-recognition mode. Ordinary startup without speech configuration returns 503 NOT_CONFIGURED for valid audio. See `WORKFLOW_VERIFICATION_2026-11-01.md`, `VOICE_SETUP.md`, and `H18_H24_DELIVERY.md` for their respective test boundaries.

Browser sign-in uses `POST /api/auth/login` with `{email,password}`. Supabase Auth verifies the credentials; the server issues a signed HttpOnly, SameSite cookie with an eight-hour lifetime. `GET /api/auth/session` reports whether it is valid and `POST /api/auth/logout` clears it. Public registration is disabled; users are provisioned by a Supabase administrator. Browser mutations require a same-origin `Origin` header. A configured `DEMO_ACCESS_TOKEN` remains available only for trusted API clients during migration and is not shown in the login UI.

Browser case operations are scoped to the signed-in owner. An assigned reviewer may read the assigned case and review saved draft versions. The owner controls sources, generation, revisions, tasks, and case status. An out-of-scope case or artifact returns `NOT_FOUND`. Legacy integration clients can access unowned fixtures.

## Envelopes

```json
{"ok":true,"data":{"caseId":"00000000-0000-4000-8000-000000000101"},"error":null,"requestId":"00000000-0000-4000-8000-000000000999"}
```

```json
{"ok":false,"data":null,"error":{"code":"NOT_IMPLEMENTED","message":"This workflow is not available yet.","retryable":false},"requestId":"00000000-0000-4000-8000-000000000999"}
```

`ok` means the operation completed, **not compliance passed**. Completed investigations may return unresolved evidence/rule findings which remain visible. Missing inputs/model results cannot become invented successful drafts. Use server-generated request IDs and `Cache-Control: no-store`. Sanitize provider errors; never return credentials/connection strings.

| HTTP | Code/condition |
|---|---|
| 400 / 401 | `INVALID_REQUEST` / `UNAUTHORIZED` |
| 404 | `NOT_FOUND`, `UNKNOWN_SKU` |
| 409 | `CONFLICT` for stale version |
| 413 / 415 | `AUDIO_TOO_LARGE` / `UNSUPPORTED_AUDIO` |
| 422 | `INVALID_MODEL_OUTPUT`, `REVIEW_BLOCKED`; missing evidence/rule when it prevents the operation |
| 429 | `RATE_LIMITED` |
| 503 / 504 | `NOT_CONFIGURED`, `DATABASE_UNAVAILABLE` / `MODEL_TIMEOUT` |
| 502 / 500 | `TRANSCRIPTION_FAILED` / sanitized `INTERNAL_ERROR` |

## Endpoints

URL IDs are UUIDs; validate before DB access. All business routes require an authenticated workspace session or the optional trusted API bearer credential.

| Method/path | Request | Success schema | Owner |
|---|---|---|---|
| GET `/api/health` | None; public | `healthResponseSchema` | P2 |
| GET `/api/cases` | Optional `q`, `status`, `channel`, `sort`, `page` | `caseListResponseSchema` | P2/P3 |
| POST `/api/cases` | `createCaseRequestSchema` | `caseIdResponseSchema`, 201 | P2/P3 |
| GET `/api/cases/:id` | None | `caseBundleResponseSchema` | P2/P3 |
| PATCH `/api/cases/:id` | `manageCaseRequestSchema` | `caseIdResponseSchema` | P2/P3 |
| GET `/api/cases/export` | Case filters | CSV attachment | P2/P3 |
| POST `/api/products` | `createProductRequestSchema` | `productResponseSchema`, 201 | P2/P3 |
| POST `/api/cases/:id/sources` | `addSourceRequestSchema` | `sourceResponseSchema`, 201 | P2/P3 |
| POST `/api/cases/:id/analyze` | `{}` | `generationResponseSchema` | P2/P3 |
| POST `/api/cases/:id/support` | `{}` | `generationResponseSchema` | P2 |
| POST `/api/cases/:id/repair` | `{}` | `generationResponseSchema` | P2/P3 |
| POST `/api/artifacts/:id/revise` | `reviseArtifactRequestSchema` | `revisionResponseSchema` | P2/P3 |
| POST `/api/artifacts/:id/review` | `reviewArtifactRequestSchema` | `reviewResponseSchema` | P2/P3 |
| POST `/api/cases/:id/tasks` | `upsertTaskRequestSchema` | `taskResponseSchema` | P2/P3 |
| POST `/api/transcribe` | Multipart `audio`/`locale` | `transcriptionResponseSchema` | P2 |
| POST `/api/translate` | `translationRequestSchema` | `translationResponseSchema` | P2 |

### Create and retrieve case

```json
{"sku":"RL-LAMP-01","channel":"shopify_us","feedbackText":"My lamp works for only about 2 hours.","feedbackLocale":"en-US","merchantInstruction":"请核对客户投诉与三个平台的商品承诺。","merchantLocale":"zh-CN","synthetic":true}
```

Look up the signed-in account's private SKU or an exact match in the shared synthetic catalog. The server derives the persisted `synthetic` value from the product. The legacy request field remains accepted. Save a case before running generation. Signed-in case lists return 25 rows per page, a filtered total, workspace status counts, and up to 90 days of daily intake. CSV export includes all matching rows. Unparameterized legacy bearer requests retain the original envelope.

Browser case bundles include `access: {role, reviewerUserId}` alongside the case, product, sources, versions, findings, revisions, tasks, and audit. Use `PATCH` with `action: "reviewer"` and a separate account UUID, or `null` to revoke access. Use `action: "status"`, `expectedStatus`, `status`, and a `note` for an audited transition. Open tasks block resolution. Reopening a task reopens a resolved case.

Artifact identity: `{id,caseId,kind,platform,market,segment,latestVersion}`. Version: `{id,artifactId,version,locale,languageStatus,content,sourceIds,reviewStatus,validationStatus,createdAt}`. UI explicitly selects the current/historical version.

Content discriminants are `investigation_summary`, `support_reply`, `shopify_description`, `amazon_listing`, and `alibaba_b2b`. Validate against the artifact's format and platform. English Amazon output is an internal brief with `internalBrief:true`. Private Amazon listings use beta German draft generation with `internalBrief:false`. Existing English briefs can be localized by sending `outputLocale: "de-DE"` in the revision request.

Analyze saves deterministic battery-runtime evidence findings, then extracts the reported issue and creates an AI investigation summary in the merchant's language. Support and repair create saved drafts in their platform-specific formats. Evidence-only findings can remain saved if the subsequent provider call fails. Repeated generation reuses existing initial artifacts; partial repair retries fill missing outputs. Generated drafts retain unresolved rule checks and cannot be approved until applicable checks are actually complete. Verified rule-source metadata alone does not make the draft checked.

### Revise both artifact kinds

```json
{"promptText":"请缩短内容，保留测试条件，不要承诺退款。","promptLocale":"zh-CN","expectedVersion":1}
```

Check expected head; generate/validate; lock and recheck; atomically save next version, new findings, revision and audit, then advance head. Stale edits return 409. Timeout/invalid output leaves old history intact. New versions start unapproved. Preserve old findings/reviews.

The current HTTP revision route uses `reloop_create_revision` for atomic version, findings, revision and audit persistence. `reloop_save_revision` remains a legacy interface. Generated content is checked again; previous content is immutable and the new version starts unapproved.

On PostgREST PGRST202 (missing signature) only, revision, review and task repositories may use the legacy case-operation RPCs. Semantic errors and ambiguous network failures never trigger fallback writes.

### Review exact version

```json
{"version":3,"decision":"changes_requested","reviewerRole":"compliance","comment":"Keep test conditions in the proposed copy."}
```

An assigned reviewer records the decision for private cases and for demo cases with an assignment. The demo owner can review an unassigned synthetic case. The server derives the business role and records the signed-in reviewer account. Approval requires a rationale, no blocking evidence, and a documented support policy cited by a support draft or matching `ruleChecks` for a listing draft. Real listing sign-off requires a checked market-law source and platform-rule source. The audit captures the rule excerpts, checked dates, and rationale. A revision starts a new review. Old-head approvals return `CONFLICT`.

### Task

```json
{"assignedRole":"qa","kind":"qa_investigation","title":"Investigate reported 2h runtime","description":"Confirm brightness, charge and operating conditions; the report is unverified.","state":"open","sourceIds":["SPEC-001"]}
```

Optional `taskId` requests update. Verify task/source IDs belong to case context. Do not convert customer testimony into a defect diagnosis.

### Voice

Multipart `audio` binary and `locale` (`zh-CN`/`en-US`). Maximum **10 MiB / 60 seconds**. MIME allowlist: `audio/webm`, `audio/mp4`, `audio/mpeg`, `audio/wav`, `audio/ogg`; strip codec parameters before comparison, then verify real content/duration/provider support. Provider limits may narrow the allowlist; reflect this in UI.

```json
{"ok":true,"data":{"text":"请核对测试条件。","locale":"zh-CN","requiresConfirmation":true},"error":null,"requestId":"00000000-0000-4000-8000-000000000999"}
```

Preview/edit transcript and require confirmation before case/revision submission. Cancel discards recording. Do not retain raw audio or log private transcripts. Permission denial, unavailable microphone, unsupported browser, upload/transcription failures and empty speech must leave typing usable. Microphone access needs HTTPS or localhost.

### Text translation

POST `/api/translate`: `{text,sourceLocale,targetLocale}`, with different source/target locales from `en-US | zh-CN` and 1–10,000 nonblank text characters. Returns `{text,sourceLocale,targetLocale}` in the standard envelope. It translates text only and never invokes transcription, changes the original input, or writes a translation preview to the database. Inbox previews are explicitly labeled as unsaved reference text. German and Arabic are not supported by this operation.
