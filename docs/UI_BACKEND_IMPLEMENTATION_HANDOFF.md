# Prototype implementation: backend handoff

Audit date: 1 November 2026. Production baseline: main `1b7667c`. Current remote backend `cde5306` and AI `ea36c13` are separate workstreams, not merged implementations. This handoff records production code support, not successful live provider/database execution. Historical verification remains in `UI_BACKEND_HANDOFF.md`; no new runtime backend or schema changes are included in this frontend integration.

## Summary

| ID | Feature | Priority | Status |
|---|---|---|---|
| BE-01 | Email/password identity and sessions | P1 | Backend change required |
| BE-02 | Account/workspace settings and team | P2 | Backend change required |
| BE-03 | Case creation | P0 | Implemented but not verified |
| BE-04 | Report download | P2 | Frontend ready / backend pending |
| BE-05 | Recent cases, filters, pagination | P1 | Implemented but not verified |
| BE-06 | Complete CSV export | P2 | Frontend ready / backend pending |
| BE-07 | Case detail and relationships | P0 | Implemented but not verified |
| BE-08 | Product lookup and media | P1 | Backend change required |
| BE-09 | Supported marketplace configuration | P1 | Implemented but not verified |
| BE-10 | Dashboard aggregates and trends | P2 | Frontend ready / backend pending |
| BE-11 | Notifications | P2 | Backend change required |
| BE-12 | Investigation and evidence | P0 | Implemented but not verified |
| BE-13 | Support generation | P0 | AI integration required |
| BE-14 | Platform listing correction | P0 | AI integration required |
| BE-15 | Revision and immutable history | P0 | AI integration required |
| BE-16 | Human approval and audit | P0 | Implemented but not verified |
| BE-17 | QA/compliance tasks | P0 | Implemented but not verified |
| BE-18 | Voice transcription | P0 | AI integration required |
| BE-19 | Case lifecycle, assignment and notes | P1 | Backend change required |
| BE-20 | Support delivery tracking | P1 | Backend change required |
| BE-21 | Rules/source maintenance | P1 | Backend change required |

## Prototype route mapping

| Prototype | Application | Notes |
|---|---|---|
| `/` | `/` | Existing production landing already contains supplied copy/artwork/structure; preserve it. |
| `/login` | `/login` | Credential appearance with explicit unavailable submission, plus working demo-token alternative. |
| `/dashboard` | `/dashboard` | Real returned-record counts, creation chart, recent cases; no fictional merchant identity. |
| `/cases` | `/cases` | Dedicated management, URL search/filters/sort and visible-row CSV. |
| `/cases/:id` | `/cases/:id/detail` | New detail page; retain existing `/cases/:id` investigation route contract. |
| `/feedback` | `/feedback` | Existing validated save/analyze, voice, retry identity; richer contextual sidebar. |
| `/investigation` | `/cases/:id` | Existing case-aware investigation. Without selection use `/dashboard?view=investigation`. |
| `/fix-approve` | `/cases/:id/fix` | Case-bound support, platform corrections, versions, review/tasks/audit. Without selection use `/dashboard?view=fix`. |
| `/rules` | `/rules` | Selected-case source browser; no global source-management API implied. |
| `/settings` | `/settings` | Profile/workspace menu; local presentation preferences only. |
| `/design-lab` / component samples | Excluded | Developer samples are not merchant pages. Their useful controls become real shared components. |

All proposed endpoints below require backend-owner agreement before frontend adoption. Existing response envelopes are `{ok,data,error,requestId}` using shared Zod DTOs. Protected requests currently require `Authorization: Bearer <demo token>`. Proposed account auth must not silently break that contract.

## BE-01 — Secure account access

