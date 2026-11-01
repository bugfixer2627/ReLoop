# Final MVP technical delivery — 1 November 2026

This report supersedes earlier status summaries; historical reports and artifacts are preserved. Development runs on `feat/ai-api`, integrated from `origin/main` commit `fa11c5c`. Authentication, sessions, login UI and the teammate's case-status contracts are preserved unchanged. No hosted database migration, seed/reset or synthetic write was authorized or performed.

## Merge audit and repairs

The manually merged baseline contained duplicate Tasks imports and duplicate VoiceInput declarations. The subsequent main/login commit already fixes those; its versions are preserved. The Analyze route had become evidence-only, dropping extraction and AI summary generation. Final stabilization restores real AI after the existing evidence persistence step, retaining both implementations.

Tests previously omitted the committed Person 3 operation migration; the local suite now loads both operation/workflow migrations. Application RPC adapters support the committed P2 scalar and P3 JSON revision/review/task signatures. Fallback occurs only after PostgREST confirms a missing signature (`PGRST202`), never after a successful or ambiguous write. SQLSTATE conflicts/not-found/invalid-input and blocked reviews retain their meanings.

Original-listing checking now uses the existing strict Person 3 comparator: documented provenance, product/version/qualifier/unit and complete matching conditions are required. Missing evidence does not suppress law/platform verification reminders. Generated content checking scans later runtime promises and Chinese numeric runtime wording during revisions; it remains a bounded heuristic, not exhaustive semantic or legal validation.

## Feature status and evidence boundaries

| Feature | Status | Evidence / limitation |
|---|---|---|
| Login/session implementation | VERIFIED LOCALLY | Teammate's implementation unchanged; automated Auth tests use mocked Supabase. User reports real login works; no fresh live credential login claimed |
| Hosted product/case/evidence/listing reads | VERIFIED LIVE | Actual Next server/API, authenticated reads, 2 evidence records and 3 snapshots; zero hosted writes |
| Chinese and English AI | VERIFIED LIVE | Two real TokenHubCloud workflow replays, local SQL persistence, actual request/output validation |
| Workflow A: analysis and English support | VERIFIED LOCALLY with real AI | Real handlers + embedded PostgreSQL; external database transport substituted |
| Workflow B: three listing formats | VERIFIED LOCALLY with real AI | Distinct Shopify/Amazon/Alibaba output; same saved case as Workflow A |
| v1→v2→v3, review and QA/audit | VERIFIED LOCALLY | Real local SQL and immutable history; real AI support replays and listing browser checks |
| Voice UI, both languages/contexts | VERIFIED LOCALLY | Four browser cases, fake microphone + mocked transcription/injected recognition events, plus lifecycle unit tests |
| Actual English browser speech | FAILED | Real vendor-service checks with recorded English returned empty/unrelated results; physical microphone acceptance remains blocked |
| Actual Chinese browser speech | FAILED | Real vendor-service checks with recorded Chinese returned empty/unrelated results; physical microphone acceptance remains blocked |
| Backend audio transcription | VERIFIED WITH REAL AUDIO FILE | Local faster-whisper multilingual base/CPU/int8, genuine Chinese/English recordings through actual Next API and UI in both contexts; physical microphone still pending |
| Hosted artifact writes | BLOCKED | Owner-approved artifact workflow migrations absent from observed hosted schema; writes not permitted |
| Substantive market-law/platform-rule checks | BLOCKED | Source/applicability/content evaluations not complete; drafts remain advisory and approvals blocked |
| Two fully live hosted/microphone demos | BLOCKED | Local SQL/browser replays do not satisfy this gate |
| Public deployment / release tag | BLOCKED pending separate approval | Neither performed |

Browser workflow final counts and final Git disposition are recorded below after verification. A passing local browser run uses a pre-provisioned signed synthetic test session, not an Auth login substitute presented as real sign-in.

## Eight voice acceptance combinations

| Mode | Language | Context | Current accepted classification |
|---|---|---|---|
| Configured local Whisper | zh-CN | Feedback instruction | VERIFIED WITH REAL AUDIO FILE |
| Configured local Whisper | en-US | Feedback instruction | VERIFIED WITH REAL AUDIO FILE |
| Configured local Whisper | zh-CN | Revision instruction | VERIFIED WITH REAL AUDIO FILE |
| Configured local Whisper | en-US | Revision instruction | VERIFIED WITH REAL AUDIO FILE |
| Browser vendor recognition | zh-CN | Feedback instruction | FAILED in automated recorded-speech acceptance |
| Browser vendor recognition | en-US | Feedback instruction | FAILED in automated recorded-speech acceptance |
| Browser vendor recognition | zh-CN | Revision instruction | FAILED in automated recorded-speech acceptance |
| Browser vendor recognition | en-US | Revision instruction | FAILED in automated recorded-speech acceptance |

