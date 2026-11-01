# Current verification — 1 November 2026

Latest follow-up: [H14_H18_SERVICE_VERIFICATION.md](H14_H18_SERVICE_VERIFICATION.md).
147 offline tests pass and two separate real-AI/local-SQL tests pass. Real
speech remains blocked; hosted writes were explicitly postponed. Older counts
and service states in this file are historical checkpoints.

The H14–H18 branch integrates the approved frontend from origin/main. Current
results and exact test boundaries are in [H14_H18_INTEGRATION.md](H14_H18_INTEGRATION.md).
The current suite contains 114 tests across 14 files, including actual local
SQL-backed API routes with mocked AI HTTP. Real Supabase/AI/speech and the two
complete live demos remain unverified. No hosted database writes were made.

The following is the preserved historical foundation report. Its test counts,
fixture-only UI description and 501 routes do not describe the current branch.

## Historical foundation verification — 31 October 2026

Milestone: Person 2 backend and AI stabilization on `feat/ai-api`; this is not the completed competition MVP.

## Verified

- Clean dependency install: `npm ci` succeeded from the committed lockfile.
- `npm run check`: ESLint, TypeScript, all **52 tests**, and production Next.js build passed.
- After the missing-case status correction, production build and lint passed again.
- `npm run smoke` against the production server: three bilingual fixture screens returned 200; both unknown-case screens returned 404; health returned explicit database/model/speech availability; all ten business method/routes returned honest HTTP 501 with no successful data.
- PostgreSQL tests executed the actual SQL migration and generated seed in PGlite, including RLS/access, source/version immutability, cross-case foreign keys, both artifact kinds through three versions, review/version binding, repeatable reset, and non-synthetic reset refusal.
- Headless Chrome desktop and mobile inspection: actual viewport/document widths were 1440/1440 and 390/390 pixels, with no elements overflowing horizontally on Fix & Approve. Desktop Inbox also inspected visually. Chinese text rendered correctly.
- All nine copied source documents/images matched the original download-file SHA-256 hashes.

Environment: Windows, Node 24.14.1, npm 11.11.0, Next.js 16.4.3, React 19.3.1. ESLint 9.39.5 is intentionally pinned to satisfy the bundled Next lint plugins' declared peer range; upgrading only ESLint to 10 produced incompatible peer requirements and was reverted before the clean install.

## Not yet verified / not implemented

No live Supabase credentials were configured; the health result was `not_configured`. SQL tests used embedded PostgreSQL, not hosted Supabase/PostgREST. Model generation, transcription, source-rule checking and business orchestration remain feature work. No real AI call, microphone test, live approval/revision flow, completed end-to-end MVP rehearsal, public deployment or external marketplace connection is claimed.

Original rule URLs remain candidate references with `needs_rule_verification`. Generated output examples in test fixtures are contract mocks. The UI preview contains original synthetic inputs only. Final poster/presentation and the `hackathon-final` tag are outside this foundation milestone.
