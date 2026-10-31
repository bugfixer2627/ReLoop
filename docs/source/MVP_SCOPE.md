# ReLoop AI — MVP Scope Freeze

**Project:** ReLoop AI — Claim-to-Action / 跨境商品承诺核验与智能纠错协同平台  
**Competition:** AI + 出海  
**Team:** 3 human developers using Cursor + GitHub  
**Build window:** 24 hours  
**Status:** Implementation scope, **not** a claim that features are already working  
**Decision:** Freeze this MVP before implementation. Only change scope when all three team members agree.

## 1. What we are building

**One customer signal → evidence-backed investigation → localized support draft → three platform-specific listing correction drafts → compliance/rule feedback → two conversational revisions → human review.**

Target user: a Chinese small/medium exporter managing authorized product listings across **Shopify US, Amazon Germany, and Alibaba International Station (阿里巴巴国际站)**.

Core problem: the same unsupported product-performance claim can spread across markets while customer service, marketplace operations, and quality assurance work separately.

**MVP proof:** One complaint about a rechargeable lamp leads to a traceable finding and three distinct reviewable corrections linked to **one saved case**. We do **not** claim that a complaint proves a manufacturing defect or that the system certifies legal compliance.

## 2. Frozen scope and priorities

| Dimension | P0 — must work in live demo | P1 — after P0 is stable | P2 — stretch only |
|---|---|---|---|
| Languages | **Chinese input/output** (merchant interface, reports, revision prompts); **English input/output** (merchant instructions, customer reply, Shopify and Alibaba content) | German (`de-DE`) localized Amazon listing correction, fully tested | Arabic (`ar-AE`) localized B2B reply with RTL support |
| Platforms | **Shopify US, Amazon Germany, Alibaba International** each show stored listing snapshot, separate output structure, findings/status, and approval workflow | Improve German copy and platform formatting | Live marketplace integration |
| Workflows | Customer Resolution; Cross-Platform Listing Repair & QA; both share one persisted `caseId` | More role-specific refinements | Extra workflows |
| Validation | **Country/market advertising-law** check AND **platform/channel-rule** check using identified, checked sources; factual evidence comparison supports both | Broader sourced rule coverage | Automated legal sign-off |
| Feedback | Risk labels AND highlighted before/after annotations | Enhanced source navigation | Optional voice feedback |
| Input methods | Text input AND working microphone voice input (Chinese and English)
| Conversation | **Two user-driven revision rounds**, yielding saved artifact versions `v1 → v2 → v3`; rerun checks after each change | Additional turns | Autonomous negotiation |

**Language order:** Chinese → English → German → Arabic. Chinese and English are guaranteed development targets and must pass acceptance tests. German is a prioritized best-effort enhancement, Arabic optional. If German is not tested, Amazon Germany must show a clearly labeled **English internal correction brief**; never label it German or publication-ready. Three platform contexts must remain visible even if an optional language is unavailable.

**Voice Input: REQUIRED FOR OUR MVP (P0).**

The application must support microphone-based voice input in Chinese
(zh-CN) and English (en-US).

Voice recordings must be transcribed into editable text and displayed
to the user for confirmation before submission.

Voice input must work for:
1. Initial merchant instructions.
2. Conversational revision instructions.

The user must always be able to switch to typing.

Voice input is a self-imposed project requirement, not a mandatory
competition requirement.

## 3. The two required connected workflows

### Workflow A — Feedback → Customer Resolution

1. Merchant enters a **Chinese or English** instruction, selects `RL-LAMP-01`, and pastes an English customer complaint.
2. Create/save `caseId`; retrieve product evidence, support policy and listing snapshots from the real database.
3. Invoke the configured LLM to extract the complaint, implicated claim, language and uncertainty; schema-validate the result.
4. Compare claims to documented specification **only when conditions are comparable**. Present an evidence-linked Chinese investigation summary and risk indicators.
5. Generate an **English Shopify US support reply draft**. Never promise an unauthorized refund or claim a defect is proven.
6. Save draft `v1` for review and revision.

### Workflow B — Same Case → Three-Platform Repair & QA

1. Open the **same `caseId`** and read three stored listing snapshots.
2. Show the original claim and cited product evidence side-by-side.
3. Generate distinct correction drafts:
   - **Shopify US (B2C):** English consumer-facing product description/FAQ correction.
   - **Amazon Germany (B2C):** Structured title, bullets and description in German **if tested**; otherwise labeled English internal reviewer brief.
   - **Alibaba International (B2B):** English wholesale listing with verified specs, MOQ/lead time **only if present** in the database.
4. Run country-law and platform-rule checks; display **risk labels** and **annotated before/after** differences with source IDs and rule applicability.
5. Accept **two typed Chinese or English conversational instructions**, save `v2` and `v3`, and rerun validation. Each version must survive refresh.
6. Create a QA investigation task; require a visible **human approve / request changes / reject** action, and persist an audit event. Approval means **approved draft**, not published content.