- **Page/component:** Login credential form; workspace identity/logout.
- **Feature:** Email/password, verified identity, provisioning and secure sessions.
- **Current backend:** `checkAccess` accepts shared configured bearer token. No email/password login, account provisioning, logout session or trusted user profile on main. Supabase SDK is available server-side, but Auth integration is absent.
- **Required behavior:** Prefer Supabase Auth with approved provisioning (dashboard/admin invites, not public signup by default). Verify passwords through provider; define secure cookie/session refresh/logout and compatibility with protected route guards. Do not create custom password storage. Decide CSRF, access expiry, tenancy and rate limits before enabling form.
- **Existing endpoint:** GET `/api/cases` currently verifies demo access; not credential login.
- **Proposed endpoint / method:** POST `/api/auth/login`, POST `/api/auth/logout`, GET `/api/auth/session` (proposal only).
- **Request:** Login `{email:string,password:string}`; logout no password; session no body.
- **Response:** Session `{user:{id:string,email:string,displayName:string|null},expiresAt:string}`; server sets HttpOnly/Secure/SameSite session cookies. Never return provider secrets.
- **Database/config:** Supabase Auth users/provider configuration; workspace membership mapping if multiuser access is approved. Schema design requires Person 3 approval; passwords remain provider-managed.
- **Authorization/validation:** normalized email, required password, generic invalid-credential errors, brute-force limits, origin/CSRF protections, session expiry/revocation; demo migration policy and server-owned roles.
- **Owner / priority / status:** Person 2 + Person 3 / P1 / Backend change required.
- **Frontend fallback:** Credential fields/validation/show-hide visible; submission disabled and labeled unavailable. Demo token remains usable, memory-only; no remember-me, Google, reset or registration claims.
- **Acceptance:** Valid/invalid credentials, rate limit, expiry/refresh, reload, logout revocation, cross-origin rejection; existing case access remains valid during approved migration.
- **Frontend source:** `src/app/login/page.tsx`, `src/components/reloop-ui/WorkspaceShell.tsx`.

## BE-02 — Workspace settings, account and team

- **Page/component:** Settings profile, languages, policy, storefronts, team.
- **Feature:** Persist account/workspace settings and trusted team identities.
- **Current backend:** No settings, team, invite, password-change or preference API. Platform records are snapshots, not live account connections.
- **Required behavior:** Define editable fields/roles; persist workspace name, merchant default locale/time zone and notification opt-ins if approved. Review guardrails must remain server-enforced. Use provider-managed invites/password operations, never demo local identities.
- **Existing endpoint:** None.
- **Proposed endpoint / method:** GET/PATCH `/api/workspace/settings`; GET `/api/workspace/members`; POST `/api/workspace/invitations` (optional).
- **Request:** Settings `{workspaceName?:string,merchantLocale?:'zh-CN'|'en-US',timeZone?:string,notificationsEnabled?:boolean}`; invitation `{email:string,role:approvedRole}`.
- **Response:** Authorized saved settings with `updatedAt:string`; members `{id,email,displayName,role,status}[]`.
- **Database:** Approved workspace/settings/membership storage if accounts enter scope; do not mutate product snapshots for storefront settings.
- **Authorization/validation:** Server-derived account/tenant ownership; admin-only membership/policy edits; validate IANA time zone/locale; never allow auto-publish toggles to bypass human approval.
- **Owner / priority / status:** Person 2 + Person 3 / P2 / Backend change required.
- **Fallback:** Persist interface language and compact display locally, explicitly device-only. Other account/team/configuration controls unavailable; no fictitious successful save.
- **Acceptance:** Authorized persistence after refresh, cross-workspace denial, validation errors; local preferences survive refresh independently of server settings.
- **Source:** `src/app/(dashboard)/settings/page.tsx`, `src/components/reloop-ui/WorkspaceProviders.tsx`.

## BE-03 — Add case

- **Page/component:** Overview Add case → Feedback form.
- **Feature:** Save original feedback once before analysis.
- **Current / required:** POST `/api/cases` exists; validates shared schema, finds registered synthetic SKU and persists case. Retain contract. Server idempotency would be a separate enhancement for lost POST responses.
- **Endpoint / method:** Existing POST `/api/cases`.
- **Request:** `{sku:string,channel:Platform,feedbackText:string,feedbackLocale:Locale,merchantInstruction:string,merchantLocale:InputLocale,synthetic:true}`.
- **Response:** `{caseId:uuid}` in existing envelope.
- **Database:** Existing products/cases; no schema request.
- **Authorization/validation:** Existing bearer/origin, SKU association, shared length/locale/platform rules; synthetic-only restriction retained.
- **Owner / priority / status:** Person 2 + Person 3 / P0 / Implemented but not verified (new integration run).
- **Fallback:** Preserve form on failure and saved case link if analysis fails; unchanged-input retry reuses saved ID.
- **Acceptance:** Create/reload same ID, unknown SKU, rejected malformed input, auth failure, analyze failure then retry without duplicate save.
- **Source:** `src/app/(dashboard)/feedback/page.tsx`.

## BE-04 — Export report

