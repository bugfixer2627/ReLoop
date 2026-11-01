# H14–H18 integration and verification

This report describes the ea36c13 milestone. For subsequent Supabase URL fixes,
real organizer AI tests, focused voice changes and current blockers, read
[H14_H18_SERVICE_VERIFICATION.md](H14_H18_SERVICE_VERIFICATION.md). The older
service-availability and test-count statements below are retained as history.

Date: 1 November 2026. Branch: `feat/ai-api`. This report records observed
behavior, not completion of the original live MVP gates.

## Cross-branch review

Reviewed `origin/main` at `08632bf`, Person 2 at `4c0f8fe`, and Person 3
`origin/feat/backend` at `2e1e4f5`. Main contains the approved frontend. It was
integrated into this branch; our branch was not merged into main. Merge
conflicts were limited to README and smoke-script expectations. UI code and
styling were preserved. Shared Zod/domain contracts did not change.

Confirmed overlaps with the unmerged Person 3 branch:

| Area | Person 2 | Person 3 | Resolution / owner |
|---|---|---|---|
| Analyze | AI extraction/summary plus evidence findings | deterministic evidence findings only | Keep P2 workflow here; P3 must agree on checker integration |
| Review | `reloop_record_review` with named arguments | `reloop_review_artifact(uuid,jsonb)` | Keep P2 tested route; reconcile transactional guards with P3 |
| Tasks | `reloop_upsert_task` with named scalar arguments | overload accepting `p_task jsonb` | Do not substitute calls without agreement |
| Migration 003 | `202610310003_workflow_writes.sql` | `202610310003_case_operations.sql` | Same prefix, different names/functions. Review applied ledgers and deployment runner before integration; never delete published migrations |
| Speech auth | Cookie-only speech while business API accepted bearer | Frontend sends bearer | Fixed in P2: both cookie and bearer accepted |
| Health/smoke | Configured/not_configured states | Frontend smoke expected not_implemented/501 | Wire shape agrees; updated smoke to current states and access failures |

Person 3 branch is deliberately unmerged. Team agreement is still required for
its shared handlers, RPC ownership and migration history.

## Fixes and local verification

- Speech accepts the merged frontend bearer flow, including CLI calls without
  Origin when explicitly authenticated. Cross-origin uploads remain rejected.
- Plain-object PostgREST errors retain CONFLICT/NOT_FOUND/REVIEW_BLOCKED codes.
- Request-changes and rejection persist while unresolved checks block approval.
  Reviewer-role checks match support versus listing ownership.
- Actual local SQL revealed an ambiguous column in the published review RPC.
  Additive `202611010005_workflow_review_fix.sql` qualifies columns and applies
  review guards inside the locked transaction. Published 003/004 are unchanged.
- Generation refuses missing documented evidence/conditions. Missing rules or
  source-only verification cannot silently mark an artifact checked.
- Retrying partial platform generation preserves saved artifacts and fills the
  missing platforms; an already complete repair returns saved data.

The API integration suite executes actual handlers, repositories, Supabase SDK
and PGlite SQL. A narrow test-only transport substitutes for PostgREST and AI
provider HTTP is mocked. It is NOT hosted Supabase or real AI verification.
Two isolated reset/seed replays cover Chinese and English case creation, one
case ID, summary, support, three platform formats, v1/v2/v3, revalidation, stale
edits, failure preserving history, blocked approval, saved request-changes, QA
task and audit retrieval. These are two automated backend replays, not the two
mandatory live browser demos.

## Services and secrets

`.env.local` exists in the project root, is ignored by `.gitignore`, and is not
tracked. No secret values are printed by `scripts/verify-services.mjs`. Its
read-only probes found Supabase/database settings present but connections
unsuccessful. LLM, transcription and strong demo-token configuration are absent.
No hosted database write, migration, seed or reset was performed.

## Person 1 handoff

The merged frontend uses actual APIs for case list/create/load, analysis,
support, repair, revisions, review, tasks and transcription. Only its explicitly
labeled synthetic input example comes from the fixture. Generated successes
are not fabricated. Remaining frontend issues to review:

