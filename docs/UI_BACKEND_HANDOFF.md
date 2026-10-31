# UI and backend integration handoff

Audit: 1 November 2026. This records code inspection, not proof of live provider/database execution.

## Scope and branch snapshot

- Production base: `origin/main` / `08632bf`; frontend integration is merged.
- AI workstream reviewed: `origin/feat/ai-api` / `4c0f8fe`.
- Data/backend workstream reviewed: `origin/feat/backend` / `2e1e4f5`.
- Phase 1 changes only the public landing composition and styles. It adds **no API, database, authentication or persistence dependency**. The interface preview is explicitly labeled, displays empty states, and never calls an API or simulates AI findings. The page remains SSR-renderable when all authenticated services are unavailable.
- Phase 2 is inspection/concept only; Phase 3 entries below are proposals. No handler, shared contract, schema, migration or runtime dependency is changed by this PR.

## Existing endpoints and current integration

| Endpoint | `main` | AI branch | Backend branch | Frontend consumption / remaining check |
|---|---|---|---|---|
| `GET/POST /api/cases`, `GET /api/cases/:id` | Supabase reads/create implemented | Inherits case APIs | Inherits, with repository changes | Typed case list/create/bundle adapter exists; live DB persistence still needs verification |
| `GET /api/health` | `not_implemented` for generation/STT | Adds `configured` / `not_configured` | Same as main | Current smoke hardcodes `not_implemented`; reconcile after agreeing merged health contract. Configured is not proof of provider reachability |
| `POST /api/cases/:id/analyze` | 501 | LLM summary + persisted findings | Deterministic listing-evidence findings only | Request `{}`; response `{caseId,artifacts,versions,findings}`. Both fit DTO, but different semantics; preserve real complaint summary and deterministic evidence comparison in canonical implementation |
| `POST /api/cases/:id/support`, `/repair` | 501 | Generation + workflow writes present | 501 | `{}` request; generation response validated. All three listing formats and support reply must be tested against real provider |
| `POST /api/artifacts/:id/revise` | 501 | Revision + generated-content checks + workflow writes present | 501 | `{promptText,promptLocale,expectedVersion}`; response `{caseId,artifact,version,revision,findings}`. Latest AI commit adds `checkGeneratedContent` and recomputes validation status; live v1→v2→v3 and stale-version 409 still unverified |
| `POST /api/artifacts/:id/review` | 501 | Route + review RPC | Different route + review RPC | `{version,decision,reviewerRole,comment}`; response `{caseId,artifactId,version,auditEvent}`. Reconcile role, validation-blocker, and current-version rules |
| `POST /api/cases/:id/tasks` | 501 | Expanded task RPC signature | JSON task RPC signature | Existing task DTO/envelope matches, RPC signatures differ; pick one canonical implementation or explicitly test coexistence |
| `POST /api/transcribe` | 501 | Implemented, cookie-only access gate | 501 | Frontend bearer-only login does not create the required cookie; incompatible until owners agree access behavior |

“Implemented” in the remote branches means code exists. Neither remote branch was merged or run against the frontend during this task. No successful LLM, STT, review, task or artifact-persistence integration is claimed.

## Dependency records

### D1 — Marketplace selector and platform display configuration

1. **UI:** Feedback Inbox selector; investigation headings; Fix & Approve platform tabs.
2. **Change:** None in Phase 1. Proposed: fetch supported operational options rather than repeat them across components.
3. **Why:** `feedback/page.tsx` contains three literal `<option>` elements; `fix-approve-client.tsx` contains platform options; `src/lib/config/platforms.ts` holds labels/market/segment/format; `api-client.ts` repeats labels. Supported IDs are also in `platformSchema` and the database enum. These are fixed MVP targets today, not a database-managed catalogue.
4. **API (proposed):** protected `GET /api/platforms`, no body, existing bearer access and JSON error envelope. Not implemented on the reviewed branches.
5. **Fields (proposed, owner approval required):** `{ok:true,data:{platforms:[{id:Platform,labelZh:string,labelEn:string,market:string,segment:'b2c'|'b2b',outputFormat:string,availability:'available'|'unavailable'}]},error:null,requestId:UUID}`. `availability` means selectable context, not live account connectivity or guaranteed generation. Do not add new platform IDs outside existing contracts.
6. **Source of truth:** backend-owned supported-platform config reusing `platformDefinitions` and validating IDs with `platformSchema`. Existing `platform_listings` are per-product snapshots, not a universal catalogue; zero snapshots does not establish that a platform is unsupported.
7. **DB/config:** **No new table required for the MVP.** A server route can expose current typed config. Do not infer labels from merchant listing text or treat a stored snapshot as an account connection.
8. **Migration/seed:** none for this proposal. An editable marketplace registry is a separate future requirement and needs schema/ownership review first.
9. **Frontend states:** disable selection during load, explicitly label unavailable entries, show retry on failure, show “暂无可用平台” for an empty list; preserve typed user inputs. Never quietly substitute hardcoded choices after an API failure.
10. **Owner:** Person 2 supplies endpoint and shared Zod schema; Person 1 consumes it after agreement; Person 3 verifies snapshot/config consistency.
11. **Status:** **Proposed; backend pending; frontend not implemented.** Phase 1 creates no dependency on this endpoint.
12. **Tests:** bearer guard; correct three IDs and B2B/B2C mapping; empty/error/401/503; response schema validation; selectable option submitted unchanged to create-case API.

