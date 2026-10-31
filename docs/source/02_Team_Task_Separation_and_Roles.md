  # ReLoop AI — Three-Human Team Task Separation & Role Playbook (v2.0)

**Competition:** AI+出海 · **Team:** 3 humans · **Build:** 24 hours · **Repository:** one shared private GitHub repository `reloop-ai`  
**Companion specification:** [`01_ReLoop_Updated_Proposal.md`](./01_ReLoop_Updated_Proposal.md)  
**Principle:** AI assistants are tools; **humans own outcomes, code, source accuracy, and demonstrations**. Do not equate human developer roles with the four business roles the app supports.

## 1. Three developers — exact responsibility boundaries

| Person | Human job title | Suggested assistants (non-exclusive) | Owns | Not responsible for |
|---|---|---|---|---|
| **Person 1 (you)** | **Product, Frontend & Demo Lead** | ChatGPT + Cursor (Claude/Codex as useful) | Clear user flows, accessible Chinese/English UI, all three platform tabs, customer/revision/approval interactions, screenshot-ready visual design, 3-minute pitch and poster | Designing server AI prompts or changing DB contracts without review | Microphone button, recording states, transcription preview, Chinese/English language selector, user confirmation |
| **Person 2** | **AI Backend & Integration Lead** | Claude/Codex in Cursor | Runnable project foundation, shared API/Zod contracts, server-side AI adapter, extraction, generation, revisions, health/error handling, integration/deployment | Independently declaring compliance rules valid without Person 3 | Speech-to-text implementation, transcription endpoint, audio validation, language processing, API errors | 
| **Person 3** | **Data, Rules & QA Lead** | Gemini + Cursor + official documentation | Supabase schema, demo seed/reset, product evidence, US/EU law and Alibaba/Amazon platform source inventory, deterministic checks, approval/audit persistence, acceptance tests, README and dependency/source manifests | Redesigning frontend screens or inventing unverified rules | Permission testing, Chinese/English accuracy tests, recording/privacy safeguards, fallback verification |

**App-level business roles (four):** `Customer Support` drafts the buyer reply; `Marketing/Marketplace Operations` reviews three listing corrections; `Quality Assurance` investigates unverified product performance; `Compliance Reviewer` examines sourced rule findings. These are visible **outputs/task/approval roles**, not separate authentication accounts during the hackathon.

**Non-negotiable priority:** Chinese + English fully working. German and Arabic only become selectable as `ready` after actual passing tests; German before Arabic. **All three platform adapters exist even when German/Arabic are beta**.

## 2. Person 1 — Product / Frontend / Demo Lead

**Owned areas:** `src/app/(dashboard)/**`, `src/components/**`, `src/styles/**`, `docs/demo-script.md`, slides, poster, screenshot assets. Avoid direct edits inside `src/app/api`, `supabase`, or `src/lib/rules`.

### Build

- [ ] Three routes/screens: **Global Feedback Inbox**, **Claim Investigation**, **Fix & Approve**.
- [ ] Chinese and English merchant commands and UI text; Chinese must never render as mojibake/placeholder.
- [ ] Functional case creation and saved case reload; source/channel choice and SKU selector.
- [ ] Evidence trace UI: product source, 12h listing claims on **three channels**, 4h internal maximum, customer 2h unverified report; show comparability/test conditions.
- [ ] **Platform tabs:** Shopify US B2C product/support; Amazon DE title/bullet/description or labeled reviewer brief; Alibaba International English B2B specs/MOQ/lead time.
- [ ] **Language priority UI:** 中文 and English fully selectable; Deutsch/العربية visible only as honest `beta`/`unavailable` if not tested. Arabic output uses RTL when enabled.
- [ ] Two visible feedback mechanisms: severity badges and highlighted before/after text spans with reason and source link.
- [ ] Chinese/English conversational revision field, actual API call, `v1 → v2 → v3` history, clear revalidation indicator.
- [ ] Role output panels: Support reply, Marketing proposals, QA task, Compliance findings/review.
- [ ] Real Review buttons (`approve`, `changes_requested`) with persistent state; never display a Send/Publish button implying a live integration.
- [ ] Loading, empty case, missing rule/evidence, API failure, retry, and saved-last-good-state UI.
- [ ] Rehearse a **3-minute demo** with one Chinese command, two typed revisions and three distinct channel outputs. Deliver poster dimensions 0.8 m × 1.8 m.