- Inbox still displays hardcoded 501 annotations despite implemented routes.
- On partial repair failure, reload persisted data before retry so the first
  saved platform is visible. The backend retry is covered locally.
- Source IDs are shown; ensure rule jurisdiction, platform/segment and checked
  date remain understandable alongside the rule source link.
- API state and decision controls exist but have not been exercised against
  live services. Current login is in memory; full refresh requires login again.
- The demo defaults to English; switch to Chinese before submitting the Chinese
  merchant scenario. Loading the example alone does not change UI locale.
- Microphone capture, denial/typing fallback and editable confirmation are
  implemented in source, but real Chinese/English recordings in both contexts
  remain unverified. No frontend redesign was performed.

## Person 3 handoff and release gate

Tasks already persist through the P2 RPC and source-ID validation; the earlier
handoff saying they were missing was inaccurate. P3 must reconcile alternate
RPCs/migration numbering, verify an approved development database, and provide
official dated market-law/platform-rule records plus applicable rule checks.
Candidate rules remain needs_rule_verification; no legal compliance is claimed.
The current conservative generated-text checker is not full multilingual
semantic claim extraction and may flag quoted historical claims.
Original generation and revision RPCs persist versions/findings/revision events
previously omitted generation/revision audit_events. Additive Person 2 migration
202611010006_workflow_write_audit.sql now writes these events atomically and
serializes initial artifact allocation by locking the case. Tests verify one
artifact/version/audit for repeated initial RPC allocation. PGlite serializes
queries; independent hosted connections under contention remain untested.
Serial partial-failure retries are tested. WAV duration is checked locally; other
formats rely on provider-reported duration. These limits remain release risks.

Final automated suite: 114 tests across 14 files. Of these, 24 foundation SQL
tests and 11 API integration tests exercise real PGlite SQL. The 11 API tests
use a test-only PostgREST transport substitute and mocked AI HTTP. Other tests
cover contracts, deterministic checks, access, route/repository mocks, provider
and speech mocks, frontend client mocks and prompt routing. No successful live
provider call is included in this count. Local approval persistence is tested
using an explicitly checked test fixture, not fabricated official rules.

Not release-complete: no real AI call, real Chinese/English speech, hosted
persistence, checked legal/platform evaluation, successful live approval or two
complete live demos. No public deployment, marketplace publishing, refund or
customer message occurred. Approval to migrate/reset the specific hosted test
database remains pending.

## Windows local verification

Open `C:\Users\Vladimir\Desktop\reloop AI` in PowerShell. Use npm.cmd if
PowerShell execution policy blocks npm. Do not overwrite existing .env.local.

```powershell
Set-Location -LiteralPath "C:\Users\Vladimir\Desktop\reloop AI"
npm.cmd ci
node scripts/verify-services.mjs
npm.cmd run dev -- --port 3000
```

Open http://localhost:3000 for the landing page and /login for workspace login.
Use the locally configured demo token, not a provider key. Health is available
without login at http://localhost:3000/api/health. Stop with Ctrl+C.

Run `npm.cmd run check` for lint/typegen/tests/build. Smoke requires a running
server: `npm.cmd run smoke`. Browser smoke requires installed Playwright and
Chrome/Edge; optional RELOOP_PLAYWRIGHT_MODULE selects an existing module and
RELOOP_BROWSER_CHANNEL selects msedge. It does not test authenticated workflows.

PowerShell does not automatically import .env.local; API clients should prompt
for the local demo token rather than relying on a variable from another shell.

```powershell
$secureToken = Read-Host "Local demo token" -AsSecureString
$demoToken = [System.Net.NetworkCredential]::new("", $secureToken).Password
$headers = @{ Authorization = "Bearer $demoToken" }
Invoke-RestMethod http://localhost:3000/api/cases -Headers $headers
Remove-Variable demoToken, secureToken, headers
```

Until the database is reachable and the demo token is configured, workspace
login/API access will fail honestly. Health configured for AI/STT only means
configuration is present; it is not a live provider success.