- **Page/component:** Overview Export report.
- **Feature:** Authorized real case/evidence/review report download.
- **Current:** No report endpoint.
- **Required:** Define scope as selected period/platform/status and case details, findings with sources, current artifact/review status and persisted audit; PDF report recommended, with snapshot time and completeness label.
- **Proposed endpoint / method:** GET `/api/reports/cases?from=ISO&to=ISO&channel=Platform&status=CaseStatus`.
- **Request:** Optional bounded ISO dates, platform/status enums; no client-authored findings.
- **Response:** `application/pdf`, attachment filename, actual bytes; existing JSON error envelope on failure. Define async job only if dataset requires it.
- **Database:** Read existing case/product/finding/artifact/version/review/audit tables; no table required for synchronous export.
- **Authorization/validation:** Same case visibility; bounded ranges/rate limits; safe filename and no credential leakage; clear generation failure.
- **Owner / priority / status:** Person 2 / P2 / Frontend ready / backend pending.
- **Fallback:** Disabled export button with visible explanation; no fabricated download.
- **Acceptance:** Real included IDs/filters/citations, unauthorized denial, correct download headers, empty data and generation error.
- **Source:** `src/app/(dashboard)/dashboard/dashboard-client.tsx`.

## BE-05 — Case lists, search and pagination

- **Page/component:** Recent cases, Inbox recent list, Case Management.
- **Feature:** Retrieve ordered cases; filter/search/sort.
- **Current:** GET `/api/cases` returns `{cases:Case[]}`, ordered newest first. No pagination/count metadata or server filter request contract; provider row limits can truncate.
- **Required:** Existing endpoint suffices for loaded-row UI. Optional server pagination/filtering for complete datasets: define `q,status,channel,sort,cursor,limit`.
- **Endpoint / method:** Existing GET `/api/cases`; proposed query extensions only after agreement.
- **Request:** Currently none. Proposed strings/enums, bounded integer limit, opaque cursor.
- **Response:** Existing Case DTO array; proposed `{cases:Case[],nextCursor:string|null,total:number}` requires shared schema coordination.
- **Database:** Read cases/products; query indexes only if owner approves.
- **Authorization/validation:** Bearer now; future account visibility; validated filters/limits and stable tie-break ordering.
- **Owner / priority / status:** Person 2 + Person 3 / P1 / Implemented but not verified.
- **Fallback:** Search/filter/sort returned rows only, labeled accordingly; no claim that counts cover complete dataset.
- **Acceptance:** Search text/SKU/ID, filter combinations, oldest/newest, empty/error, case identity; test datasets exceeding default provider limit before full-data claims.
- **Source:** `src/components/reloop-ui/useCases.ts`, `CaseTable.tsx`, `src/lib/frontend/case-list.ts`, `src/app/(dashboard)/cases/case-management.tsx`.

## BE-06 — CSV export

- **Page/component:** Case Management Export visible rows CSV.
- **Feature:** Genuine case data export.
- **Current:** No export API; client can export the loaded filtered rows without backend changes.
- **Required:** No backend work for visible-row download. Complete filtered dataset export needs agreed GET `/api/cases/export` with BE-05 filters and server visibility.
- **Method / request:** Proposed GET with `q?,status?,channel?,sort?`.
- **Response:** UTF-8 `text/csv`, attachment; columns caseId, sku, channel, status, feedback, feedbackLocale, createdAt; escape quotes/newlines and neutralize spreadsheet formulas.
- **Database:** Existing cases/products reads; no new table.
- **Authorization/validation:** Same visibility, bounded export size, safe filename, CSV injection defense.
- **Owner / priority / status:** Person 2 / P2 / Frontend ready / backend pending (complete-dataset export only).
- **Fallback:** Actual filtered visible-row Blob download, explicitly labeled; disabled on empty/loading/error.
- **Acceptance:** Exact visible IDs, Chinese/quotes/newlines, leading formulas, empty filter, denied complete export; no invented rows.
- **Source:** `src/app/(dashboard)/cases/case-management.tsx`, `src/lib/frontend/case-list.ts`.

## BE-07 — Case detail

