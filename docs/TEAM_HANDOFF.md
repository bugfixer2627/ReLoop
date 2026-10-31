# Three-person handoff

This main commit is the shared foundation milestone. The roles split **after** it. Do not merge `TEST_REFERENCE_OR_IGNORE` as a shortcut; it is reference only.

## Ownership

| Human | Owns after branching | First concrete result |
|---|---|---|
| Person 1 — user: product/frontend/demo | `src/app/(dashboard)/**`, root layout/CSS/error/loading pages, `src/components/**`, demo script, poster/slides | Real Inbox → Investigation → Fix & Approve navigation using contract mocks, then APIs; voice recording/editable transcript UX |
| Person 2 — AI/backend/integration | `src/app/api/**`, `src/lib/ai/**`, `src/lib/workflows/**`, `src/lib/server/**`, shared contracts/config by coordination, deployment | Access gate, real case/analyze/support paths, one model adapter, speech adapter; both reply and listing revisions |
| Person 3 — data/rules/QA | `supabase/**`, `scripts/database.mjs`, seed generation/fixture, `src/lib/db/**`, `src/lib/rules/**`, `tests/**`, source verification, README/manifests | Configure demo Supabase, apply/seed, row-to-DTO repositories and transactional writes, comparable evidence and verified law/platform checks |

Person 2 coordinates changes to `package.json`, lockfile, tooling, API/Zod contracts and CI. Person 3 approves data/rule semantics; Person 1 approves UI response usability. Do not independently rewrite each other's files. The fixture and generated SQL must change together.

## Branch from the verified foundation

The foundation task leaves main as the shared baseline. Each person creates **their own** branch only when work is assigned:

```sh
git switch main
git pull --ff-only origin main
git switch -c codex/frontend
```

Use `codex/ai-api` for Person 2 and `codex/data-rules` for Person 3. These names follow the workspace's branch prefix; they correspond to the three feature branches described in the original team playbook. Do not create all three branches in one person's active working tree or run concurrent agents against the same files.

## Fixed contracts

Read `DECISIONS.md`, `API_CONTRACT.md`, `ARCHITECTURE.md`, then `src/lib/contracts`. All DTOs use camelCase. Database uses snake_case. A case is saved before AI runs. Four logical output artifacts: support reply + Shopify correction + Amazon correction/brief + Alibaba correction. Each is independently revisable. The same case context drives both workflows.

For the demo, show **two real edits on support and two on at least one listing**. All edits must persist and revalidate; no fake version counter. Approval targets the exact current version. QA and compliance are work outputs/tasks, not four account systems.

Person 1 can use `tests/fixtures/generation.ts` with a visible contract-mock label until live routes exist. Do not import that mock into a server route or quietly show it as live output. Main's original-input preview intentionally has no generated drafts, reviews or audit history.

## Integration gates

1. **Next integration:** P2/P3 enable authenticated case create/get and real database reads; P1 swaps fixture read for typed API fetching with loading/error states. Confirm after-refresh persistence.
2. **Core AI:** P2 connects a real model; P3 supplies evidence checks/policy retrieval. Chinese and English both work. Preserve unverified customer testimony.
3. **Repair/checks:** three different schemas over three stored snapshots. Source-checked market-law and platform findings; no false pass on unverified Amazon rule.
4. **Revisions/review:** both support and listing histories reach v3; atomic saved revisions, fresh findings, version-bound review, QA task and audit survive reload.
5. **Voice P0:** Chinese/English input and follow-up recordings become editable confirmed text. Test deny/cancel/unsupported/failure paths with typing fallback and no raw audio storage.
6. **Feature freeze:** two complete runs after reset, negative tests, deployment and measured timings. Then final competition artifacts and final tag.

Every PR: describe observed behavior, run lint/typecheck/tests/build, coordinate schema changes, and keep main runnable. Update actual acceptance status only after verification. No `.env.local`, keys, real customer data, or unverified compliance claims in commits.

## Services still needed

The foundation does not require credentials to preview or test locally. Feature owners need a dedicated Supabase project, one usable model API, a Chinese/English transcription API or tested browser implementation, current applicable official rule text, and a demo hosting target. Add credentials through `.env.local`/hosting secrets only.
