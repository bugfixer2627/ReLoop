# Integration evidence

Captured 1 November 2026. Tokens, credentials and service hostnames are excluded.

| File | Evidence level |
|---|---|
| `live-http.json` | Real loopback HTTP against configured remote test DB; 4 tests passed / 3 failed. Case saved/reloaded; operation RPC deployment missing. No mocks |
| `database-probe.json` | Sanitized read-only transport/function/ledger diagnosis. No migration applied |
| `authenticated-browser.json` | Real bearer login, actual saved case and analysis-error recovery, platform views, Chinese toggle and mobile layout. No interception |
| `authenticated-case-desktop.png` | Actual saved synthetic case; original evidence/snapshots visible, no saved analysis findings |
| `authenticated-fix-desktop.png`, `authenticated-fix-mobile.png` | Actual authenticated case workspace with empty generated output; not evidence of working AI/review |
| `frontend-regressions.json` | Explicitly intercepted synthetic HTTP fixtures used only for frontend query/artifact/history/error behavior. Fixture artifacts never persisted; not backend integration evidence |
| `landing-before-desktop.png`, `landing-before-mobile.png` | Combined application before this task's animation polish |
| `landing-after-desktop.png`, `landing-after-mobile.png` | Actual production build after restrained animation polish; approved composition/copy/assets retained |
| `landing-motion-desktop.webm`, `landing-motion-mobile.webm` | Short recordings of real Chrome screencast frames, encoded to WebM with browser MediaRecorder; not AI-generated video |
| `landing-browser.json` | Public routes/focus, widths 320–1440, no-JS content, one finite artwork animation and reduced-motion checks; no captured browser errors |

Screenshots were taken only after actual authenticated API access succeeded. No synthetic HTTP fixture screenshot is presented as a live application result. The public preview remains explicitly labeled as conceptual with no live case data.

Visual verification preserves the current design. Motion: one 1.5s ambient opacity settle, one gentle 3.4s artwork settle, .8s preview entrance and button hover/press feedback; transform/opacity only for animations. Reduced motion sets animation:none and transitions to 0s. No infinite loop, new assets or backend dependency.

## Read the failures correctly

Health can report database reachable while operation endpoints fail: it reads the products table and does not establish that migration 003/RPCs are deployed. Real case persistence works after local configuration corrections, but findings/tasks/review do not. PGlite regression tests prove SQL semantics only. See `../INTEGRATION_VERIFICATION.md` for reproduction and next owner actions.

The ordinary local configuration still needs a demo access token; the temporary test token was not persisted. A local SDK URL correction was made in ignored `.env.local`; affected Node processes also require system CA trust. No TLS verification was disabled.