### D2 — Product/SKU input, cases and operational counts

1. **UI:** Inbox SKU input, dashboard case table/count cards, case detail.
2. **Change:** None. Existing SKU input is free text; explicit “Load synthetic example” loads a disclosed seed example. Dashboard counts derive from returned cases, never fake analytics.
3. **Why:** real product choice and case state must come from persisted data. A future product picker needs an API; no product-list API exists now.
4. **API:** existing protected case APIs; proposed optional `GET /api/products` for a picker, **not implemented**.
5. **Fields:** current create-case fields: `sku,channel,feedbackText,feedbackLocale,merchantInstruction,merchantLocale,synthetic:true`; return `caseId`. Current bundle and list use shared schemas. A future picker would return `{products:[{id,sku,name,synthetic}]}` inside the standard envelope; backend owner must approve scope/pagination.
6. **Source:** `products`, `cases`, and current case repository, not marketing copy or fixtures masquerading as API results.
7. **DB/config:** existing tables suffice. Do not change generated SKU rules or assign client-generated case IDs.
8. **Migration/seed:** existing foundation/product-SKU migrations and approved synthetic seed. No new migration required for a read-only picker.
9. **States:** current loading/empty/error/retry and unknown-SKU errors; preserve inputs after failure. Counts only cover returned cases and must be relabeled/extended if server pagination is introduced.
10. **Owner:** Person 3 data/repository; Person 2 API; Person 1 picker only after API agreement.
11. **Status:** **Already supported** for case APIs; live DB integration **unverified**. Picker **proposed**, not part of this PR.
12. **Tests:** create→reload same case ID; unknown SKU; synthetic disclosure; DB unavailable; counts and source product identity; reload history without fixtures/interception.

### D3 — Analysis, support reply and three listing corrections

1. **UI:** Inbox save/analyze; Investigation summary/evidence/sources; Fix & Approve generation controls.
2. **Change:** None. Landing shows a conceptual empty interface and keeps the existing service-availability caveat.
3. **Why:** summaries, findings, drafts and language readiness require real persisted API output, not authored preview content.
4. **API:** `/cases/:id/analyze`, `/support`, `/repair` as listed above.
5. **Fields:** `{}` request; generation response plus bundle reload; artifact `kind,platform,market,segment`; version `locale,languageStatus,content,sourceIds,validationStatus,reviewStatus`; findings retain categories, uncertainty, source IDs and original/proposed spans.
6. **Source:** product evidence, three `platform_listings`, verified/applicable `rules`, actual model output and deterministic checker; same `caseId` throughout.
7. **DB/config:** existing artifact/version/finding entities; model config server-only. AI branch's workflow write functions must be selected/reviewed by owners.
8. **Migration/seed:** remote `202610310003_workflow_writes.sql` and backend `202610310003_case_operations.sql` share a version prefix and contain overlapping operations. AI branch also adds `202610310004_workflow_revalidation.sql`. Coordinate unique ordering and canonical RPCs before applying. No schema is added here.
9. **States:** current loading/error/501; preserve last valid content. Empty findings stay empty. Remove hardcoded “501” explanatory UI only after actual endpoint behavior changes in an approved integration.
10. **Owner:** Person 2 model/route orchestration; Person 3 evidence/rule verification and persistence; Person 1 consumer.
11. **Status:** **Frontend implemented / backend pending on main**. Remote implementations present but **not integrated or live verified**.
12. **Tests:** Chinese/English; same-case identity; three distinct outputs; Amazon English internal-brief badge unless German is tested; evidence vs unverified testimony; source-linked market-law/platform-rule findings; timeout/invalid JSON/provider absence.

### D4 — Revision, approval, tasks and audit

