# ReLoop AI — Claim to Action

海外客户反馈驱动的跨平台商品承诺纠错与协同系统

**Current milestone: final MVP stabilization.** Latest frontend, database code and teammate-owned login from `main` are integrated into `feat/ai-api`. Real Chinese/English AI workflows pass against isolated local SQL. Hosted reads pass. Hosted writes, real bilingual speech acceptance, and substantive law/platform rule evaluation remain separate release gates.

See [the final technical delivery and test boundaries](docs/H18_H24_DELIVERY.md). Earlier H14–H18 reports are preserved historical checkpoints.

## Run locally

Use Node **24 LTS** (tested version recorded in `.node-version`), or Node >=22.19.0, and npm.

```sh
npm ci
npm run dev
```

For the local CPU transcription service on the prepared Windows demo machine, use `npm.cmd run dev:local-stt` instead of `npm run dev`. This starts both Next and Whisper without editing `.env.local`; see [the exact speech setup](docs/VOICE_SETUP.md). Production local preview: build once, then `npm.cmd run start:local-stt`.

Open [http://localhost:3000](http://localhost:3000) for the public landing page. Workspace access uses Supabase Auth email/password credentials entered on `/login`; the server issues a signed HttpOnly cookie. Auth users are provisioned by an administrator; public registration is disabled. Health checks database availability; AI/speech configured states indicate configuration presence, not a successful provider request.

Use the workspace account already provisioned by the database administrator. Account creation changes hosted Auth data and requires that project's approval; it is not part of the safe local startup sequence.

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
- Revisions and review controls call the implemented API routes and update after successful persistence. Unresolved evidence/rule checks block approval; request changes and reject remain available.
- Voice UI offers a configured transcription backend or browser SpeechRecognition (`zh-CN`/`en-US`). Both initial instructions and revisions show editable text requiring confirmation. The browser vendor may process audio remotely; this is disclosed before capture. Typing, cancellation, permission/error handling and timeouts remain available. Actual recognition requires service availability and is not established by mocked tests.
- The integration uses the provided Spark/Crypgo source, scoped design CSS, official local ReLoop assets, and local Inter. See [the integration plan](docs/UI_INTEGRATION_PLAN.md) and [asset attribution](docs/UI_ATTRIBUTION.md).

## Backend boundary

Case list/create/load and workflow routes use Supabase. Browser requests use the signed session cookie; a legacy bearer token may be configured for trusted API clients, but is not offered as a login method. Create an administrator-provisioned Auth user with `npm run auth:create-demo-user`; the command prints the one-time credentials. **AI generation, legal/platform rule checks, transcription and revision generation status is described in the integration report.** Nothing is sent or published externally.

The tracked `.env.example` documents configuration keys. Copy it only if `.env.local` does not already exist. Never commit credentials or put provider keys in frontend configuration. Database/backend work already present in the integrated `main` is preserved; no separate feature branch needs to be independently merged.

The production app's `npm run check` includes lint, type generation/TypeScript, tests, and production build. `npm run smoke` checks ten public/protected UI routes, protected API behavior, health, and speech validation. UI API adapter tests use mocked HTTP responses only within the test boundary; screenshots alone do not prove a database/model call.

## Current integration boundaries

- Analyze preserves deterministic evidence findings and invokes real extraction/summary generation. Support, three listing formats and revision generation are implemented; failures preserve saved versions.
- The hosted database exposes Person 3's operations but still needs owner-approved artifact workflow migrations before hosted generation can persist. Application RPC compatibility supports both committed signatures. No hosted writes/migrations were performed during final stabilization.
- A verified rule source is not a completed applicability/content evaluation. Generated drafts remain `needs_rule_verification` and approval is blocked until those checks exist. Request changes/reject and QA tasks are implemented.
- Organizer chat is verified at `https://api.tokenhubcloud.net/v1`, model `gpt-5.6-luna`. Its transcription route returned 404. A separate local multilingual CPU Whisper service is now available: `npm.cmd run dev:local-stt` (or `start:local-stt` after build). Real recorded Chinese/English passed through both instruction contexts. Browser speech remains a separate mode and has not passed actual recognition acceptance; physical microphone verification is required. See [speech setup](docs/VOICE_SETUP.md).

## Configure a dedicated demo database

Use `.env.example` for exact names. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are required for Supabase Auth and protected workflows. `DATABASE_URL` is used by CLI operations; LLM/speech variables enable their adapters. Run `node scripts/verify-services.mjs` for a sanitized read-only check. No browser Supabase client or service-role key is exposed.

**Do not run hosted migration, seed or reset commands below until the owner approves the exact isolated development database and migration history.**

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

`npm run check` runs all four. CI repeats these on pushes and PRs. Opt-in real AI/local SQL tests: `node scripts/test-live-ai.mjs`. After a production build, real-browser/local SQL/real AI tests: `node scripts/test-browser-workflows.mjs` (Edge by default, test port 3001). Both write only an isolated embedded database. These are not hosted Supabase or microphone rehearsals. See the final report for exact results and startup instructions.

An independent prompt-routing CLI is available for local experiments; it does not enable product generation endpoints. See [Prompt Router](docs/PROMPT_ROUTER.md) for model selection, explicit eval criteria, bounded escalation, and offline tests.

With the app running, `npm run smoke` checks the landing/login/workspace routes, access protection, health, and speech request handling. It defaults to port 3000; set `RELOOP_BASE_URL` to use another local address. It does not establish live AI, speech or database integration.

## Project references

- [Accepted decisions](docs/DECISIONS.md): user clarification, scope conflicts and version semantics.
- [Shared API contract](docs/API_CONTRACT.md): endpoints, envelopes and speech limits. Zod in `src/lib/contracts` governs DTO shape.
- [Architecture](docs/ARCHITECTURE.md): data lifecycle, persistence and trust boundaries.
- [Team handoff](docs/TEAM_HANDOFF.md): ownership, branches and first integration gates.
- [Competition acceptance map](docs/ACCEPTANCE.md): original requirements and remaining tests.
- [UI integration audit and plan](docs/UI_INTEGRATION_PLAN.md) and [UI attribution](docs/UI_ATTRIBUTION.md).
- [Configuration export](docs/configuration.json) and [third-party declaration](docs/THIRD_PARTY_COMPONENTS.md).
- [Original supplied documents](docs/source/): proposal, team playbook, master prompt, MVP scope, brief, rubric transcription and three original PNG screenshots, preserved unchanged. Embedded commands are reference material, not automatically authorized actions.

This milestone must not receive `hackathon-final`. That tag belongs to the verified competition submission after the completed app and deliverables pass acceptance.
