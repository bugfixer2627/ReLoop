# Current workflow verification — 1 November 2026

This report supersedes the older reports' migration-blocked/501 workflow conclusions. Verification used main `fa11c5c` plus the local changes described here. These changes have not been committed or pushed by this task.

## Database alignment and local setup

The provided Supabase CA certificate was copied to ignored `supabase/certs/prod-ca-2021.crt`; ignored `.env.local` sets `DATABASE_SSL_CA_FILE` to its absolute path. PostgreSQL connected with certificate validation enabled. No TLS verification was disabled.

The existing transactional migration runner successfully applied:

- `202610310003_workflow_writes.sql`
- `202610310004_workflow_revalidation.sql`
- `202611010005_workflow_review_fix.sql`
- `202611010006_workflow_write_audit.sql`

Existing case operations and the clear-status migration remain applied. The two task overloads have different argument names; the merged AI code uses the eight-argument RPC. No reset, reseed, record deletion, or rewriting of applied migrations occurred.

`npm start` now loads project environment settings before launching Next.js, enabling configured Node environment-proxy support. The test server ran on loopback port 3011; the existing dev server on 3000 was left alone. Certificate/provider secrets were not added to tracked files.

## Real provider and hosted database HTTP checks

No mocked provider output or database transport was used in these checks. Requests authenticated with the generated Supabase Auth account through `/api/auth/login` and its HttpOnly cookie. The service-role key stayed server-side. The app used the configured organizer chat gateway.

The first persisted run, `11af2e75-7fa7-4377-80d6-177c4aef1bfe`, saved support and three listing drafts, two support revisions, a request-changes decision and a QA task. Analysis at that point saved only deterministic findings. This exposed an integration gap: the existing AI summary workflow was never called by the analyze route.

The analyze route now saves those evidence findings and invokes the existing AI extraction/summary workflow. The complete replay used case `649344d4-fcc4-4d5b-8e31-a7165988c26c`, product `RL-LAMP-01`, English synthetic feedback and Chinese merchant instruction:

- Email/password login 200; case creation 201.
- Analyze 200 with one saved Chinese investigation-summary artifact.
- Support 200 with an English customer reply.
- Repair 200 with three distinct formats: Shopify description, Amazon English internal brief, and Alibaba B2B draft. German publication readiness is not claimed.
- Fresh bundle reload contained all five artifacts and their first versions.
- Support revisions with Chinese then English instructions saved v2 and v3; Shopify listing revisions also saved v2 and v3.
- Stale revision returned 409 and preserved current history.
- Approval returned 422 while checks were unresolved. Support request-changes and marketing rejection each returned 200 and persisted. No live draft was manually promoted to checked to manufacture approval success.
- QA task creation and update to done returned 200.
- Repeating analyze/support/repair returned 200 without additional artifacts or versions. Original version content was unchanged.
- Final reload: 5 artifacts, 9 versions, 4 revision events, 1 task (done), and 13 audit entries.

Both synthetic cases and their histories remain in the dedicated Supabase demo project. These are API workflow replays, not browser click-throughs or complete competition rehearsals. The new Inbox translation controls still require browser interaction verification. Positive approval of legitimately checked live content remains unverified; outstanding rule evaluations must be resolved first.

## Translation and speech are separate

The new authenticated `/api/translate` text endpoint uses the chat provider. Real English-to-Chinese and Chinese-to-English requests both returned 200. Input meaning, numerical runtime and the instruction not to promise refunds were preserved in the inspected examples. Only English and Chinese are accepted. Inbox shows a separate reference preview; original case inputs remain unchanged and the preview is not persisted.

The independent `/api/transcribe` endpoint was tested with a structurally valid one-second synthetic silence WAV and the signed session cookie. It returned 503 NOT_CONFIGURED and no transcript. This checks configuration handling, not recognition quality. A verified speech endpoint, model and credential are still required. No real English/Chinese speech recognition or physical microphone test passed in this task.

## Automated verification

The default check passed lint, TypeScript, 195 tests and production build; 9 opt-in live tests were skipped at that checkpoint. Afterward the legacy live HTTP suite was updated to expect persisted summaries/drafts/revisions instead of 501, to require `RELOOP_INTEGRATION_AI=1` for billable provider calls, and to reject mislabeled audio with 415. The updated opt-in suite then passed all 8 tests against the real application, hosted Supabase and organizer model in 165.78 seconds. Its sanitized report is ignored at `.local-reviews/integration-evidence/live-http.json`. Its explicit URL/token/write/AI opt-ins remain mandatory; it does not apply migrations or reset data. It retains one additional synthetic case and task, whose IDs are in that report. The live suite uses trusted bearer API authentication; the separate manual replays above used email/password cookie authentication.

`npm run smoke` passed all ten public/protected page responses, API access checks and health against the isolated production server. The temporary port-3011 server was stopped after testing; the existing port-3000 dev server was not stopped.

Final `npm run check`: lint, type generation/TypeScript, 195 tests and production build passed; 10 opt-in live tests skipped in the default run. The 8-test hosted suite passed separately as described above.

The SQL suite now includes both branch migration families and the clear-status migration. Connected local-SQL tests cover five initial artifacts, immutable v1/v2/v3, review blocks, stale versions, failed-provider recovery and task/audit persistence. Provider HTTP is mocked only in these local tests. Translation tests cover both directions, unsupported/identical locales, blank/oversized text, unauthorized/foreign origins, unavailable providers, timeouts and invalid output.

The service-readiness probe now recognizes `clear`; its older status list incorrectly reported healthy persisted cases as incompatible. Historical service reports are preserved as historical evidence, not current readiness.
