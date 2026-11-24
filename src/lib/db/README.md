# Database setup and persistence

`client.ts` is a server-only Supabase client. No database credential may be imported into a client component.

## Demo database commands

- `npm run db:apply` applies migrations in filename order and records their names and checksums in `reloop_schema_migrations`. Add a new migration to change an existing schema. For an existing hosted project, confirm its migration history before applying anything.
- `npm run db:seed` loads the synthetic fixture. Existing records with matching seed IDs are preserved.
- `npm run db:reset` deletes synthetic case, artifact, task, and history records, then recreates the sample case. It preserves products, evidence, snapshots, and reviewed rules. Use it only with a dedicated demo database. The script refuses a reset when it finds non-synthetic products or cases.
- `npm run db:generate-seed` regenerates `supabase/seed.sql` from the canonical `src/lib/fixtures/demo.json`. When evidence or snapshots change, assign new IDs and versions to preserve their history.

## Repository boundaries

Repositories map snake_case database rows to camelCase DTOs and validate them against the shared contracts. Database tables use RLS, and the trusted server makes application queries with the service role. See [architecture](../../../docs/ARCHITECTURE.md) for the access boundary.

Artifact identity and artifact version are separate. Revision creation must lock/check the current version and atomically insert the next version, revision event, findings and audit event. Return `CONFLICT` for stale `expectedVersion`; do not increment the head if generation/validation fails. Reviews target a version, never the entire artifact. Check the same case for every related record.
