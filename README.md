# ReLoop AI — Claim to Action

海外客户反馈驱动的跨平台商品承诺纠错与协同系统

**Current milestone:** the AI branch is merged into main. The provided Supabase CA enables verified Postgres connections, and the missing workflow migrations are deployed. Real provider/hosted-Supabase HTTP checks pass case creation, AI summary, support and three listing drafts, support/listing v1→v2→v3, review decisions, task updates and reload. See [current verification and limitations](docs/WORKFLOW_VERIFICATION_2026-11-01.md).

Chinese/English text translation is a separate authenticated endpoint and Inbox reference preview; both directions were tested with the real chat provider. Speech transcription still requires its own working endpoint/model/key. Outstanding rule checks prevent approval, and a complete browser rehearsal remains unverified.

## Run locally

Use Node **24 LTS** (tested version recorded in `.node-version`), or Node >=22.19.0, and npm.

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public landing page. Workspace access uses Supabase Auth email/password credentials entered on `/login`; the server issues a signed HttpOnly cookie. Auth users are provisioned by an administrator; public registration is disabled. Health checks database availability; AI/speech configured states indicate configuration presence, not a successful provider request.

For a synthetic demo account, run `npm run auth:create-demo-user`. It creates an email-confirmed Supabase Auth user with a random `@example.com` address and password and prints the credentials once. That address cannot receive verification or password-reset mail.

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
- Voice UI uses microphone permission and `MediaRecorder`, supports stop/cancel, and sends bearer-authenticated audio to `/api/transcribe`. Editable transcripts require confirmation, and typing remains available on failure. Live speech remains unverified.
- The integration uses the provided Spark/Crypgo source, scoped design CSS, official local ReLoop assets, and local Inter. See [the integration plan](docs/UI_INTEGRATION_PLAN.md) and [asset attribution](docs/UI_ATTRIBUTION.md).

## Backend boundary

Case list/create/load and workflow routes use Supabase. Browser requests use the signed session cookie; a legacy bearer token may be configured for trusted API clients, but is not offered as a login method. Create an administrator-provisioned Auth user with `npm run auth:create-demo-user`; the command prints the one-time credentials. **AI generation, legal/platform rule checks, transcription and revision generation status is described in the integration report.** Nothing is sent or published externally.

The tracked `.env.example` documents the configuration keys. Copy it only if `.env.local` does not already exist. Never commit credentials or copy provider keys into frontend configuration. Set `DATABASE_SSL_CA_FILE` to the downloaded Supabase certificate when required; local certificates are ignored in `supabase/certs/`. `npm start` loads the project environment before launching Next.js so configured proxies apply at process startup.

The production app's `npm run check` includes lint, type generation/TypeScript, tests, and production build. `npm run smoke` checks public/protected page responses, API authentication and health. The opt-in `tests/integration.live.test.ts` checks actual saved results. It requires `RELOOP_INTEGRATION_BASE_URL`, `RELOOP_INTEGRATION_TOKEN`, `RELOOP_INTEGRATION_WRITES=1`, and `RELOOP_INTEGRATION_AI=1` for real provider calls and synthetic writes. No reset or migration runs inside the test.

## Remaining backend work

- Configure a verified transcription provider and test real Chinese/English recordings separately from text translation.
- Resolve applicable rule evaluations before approving generated drafts; source metadata alone does not complete checks.
- Run the full user-facing browser rehearsal, including translation previews and microphone permissions. API replays do not prove those interactions.
- The browser uses a signed HttpOnly session issued after Supabase Auth email/password verification. Team/tenant provisioning and account management remain separate work.

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

`npm run check` runs all four. CI repeats these on pushes and PRs. Actual model, speech, live Supabase and two complete MVP rehearsals require feature implementation and credentials; foundation tests do not establish those gates.

An independent prompt-routing CLI is available for local experiments; it does not enable product generation endpoints. See [Prompt Router](docs/PROMPT_ROUTER.md) for model selection, explicit eval criteria, bounded escalation, and offline tests.

With the app running, `npm run smoke` checks the landing/login/workspace routes, access protection, health, and speech request handling. It defaults to port 3000; set `RELOOP_BASE_URL` to use another local address. It does not establish live AI, speech or database integration.

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