- **Page/component:** Case Detail and workflow links.
- **Feature:** Read-only original feedback/product/evidence/listings/current versions/tasks/audit relationships.
- **Current / required:** Existing bundle endpoint supplies these entities; preserve association and schemas. No new detail API needed.
- **Endpoint / method / request:** GET `/api/cases/:id`, UUID path; no body.
- **Response:** Existing `CaseBundle` shared DTO (case, product, evidence, listings, rules, artifacts, versions, findings, revisions, tasks, audit).
- **Database:** Existing related tables; no changes requested.
- **Authorization/validation:** Bearer and UUID; future account scoping; original/history fields remain read-only.
- **Owner / priority / status:** Person 2 + Person 3 / P0 / Implemented but not verified.
- **Fallback:** Loading, missing/invalid case recovery, retry; no static example substituted.
- **Acceptance:** Detail→investigation→fix retains exact case ID; 404/503 recovery; original fields cannot be edited.
- **Source:** `src/app/(dashboard)/cases/[id]/detail/`, `src/components/reloop-ui/useCaseBundle.ts`.

## BE-08 — Product context

- **Page/component:** Inbox Product Overview; Detail product attributes.
- **Feature:** SKU lookup before saving, sourced images/descriptions/specifications.
- **Current:** Bundle exposes existing Product (identity/name/attributes), evidence/listings after case load. No SKU-lookup API, image or description contract.
- **Required:** Optional read-only lookup, source ownership for media/description and explicit missing values. No unrelated stock image.
- **Proposed endpoint / method / request:** GET `/api/products/:sku`; validated bounded SKU.
- **Response:** `{product:Product,description:string|null,imageUrl:https|null,evidence:EvidenceSource[]}` proposed; owners decide authoritative fields/storage.
- **Database:** Existing products/evidence; image/description may require approved field/source extension. Not automatically a new table.
- **Authorization/validation:** Protected catalogue, safe URL policy, no arbitrary client-generated specifications.
- **Owner / priority / status:** Person 2 + Person 3 / P1 / Backend change required.
- **Fallback:** Existing SKU entry and clearly unavailable pre-save product preview; saved name/attributes come from bundle.
- **Acceptance:** Found/missing SKU, null media/description, failed lookup preserves input, unsafe URLs rejected, case product identity matches lookup.
- **Source:** `src/app/(dashboard)/feedback/page.tsx`, `src/app/(dashboard)/cases/[id]/detail/`.

## BE-09 — Marketplaces

- **Page/component:** Inbox selector, correction tabs, Settings snapshots.
- **Feature:** Supported contexts, not merchant account connections.
- **Current / required:** Shared Platform enum plus `src/lib/config/platforms.ts` provides fixed Shopify US, Amazon DE, Alibaba Intl whitelist. No endpoint required for fixed MVP; keep IDs stable. Optional dynamic registry requires separate agreement.
- **Endpoint / method / request:** None needed; optional proposed GET `/api/platforms`, no body.
- **Response:** Proposed `{platforms:{id:Platform,label:string,market:string,segment:'b2b'|'b2c',available:boolean}[]}`.
- **Database:** Existing listings/config sufficient; no marketplace registry table requested.
- **Authorization/validation:** Shared enum remains authoritative until coordinated change; do not imply connected accounts.
- **Owner / priority / status:** Person 2 / P1 / Implemented but not verified.
- **Fallback:** Existing localized configuration and snapshot labels; no fake connection switch.
- **Acceptance:** All three stable IDs, source language independent of output locale, each platform shows its own listing/artifact.
- **Source:** `src/app/(dashboard)/feedback/page.tsx`, `src/app/(dashboard)/cases/[id]/fix/fix-approve-client.tsx`, `src/app/(dashboard)/settings/page.tsx`.

## BE-10 — Metrics, activity and charts

- **Page/component:** Overview metrics, case-creation chart, activity panel.
- **Feature:** Reliable aggregates, time series and recent audit activity.
- **Current:** Case list has statuses/createdAt; bundle contains case-specific audit. No global metrics/time-series/activity endpoint or review-duration data. Loaded case counts and UTC creation dates can be calculated honestly.
- **Required:** Optional full-dataset scoped aggregates; complaint-theme/high-risk/rate/time metrics require explicit definitions and evidence, not status substitution.
- **Proposed endpoint / method:** GET `/api/dashboard?from=ISO&to=ISO&channel=Platform`; optional GET `/api/activity?cursor=...`.
- **Request:** Bounded period/platform and optional cursor.
- **Response:** Proposed `{scope:{from,to,complete:boolean},counts:{open:number,investigating:number,pendingReview:number,closed:number},series:{date:string,count:number}[],activity:AuditEvent[]}`. Review time/risk/theme metrics omitted until defined.
- **Database:** Existing case/audit records; duration requires reliable lifecycle timestamps if approved.
- **Authorization/validation:** Same case visibility; no unrelated tenant audit; specify timezone and completeness.
- **Owner / priority / status:** Person 2 + Person 3 / P2 / Frontend ready / backend pending.
- **Fallback:** Real returned-case counts/chart labeled sample scope; no complaint-theme simulation or fictional audit. Global activity unavailable.
- **Acceptance:** Counts reconcile with authorized fixtures, timezone boundaries, empty/error state, no fabricated zeros on load failure, aggregate above provider row cap.
- **Source:** `src/app/(dashboard)/dashboard/dashboard-client.tsx`, `src/lib/frontend/case-list.ts`.

