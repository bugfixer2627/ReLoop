# H14–H18 service and voice verification

This continues the report at ea36c13. Hosted database integration is explicitly
postponed at the user's request. No hosted write, migration, seed, reset, status
change, marketplace action or customer message was performed by this work.

During the task, teammates advanced origin/main to 1b7667c and origin/feat/backend
to cde5306. Latest main includes additional frontend refinements and overlapping
Person 3 backend handlers. Those updates were inspected but not merged into this
branch after database integration was postponed. The UI tested here is the
previously integrated main baseline plus the focused voice fixes listed below.
This task never pushed to main or force-pushed any branch.

## 1. Supabase diagnosis and fix

The local SUPABASE_URL contains the Data API suffix /rest/v1. The Supabase SDK
appends /rest/v1 itself, so the former client requested a duplicated path and
received HTTP 404/PGRST125. The previous probe incorrectly grouped this as an
unreachable connection. The backend and diagnostic script now normalize the
project URL to its origin, accepting only an origin or the exact Data API root;
arbitrary paths, credentials in URLs, query strings and insecure remote URLs
are rejected. Regression tests exercise the actual SDK URL construction.

VERIFIED LIVE: authenticated HTTP reads work. All twelve business tables are
readable. The service-role key is a matching, unexpired legacy JWT. The API and
pooler configuration refer to the same project. DNS resolves to IPv4, so this
is not an observed IPv6-only-host problem. No key, header or connection string
is printed in the probe or this report.

Direct PostgreSQL remains BLOCKED independently of HTTP: port 5432 accepts TCP
then closes during SSL negotiation before password authentication. Port 6543
accepts PostgreSQL SSL negotiation but certificate verification fails with
SELF_SIGNED_CERT_IN_CHAIN, including with the Windows system trust store.
No password-authentication conclusion can be drawn before TLS succeeds.
The optional DATABASE_SSL_CA_FILE setting accepts the project's CA certificate
downloaded from Supabase Database Settings. Certificate verification stays on;
there is no plaintext or rejectUnauthorized:false fallback. The PostgreSQL CLI
and probe share this configuration. They were not used to mutate hosted data.

## 2. Live database compatibility snapshot

The project is being changed concurrently by Person 3. The initial ledger
contained migrations 001/002. Later read-only checks observed:

- 202610310001_foundation.sql
- 202610310002_generate_product_sku.sql
- 202610310003_case_operations.sql
- 202611010004_case_clear_status.sql

Exposed RPC names were reloop_save_evidence_findings, reloop_save_revision,
reloop_review_artifact and reloop_upsert_task. These are Person 3's interfaces,
not the complete Person 2 RPC set used by this branch. Their signatures and
applied migration ledgers need reconciliation before hosted workflow testing.

The actual Next.js health, protected case-list and seeded-case read checks
initially passed, retrieving two evidence records and three listings. A later
live browser login failed because the database now contains case status clear.
Our frozen domain contract accepts open/investigating/pending_review/closed.
The case-list DTO validator therefore fails closed with DATABASE_UNAVAILABLE,
and the current login verifies access by calling that list. This is a contract
mismatch, not an invalid Supabase key or unreachable HTTP server. No status was
silently mapped or hidden. The probe reports this compatibility issue explicitly.
Do not extend the shared contract or replace Person 3's migrations without team
agreement. Ten rule rows were marked verified in the live metadata snapshot;
this work did not independently verify their official sources or applicability.

## 3. Organizer provider and real AI

The key came from https://api.tokenhubcloud.net/keys. It is valid for that
organizer service; the earlier OpenAI 401 resulted from using the wrong server.
Public documentation at https://api.tokenhubcloud.net/docs/guide/api-usage
identifies /v1/responses and /v1/chat/completions. Authenticated /v1/models
returned HTTP 200. Only this exact organizer domain was used with its key after
the provider was identified; unrelated TokenHub services were not tried.

Local configuration now explicitly uses:

```dotenv
LLM_PROVIDER=openai_compatible
LLM_BASE_URL=https://api.tokenhubcloud.net/v1
LLM_MODEL=gpt-5.6-luna
LLM_API_KEY=${OPENAI_API_KEY}
LLM_TIMEOUT_MS=60000
```

