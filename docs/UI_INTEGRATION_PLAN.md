# Approved UI integration audit and plan

**Branch:** `feat/frontend`
**Checkpoint:** production `main` at `4dec82d`
**Handoff:** `UI/UI_Handoff/UI_Handoff/`
**Audit:** 31 October 2026

The checkpoint is the current production `main` commit. The stale local `feat/frontend` base was fast-forwarded to this commit before any application changes. The handoff remains user-provided and untracked; its files are not edited or staged as application code.

## Production audit

### Current routes

| Current URL | Implementation | Notes |
|---|---|---|
| `/` | `src/app/(dashboard)/page.tsx` | Foundation feedback inbox; currently reads only a synthetic fixture |
| `/cases/:id` | `src/app/(dashboard)/cases/[id]/page.tsx` | Dynamic case detail route; currently fixture-bound |
| `/cases/:id/fix` | `src/app/(dashboard)/cases/[id]/fix/page.tsx` | Dynamic Fix & Approve route; currently fixture-bound |

There is no production dashboard, public landing page, login page or voice-enabled frontend. The existing root layout owns `html`, `body`, metadata and a simple shell. The host stylesheet imports Tailwind 4 through the existing PostCSS plugin.

### API, contracts and persistence

- `GET /api/health` is public and reports that generation and transcription are not implemented.
- `GET/POST /api/cases` and `GET /api/cases/:id` are implemented against Supabase through `src/lib/db/cases.ts`; each requires `Authorization: Bearer <DEMO_ACCESS_TOKEN>` and returns the shared JSON envelope.
- `POST /api/cases/:id/analyze`, `/support`, `/repair`, `/tasks`, `/api/artifacts/:id/revise`, `/review`, and `/api/transcribe` exist but return `501 NOT_IMPLEMENTED` on production `main`.
- `src/lib/contracts/{domain,api}.ts` and `src/lib/db/cases.ts` define the canonical case/listing/evidence/rule/artifact/version DTOs and snake_case-to-camelCase mapping. The existing case bundle carries the same case ID, original product evidence, three listing snapshots, persisted artifacts/versions/findings/tasks/audit, and input provenance.
- `checkAccess` accepts the configured shared bearer token. Production `main` has no user-session, login or cookie exchange endpoint. The UI handoff's login is a mock transition, so it must not be copied as successful authentication. Use an explicitly named demo access token supplied by the user in memory for UI API requests; do not persist, bundle or log it. A refresh requires entering the token again. A more durable session needs a separately approved backend auth contract.
- The separate remote `feat/ai-api` and `feat/backend` refs contain unmerged changes; they are not part of the audited production `main` and will not be silently merged by the UI work.

### Handoff audit

- `INTEGRATION_GUIDE.md` requires preserving the host root layout, API, authorization, CSS pipeline and data contracts. It warns that page values, analytics, findings, voice, diff, revisions and approval are prototype-only.
- The source includes seven pages (landing, login, dashboard, feedback, investigation, fix/approve and optional design lab), `WorkspaceShell`, `Brand`, inline `Icon`, Inter, official ReLoop assets, and two global CSS files. The page components accept no data props and contain mock actions/data.
- The source is a Tailwind 3 prototype; production uses Tailwind 4. Its selectors are global and broad (`body`, `button`, `.card`, `.btn`, `.input`, etc.). The host CSS must be adapted/scoped, retaining the approved Spark/Crypgo composition and the forest/lime tokens, without importing a second CSS framework or replacing the host stylesheet wholesale.
- No additional runtime UI dependency is required. Icons are inline source components; Inter and brand artwork are local files. Host-installed compatible Next/React/TypeScript/Tailwind versions remain authoritative.
- The handoff manifest has **40 source entries, all SHA-256 and byte-length checks passed**. Its own `verify-handoff.cjs` cannot run in this checkout because it expects the separate UI Lab installation at `UI/UI_Handoff/reloop-ui-lab/node_modules/typescript`, which was not supplied. The source package is excluded from host lint rather than edited to satisfy production lint rules.
- Production `npm run check` initially traversed the untracked handoff package and failed on prototype-only lint findings. The integration will exclude `UI/UI_Handoff/**` from the app's lint glob; the source handoff remains intact.