## BE-11 — Notifications

- **Page/component:** Header notification popover and Settings.
- **Feature:** Persisted notifications/read state.
- **Current:** No API/table or authenticated account recipient.
- **Required:** Optional, after BE-01, real recipient-scoped notification records; never infer an unread badge from sample data.
- **Proposed endpoint / method:** GET `/api/notifications`; PATCH `/api/notifications/:id`.
- **Request:** GET `cursor?,limit?`; PATCH `{read:boolean}`.
- **Response:** `{notifications:{id,caseId,title,createdAt,readAt:string|null}[],nextCursor:string|null}` and saved notification.
- **Database:** Approved notification storage/recipient mapping if prioritized.
- **Authorization/validation:** Recipient from session; enforce ownership, valid linked case and idempotent read update.
- **Owner / priority / status:** Person 2 + Person 3 / P2 / Backend change required.
- **Fallback:** Honest unavailable popover; no unread count or fabricated notifications.
- **Acceptance:** Recipient isolation, persisted read after reload, empty/loading/error, expired auth.
- **Source:** `src/components/reloop-ui/WorkspaceShell.tsx`, `src/app/(dashboard)/settings/page.tsx`.

## BE-12 — Investigation

- **Page/component:** Comparison findings, source records, summary.
- **Feature:** Evidence-first investigation, source-linked law/platform checks and complaint summary.
- **Current:** GET bundle; POST analyze deterministically compares stored numeric evidence and saves via `reloop_save_evidence_findings`. Does not generate an AI summary or verify law/platform rules.
- **Required:** Preserve deterministic comparisons and integrate AI summary/source checks through owner-approved workflow. Verify live RPC deployment; code alone is insufficient.
- **Endpoint / method / request:** Existing GET `/api/cases/:id`, POST `/api/cases/:id/analyze` with `{}`.
- **Response:** Existing generation DTO `{caseId,artifacts,versions,findings}`; main returns empty artifacts/versions plus saved evidence findings.
- **Database:** Existing findings/evidence/rules/artifacts/versions; canonical operation migration required.
- **Authorization/validation:** Same case ID; only documented comparable evidence supports conclusions; customer report unverified; market-law and platform rules separate; provenance/citations and rule applicability required.
- **Owner / priority / status:** Person 2 + Person 3 / P0 / Implemented but not verified (deterministic path); AI summary remains pending.
- **Fallback:** Read stored source data, clear empty/unavailable findings, retain saved case; never show confidence percentages from prototype.
- **Acceptance:** Matching conditions, mismatches, missing evidence, unverified rules, repeat analysis, citations/refresh persistence and provider failure.
- **Source:** `src/app/(dashboard)/cases/[id]/investigation-client.tsx`.

## BE-13 — Support reply

- **Page/component:** Fix & Approve Customer Support Reply.
- **Feature:** Generated response belonging to exact selected complaint/evidence/policy.
- **Current:** POST support returns 501 on main. AI branch has unmerged orchestration.
- **Required:** Real provider generation and atomic artifact/version/findings persistence, same case/product sources, no unsupported refund/replacement/defect commitments.
- **Endpoint / method / request:** Existing POST `/api/cases/:id/support`, `{}`.
- **Response:** Existing generation DTO; support content `{format:'support_reply',subject:string,body:string}`, version/source IDs and validation/review state.
- **Database:** Existing artifacts/versions/findings; reconcile AI write RPCs/migration with main.
- **Authorization/validation:** Bearer/session agreement; scoped case/sources, shared DTO, rate/timeout/provider-output checks; never approved automatically.
- **Owner / priority / status:** Person 2 + Person 3 / P0 / AI integration required.
- **Fallback:** Generate action reports real 501/unavailable; no sample lamp response. Copy saved content only; no claim it was sent.
- **Acceptance:** Two distinct complaints yield correctly associated replies; EN/ZH input; policy checks, provider error, reload and no fake sent state.
- **Source:** `src/app/(dashboard)/cases/[id]/fix/fix-approve-client.tsx`, `src/components/reloop-ui/ArtifactWorkspace.tsx`.

