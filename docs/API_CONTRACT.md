# Shared API contract v1 — foundation handoff

**Canonical shapes:** `src/lib/contracts/domain.ts` and `api.ts`. Breaking changes require Person 2 to coordinate with Persons 1/3. Health, case, generation, revision, review and transcription routes are implemented behind the demo-access gate; task persistence still depends on the remaining Person 3 integration.

Case routes require `Authorization: Bearer <DEMO_ACCESS_TOKEN>`. Configure a strong shared token on the server. Until a secure login/session UI is implemented, do not embed the token in frontend code or expose it publicly. Cross-origin writes are rejected.

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

URL IDs are UUIDs; validate before DB access. Enforce the shared demo-access gate before enabling business routes on a shared deployment.

| Method/path | Request | Success schema | Owner |
|---|---|---|---|
| GET `/api/health` | None; public | `healthResponseSchema` | P2 |
| GET `/api/cases` | None | `caseListResponseSchema` | P2/P3 |
| POST `/api/cases` | `createCaseRequestSchema` | `caseIdResponseSchema`, 201 | P2/P3 |
| GET `/api/cases/:id` | None | `caseBundleResponseSchema` | P2/P3 |
| POST `/api/cases/:id/analyze` | `{}` | `generationResponseSchema` | P2/P3 |
| POST `/api/cases/:id/support` | `{}` | `generationResponseSchema` | P2 |
| POST `/api/cases/:id/repair` | `{}` | `generationResponseSchema` | P2/P3 |
| POST `/api/artifacts/:id/revise` | `reviseArtifactRequestSchema` | `revisionResponseSchema` | P2/P3 |
| POST `/api/artifacts/:id/review` | `reviewArtifactRequestSchema` | `reviewResponseSchema` | P2/P3 |
| POST `/api/cases/:id/tasks` | `upsertTaskRequestSchema` | `taskResponseSchema` | P2/P3 |
| POST `/api/transcribe` | Multipart `audio`/`locale` | `transcriptionResponseSchema` | P2 |

### Create and retrieve case

```json
{"sku":"RL-LAMP-01","channel":"shopify_us","feedbackText":"My lamp works for only about 2 hours.","feedbackLocale":"en-US","merchantInstruction":"请核对客户投诉与三个平台的商品承诺。","merchantLocale":"zh-CN","synthetic":true}
```

This MVP accepts synthetic cases only. Lookup SKU, persist case, then generate. Never silently fall back to the lamp for an unknown SKU. Join product SKU when mapping case rows.

Case bundle: `{case,product,evidence[],listings[],rules[],artifacts[],versions[],findings[],revisions[],tasks[],audit[]}`. `demoBundle` is a validated original-input example. `tests/fixtures/generation.ts` is a **contract mock** with all four output formats for isolated UI work, not evidence of live generation.

Artifact identity: `{id,caseId,kind,platform,market,segment,latestVersion}`. Version: `{id,artifactId,version,locale,languageStatus,content,sourceIds,reviewStatus,validationStatus,createdAt}`. UI explicitly selects the current/historical version.

Content discriminants: `investigation_summary`, `support_reply`, `shopify_description`, `amazon_listing`, `alibaba_b2b`. Validate the content **and matching artifact context**. Alibaba cannot receive a Shopify description. English Amazon output requires `internalBrief:true`; German can only be enabled after tests.

Analyze returns summary/evidence findings; support returns reply; repair returns three listing artifacts/findings. Check source IDs/versions against retrieved context. Repeated generation requests must not create duplicate initial artifacts; coordinate transaction/idempotency behavior before implementation.

### Revise both artifact kinds

```json
{"promptText":"请缩短内容，保留测试条件，不要承诺退款。","promptLocale":"zh-CN","expectedVersion":1}
```

Check expected head; generate/validate; lock and recheck; atomically save next version, new findings, revision and audit, then advance head. Stale edits return 409. Timeout/invalid output leaves old history intact. New versions start unapproved. Preserve old findings/reviews.

### Review exact version

```json
{"version":3,"decision":"changes_requested","reviewerRole":"compliance","comment":"Keep test conditions in the proposed copy."}
```

Support reviews support outputs; marketing/compliance review listings. Old-head approvals return `CONFLICT`; blockers/unresolved required evidence/rules return `REVIEW_BLOCKED`. Persist review, state change and audit atomically. Approval is for an internal draft only.

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