### Definition of done

A teammate who hasn't seen the code can move from an imported ticket to the two complete workflows without opening a terminal; all buttons invoke working endpoints and refresh shows previously saved state. Chinese and English **both** work; platform-specific formatting is visible.

### Best use of AI assistants

Generate UI components and test cases in small, non-overlapping units; ask AI to compare every page against the acceptance criteria. **You** check that UI badges do not overclaim beta languages or legal compliance.

## 3. Person 2 — AI Backend & Integration Lead

**Owned areas:** project scaffold before branching; `src/app/api/**`, `src/lib/ai/**`, `src/lib/contracts/**`, `src/lib/workflows/**`, deployment settings with no exposed keys.

### Build

- [ ] Start Next.js TypeScript Tailwind; confirm `npm run dev` and build pass; commit runnable foundation to `main`.
- [ ] By Hour 2, freeze shared Zod schemas for case, market/platform, language capability, artifacts, findings, roles, review states, and typed errors.
- [ ] Server-side AI provider interface; model access via `.env.local` / deployment secret only; provider SDK selection can change without frontend schema changes.
- [ ] Real DB reads via Person 3's repository layer and real model calls (not static responses presented as AI).
- [ ] Language-safe extraction of Chinese and English user instructions and English/German customer/listing text; structured JSON validated by Zod.
- [ ] Generate Chinese merchant diagnosis, English Shopify support reply, **three distinct output schemas** for the three platform adapters.
- [ ] Amazon German generator behind capability toggle; if unavailable produce correctly labeled **English internal reviewer brief**. Arabic UAE-oriented B2B reply behind separate toggle, not required for demo success.
- [ ] `POST /api/artifacts/:id/revise`: accepts Chinese or English follow-up, persists next version, reruns applicable checks, never edits old versions in place.
- [ ] Normalize source IDs and include `languageStatus`, `locale`, `platform`, `segment`, `reviewState` in every response.
- [ ] Predictable errors: invalid request, unknown SKU, rate limit, model timeout, invalid LLM JSON, missing rule source; preserve last successful artifact.
- [ ] Work with Person 3 to ensure deterministic claim/rule checks are code/rule data, not solely model opinions.

### Definition of done

Two real workflows share the same `caseId`; Chinese/English input is accepted and produces usable output; three platform-specific drafts exist; two revisions are persisted with validation; no failure produces fake approval or “fully compliant” output.

### Best use of AI assistants

Have Claude/Codex generate one endpoint at a time against fixed Zod schemas and run unit tests. Use another model for code review, not uncontrolled parallel edits to the same folder.

## 4. Person 3 — Data, Compliance & QA Lead

**Owned areas:** `supabase/**`, `src/lib/db/**`, `src/lib/rules/**`, `tests/**`, `docs/rule-sources.md`, `docs/test-results.md`, `README.md`, `.env.example`, third-party manifest.

### Build

- [ ] Supabase schema for SKU, evidence, three platform listing snapshots, case, rule, artifact version, finding, task, approval and audit events.
- [ ] Seed/reset **one synthetic merchant, one SKU, three platform listings, 6–8 feedback samples**. Label as fictional; store actual rule-source URLs separately.
- [ ] Evidence check: comparable numeric claims under comparable conditions; `documented_mismatch` vs `needs_evidence` vs `unverified_observation`.
- [ ] **Country-law check:** US FTC ad claim substantiation for Shopify US; EU UCPD misleading commercial practices for German B2C where applicable; avoid applying EU B2C law automatically to Alibaba's B2B context.
- [ ] **Platform-rule check:** Alibaba International membership/service rule text on accurate product information and avoiding misleading promotion, with current applicability verification. Amazon DE platform specifics must be marked `needs_rule_verification` until official applicable excerpt is accessible (e.g. organizer help center).
- [ ] Rule records with `category`, `platform`, `market`, `segment`, source URL, excerpt, reviewed date, version applicability, and verification state. Unverified rule must never be treated as a confirmed violation.
- [ ] Keep **evidence**, **market-law**, and **platform-rule** findings as separate typed categories; only last two count as distinct organizer validation categories.
- [ ] Real persisted review decisions, QA and Compliance tasks, version history, and event timestamps.
- [ ] Automated acceptance tests for Chinese/English, three platform adapters, role outputs, rule provenance, v1/v2/v3, missing source, LLM error behavior, and seed/reset repeatability.
- [ ] README: installation, env variables without secrets, seed/reset, demo script, endpoint list, rule scope caveats and known limitations.