## BE-14 — Listing corrections

- **Page/component:** Fix & Approve platform tabs/comparison.
- **Feature:** Three platform-specific corrections from actual saved snapshots.
- **Current / required:** POST repair is 501. Integrate real generation for Shopify description, Amazon listing/internal brief, Alibaba structured B2B; preserve original source comparison.
- **Endpoint / method / request:** Existing POST `/api/cases/:id/repair`, `{}`.
- **Response:** Existing generation DTO and discriminated ArtifactContent; correct platform/market/segment, languageStatus, version sources/findings.
- **Database:** Existing artifacts/versions/findings; approved canonical workflow writes.
- **Authorization/validation:** Case/product/source scope, separate platform semantics, realistic language validation; no claim German output is ready unless tested.
- **Owner / priority / status:** Person 2 + Person 3 / P0 / AI integration required.
- **Fallback:** Actual snapshot remains readable; missing correction and actual service failure shown.
- **Acceptance:** Three distinct formats/IDs, correct snapshot/source associations, English internal-brief disclosure, failed generation leaves prior drafts intact.
- **Source:** `src/app/(dashboard)/cases/[id]/fix/fix-approve-client.tsx`, `src/components/reloop-ui/ArtifactWorkspace.tsx`.

## BE-15 — Revisions and comparison

- **Page/component:** Revision composer/history and selected-version comparison.
- **Feature:** Persist immutable successive drafts with fresh findings.
- **Current:** HTTP revise 501. Main SQL `reloop_save_revision` exists but caller must validate content/findings; bundle includes versions/revisions.
- **Required:** Wire real revise generation to canonical atomic RPC; revalidate new content, reset review, reject stale expected version. No direct destructive edits/restores to historical versions. Optional manual-save/restore requires separately agreed command.
- **Endpoint / method / request:** Existing POST `/api/artifacts/:id/revise`, `{promptText:string,promptLocale:InputLocale,expectedVersion:number}`.
- **Response:** Existing `{caseId,artifact,version,revision,findings}` revision DTO.
- **Database:** Existing artifacts/versions/revision_events/findings/audit_events; reconcile overlapping branch migrations, no new schema from UI.
- **Authorization/validation:** Case/artifact ownership, current version locking, source integrity, immutable prior content, provider output validation.
- **Owner / priority / status:** Person 2 + Person 3 / P0 / AI integration required.
- **Fallback:** Selected saved versions and prior comparison work; unsaved instruction labeled; unavailable errors preserve content. Historical editing/review disabled.
- **Acceptance:** Support and listing v1→v2→v3 survive reload; citation selection follows version; stale 409, failed request creates no version, new findings/review reset.
- **Source:** `src/components/reloop-ui/ArtifactWorkspace.tsx`.

## BE-16 — Approval and audit

- **Page/component:** Human review controls/audit timeline.
- **Feature:** Explicit authorized decision on exact current version, never external publish.
- **Current / required:** Review handler and main SQL exist; confirm deployment and compatible merged AI guardrails. Demo role field is business-role selection, not authenticated user authorization. Account transition needs server-owned roles.
- **Endpoint / method / request:** POST `/api/artifacts/:id/review`, `{version:number,decision:'approved'|'changes_requested'|'rejected',reviewerRole:Role,comment:string}`.
- **Response:** Existing `{caseId,artifactId,version:ArtifactVersion,auditEvent:AuditEvent}`.
- **Database:** Existing artifact_reviews/artifact_versions/audit_events; main operation RPC.
- **Authorization/validation:** Current version, allowed reviewer role, unresolved checks block approval; changes-requested/reject remain possible; no browser-only approved flag.
- **Owner / priority / status:** Person 2 + Person 3 / P0 / Implemented but not verified.
- **Fallback:** Real server response required; errors remain visible; no named fictional approver or publishing button.
- **Acceptance:** Approve success and reload, wrong role, stale version, unresolved check 422, request-changes despite findings, atomic audit, unauthorized denial.
- **Source:** `src/components/reloop-ui/ArtifactWorkspace.tsx`, `src/app/(dashboard)/cases/[id]/fix/fix-approve-client.tsx`.

## BE-17 — QA/compliance tasks