1. **UI:** `ArtifactWorkspace` and Fix & Approve task/audit panels.
2. **Change:** None; Phase 2 mockup rearranges existing empty panels only, outside production routing.
3. **Why:** versions, review decisions, task assignments and audit must survive reload and reflect server constraints.
4. **API:** `/artifacts/:id/revise`, `/review`, `/cases/:id/tasks`, followed by case bundle reload.
5. **Fields:** use exact requests/responses from endpoint table; task request `taskId?`, `assignedRole,kind,title,description,state,sourceIds`; task response `task,auditEvent`. Review is explicit and version-specific; no external publishing.
6. **Source:** `artifacts`, `artifact_versions`, `revision_events`, `artifact_reviews`, `tasks`, `audit_events`; not client success flags.
7. **DB/config:** existing entities; reconcile AI branch `createRevision/recordReview/upsertTask` with backend branch `reloop_save_revision/reloop_review_artifact/reloop_upsert_task` and different task signatures.
8. **Migration/seed:** reconcile the two `202610310003_*` migrations and AI branch `202610310004_workflow_revalidation.sql`. Keep current-version locking, role and source validation, immutable prior content and audit protections. Latest AI code now checks generated content and recomputes validation status; its pattern-based checker still needs realistic language/conditions coverage tests.
9. **States:** current busy, stale-version conflict, blocked review, unavailable and retained previous version. Success only after saved response; no mock audit events.
10. **Owner:** Person 2 and Person 3 agree canonical write semantics; Person 1 verifies existing controls afterward.
11. **Status:** **Frontend implemented / backend pending on main**; remote review/task handlers overlap and remain **unverified together**.
12. **Tests:** two Chinese/English revisions v1→v2→v3 and reload; checks rerun on new draft; stale 409; unsupported reviewer rejected; unresolved source/rule blocks approval but still permits appropriate request-changes/reject actions; persisted review/task/audit after reload; cross-case source rejected.

### D5 — Voice and access behavior

1. **UI:** existing Login/WorkspaceProviders; VoiceInput in Inbox and revision panel.
2. **Change:** None. No cookie or token workaround added by visual work.
3. **Why:** the merged UI stores a bearer token in memory and does not call `/api/access`; the AI branch's `demoAccessFailure` reads only the `reloop_demo_access` cookie.
4. **API:** `POST /api/transcribe`; remote `/api/access` exists only on AI branch. Agree one approach: retain bearer support consistently via `checkAccess`, or separately approve cookie-session login and logout behavior.
5. **Fields:** multipart `audio` and `locale:zh-CN|en-US`; response `{text,locale,requiresConfirmation:true}` in standard envelope. Maximum 10 MiB/60 seconds. A cookie-login alternative currently accepts `{token}` and returns `{required,authenticated}`, but is not an agreed frontend contract.
6. **Source:** actual STT provider and server-side demo access configuration; never simulated transcript/identity.
7. **DB/config:** no raw-audio persistence; no database changes. Server provider secrets and demo token must remain server-only.
8. **Migration/seed:** none for speech/access. Do not introduce session persistence as part of landing design.
9. **States:** permission request/denial, record/stop/cancel, unavailable/browser/format errors, editable transcript confirmation and typing fallback; no silent submit. Refresh still requires token re-entry under current contract.
10. **Owner:** Person 2 auth/STT; Person 1 consumes agreed contract; Person 3 privacy/language/error QA.
11. **Status:** **Blocked** by auth mismatch on AI branch; 501 on main and backend branch. Remaining business routes accept bearer on the inspected branches.
12. **Tests:** accepted bearer or approved cookie flow, denied access, origin/CSRF and secure-cookie behavior, Chinese/English speech, recording limits/cancel/cleanup, transcript edit before submit, no retained raw audio.

## Actionable owner handoff

- **Person 2:** reconcile `src/app/api/transcribe/route.ts` and `src/lib/server/access.ts`; preserve the agreed bearer contract or propose the full session contract separately. Update `tests/transcribe.test.ts` / `tests/access.test.ts` for real frontend auth. Retain origin/rate/size protections.
- **Person 2 + Person 3:** choose canonical handlers in `src/app/api/cases/[id]/analyze/route.ts`, `tasks/route.ts`, `src/app/api/artifacts/[id]/review/route.ts`; reconcile `src/lib/db/workflows.ts` / `src/lib/db/cases.ts` and both `202610310003_*` migrations. Do not overwrite one branch's safety checks with another's less restrictive implementation.
- **Person 2:** preserve the latest `checkGeneratedContent` / `validationStatus` changes in `src/app/api/artifacts/[id]/revise/route.ts`, `src/lib/rules/checker.ts` and the follow-up revalidation migration. Verify Chinese/English phrases, runtime conditions and unsupported commitments beyond the current regex examples; prove review state resets and saved findings belong to each new version. Original-listing comparison alone is not validation of a correction.
- **Person 1 after contract agreement:** update `scripts/smoke.mjs` for approved health states and actual workflow expectations, while retaining meaningful auth/error assertions; consume proposed `/api/platforms` only once supplied. No such consumer is added here.
- **Person 3:** apply selected migrations to a test DB, verify official rule records, then run same-case generation→two revisions→review/task/audit twice after reset. No live DB writes or service success were attempted by this landing task.

## Static content policy

Landing copy, artwork, navigation labels and visual tokens stay static. The empty preview is illustration, not operational state. User identity, marketplace availability, product/case data, generated text, findings, decisions, task status and counts must come from approved APIs. Existing explicit seed-example loading remains disclosed synthetic input, not a fallback for failed calls.
