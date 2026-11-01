# Person 2 database and rules handoff for Person 3

Latest: hosted integration is postponed by the user. No hosted mutations were
performed. The HTTP connection failure is fixed by normalizing SUPABASE_URL
when /rest/v1 was copied. Read-only probes now authenticate and read all tables.
During this work P3's case_operations and case_clear_status migrations appeared
in the live ledger. New status clear is incompatible with the frozen case DTO
and blocks the case list/login. Do not silently map this state or replace RPCs;
agree the contract after integration resumes. Direct PostgreSQL also needs the
correct pooler route and verified CA certificate. See the latest service report.

Person 2 consumes the repositories and workflow RPCs; Person 3 owns the schema,
seed, sourced rule inventory and task implementation.

## Migration order

Apply migrations in filename order. `202610310003_workflow_writes.sql` is the
published artifact/revision/review/task RPC migration. The additive
`202610310004_workflow_revalidation.sql` only replaces `reloop_record_review`
to lock the artifact head and reject stale review versions. Do not recreate the
artifact or revision functions in a later migration with the same signature.

The local database test runs all migrations plus `supabase/seed.sql` in PGlite.
The additive `202611010005_workflow_review_fix.sql` fixes an ambiguous column
in the Person 2 review RPC and enforces reviewer/approval checks in its locked
transaction. Published 003/004 remain unchanged. Do not apply this to a hosted
database until its owner approves the exact environment and migration history.
Additive 202611010006_workflow_write_audit.sql serializes initial allocation
using a case lock and writes generation/revision audit events transactionally.
It changes only Person 2 RPCs and preserves all published migration files.
It verifies immutable versions, v1 → v2 → v3 history, RLS, append-only audit
rows, RPC writes and stale revision conflict handling.

## Required Person 3 follow-up

- Replace candidate rule records with official, dated, checked excerpts before
  claiming compliance. Until then, generated artifacts intentionally remain
  `needs_rule_verification`.
- Task persistence and route-level source-ID validation already exist here and pass SQL-backed API tests. The earlier handoff incorrectly described them as missing. Reconcile the alternate task RPC signatures before merging feat/backend.
- Keep rule categories separate (`market_law`, `platform_rule`,
  `merchant_policy`) and preserve the case/version composite relationships.
- Verify hosted Supabase migrations with a dedicated synthetic project. No
  hosted database or live rules were tested in this branch.

Workflow writes are individually atomic. The three repair artifacts are written
one at a time, so a provider or database failure can leave a partial repair run;
the UI should reload the case and show which artifacts exist.