- **Page/component:** Fix & Approve task timeline/actions.
- **Feature:** Create/reopen/complete real source-linked tasks.
- **Current / required:** Existing task handler/RPC supports create/update, returns task/audit. Confirm deployment; no new endpoint needed.
- **Endpoint / method / request:** POST `/api/cases/:id/tasks`, `{taskId?:uuid,assignedRole:Role,kind:string,title:string,description:string,state:string,sourceIds:string[]}` per shared Zod limits.
- **Response:** `{task:Task,auditEvent:AuditEvent}`.
- **Database:** Existing tasks/audit_events; `reloop_upsert_task`.
- **Authorization/validation:** Existing bearer and source/case guards; future server roles; no cross-case updates.
- **Owner / priority / status:** Person 2 + Person 3 / P0 / Implemented but not verified.
- **Fallback:** No fabricated task completion; refresh bundle only on API success, show failures.
- **Acceptance:** Create→reload→done→reopen; invalid sources/unknown task denied; audit persisted atomically.
- **Source:** `src/app/(dashboard)/cases/[id]/fix/fix-approve-client.tsx`.

## BE-18 — Speech

- **Page/component:** Inbox and revision VoiceInput.
- **Feature:** Chinese/English speech → editable confirmed text.
- **Current:** Main transcribe returns 501; remote AI implementation must be reconciled with current bearer access.
- **Required:** Real STT provider, consistent auth, existing limits/confirmation, no retained raw audio.
- **Endpoint / method / request:** POST `/api/transcribe`; multipart `{audio:Blob,locale:'zh-CN'|'en-US'}`; supported formats/10 MiB/60 seconds per contracts.
- **Response:** `{text:string,locale:InputLocale,requiresConfirmation:true}`.
- **Database:** None required; server-only provider configuration.
- **Authorization/validation:** Approved bearer/session guard, origin/rate/size/format limits, timeout and safe provider failures.
- **Owner / priority / status:** Person 2 / P0 / AI integration required.
- **Fallback:** Existing real permission/record/cancel/errors, typing fallback; no simulated transcript.
- **Acceptance:** Both languages, denied permission, unsupported/browser errors, cancellation, oversized input, auth, editable confirmation, cleanup.
- **Source:** `src/components/reloop-ui/VoiceInput.tsx`.

## BE-19 — Case notes, lifecycle and assignment

- **Page/component:** Prototype Case Detail assign/review/reopen and Investigation save note.
- **Feature:** Persistent notes/status/assignee commands.
- **Current:** Read-only case DTO; no update/note/assignee route. Reviewer assignment not backed by account system.
- **Required:** Define allowed lifecycle transitions and whether notes/assignment are in hackathon scope. Never mutate original complaint or product association through these commands.
- **Proposed endpoint / method:** PATCH `/api/cases/:id` for approved status/assignment; POST `/api/cases/:id/notes`.
- **Request:** `{status?:CaseStatus,assigneeId?:uuid|null,expectedUpdatedAt:string}`; note `{text:string}`.
- **Response:** Saved case metadata/note and audit; add shared DTO fields only by agreement.
- **Database:** Existing status; assignment/concurrency timestamps/notes require approved data design.
- **Authorization/validation:** Server identity, role and valid transition/assignee; length checks, conflict control and audit; original records immutable.
- **Owner / priority / status:** Person 2 + Person 3 / P1 / Backend change required.
- **Fallback:** Read saved status, explain unavailable notes/assignment/lifecycle commands. No local fake reopen.
- **Acceptance:** Authorized transitions, invalid/stale denied, refresh persistence, original source unchanged, valid assignee identity.
- **Source:** `src/app/(dashboard)/cases/[id]/detail/`, `src/app/(dashboard)/cases/[id]/investigation-client.tsx`.

## BE-20 — Support delivery tracking

