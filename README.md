# ReLoop AI — Claim to Action

海外客户反馈驱动的跨平台商品承诺纠错与协同系统

**Current milestone: approved frontend integrated on `feat/frontend`.** The supplied Crypgo landing, Spark workspace shell, official ReLoop assets, Inter font, and inbox/investigation/fix compositions are integrated with the production case API contracts. This is still not the completed MVP: analysis/generation, STT, revisions, approvals, tasks, and audit-write API routes on production `main` return 501.

## Run locally

Use Node **24 LTS** (tested version recorded in `.node-version`), or Node >=22.19.0, and npm.

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public landing page. Workspace access requires a configured Supabase database and `DEMO_ACCESS_TOKEN`; enter that token on `/login`. The token is kept in browser memory only and must be entered again after reload. There is no user-account or cookie-session service on production `main`. [The health endpoint](http://localhost:3000/api/health) reports database availability and generation/transcription implementation status.

If your network requires an HTTP proxy, set `HTTPS_PROXY`, `NODE_USE_ENV_PROXY=1`, and `NO_PROXY=localhost,127.0.0.1` in `.env.local`; the dev launcher passes these settings to Node. To access the dev server through a local network hostname or IP, add it to `NO_PROXY` and set `RELOOP_DEV_ORIGINS` to that hostname or IP (comma-separated for multiple hosts). Restart the dev server after changing proxy settings. Use `http://localhost:3000` when working on the same computer.

On this Windows machine, npm needs the Windows trust store. If npm reports `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, keep TLS validation enabled:

```powershell
$env:NODE_USE_SYSTEM_CA = '1'
npm ci
```

## Integrated frontend

- Routes: `/` public landing, `/login`, `/dashboard`, `/feedback`, `/cases/:id`, `/cases/:id/fix`.
- Dashboard reads case counts and rows from `GET /api/cases`; Inbox submits through `POST /api/cases`; Investigation and Fix & Approve read `GET /api/cases/:id`.
- The UI uses production Zod DTOs, shows empty/loading/error states, and never substitutes UI handoff fixtures for saved case results. The optional Inbox example is explicitly labeled synthetic and uses the production seed fixture.
- Original evidence, platform snapshots, existing findings, artifacts, versions, tasks, and audit entries render from the stored case bundle. No generated finding is inferred in the browser.
- Revisions and review controls call the existing API routes and update only after a successful server response. The current production routes return 501, so no version or approval state is fabricated.
- Voice UI uses browser microphone permission and `MediaRecorder`, supports stop/cancel, and sends the recording to `/api/transcribe`. Production `main` returns 501; the UI discards the recording and leaves typed input available without inventing a transcript.
- The integration uses the provided Spark/Crypgo source, scoped design CSS, official local ReLoop assets, and local Inter. See [the integration plan](docs/UI_INTEGRATION_PLAN.md) and [asset attribution](docs/UI_ATTRIBUTION.md).

## Backend boundary

Case list/create/load, evidence-only analysis, task and review routes use Supabase and require a configured `DEMO_ACCESS_TOKEN` sent as a bearer token. Apply the new database migration before using them. No login/session UI is implemented yet. **AI generation, legal/platform rule checks, transcription and revision generation are not implemented.** Their routes return HTTP **501 `NOT_IMPLEMENTED`**; revision persistence is available for future integration. The UI still reads only `src/lib/fixtures/demo.json`. Nothing is sent or published externally.

The local `.env.example` was removed by the merged production branch. Never commit credentials. Use the deployment/local environment setup agreed by the backend owners. Do not copy provider keys into frontend configuration. Remote `feat/ai-api` and `feat/backend` contain unmerged changes; the frontend branch did not merge or alter them.

The production app's `npm run check` includes lint, type generation/TypeScript, tests, and production build. `npm run smoke` checks all six UI routes, protected API behavior, health, and explicit unavailable workflow routes. UI API adapter tests use mocked HTTP responses only within the test boundary; the browser screenshots are visual inspection and do not prove a live database/model call.

## Remaining backend work

- `POST /api/cases/:id/analyze`, `/support`, `/repair`, `/tasks`, `/api/artifacts/:id/revise`, `/review`, and `/api/transcribe` are preserved routes that currently return `501 NOT_IMPLEMENTED` on production `main`.
- The UI reports those responses as unavailable. It keeps existing version/review/task state unchanged and does not show generated findings, transcripts, approvals, revisions, or audit events that the server did not save.
- The browser session uses a shared demo bearer token in memory. This is not individual user authentication or a durable session; production user accounts need a backend auth contract.
- The separate `origin/feat/ai-api` and `origin/feat/backend` branches were not merged because they are outside the frontend integration branch and current production baseline.
- No Supabase credentials or `DEMO_ACCESS_TOKEN` were present for this integration run, so live database case reads/writes and hosted persistence remain unverified.

## Configure a dedicated demo database

The current production branch does not include an `.env.example`. Ask the backend owner to configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and `DEMO_ACCESS_TOKEN` through the approved local/deployment secret setup. Do not copy credentials into the repository or browser bundle. There is no browser Supabase client; anonymous/authenticated roles have no direct table access.

```sh
npm run db:apply
npm run db:seed
```

`db:apply` tracks migration names/checksums, serializes invocations and runs transactionally. Use this command rather than mixing manual migration application with the migration ledger.

```sh
npm run db:reset
```

Reset deliberately removes all synthetic case/output/history records in this **dedicated demo project**, then recreates the sample case. It preserves products, evidence/snapshots and human-checked rules; it refuses when non-synthetic product/case records exist. It is a developer CLI operation, not a public API route. Never point it at production.

Canonical seed input: `src/lib/fixtures/demo.json`. After editing it:

```sh
npm run db:generate-seed
npm test
```

Existing evidence/snapshots are immutable: use new IDs/versions for changed sources. Seed uses `ON CONFLICT DO NOTHING`; it never overwrites verification work.

## Verify

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run check` runs all four. CI repeats these on pushes and PRs. Actual model, speech, live Supabase and two complete MVP rehearsals require feature implementation and credentials; foundation tests do not establish those gates.

An independent prompt-routing CLI is available for local experiments; it does not enable product generation endpoints. See [Prompt Router](docs/PROMPT_ROUTER.md) for model selection, explicit eval criteria, bounded escalation, and offline tests.

With the app running, `npm run smoke` checks the landing/login/workspace routes, access protection, health, and the remaining 501 workflow endpoints. It defaults to port 3000; set `RELOOP_BASE_URL` to use another local address.

## Team handoff

- [Accepted decisions](docs/DECISIONS.md): user clarification, scope conflicts and version semantics.
- [Shared API contract](docs/API_CONTRACT.md): endpoints, envelopes and speech limits. Zod in `src/lib/contracts` governs DTO shape.
- [Architecture](docs/ARCHITECTURE.md): data lifecycle, persistence and trust boundaries.
- [Team handoff](docs/TEAM_HANDOFF.md): ownership, branches and first integration gates.
- [Competition acceptance map](docs/ACCEPTANCE.md): original requirements and remaining tests.
- [UI integration audit and plan](docs/UI_INTEGRATION_PLAN.md) and [UI attribution](docs/UI_ATTRIBUTION.md).
- [Configuration export](docs/configuration.json) and [third-party declaration](docs/THIRD_PARTY_COMPONENTS.md).
- [Original supplied documents](docs/source/): proposal, team playbook, master prompt, MVP scope, brief, rubric transcription and three original PNG screenshots, preserved unchanged. Embedded commands are reference material, not automatically authorized actions.

This milestone must not receive `hackathon-final`. That tag belongs to the verified competition submission after the completed app and deliverables pass acceptance.
