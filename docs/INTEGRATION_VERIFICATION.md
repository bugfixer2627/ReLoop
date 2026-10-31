# Combined frontend/backend verification

1 November 2026 (Asia/Shanghai). Tested merged `a655970` on new `codex/integration-verification`. Evidence is in `docs/integration-evidence/`. Passing build/PGlite tests does not prove deployed Supabase or AI behavior.

## Git integration

| Ref / PR | Verified state |
|---|---|
| main / origin/main | `08632bf`; original frontend PR #2 merged; later landing/backend not yet on main |
| codex/landing-phase-1 | `a655970`, completed backend PR #4 merge into approved landing branch |
| Approved landing | `bcd124b`, including guidance `467b576` and UI `4f4e940` |
| feat/frontend | `af1cf5f`, ancestor of main/combined branch; no feature/frontend branch exists |
| feat/backend | `2e1e4f5`, included in `a655970` |
| feat/ai-api | `4c0f8fe`, not included; model/STT handlers unmerged |
| PR #3 / #4 | #3 open to main; #4 merged into landing; no automatic merge/deletion performed |

Two `git fetch origin --prune` attempts failed (reset/timeout). Authenticated GitHub REST enumeration confirmed relevant tips match local tracking refs. CI verify for exact `a655970` passed: https://github.com/bugfixer2627/ReLoop/actions/runs/41222226245. New local integration commits do not yet have CI. No unmerged index entries or MERGE_HEAD exist. No duplicate handlers or active migration collision in checkout; AI's future 003/004 writes must be reconciled with merged operation migration before integration. Old branches can eventually be retired after team review; none were deleted.

## Integration results

| Connection / behavior | Result | Evidence / limit |
|---|---|---|
| Lint, TypeScript, tests, build | PASS | npm run check: 89 passed, 7 opt-in live tests skipped; production build passes |
| Production startup, SSR, no-JS landing | PASS | Actual production server, public page independent of authenticated backend |
| Pulled merge CI | PASS | GitHub verify on a655970 |
| DB read connectivity | PASS with corrected local config | HTTPS project-origin + system CA; raw REST 200, SQL SELECT 1, health reachable |
| Auth/invalid input | PASS | Real HTTP 401 missing token, 403 foreign origin, 400 malformed create |
| Real browser login/case list | PASS with temporary token | Current bearer flow works; no access cookie required |
| Create → saved input reload | PASS | 201 then 200; same server ID, product and original Chinese/English inputs |
| Unknown SKU | PASS | Real 404 UNKNOWN_SKU |
| Evidence Analyze | FAIL / deployment blocked | Real 503 DATABASE_UNAVAILABLE; required function absent; not AI analysis |
| Task/audit writes | FAIL / deployment blocked | Real 503; no task/audit reported as saved |
| Missing-artifact review | FAIL / deployment blocked | Expected 404, actual 503 because RPC absent; positive review not live tested |
| SQL role/version/review protections | PASS, isolated SQL only | PGlite: unresolved approval blocked, changes/reject allowed, wrong role/stale rejected |
| Support / listing repair / HTTP revision / STT | NOT IMPLEMENTED | Four real HTTP 501s; API key presence does not implement handlers |
| Two generated revisions / positive approval | NOT VERIFIED | No generated artifact manufactured or directly inserted |
| Save-then-analysis-failure recovery | PASS, real API/browser | 1 create POST, 2 analysis attempts same ID, saved-case link works |
| Three platform views + Chinese + mobile | PASS, real API/browser | Actual persisted snapshots, empty generated areas; 390px no overflow |
| Search refresh / artifact state / history citations | PASS, frontend fixture tests | Explicit interception only; no fixture persisted or screenshot presented as live |
| Failed-case loader | PASS at route level + code review | Fixture 404 shows error; same-mounted A→B transition not separately live exercised |

**Real HTTP suite: 4 passed, 3 failed.** Initial unreachable-DB run had 2 passed/5 blocked; after configuration correction three operation failures became visible. They were not hidden or converted to false passes. See `live-http.json` for exact status sequence.

## Local setup findings