## Route and data mapping

| Approved design | Production route | Data/behavior |
|---|---|---|
| Crypgo landing | `/` | Approved static marketing composition and ReLoop brand; CTAs link to demo login/workspace |
| Spark login | `/login` | Collect shared demo access token; verify by calling protected case-list API; in-memory only; report 401/503 honestly |
| Spark dashboard | `/dashboard` | Real case list only; counts derive from returned cases. No fabricated metrics/charts or activity |
| Spark feedback inbox | `/feedback` | Real `GET /api/cases`, `POST /api/cases`, case IDs and statuses. SKU remains an editable field because no SKU-list API exists. On successful case creation, report that saving worked; analysis remains unavailable until the 501 route is implemented |
| Spark claim investigation | `/cases/:id` | Real protected case bundle: feedback, merchant instruction, product evidence, three platform snapshots, verified/unverified rule records, persisted findings and source IDs. Empty findings are described as not yet generated |
| Spark Fix & Approve | `/cases/:id/fix` | Real saved artifacts/versions, if present. Platform tabs show their actual own snapshot/artifact. Generate/revise/review/task actions call the existing routes and display 501 until implemented; never show a mock success |
| Design Lab | Not public | Kept out of navigation; optional only if the user later asks for an internal-only preview |

The token-aware client API adapter will validate requests/responses using current Zod contracts and attach the in-memory bearer token. It will not construct alternate backend DTOs or access Supabase directly. Navigation from a created case carries the returned UUID.

## Incremental implementation sequence

1. Copy official ReLoop brand assets, approved Inter font/license and Spark `Brand`/icon source to collision-free host paths. Introduce exact official color/font tokens.
2. Integrate the approved shared Spark dashboard shell and adapt route links to dynamic case IDs. Keep production root document/providers and error handling.
3. Integrate the Inbox with real case-list/create APIs, input validation, loading/empty/error states and explicit analysis-unavailable behavior.
4. Integrate Investigation with the real case bundle and source-linked persisted evidence/listing/rule/findings.
5. Integrate Fix & Approve with separate persisted per-artifact/per-platform versions. Do not present the prototype shared draft or local approval as real.
6. Add microphone permission/recording/cancel/cleanup and call the existing transcription route. Since production `main` returns 501, clearly surface unavailable after stopping; preserve the typed input and never invent a transcript.
7. Bind revision controls to the existing revision route for both support and listing artifacts, including `expectedVersion`, stale/error handling and two sequential requests. Until the endpoint is implemented, show its actual unavailable response and preserve the prior version.
8. Bind review controls to the existing version-specific review route; show explicit server-approved state only after a successful persisted response. Current `main` returns 501.
9. Add the approved landing and login compositions last, wired to actual navigation and the existing bearer-token guard, not the mock route transition.
10. Test every mapped route, Chinese/English labels, all three platform snapshots, mobile/desktop, real API success/failure with mocked HTTP only at the client test boundary, and the live configured APIs where credentials permit. Run host lint, TypeScript, tests and production build. Report all remaining 501 integrations.

## Preservation boundaries

No API routes, backend modules, case contracts, database code/migrations, seed fixtures, credentials or provider files are modified by the UI port. Existing API methods/routes are preserved. `package.json` and PostCSS/Tailwind configuration are not replaced. Only the frontend route compositions, shared visual components/assets/styles, API-client-only code and lint exclusion for the handoff folder may change.

The design kit's MIT/Inter notices and official project-supplied ReLoop artwork permissions remain alongside copied assets. The mock avatar is not a real merchant identity and will be replaced by a neutral ReLoop demo identity or the existing user's authenticated profile; no fake person/activity is shown as real data.

## Baseline verification

- Handoff manifest SHA-256/byte-length comparison: 40/40 passed.
- Production baseline `npm run check`: blocked at ESLint because the untracked prototype handoff folder is recursively linted. Its `.cjs` packaging utilities and mock sample intentionally don't follow app lint rules. Fix by excluding the source package, not editing it.
- No production Supabase/model/STT credentials are assumed; live service verification depends on configuration.