**Important:** The two workflows cannot be independent chat demos. Their inputs, findings, drafts, revision events and tasks must share a persisted case and evidence records.

## 4. One repeatable demo fixture

Use visibly labeled **synthetic merchant/customer data**. Do not imply that the fictional buyer, manufacturer or test results are real.

| Item | Demo fixture |
|---|---|
| Product/SKU | Rechargeable desk lamp, `RL-LAMP-01` |
| Merchant | Fictional Ningbo exporter |
| Evidence record | `SPEC-001`: **maximum 4 h runtime**, with stated test conditions; if test conditions missing, flag `needs_evidence` |
| Shopify US listing | “Up to 12 hours battery life” |
| Amazon Germany listing | “Bis zu 12 Stunden Akkulaufzeit” |
| Alibaba International listing | “12h runtime” in B2B product information |
| Customer complaint | “My lamp works for only about 2 hours.” |
| Chinese instruction | `请分析客户投诉，核对产品参数，检查 Shopify 美国站、Amazon 德国站和阿里巴巴国际站的商品信息，并给出处理建议。` |

**Expected reasoning:** `12 h` versus a comparable documented `4 h` maximum is a potential **marketing-claim contradiction**. Customer-reported `2 h` is an **unverified observation**, prompting QA investigation—not an automatically established defect. Do not replace claims with “4 hours” unless supporting evidence and conditions justify the exact wording.

## 5. Validation: what the two competition categories mean

The application must separate these layers:

| Layer | Question | Counts as one of two required categories? | Required behavior |
|---|---|---|---|
| **Evidence comparison** | Does a claim contradict the merchant's documented product data? | **No, by itself** | Show source ID, comparable conditions, uncertainty and factual finding. |
| **Category 1 — Country/market law** | Could a claim present misleading-advertising or substantiation risk under a rule applicable in the target market? | **Yes** | Use a verified US FTC or relevant EU/German official source; record market, source URL, excerpt, checked date and applicability. |
| **Category 2 — Platform rules** | Could the proposed product content conflict with applicable marketplace requirements? | **Yes** | Use a verified Alibaba International and/or Amazon DE platform-specific rule; record platform, source URL, excerpt, checked date and applicability. |

A rule cannot be fabricated by the LLM. Missing/inaccessible sources must result in **`needs_rule_verification`**, not “passed compliance.” A rule applies only to the correct platform, geography and business context. All outputs are advisory drafts requiring human review.

**Starting source inventory for verification, not preapproved findings:**
- US FTC advertising substantiation: <https://www.ftc.gov/business-guidance/advertising-marketing/advertising-marketing-basics>
- European Commission, Unfair Commercial Practices Directive: <https://commission.europa.eu/law/law-topic/consumer-protection-law/unfair-commercial-practices-and-price-indication/unfair-commercial-practices-directive_en>
- Alibaba International Station seller help/rules: use the organizer-provided merchant help-center documents; verify the exact applicable rule text and URL before seeding.
- Amazon Germany listing rules: use verified Seller Central/official documentation where accessible; if unavailable, explicitly leave unverified.

## 6. UI and data boundaries

**Exactly three primary screens:**

1. **Feedback Inbox:** Chinese/English text input, microphone voice input, editable transcription preview, complaint input, SKU/source selection, saved cases.
2. **Claim Investigation:** Chinese evidence summary, customer statement versus product specification versus three snapshots, rule/source citations and risk badges.
3. **Fix & Approve:** English support reply, three platform tabs with different draft structures, annotated changes, chat revision history, QA task and approval/audit timeline.

**Minimum technical stack:** Next.js + TypeScript + Tailwind; Next.js route handlers; Supabase Postgres; Zod-validated requests/model outputs; one configurable **server-side** LLM API. No API keys in Git. Prefer simple orchestration over complex multi-agent tooling.

**Minimum durable entities:** `products`, `evidence_sources`, `platform_listings`, `cases`, `rules`, `artifacts`, `findings`, `revision_events`, `tasks`, `audit_events` (or explicitly agreed equivalents). Shared schema/API contracts must be frozen before parallel coding. A simple documented role switch for the demo is acceptable; full authentication/RBAC is not required.

**Failure states:** missing product evidence → `needs_evidence`; missing valid rule → `needs_rule_verification`; unknown SKU/LLM timeout/invalid output → visible recoverable error. Preserve prior valid versions and do not report false success. Seed/reset must make the live demo repeatable.

## 7. Competition pass/fail acceptance checklist