Configured tests capture real prerecorded audio through browser MediaRecorder, reach the actual Next endpoint/local engine, check meaningful recognized content, edit/confirm it and verify it enters the intended field without a workflow write. Browser tests never call `/api/transcribe` and never inject transcript results. An early language-only assertion falsely accepted unrelated Chinese text; it was strengthened to require recorded content. That early result is not counted as a verified voice case.

The user subsequently confirmed successful physical-microphone recognition in Chinese and English. Mode, screen coverage and browser were not specified; clarification was requested rather than assigning that success to all eight combinations. Per-combination physical acceptance remains BLOCKED until identified. No final main merge is permitted while a mandatory mode or another P0 gate remains unverified.

Browser diagnosis: installed Edge exposes the API in a secure localhost context, microphone permission is granted in the test, and actual `start → audiostart → soundstart → speechstart → result → audioend → end` events occur. Its recorded-file results are empty or unrelated; enabling interim results in a separate native probe also returned no usable text. The same captured recording is recognized correctly through configured local Whisper. This isolates the observed limitation to the automated browser/vendor-recognition path; it does not establish whether a normal physical microphone session on another browser succeeds.

## Windows 11 local startup

1. Open `C:\Users\Vladimir\Desktop\reloop AI` in Codex. Use its PowerShell terminal in that folder.
2. Use Node >=22.19.0; the project pins Node 24.14.1 in `.node-version`. This stabilization environment ran Node 26.13.0. Use npm, with the committed `package-lock.json` for reproducible installation.
3. If dependencies are missing, run `npm.cmd ci`. If the Windows certificate store is needed, set `$env:NODE_USE_SYSTEM_CA = '1'` for this terminal, keeping TLS verification enabled.
4. Keep the existing `.env.local`. For a new checkout only: `if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }`. Edit locally; do not paste credentials in chat. `.env.local` is Git-ignored and untracked.
5. Run `npm.cmd run dev`. Open **http://localhost:3000**. Existing background production preview can be stopped before starting dev on that port.
6. Open `/login`, use the already-provisioned email/password workspace account, then open Feedback. Login/token/session code belongs to its existing owner; these instructions do not change it.
7. Stop the terminal's server with **Ctrl+C**. Production startup is `npm.cmd run build` then `npm.cmd run start`. Restart after changing local environment values.

| Environment | Requirement |
|---|---|
| SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY | Required for protected database workflows and existing Auth; server-only |
| LLM_PROVIDER, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL | Required for custom chat. Working organizer setup: `openai_compatible`, `https://api.tokenhubcloud.net/v1`, local secret, `gpt-5.6-luna` |
| LLM_TIMEOUT_MS | Optional; existing 60000 ms retained (allowed 1000–120000) |
| OPENAI_API_KEY | Official-OpenAI fallback only; organizer use needs explicit LLM_API_KEY, which may reference this local variable using Next env expansion |
| TRANSCRIPTION_PROVIDER / BASE_URL / API_KEY / MODEL | Only for a separately verified compatible backend audio service; chat access does not establish audio support |
| DATABASE_URL, DATABASE_SSL_CA_FILE | CLI migrations only, unnecessary for normal HTTP app operation; hosted writes remain prohibited without approval |
| Proxy/dev-origin values | Optional existing network configuration; preserve working settings, use localhost on this machine |

For a working local configured transcription service, use `npm.cmd run dev:local-stt`, or after a production build `npm.cmd run start:local-stt`. The local Python environment/model are prepared on this machine. See [VOICE_SETUP.md](VOICE_SETUP.md) for installation and two independent paths. Temporary STT process settings do not edit `.env.local` or the working chat configuration.

Browser speech mode needs a supported browser, permitted microphone access, localhost/HTTPS, and a reachable browser-vendor speech service. It requires no ReLoop speech key. Audio may be processed by the vendor. ReLoop does not create or retain raw recordings in this mode.

## Practical checks