The secret remains in ignored .env.local. The alias avoids duplicating it.
The first account-listed gpt-6.1-sol/gpt-5.6-sol probes closed or timed out;
gpt-5.6-luna actually returned valid JSON with HTTP 200 and was selected on
that evidence. These observations do not prove the other models never work.
The model setting here belongs to the application, not the Codex agent model.

Confirmed provider compatibility fixes:

- Some responses wrap an entire JSON document in <escape>...</escape>. The
  parser removes only that exact full envelope, then parses and validates the
  entire result. It does not extract fragments from prose or repair invalid
  schemas. Rejection tests cover malformed envelopes and invalid structures.
- The old listing prompt included all three schemas; a real response returned
  all three outputs in one object and correctly failed validation. Each prompt
  now specifies only its target platform's flat output shape.
- Summary language and direct-to-customer English support tone are explicit.
- Extraction now sends only complaint text/locale and passes the validated
  result to summarization. It no longer sends irrelevant listing/rule context.
- Credential rejection maps to a sanitized configuration error. Provider timeouts
  remain bounded. Existing valid versions survive failures.

VERIFIED LIVE: two real-provider replays passed for Chinese and English merchant
inputs. Actual extraction, summary, English support, all three platform outputs,
Chinese/English revisions, schema validation, local immutable v1/v2/v3 history,
blocked approval, saved request-changes, QA task and audit reload were exercised.
The final run passed 2 tests in 246.65 seconds. The Chinese run needed retries
after transient analyze and repair failures; retry outcomes are saved in its
artifact. No static AI results were substituted.

These calls use the original synthetic fixture and an isolated real PGlite SQL
database. The test-only PostgREST transport is substituted; provider HTTP is
real. They are not two complete hosted browser demos. Generated artifacts and
earlier diagnostic response versions are preserved in ignored test-results/.

## 4. Speech provider result

BLOCKED: this organizer's public documentation lists chat/Responses/Messages,
and the account's model list contains no transcription model. A real request
with a locally synthesized English WAV to /v1/audio/transcriptions returned
HTTP 404 with no transcript. Chat compatibility does not imply audio support.
Chinese recognition and English recognition have not succeeded and are not
claimed. No different speech service was assumed to accept the organizer key.

To complete live speech, obtain the organizer's actual supported audio endpoint
and model, or configure a separate speech provider locally:

```dotenv
TRANSCRIPTION_PROVIDER=openai_compatible
TRANSCRIPTION_BASE_URL=<verified API base>
TRANSCRIPTION_MODEL=<supported transcription model>
TRANSCRIPTION_API_KEY=<that speech service's key>
```

The adapter currently requires audio/transcriptions with verbose_json containing
text and measured duration. A provider with a different response protocol needs
an explicit adapter, not fabricated duration. Standard OPENAI_API_KEY fallback
is supported for the official OpenAI endpoint; an explicit generation key is
not forwarded to an unrelated speech origin. The current organizer setup leaves
speech not_configured rather than falsely claiming readiness.

## 5. Focused frontend changes for Person 1 review

Only these frontend-owned files changed; visual styling and unrelated screens
were preserved:

- src/components/reloop-ui/VoiceInput.tsx: prevent duplicate permission requests,
  handle recorder errors, release microphone tracks/chunks, abort uploads on
  cancellation/unmount, ignore late transcripts, give transcript fields unique
  IDs, support available MP4/Ogg recorder fallback, and expose cancellation while
  transcribing. Existing typed text is preserved on every failure path.
- src/lib/frontend/api-client.ts: normalize MIME codec parameters, use matching
  upload extensions and forward AbortSignal.

Backend uploads verify bounded body size, declared MIME and file signatures.
WAV duration is checked before provider invocation; other formats require the
provider's measured duration. Bearer and cookie paths are tested. Cookie
mutations require same-origin Origin; explicit bearer CLI calls can omit it.
Raw audio is processed transiently and is not persisted by the app.