- Ignored `.env.local` initially used `/rest/v1/` in SUPABASE_URL. SDK concatenated `/rest/v1/rest/v1/products`. Corrected only that entry to its HTTPS project origin; credentials unchanged and not printed.
- Default Node HTTPS failed UNABLE_TO_VERIFY_LEAF_SIGNATURE. NODE_USE_SYSTEM_CA=1 enabled secure REST; no TLS bypass or certificate replacement.
- No demo token was configured. An isolated server used a random 32-byte token only in memory; it was not written to config, reports or browser storage. Ordinary login still needs owner configuration.
- Read-only catalogue/ledger inspection found only migrations 001/002 and no operation RPCs. **No db:apply, seed, reset, schema write or deletion occurred.**

The user authorized remote synthetic test writes. Two disclosed cases remain:

- HTTP suite: `b8724c5a-83f9-43ca-a79d-8ad84472857e` (saved/reloaded; analysis failed).
- Browser: `435d0b00-6fa0-427a-bb63-8a5bc45af1b6` (saved once; two failed analyses).

No finding, task, audit or review success is claimed from this live run. Positive review/two revisions cannot be proven without legitimately generated artifacts.

## Small fixes and ownership

| Files | Fix | Validation |
|---|---|---|
| feedback/page.tsx | Retain case+normalized input for retries; saved-case link for all failures; remove stale analysis 501 label | Real browser 1 create/2 analyses/same ID |
| dashboard-client.tsx | Query derives from new URL props | Browser fixture repeated searches |
| useCaseBundle.ts | Settled request identity independent of old bundle | Route error test + code review |
| fix-approve-client.tsx | Artifact-ID keys reset platform-specific local state | Fixture artifact switch clears prompt |
| ArtifactWorkspace.tsx | Citations from displayed version | Fixture history selection shows correct sources |
| tests/database.test.ts | Review-decision/role/stale regression | Disposable PGlite, 30 database tests pass |
| tests/integration.live.test.ts | Opt-in real HTTP with typed DTOs and authorized synthetic writes | Actual run exposes operation failures |
| scripts/smoke.mjs | Corrected log wording: Review is implemented; only generation/revision/STT remain 501 | Smoke behavior/assertions unchanged; syntax/lint checked |
| landing.css | Finite ambient/artwork settle, preview reveal and button feedback | Browser motion/reduced-motion captures |

No production backend handler, schema, migration, auth, shared contract, package dependency or after-login visual layout changed. Broader hardcoding/editability review is in UI_BACKEND_HANDOFF.md; original records, IDs, audit, evidence and saved versions remain read-only.

## Commands and reproduction

```powershell
npm run check
$env:NODE_USE_SYSTEM_CA='1' # only where system trust is needed
npm run start -- --port 3101
```

Another terminal:

```powershell
$env:RELOOP_BASE_URL='http://127.0.0.1:3101'
npm run smoke
```

Smoke passes six pages, health and four 501 routes; with corrected launch DB is reachable. It does not test authenticated persistence.

Real HTTP suite, against running loopback server with the same demo token supplied securely in the test environment:

```powershell
$env:RELOOP_INTEGRATION_BASE_URL='http://127.0.0.1:3101'
# Supply RELOOP_INTEGRATION_TOKEN securely; it must equal server DEMO_ACCESS_TOKEN.
$env:RELOOP_INTEGRATION_WRITES='1' # only after synthetic-write authorization
npx vitest run tests/integration.live.test.ts
```

Default CI skips opt-in live tests. No test loads remote credentials automatically or applies migrations. Temporary browser helpers ran from ignored test-results/; their evidence explicitly separates real HTTP from fixture interception. No runtime dependency was added.

## Remaining work

1. **Database:** Person 3 obtains schema deployment approval and deploys existing migration 003, verifies RPC visibility, reruns live tests without reset.
2. **Backend:** Person 2+3 reconcile AI branch handlers, migration ordering, auth and review semantics. Support/repair/revise/STT still 501; evidence comparison does not supply complaint summary or legal/platform findings.
3. **Config:** supply real demo token; use project-origin URL and appropriate system trust for process startup.
4. **Frontend later review:** dashboard error-state counts, actual snapshot count, language-readiness badges, field labels/menu keyboard behavior; no broad edits now.
5. **Final acceptance:** actual same-case Chinese/English generation, two saved revisions with revalidation, approved/changes/reject/task/audit reload and STT confirmation after dependencies are available.