```powershell
Set-Location 'C:\Users\Vladimir\Desktop\reloop AI'
Invoke-RestMethod http://localhost:3000/api/health
npm.cmd run check
node scripts/smoke.mjs
node scripts/test-live-reads.mjs
node scripts/browser-smoke.mjs
node scripts/browser-voice-test.mjs
```

Health should report `ok: true`, database reachable, generation configured, and transcription configured when launched with local STT. Standard startup retains the original environment and can report speech not configured. Configuration presence does not establish an audio/provider call. Protected APIs reject unsigned requests. The live-read script uses the existing optional legacy API credential locally without displaying it and makes no writes. It does not test browser login.

After building, opt in to real provider tests (paid provider calls may consume organizer quota):

```powershell
node scripts/test-live-ai.mjs
node scripts/test-browser-workflows.mjs
```

The first invokes actual handlers with a real Supabase SDK over a narrow SQL test transport. The second starts the actual production app on loopback port 3001, with process-only database overrides, a local SQL bridge and a synthetic signed test session. Both apply committed migrations only to disposable embedded PostgreSQL. Neither changes `.env.local`, hosted data or provider setup. Run production browser tests sequentially after building; rebuilding `.next` during an active production test invalidates its static assets. Results/screenshots use timestamped names in ignored `test-results/`; previous artifacts remain intact.

In Feedback, test each merchant-language choice with **mode → microphone → speak → Stop & transcribe → edit → Use transcript**. Confirmation appends text; it does not submit a case. On a saved artifact, use the same voice control and the separate instruction-language selector for revision instructions. Check cancellation, denial, empty audio and service failure leave typed input intact. The configured-service option exercises `/api/transcribe`; browser mode never uploads to that route.

The actual endpoint is POST multipart, not a browser GET. Prefer the existing voice UI to avoid copying credentials. `node scripts/test-real-voice.mjs` performs all eight recorded-speech combinations on local port 3002; it returns failure when browser recognition fails. Recorded-audio results and physical microphone acceptance are separate. Missing service returns a typed 503; the organizer's missing audio route is not evidence of speech support.

Case generation/revisions/reviews/tasks in the hosted workspace would write shared data and remain outside this milestone's authorization. Use the isolated browser runner for these checks. Supported UI controls call real APIs; they can report honest persistence/provider failures. Settings preferences, navigation, tab selection, version history, copy, review confirmation and task controls are implemented. No control publishes to marketplaces, sends a customer email, issues refunds, or certifies compliance.

## Three-minute demonstration sequence

Use only an owner-approved isolated demo database with required RPCs and accepted microphone/service configuration. Until those gates pass, describe the local test boundary rather than presenting a hosted live demo.

| Time | Demonstration |
|---|---|
| 0:00–0:25 | Open saved synthetic lamp context; identify the customer's unverified 2h report and three stored 12h listing claims |
| 0:25–0:50 | Speak Chinese, edit/confirm transcript; save one case and show actual AI investigation with SPEC-001 and matching conditions |
| 0:50–1:15 | Generate English support response; explain unknowns and absence of refund/defect guarantees |
| 1:15–1:50 | Generate Shopify US, Amazon DE internal brief and Alibaba B2B drafts; show distinct structures, source links, before/after and unresolved rule checks |
| 1:50–2:30 | Apply Chinese and English revision prompts; show v1→v2→v3 and fresh checks. Use English voice only after its actual acceptance test passes |
| 2:30–3:00 | Request changes/reject where appropriate, show blocked approval for unresolved checks, create QA task, reload history and state limitations |

Provider latency may exceed this schedule; measure a rehearsal before promising live timing. Saved outputs can be shown as explicitly labeled earlier results, never as new live generations.

## Deployment and submission gates

Technical setup: Node-capable Next host, npm lockfile install, successful `npm run check`, runtime secrets, HTTPS, approved Supabase schema/RPCs and existing Auth configuration. Set provider timeout/hosting request duration consistently. No browser-visible service key or provider key. Run same-origin health/read/smoke checks after deployment, without synthetic hosted writes until approved.

Required remaining gates: actual Chinese/English voice in both contexts; approved hosted persistence; verified rule-source applicability and content checking; two full accepted demos; poster/presentation completion by their existing owners; final submission review. No release tag or public deployment is created here. The technical docs are ready for review; **full MVP submission readiness is not claimed**.

## Automated and opt-in verification