VERIFIED LOCALLY / MOCK-TESTED ONLY: four browser scenarios cover Chinese and
English, each in initial and revision inputs. They use actual browser
MediaRecorder with a fake audio device and substituted API/transcription
responses. Permission-denial simulation, cancellation without upload, recorder
track cleanup, failed-transcription typing preservation, transcript discard,
in-flight abort, editable preview, explicit confirmation and subsequent request
payloads all pass. These tests are not evidence of real speech recognition or
physical microphone permission behavior. Edge Chromium was available for
automation; a physical Chrome microphone remains a manual acceptance gate.

## 6. Completion classification

| Component | Classification | Boundary |
|---|---|---|
| Supabase HTTP authentication and table/seed reads | VERIFIED LIVE | Read-only; latest case-list schema drift blocks login |
| Direct PostgreSQL | BLOCKED | Pooler/TLS issues described above |
| Organizer AI generation and revisions | VERIFIED LIVE | Chinese/English, synthetic context, actual provider |
| Version/task/review/audit persistence | VERIFIED LOCALLY | Real embedded SQL; hosted writes postponed |
| Browser voice lifecycle and confirmation | VERIFIED LOCALLY | Fake microphone and mocked transcripts |
| Chinese and English speech recognition | BLOCKED | No working provider endpoint configured |
| Browser workflow submission wiring | MOCK-TESTED ONLY | Both voice contexts; no hosted writes |
| Full Workflow A/B on hosted services | BLOCKED | RPC/contracts integration intentionally postponed |
| Two complete hosted browser demos | BLOCKED | Two AI/local SQL replays are a different boundary |

## 7. Remaining H14–H18 and H18–H24 work

H14–H18 is not complete: reconcile Person 3's RPCs and clear status after the
agreed postponement; verify checked rule applicability; approve a specific
isolated hosted test database before writes; configure a real speech provider;
test physical Chinese/English microphone input in both contexts; and perform
the two complete browser demos. The feature branch remains unmerged into main.

Person 2 configuration/diagnostic/test tooling is prepared for H18–H24. Final
deployment still needs approval. Person 1 owns the poster, presentation and
three-minute demo; Person 3 owns final rule/source inventory and database
agreement. Repeat full repository verification and rehearsals before the team
authorizes feature freeze, final submission and hackathon-final tag. No tag or
public deployment is created by this task.

## 8. Windows preview and repeatable checks

Final validation: npm.cmd run check passed lint, type generation/TypeScript,
147 offline tests and production build. The default suite skips the two opt-in
live-provider tests; those passed separately against the organizer service.
Four browser voice scenarios passed with fake audio and mocked responses.
Earlier real protected API reads passed, but the final live browser login test
failed after Person 3's clear-status migration; that failure is documented,
not hidden or counted as a successful end-to-end run. Secret checks found no
real keys in tracked/untracked source; .env.local and test-results remain ignored.

Open the existing project in PowerShell:

```powershell
Set-Location -LiteralPath "C:\Users\Vladimir\Desktop\reloop AI"
npm.cmd run dev -- --port 3000
```

Open http://localhost:3000 in Chrome. Stop with Ctrl+C. The landing page works;
current workspace login depends on resolving the live clear-status contract
mismatch. Read the locally generated DEMO_ACCESS_TOKEN from .env.local privately;
never enter a provider/Supabase key into the login form or paste one into chat.
Do not overwrite the existing .env.local. Standalone scripts now use Next's
actual environment loader, including variable expansion and precedence.

```powershell
npm.cmd run check
node scripts/verify-services.mjs --providers
node scripts/test-live-reads.mjs
node scripts/test-live-ai.mjs
```

The third command intentionally fails if the live database contract drifts. The
fourth makes real, potentially billable generation calls but writes only local
embedded SQL. Normal npm test skips those two opt-in live tests. Browser scripts
require an installed Playwright module and local Chromium browser; they do not
install or change application dependencies.

Once a real speech provider is configured, use synthetic Chinese/English WAV
samples of at most 60 seconds and 10 MiB:

```powershell
node scripts/test-live-speech.mjs --zh="C:\samples\chinese.wav" --en="C:\samples\english.wav"
```

Inspect the saved transcript artifact. Then, in Chrome, select Chinese, record
an initial instruction, stop, edit the preview, confirm and submit. Repeat in
English and in the revision input for v2 and v3. Test denial, cancel and retry;
verify typed text is preserved. Do not mark this complete until real recognition
and the saved workflow are verified in the approved environment.