- [ ] Chinese and English merchant instructions are accepted and persisted.
- [ ] Chinese merchant-facing explanation and English customer-facing content are generated through real LLM calls.
- [ ] Three platform-specific outputs use three real stored snapshots and **are not one translated template**; Alibaba is explicitly B2B.
- [ ] Two actual connected workflows run against the same `caseId` and real database reads.
- [ ] Two user-driven conversation turns persist `v2` and `v3`; validation reruns for revised content.
- [ ] At least one **country-law** finding and one **platform-rule** finding link to checked, applicable source records; unavailable sources are marked unverified.
- [ ] At least two feedback methods are visible: risk indicators and annotated text changes.
- [ ] Evidence discrepancy is distinguished from unverified customer testimony; unsupported facts/refunds/certifications are never invented.
- [ ] QA task, human review action and audit event persist after refresh.
- [ ] Actual AI invocation, business data retrieval, model output, checking, result return and error paths can be explained in the 3-minute demo.
- [ ] Two end-to-end runs succeed after reset without manual database editing.
- [ ] German is demonstrated only if working; Arabic only if independently tested. Unsupported features are not labeled ready.
- [ ] Microphone input works in Chinese and English for initial instructions and conversational revisions. Transcriptions are editable before submission; microphone errors and permission denial fall back to typing.

**Do not treat planned functionality as achieved.** Mark these checkboxes only after live verification.

## 8. Team ownership, GitHub and timeline

| Human | Owns | AI assistants may help with |
|---|---|---|
| **Person 1 (product/frontend/demo lead)** | Chinese/English UI, three screens, risk/diff visuals, revision controls, end-to-end demo, poster/deck | UI implementation, product review, pitch script | Person 1 also owns microphone UI, recording states transcription preview, and voice-to-text user experience.
| **Person 2 (AI/backend lead)** | API contracts and handlers, model integration, structured extraction/generation, revisions, error handling | Implementation, debugging, tests | Person 2 owns speech-to-text integration, language selection, transcription API contracts, and error handling.
| **Person 3 (data/rules/QA lead)** | Supabase schema and demo seed/reset, evidence and official rules, deterministic comparisons, persistent audit, testing, README/source inventory | Research, source verification, database/tests | Person 3 tests Chinese and English transcription, microphone permissions, privacy handling, and failure cases.

**Git:** One private repo; `main` stays runnable; branches `feat/frontend`, `feat/ai-api`, `feat/data-rules`. Agree shared types/routes first. Merge only tested PRs; do not commit `.env`, secrets, or real customer data.

| Deadline | Completion gate |
|---|---|
| **H0–H2** | Freeze this file, schema, API contracts, UI mock payloads; commit runnable app foundation. |
| **H2–H6** | Chinese/English inputs, persisted case, evidence retrieval, support draft. |
| **H6–H10** | Three platform correction drafts + country/platform check outputs. |
| **H10–H14** | Saved revisions, revalidation, QA task, approvals, audit. |
| **H14–H18** | Full integration, failure cases, stable replay; **feature freeze**. |
| **H18–H24** | Demo rehearsals, README, dependency/component declaration, config export, poster, slides/HTML, final Git tag. |

**Submission:** Compilable source/project; README; platform configuration export or relevant app configuration; third-party component declaration; poster **0.8 m × 1.8 m**; three-minute PPT/HTML/demo; Git tag **`hackathon-final`**.

## 9. Explicitly out of scope for the 24-hour MVP

- Live Shopify/Amazon/Alibaba account integrations, scraping, automatic publishing or message sending.
- Voice output/text-to-speech, refunds, inventory changes, autonomous negotiations, full CRM, analytics dashboard.
- German/Arabic speech recognition unless core features are complete.
- Guaranteed German or Arabic generation; German is a priority stretch output, Arabic a lower-priority stretch output.
- Proving product defects or legal compliance; fabricating test conditions, supplier capabilities, certifications or financial impact.
- Additional platforms, extra workflows, custom multi-agent infrastructure, and unrelated visual features.

**Emergency cut order:** Arabic → optional German text generation (retain Amazon DE structured context/English reviewer brief) → cosmetic polish → optional outputs. **Never cut:** Chinese/English input/output, two connected workflows, three configured platform adapters, two validation categories, two feedback methods, two revisions, actual AI + DB calls and visible human approval. Voice input for Chinese and English is P0 and must not be removed without explicit team approval. Keep text input as the fallback.

## 10. Instructions to Cursor / teammates

1. Read this file **alongside** `01_ReLoop_Updated_Proposal.md`, `02_Team_Task_Separation_and_Roles.md` and `03_Cursor_Master_Project_Prompt.md`.
2. **This `MVP_SCOPE.md` takes precedence if older documents suggest broader or conflicting scope.** Competition eligibility requirements take precedence over all project docs.
3. In **Cursor Planning**, first propose schema, types, API responses, file ownership, integration tests and implementation gates. **Do not write code until the three developers accept the shared contracts.**
4. After approval, scaffold, commit to `main`, create feature branches and implement independently against mocks/contracts.
5. Refuse scope creep. If the team is behind, apply the emergency cut order; do not quietly mark missing work as done.