### Definition of done

Every finding has actual stored source IDs and a defensible rule applicability; unsupported source claims are flagged rather than “passed”; any teammate can run the same demo twice from a reset.

### Best use of AI assistants

Use Gemini for independent source research and edge-case generation. **Human must open and verify** official regulations and platform rule scope—AI citation lists alone are not sufficient.

## 5. Shared contracts before independent coding

**Person 2 owns the implementation of contracts; Person 3 approves data/rule semantics; Person 1 approves frontend usability and response shape. Freeze by H2.**

### Must-agree enums

```ts
type Platform = 'shopify_us' | 'amazon_de' | 'alibaba_intl';
type Locale = 'zh-CN' | 'en-US' | 'de-DE' | 'ar-AE';
type LanguageStatus = 'ready' | 'beta' | 'unavailable';
type BusinessRole = 'support' | 'marketing' | 'qa' | 'compliance';
type FindingCategory = 'evidence' | 'market_law' | 'platform_rule';
type Severity = 'info' | 'warning' | 'blocker';
type EvidenceStatus = 'documented_mismatch' | 'needs_evidence' | 'unverified_observation' | 'supported';
type ReviewStatus = 'draft' | 'pending_review' | 'approved' | 'changes_requested' | 'blocked';
```

### Shared API baseline

| Endpoint | Input → result | Owner |
|---|---|---|
| `GET /api/health` | Public health, DB/model readiness without secrets | P2 |
| `POST /api/cases` | Input `{sku,channel,feedbackText,merchantInstruction,merchantLocale}` → `{caseId}` | P2/P3 |
| `GET /api/cases/:id` | Case, evidence, three listings, artifacts, findings, tasks/audit | P2/P3 |
| `POST /api/cases/:id/analyze` | Real retrieval + parsed findings + Chinese/English summary | P2/P3 |
| `POST /api/cases/:id/support` | English Shopify reply draft v1 | P2 |
| `POST /api/cases/:id/repair` | 3 platform-specific drafts + source-linked rule checks | P2/P3 |
| `POST /api/artifacts/:id/revise` | Follow-up text + input locale → persisted next version + revalidation | P2/P3 |
| `POST /api/artifacts/:id/review` | `{decision, reviewerRole, comment}` → saved decision/event | P2/P3 |
| `POST /api/cases/:id/tasks` | QA/compliance task create/update | P3/P2 |

### Shared response example (illustrative; schema freeze governs)

```json
{
  "data": {
    "caseId": "case-demo-001",
    "artifacts": [
      {
        "id": "a-alibaba-001",
        "kind": "listing_repair",
        "platform": "alibaba_intl",
        "market": "global_b2b",
        "locale": "en-US",
        "languageStatus": "ready",
        "version": 1,
        "reviewStatus": "pending_review",
        "fields": { "title": "...", "specification": "...", "moq": "as documented" },
        "sourceIds": ["SPEC-001", "LIST-ALI-001"]
      }
    ]
  },
  "findings": [
    {
      "category": "platform_rule",
      "ruleId": "PLAT-ALI-001",
      "sourceIds": ["SPEC-001", "PLAT-ALI-001"],
      "severity": "warning",
      "ruleVerified": true,
      "explanation": "Published claim appears inconsistent with documented product evidence."
    }
  ],
  "error": null
}
```

**API quality rules:** Validate LLM JSON; never hardcode a “success” response to simulate a model call; never invent data field values; don't expose keys; no duplicate case stores or inconsistent enum strings.

## 6. Cursor + GitHub team workflow

1. Create **one private GitHub repo**, invite the other two teammates. Add the three Markdown files under `/docs`.
2. In **Cursor Planning**, read the three documents and agree on the contracts. This is a **shared, non-person-specific planning stage**.
3. P2 scaffolds minimal runnable Next.js project and contracts on `main`; P1/P3 review. `main` must run before branching.
4. Branch from `main`: `feat/frontend`, `feat/ai-api`, `feat/data-rules`. Each human owns files defined above.
5. Each developer can use Cursor Agent locally for their own assigned subtask. **Multitask** only for isolated worktrees/tasks after contracts are frozen. Cloud runs are optional, not required.
6. Merge small PRs at H6/H10/H14; one human integration coordinator (P2 suggested) approves changes after build/tests. **Never commit `.env.local`, API keys, secrets, real customer data.**
7. At H18 freeze features; final tag after verification: `hackathon-final`.

