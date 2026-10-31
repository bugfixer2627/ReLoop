# Person 3: persistence implementation boundary

`client.ts` is a server-only Supabase client. No database credential may be imported into a client component.

Implement repositories here against `supabase/migrations/202610310001_foundation.sql` and shared contracts. Convert snake_case database rows to camelCase API DTOs explicitly and validate them. SQL seed and `src/lib/fixtures/demo.ts` must describe the same product and original snapshots.

Before enabling write APIs, implement the shared demo-access gate described in `docs/ARCHITECTURE.md`. Browser clients must never receive the service-role key. All tables have RLS enabled and no anonymous/authenticated policies; only the trusted server/service role may access them.

Artifact identity and artifact version are separate. Revision creation must lock/check the current version and atomically insert the next version, revision event, findings and audit event. Return `CONFLICT` for stale `expectedVersion`; do not increment the head if generation/validation fails. Reviews target a version, never the entire artifact. Check the same case for every related record.