- `npm run check`: **216 passed, 19 opt-in cases skipped**, 20 passed test files / 4 opt-in files; ESLint, Next type generation, TypeScript and production build pass. Python source syntax also passes.
- The 19 default skips are 7 explicit HTTP integration cases, 2 real-AI/local-SQL replays, 2 real-browser/local-SQL workflows, and 8 genuine-audio voice combinations. They are opt-in external/browser tests, not suppressed failures.
- `node scripts/test-live-ai.mjs`: **2 passed** (Chinese and English), actual TokenHubCloud calls, real local SQL; both support revisions, approval blocking, requested changes, QA and 9 audit events. Latest rerun took approximately 251 seconds, including a bounded transient-provider retry.
- `node scripts/test-browser-workflows.mjs`: **2 passed** (Chinese and English) in approximately 181 seconds total after the final stable build. Each used actual frontend interactions, actual Next routes, real AI and local PostgreSQL: case save/analysis, English support, all three listing tabs, two listing revisions with explicit zh/en instruction metadata, requested changes, QA, nine audit events and reload persistence. Five artifacts/seven versions/two revisions remain bound to one saved case per run. These two local browser replays exclude physical microphone and hosted Supabase/Auth; they are not claimed as two fully live hosted demos.
- `node scripts/test-live-read-suite.mjs`: **3 passed, 4 blocked/skipped**. Actual HTTP health/auth enforcement/validation, hosted case/evidence reads, nonexistent targets and invalid audio. The four write-dependent cases were not enabled. No hosted write was made.
- `node scripts/test-real-voice.mjs`: **4 real-audio configured-STT cases passed; 4 browser-vendor recognition cases failed**. All failures are retained in the test result, not changed to success/skips. See the eight-case table and pending manual-coverage clarification.
- `node scripts/browser-voice-test.mjs`: **4 UI cases passed** (zh/en × initial/revision), including configured upload, injected browser recognition lifecycle, preview/edit/confirm, cancellation/denial/error recovery, no automatic submission. These are explicitly mocked/injected speech tests.
- `node scripts/smoke.mjs`: 10 page routes, health and protected API/speech validation pass. `browser-smoke.mjs`: six routes, current login fields, mobile landing and zero uncaught page errors pass; it submits no login credentials.
- Git whitespace/known-secret scans pass; `.env.local` remains ignored/untracked. `npm audit --omit=dev` reports **0 production advisories**. The full dependency audit reports **16 moderate development advisories**, no high/critical; no unrelated forced upgrade was attempted.

The offline suite covers production schemas/fixtures, compatible provider payloads and failure handling, transcript MIME/size/duration/auth validation, case/workflow route guards, content/source validation, strict evidence comparability, bounded generated-claim checks, platform formats, immutable SQL persistence, stale-head concurrency/reviews, revisions/tasks/audit, frontend API mapping/error handling and browser speech lifecycle with injected events. Automated Auth tests mock the Auth provider; no fresh real credential login is claimed. Substantive law/platform evaluation and hosted positive writes are not covered as working integrations.

## Git and final delivery disposition

The final fetch found `origin/main` still at `fa11c5c`, already integrated into `feat/ai-api`. There were no integration conflicts. All valid unfinished AI/voice work was preserved, including recoverable Git stash checkpoints. The teammate's authentication/session/login and `clear` status implementation matches that integrated baseline, with no new edits. No shared migration files or hosted data were changed. Credentials and the working organizer configuration were not edited.

Development is committed/pushed only to `feat/ai-api`; the commit identity is available in its Git log and the accompanying final response. The conditional final merge into main is **not performed**, because mandatory browser recognition acceptance and the remaining P0 integration gates are unresolved. No force push, tag, public deployment or teammate-addressed message is created. Technical deliverables include updated README, API/architecture/configuration, two-mode speech setup, third-party/runtime declarations, source inventory, acceptance/test report, deployment gates, poster content guidance and a three-minute demo outline. Finished visual poster/slides and final submission approval remain outside this backend implementation.

## Poster and presentation technical content

The specified poster size is 0.8 m × 1.8 m. Suggested factual content: one-sentence problem; synthetic lamp case (12h listing, documented 4h maximum under conditions, unverified 2h customer report); same-case architecture diagram; three visibly different platform outputs; source/condition comparison; v1→v2→v3 and human review; QR/link only for an approved deployed demo; measured processing time and verified service boundaries. Include a prominent “advisory drafts, no automatic publication or legal certification” note. Do not label prerecorded/mocked tests as live microphone acceptance or claim reduced returns/revenue gains without data. Finished visual poster/slides are not produced by this backend milestone.