**Conflict protocol:** If one task requires changing another person's owned module, open an issue/PR or get a quick agreement. **Don't have three AI agents independently rewrite the same shared files**.

## 7. 24-hour handoff gates

| Time | P1 — Product/UI | P2 — AI/backend | P3 — Data/rules/QA | Required gate |
|---|---|---|---|---|
| **H0–H2** | Screen flow and Chinese/English labels; review APIs | Repo scaffold + Zod/API contracts | DB schema + sourced rule inventory | One runnable `main`; contracts signed off |
| **H2–H6** | Feedback Inbox + Claim Investigation with live GET | Case/analyze/support endpoints | DB seeded, evidence comparison | Chinese/English case works and persists |
| **H6–H10** | 3 platform tabs + diff/risk panels | Three platform adapters + repair route | FTC/EU/Alibaba checks; rule provenance | Three distinct output structures appear |
| **H10–H14** | Chat revisions and review UI; status handling | v1→v2→v3; retry/errors; approval routes | Persist revisions/reviews/tasks; tests | Both workflows, 2 checks, 2 feedback modes complete |
| **H14–H18** | UX polish + rehearsal/backup | Deploy, integrate, debug | Run failing/negative tests + reset | Feature freeze, 2 repeatable demos |
| **H18–H24** | Slides, 0.8×1.8m poster, pitch | Stable deployment, config export | README, tests, dependency manifest, source list | Repo tag and submission package ready |

**Ten-minute sync at H2/H6/H10/H14/H18:** each person provides one visible result, one test or URL, blockers, and next expected output.

## 8. Who resolves disputes?

| Decision | Final accountable person | Must consult |
|---|---|---|
| Features / scope / language priorities / demo | P1 | P2 (engineering), P3 (validation) |
| API schema, models, integration, branching | P2 | P1 (frontend), P3 (data) |
| Rule sources, evidence status, legal/platform wording | P3 | P2 (implementation), P1 (presentation) |
| Release / merge freeze | All 3; P2 runs final checks | All |

If a verified official Amazon DE rule is missing, **do not fabricate it**. Keep Amazon output as review-needed and use source-backed Alibaba platform rule plus US/EU market law to satisfy the organizer's two validation categories.

## 9. Final shared acceptance checklist

- [ ] Mandarin and English input/output **both** pass real tests.
- [ ] German and Arabic correctly marked beta/unavailable unless tested; German prioritized before Arabic.
- [ ] Shopify US, Amazon DE and Alibaba International have separate stored snapshots, adapters and reviewable draft cards.
- [ ] Alibaba result uses **B2B** fields and doesn't invent MOQ, prices or certifications.
- [ ] Both workflows operate on the **same** persistent `caseId`.
- [ ] `evidence`, `market_law` and `platform_rule` categories are visibly distinct; law/platform sources and scopes shown.
- [ ] Risk badges and text-level annotations/diffs both work.
- [ ] Two typed conversational revisions produce v1/v2/v3 and rerun checks, persisted after reload.
- [ ] Support, Marketing, QA and Compliance responsibilities are present as actual tasks or review outputs, not decorative agent labels.
- [ ] No calls claim unsupported safety, efficacy, certification, legal approval or automatic publication.
- [ ] Unknown SKU/missing source/provider error leaves case recoverable and last good output intact.
- [ ] Two full demos run after seed reset; README, poster, pitch, config/dependency manifest and `hackathon-final` tag prepared.

## 10. Emergency scope order

**Cut first:** Arabic → German natural-language generation if unstable (preserve Amazon DE context and reviewer brief) → visual animations/analytics → optional buyer outreach → automatic extraction of SKU from messy input.  
**Do not cut:** Chinese/English guaranteed paths; three platform contexts; two genuine workflows; two qualifying check categories; two feedback formats; two revisions; real DB + LLM; persistent review/task handling; safe errors.

---

**Source note:** Minimum competition requirements are taken from the organizer's Chinese brief and three judging rubrics shared in the project. External law/platform sources and applicability are summarized in the updated proposal; P3 must verify exact rule excerpts and dates before claiming a platform violation.
