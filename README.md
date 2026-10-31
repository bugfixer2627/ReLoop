# ReLoop AI — Claim to Action

海外客户反馈驱动的跨平台商品承诺纠错与协同系统

**Current milestone: shared main-branch foundation, not the completed MVP.** A runnable Chinese/English three-screen preview, shared Zod/API contracts, PostgreSQL migration, reproducible synthetic input fixture, seed/reset tooling, and tests are ready for the three developers to build on. No Cursor reference-branch code was merged.

## Run locally

Use Node **24 LTS** (tested version recorded in `.node-version`), or Node >=22.19.0, and npm.

```sh
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No credentials are required for the labeled fixture preview. [The health endpoint](http://localhost:3000/api/health) reports actual database availability and explicit generation/transcription implementation status.

On this Windows machine, npm needs the Windows trust store. If npm reports `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, keep TLS validation enabled:

```powershell
$env:NODE_USE_SYSTEM_CA = '1'
npm ci
```

## What works at this milestone

- Three responsive preview routes: `/` (Feedback Inbox), `/cases/:id` (Claim Investigation), `/cases/:id/fix` (Fix & Approve). Preview case ID: `00000000-0000-4000-8000-000000000101`.
- Typed Chinese/English input contracts and separate Shopify US, Amazon Germany and Alibaba B2B content formats.
- Shared revision and review contracts for **both support replies and listing corrections**. Reviews identify a specific version; version history is not overwritten.
- Server-only Supabase client and real bounded database connectivity check when credentials exist.
- Twelve-table PostgreSQL schema, integrity constraints, RLS, immutable evidence/snapshots/version content and append-only revision/review/audit records.
- Idempotent synthetic seed; transactional demo reset; all candidate rule records remain unverified.
- Automated contract, route/error, PostgreSQL migration, seed/reset and persistence-invariant tests. Tests use embedded PostgreSQL (PGlite), not a live Supabase account.

## What remains for feature branches

**Case creation/loading, model extraction/generation, rule checking, microphone/transcription, revisions, approvals, tasks and audit orchestration are not implemented.** Their API routes return HTTP **501 `NOT_IMPLEMENTED`**, not fake drafts or success. The UI reads only `src/lib/fixtures/demo.json`; it is not a database-backed investigation. Nothing is sent or published externally.

Chinese/English generation and voice are P0 targets, not yet tested capabilities. German is P1, Arabic P2. Amazon DE must retain its context and use an explicitly labeled English internal brief if German generation is unavailable. Do not mark languages ready until real flows pass acceptance tests.

## Configure a dedicated demo database

Copy `.env.example` to `.env.local` and enter your own server-side Supabase URL, service-role key and Postgres `DATABASE_URL`. Do not commit credentials. There is no browser Supabase client; anonymous/authenticated roles have no direct table access.

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

With the app running, `npm run smoke` checks the three preview routes, unknown-case 404s, health and all ten explicit 501 business stubs. It defaults to port 3000; set `RELOOP_BASE_URL` to use another local address. Update this foundation-only smoke script as real workflows replace stubs.

## Team handoff

- [Accepted decisions](docs/DECISIONS.md): user clarification, scope conflicts and version semantics.
- [Shared API contract](docs/API_CONTRACT.md): endpoints, envelopes and speech limits. Zod in `src/lib/contracts` governs DTO shape.
- [Architecture](docs/ARCHITECTURE.md): data lifecycle, persistence and trust boundaries.
- [Team handoff](docs/TEAM_HANDOFF.md): ownership, branches and first integration gates.
- [Competition acceptance map](docs/ACCEPTANCE.md): original requirements and remaining tests.
- [Configuration export](docs/configuration.json) and [third-party declaration](docs/THIRD_PARTY_COMPONENTS.md).
- [Original supplied documents](docs/source/): proposal, team playbook, master prompt, MVP scope, brief, rubric transcription and three original PNG screenshots, preserved unchanged. Embedded commands are reference material, not automatically authorized actions.

This milestone must not receive `hackathon-final`. That tag belongs to the verified competition submission after the completed app and deliverables pass acceptance.