- **Page/component:** Prototype Support Copy reply / Mark as sent.
- **Feature:** Copy saved reply locally; separately record authorized sending/delivery.
- **Current:** No send/delivery endpoint or state. Clipboard copy needs no backend.
- **Required:** Optional explicit delivery logging tied to exact reviewed artifact version; actual external sending is a separate approved integration, not implied by copy/approval.
- **Proposed endpoint / method:** POST `/api/artifacts/:id/delivery` (optional scope).
- **Request:** `{version:number,channel:Platform,deliveryMode:'manual_confirmation',confirmation:string}` proposed.
- **Response:** `{delivery:{id,artifactId,version,recordedAt,actorId},auditEvent:AuditEvent}` proposed.
- **Database:** Approved delivery record/audit extension if needed.
- **Authorization/validation:** Named identity/permission, current reviewed version, explicit confirmation, duplicate protection, no fabricated customer delivery receipt.
- **Owner / priority / status:** Person 2 + Person 3 / P1 / Backend change required.
- **Fallback:** Copy actual saved text, honest clipboard success/error; no Mark as sent success.
- **Acceptance:** Copy exact selected version; cannot send unapproved/stale/foreign artifact; confirmed record/audit survives reload.
- **Source:** `src/components/reloop-ui/ArtifactWorkspace.tsx`.

## BE-21 — Rules and source maintenance

- **Page/component:** Rules & Sources browser / Add source.
- **Feature:** Browse stored records; optionally maintain verified source records.
- **Current:** Bundle returns rules plus product evidence; no global source-list/create/update endpoint.
- **Required:** Read selected-case sources now. Backend owners decide global rule catalogue/edit workflow and official verification requirements before enabling Add source.
- **Existing endpoint / method:** GET `/api/cases/:id`. Proposed optional GET/POST `/api/sources`.
- **Request:** Proposed list `category?,market?,platform?`; create `{category,sourceUrl,excerpt,checkedAt,applicability,market,platform,segment}` based on existing rule schema.
- **Response:** Existing Rule/Evidence DTOs; proposed source creation returns saved source with verification status and audit.
- **Database:** Existing rules/evidence; any maintenance audit/source extension requires owner approval.
- **Authorization/validation:** Official HTTPS sources, exact excerpt/checked date, role-approved verification; do not mark rule verified without source proof or apply B2C laws to B2B automatically.
- **Owner / priority / status:** Person 2 + Person 3 / P1 / Backend change required (maintenance only).
- **Fallback:** Filter/read selected-case sources; disabled Add source with explanation; case picker if none selected.
- **Acceptance:** Correct case product evidence, category filters, safe citations, missing/invalid case, no fabricated verified status; unauthorized edits rejected when implemented.
- **Source:** `src/app/(dashboard)/rules/`, `src/components/reloop-ui/SourceBrowser.tsx`.

## Static and local features requiring no new backend

Complaint tips/checklist, navigation, dropdowns, responsive layout, selected saved-version comparisons, clipboard copy and visible-row CSV are frontend features. UI locale and compact display persist as explicitly device-only preferences. Do not create a complaint-team backend, theme table or account identity to support these controls.

## Integration priorities and verification boundary

First reconcile canonical AI/database operations, access and health contracts, then deploy approved RPCs and verify same-case generation → two revisions → explicit review → audit/task reload. Optional accounts, notifications, analytics and reports must not delay that path. No backend branch is automatically merged; no database migration is applied by this task. Browser API fixtures prove UI behavior only.

### Implementation verification

- `npm run check`: lint, TypeScript and production build pass; 111 tests pass, 7 opt-in live HTTP tests skipped because their explicit integration URL/token variables were not supplied. No database migrations were run.
- `scripts/ui-prototype-check.mjs`: connected routes, actual-ID navigation, filtering/CSV, support and listing v1→v2→v3, version citations/history, explicit review/cancel, task update/reload, local preferences, keyboard dialog/drawer behavior and Chinese responsive layouts pass using intercepted synthetic API fixtures. Real browser microphone denial and an explicit unsupported-recorder fixture preserve typing fallback. This does not prove provider or database success.
- `scripts/ui-phase2b-check.mjs`: existing validation, same-ID analysis retry, changed-input new-case behavior, missing-case recovery, localization and 320/390/768/1024/1440 layouts pass. Five deliberate non-2xx fixture responses are expected error-state coverage, not hidden failures.
- Real HTTP: all 10 pages return 200 with protected-access gates; five protected reads/writes reject unauthenticated requests with 401; support, repair, revision and transcribe return 501. Initial smoke run reported database unreachable and completed; final smoke reruns time out at the 10-second `/api/health` gate. **The complete final smoke run is blocked**, despite successful independent route/access/unavailable checks. Backend/configuration owner must verify Supabase reachability/TLS and bounded health behavior. No new live generation, revision, task, review or database persistence success is claimed.
- Source audit: no backend handler, shared API contract, authentication guard, database repository or migration changed. Production dependencies are unchanged. Review screenshots and browser logs remain ignored under `.local-reviews/`.
