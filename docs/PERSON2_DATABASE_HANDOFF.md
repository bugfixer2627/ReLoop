# Person 2 database and rules handoff for Person 3

Person 2 consumes the repositories and workflow RPCs; Person 3 owns the schema,
seed, sourced rule inventory and task implementation.

## Migration order

Apply migrations in filename order. `202610310003_workflow_writes.sql` is the
published artifact/revision/review/task RPC migration. The additive
`202610310004_workflow_revalidation.sql` only replaces `reloop_record_review`
to lock the artifact head and reject stale review versions. Do not recreate the
artifact or revision functions in a later migration with the same signature.

The local database test runs all migrations plus `supabase/seed.sql` in PGlite.
It verifies immutable versions, v1 → v2 → v3 history, RLS, append-only audit
rows, RPC writes and stale revision conflict handling.

## Required Person 3 follow-up

- Replace candidate rule records with official, dated, checked excerpts before
  claiming compliance. Until then, generated artifacts intentionally remain
  `needs_rule_verification`.
- Complete `/api/cases/:id/tasks` persistence and source-ID validation.
- Keep rule categories separate (`market_law`, `platform_rule`,
  `merchant_policy`) and preserve the case/version composite relationships.
- Verify hosted Supabase migrations with a dedicated synthetic project. No
  hosted database or live rules were tested in this branch.

Workflow writes are individually atomic. The three repair artifacts are written
one at a time, so a provider or database failure can leave a partial repair run;
the UI should reload the case and show which artifacts exist.
