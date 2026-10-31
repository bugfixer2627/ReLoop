# ReLoop AI — Detailed General Cursor Master Prompt (v2.0)

**Use this file in Cursor → Planning / Plan Mode before implementation.**  
**This is a project-wide prompt, intentionally NOT personalized to any of the three developers.** Dedicated role-specific coding prompts can be created later.  
**Read with:** [`01_ReLoop_Updated_Proposal.md`](./01_ReLoop_Updated_Proposal.md) and [`02_Team_Task_Separation_and_Roles.md`](./02_Team_Task_Separation_and_Roles.md).

## What to do first

1. Create a **private GitHub repository** named `reloop-ai` and clone/open it in Cursor.
2. Put these three files in repo folder `/docs/` (retain filenames), commit them when appropriate.
3. Select **Planning**, paste the complete prompt between the two markers below.
4. Inspect the plan and have all three humans agree on data/contracts and file boundaries. **Do not authorize broad coding until the plan is approved.**
5. After approval, scaffold a runnable base and let people work on their assigned feature branches; optional Multitask/Cloud only for isolated work.

---

## BEGIN MASTER CURSOR PROMPT — COPY FROM HERE

```text
You are the senior product architect and technical planning agent for ReLoop AI, a real, deployable submission to the “赛道二：AI+出海” hackathon.

IMPORTANT CONTEXT
- Three human developers share one private GitHub repository and have 24 hours total.
- We want the smallest complete and repeatable application that genuinely meets the organizer's requirements, not an impressive-looking fake demo.
- This is a GENERAL project brief and planning task. Do not assume you are working for a particular teammate or assign yourself to a person's files.
- First read all of these Markdown files completely:
  docs/01_ReLoop_Updated_Proposal.md
  docs/02_Team_Task_Separation_and_Roles.md
  docs/03_Cursor_Master_Project_Prompt.md
- If any file is missing, unreadable or inconsistent, explicitly report the gap. Do not pretend to have read unavailable content.
- The files plus the requirements below form the specification. When in doubt, prioritize hard acceptance tests and the 24-hour limit over feature novelty.

PRODUCT DEFINITION
Name: ReLoop AI — Claim-to-Action (海外客户反馈驱动的跨平台商品承诺纠错与协同系统).
Goal: A Chinese export merchant can paste an international customer complaint and ask ReLoop to compare the claim with verified merchant product data; identify whether the claim appears unsupported in three channel snapshots; generate different customer-service and listing-repair drafts; check country-law and platform-rule risks; then revise and approve outputs in one tracked case.

TARGET BUSINESS USER
A small or medium Chinese exporter with one product SKU appearing in:
1. Shopify US — DTC consumer product page and support ticket.
2. Amazon Germany — B2C product detail page; German is preferred, but generation is explicitly beta unless passing tests.
3. Alibaba International Station / 阿里巴巴国际站 — B2B wholesale product listing with specs and documented MOQ / lead time.
Do not present Alibaba B2B as if it were another Shopify consumer storefront.

LANGUAGE REQUIREMENTS — STRICT PRIORITY
Priority 1: Chinese (zh-CN) — MUST WORK as merchant text input, case/risk summary output, and conversational follow-up language.
Priority 2: English (en / en-US) — MUST WORK as merchant input, English case/risk explanation, US Shopify support response, and platform-specific draft content including Alibaba B2B.
Priority 3: German (de-DE) — best effort for Amazon Germany. If not tested successfully, label it beta/unavailable and show a clearly identified English INTERNAL review brief instead; never pass it off as a publication-ready German product listing.
Priority 4: Arabic (ar-AE) — stretch for Arabic-speaking B2B buyer communication; when implemented, use RTL on content and check locale-specific wording. Do not claim legal conformity across all Arabic-speaking jurisdictions.
GUARANTEE Chinese and English input/output. Expose truthful per-language capability states: ready, beta, unavailable. German and Arabic must never block the guaranteed flow. Do not fake translation or success states.

PLATFORM REQUIREMENTS — ALL THREE CONFIGURED
Each platform MUST have:
- its own real stored listing snapshot with source/version,
- a separate adapter/output schema and visibly different business format,
- evidence-linked findings and a reviewable correction draft,
- platform and market fields included in every artifact,
- clear approval status.
Shopify US: English DTC support response plus consumer-facing product description/FAQ correction. Respect documented merchant support policy and applicable US advertising rules.
Amazon Germany: marketplace-friendly title, bullets and description proposed correction; if German is not functioning, deliver an English INTERNAL reviewer note with the same fields and accurate availability badge. Only declare an Amazon DE rule violated if an applicable Germany rule excerpt is actually verified.
Alibaba International: English B2B title/specification/detail-page correction, documented MOQ and lead-time information, certification only if supported; check official Alibaba International merchant/product information rules. Do not invent prices, MOQs, credentials, standards or lead times.
IMPORTANT: “Support three platforms” refers to three working contextual adapters over stored/imported snapshots, NOT to three live account integrations. No scraping or publishing is required in the MVP.

BUSINESS WORKFLOW A — CUSTOMER FEEDBACK → RESOLUTION
1. Accept Chinese OR English merchant instructions, imported feedback text, channel, and a specific SKU.
2. Persist a caseId before generation.
3. Fetch the product specification, evidence sources and support policy from a real database.
4. Call a real LLM to classify the issue, extract claimed durations/units, detect input language and produce strict JSON validated by Zod.
5. Run deterministic comparable-number/condition checks separately from LLM interpretation.
6. Return merchant-facing Chinese or English summary, evidence IDs, unknowns and statuses; customer testimony remains unverified.
7. Generate an English US Shopify support reply that does NOT promise an unauthorized refund or claim an unconfirmed defect.
8. Accept at least TWO sequential free-text conversational follow-ups (Chinese or English). Persist artifact versions v1, v2 and v3, preserving the original. Rerun validation after EVERY revision.
9. Human Support reviewer can approve/ask for changes. No automatic sending.

BUSINESS WORKFLOW B — SAME CASE → CROSS-PLATFORM LISTING REPAIR
1. Retrieve the same caseId, product evidence, and THREE stored platform listing snapshots.
2. Extract explicit listing claims and compare quantities/units/test conditions with evidence.
3. Generate channel-specific draft repairs for Shopify US, Amazon DE (German if available or transparently English internal reviewer brief), and Alibaba International B2B.
4. Perform TWO DISTINCT COMPETITION-QUALIFYING CHECK CATEGORIES:
   a. market_law: US FTC substantiation for US consumer-facing copy; EU Unfair Commercial Practices Directive, Article 6, when assessing German B2C copy and applicable.
   b. platform_rule: source-verified Alibaba International merchant/listing rules, and Amazon DE listing rules only when exact German-market rule applicability has been checked.
   There is also an evidence integrity layer (the 12h vs 4h factual mismatch), but this does NOT substitute for either qualifying category. Findings must be separately categorized and sourced.
5. Give at least TWO feedback forms: risk/severity badges and precise text annotations/before-after diff. Include source URLs, rule ID, applicability and status.
6. Marketing reviews platform-specific drafts; Compliance reviews unresolved rule risks; QA gets an investigation task for the customer's unverified performance report.
7. Persist approval decisions, tasks, revision history and audit events against the same caseId. Do NOT publish external listings.

DEMO DATA — ALL MERCHANT DATA IS SYNTHETIC
Fictional Ningbo rechargeable LED desk lamp maker, SKU RL-LAMP-01.
- Specification source SPEC-001: maximum 4 hours runtime under recorded test conditions; do not extrapolate if conditions are missing.
- Shopify US product page: “up to 12 hours battery life.”
- Amazon Germany product page: “Bis zu 12 Stunden Akkulaufzeit.”
- Alibaba International B2B detail page: “12h runtime” plus documented wholesale fields.
- US Shopify support ticket: “My lamp only lasts about 2 hours.”
- Merchant Chinese demo instruction: 请分析这条客户投诉，核对产品参数，并检查 Shopify 美国站、Amazon 德国站和阿里巴巴国际站的描述，生成中文风险结论和英文处理方案。
Expected interpretation: the listed 12h conflicts with documented 4h maximum ONLY if conditions are comparable. The customer's 2h report is UNVERIFIED and generates a QA task, NOT a confirmed defect conclusion. If evidence/conditions are insufficient, say NEEDS_EVIDENCE and do not invent the correct runtime.

VALIDATION SEMANTICS — NO LEGAL CERTIFICATION
Implement three layers, in separate finding categories:
0. evidence: internal factual support/comparability (NOT an additional scoring category).
1. market_law: risk assessment tied to identified market law and applicability (a scoring category).
2. platform_rule: risk assessment tied to the actual channel's policy/rules (another scoring category).
Example references to seed and verify:
- US FTC Advertising FAQ: https://www.ftc.gov/business-guidance/resources/advertising-faqs-guide-small-business
- US FTC substantiation: https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation
- EU UCPD overview: https://commission.europa.eu/law/law-topic/consumer-protection-law/unfair-commercial-practices-and-price-indication/unfair-commercial-practices-directive_en
- EU Directive: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32005L0029
- Alibaba International service agreement: https://terms.alicdn.com/legal-agreement/terms/suit_bu1_b2b/suit_bu1_b2b202111301159_44306.html
- Alibaba product-rule explanation (older; reverify): https://activity.alibaba.com/pc/02ade148.html
- Amazon DE Seller Central help: https://sellercentral.amazon.de/help/hub/reference/external/G200335450 (may be gated; don't invent text).
Every rule needs: id, category, jurisdiction, platform if relevant, B2C/B2B applicability, source URL, text excerpt, verified or unverified state, and checked date. Treat an inaccessible Amazon rule as NEEDS_RULE_VERIFICATION. Do not use Amazon US policy as if it were verified Amazon Germany policy.
The application identifies possible risks only; it does not certify legal compliance, independently test a product, or establish final legal liability.

DATA INTEGRITY & PERSISTENCE
Choose the minimum useful schema (Supabase Postgres preferred):
- products
- evidence_sources (including provenance, conditions, source version)
- platform_listings (platform, market, segment, snapshot fields and version)
- cases (feedback and merchant instruction, input locale, caseId)
- rules (market law and platform policy with verified status)
- artifacts (platform, locale, languageStatus, kind, fields, version, approval)
- findings (category, severity, evidence status, source IDs and exact text span)
- revision_events
- tasks (Support, Marketing, QA, Compliance)
- audit_events
Each generated artifact must be traceable to caseId and sourceIds. A case created during one workflow MUST be loaded unchanged in the other. Do not lose old versions when revising.

TECHNOLOGY CONSTRAINTS
- Next.js App Router + TypeScript + Tailwind CSS for frontend and server route handlers.
- Zod for request/response/LLM output validation.
- Supabase Postgres for persistence; no complex vector DB or RAG framework required.
- One configurable LLM API adapter on the SERVER. Current AI keys may be configured for Claude/Codex, but choose provider by actual availability and compatibility, not by branding.
- Use real database/API operations; mock data allowed only as honest initial fixtures/seeded synthetic examples, not simulated successful production calls.
- The codebase must run locally and be deployable, with .env.example, no secrets in Git.
- Avoid unnecessary auth systems, real marketplace APIs, browser scraping, image generation, payments or email sending.
- Voice INPUT is required for Chinese and English.
- Voice OUTPUT is optional.- No autonomous legal decision, automatic refund or publication.

UI REQUIREMENTS — THREE SCREENS ONLY
1. Feedback Inbox: source/channel selection, SKU, Chinese/English merchant prompt, complaint text, saved cases, Analyze.
2. Claim Investigation: evidence trace/spec conditions, three original channel claims, uncertainty, sources, categorical findings and language status.
3. microphone recording and transcript confirmation to the Feedback Inbox and Fix & Approve screen specifications.
4. Fix & Approve: distinct Shopify US / Amazon DE / Alibaba International tabs, customer support draft, risk badges, exact before/after edits, Chinese/English revision chat, v1/v2/v3 history, QA/compliance tasks and real human review state.
The UI should be understandable to a Chinese SME seller, not a developer. Chinese labels are the recommended default. Keep English accessible. Avoid overloading with secondary dashboards and visual effects.

API CONTRACT PLANNING
At minimum define typed requests/responses for:
GET  /api/health
POST /api/cases
GET  /api/cases/:id
POST /api/cases/:id/analyze
POST /api/cases/:id/support
POST /api/cases/:id/repair
POST /api/artifacts/:id/revise
POST /api/artifacts/:id/review
POST /api/cases/:id/tasks
Include fields for caseId, sourceIds, platform, market, segment, inputLocale, outputLocale, languageStatus, artifact kind, version, finding category, rule verification state, review status, and predictable errors.
Use error object {code,message,retryable}. Failure must not produce fabricated drafts/false approvals. Show honest last-saved fallback and retry states.
POST /api/transcribe

Accept a bounded audio upload and language hint (zh-CN or en-US).
Return validated transcript text, detected/selected language,
and predictable errors. Do not persist raw audio.

Use a supported browser speech-recognition implementation or
a server-side transcription API. If browser recognition support
is inconsistent, prefer an API-backed implementation.

COMPETITION ACCEPTANCE GATES — MANDATORY
A. Chinese AND English input/output paths work (team guarantee; above organizer minimum).
B. Three separate platform contexts with snapshots and distinct outputs work (team guarantee; above organizer minimum).
C. At least two languages OR two business roles/scenarios; our app demonstrates both routes using Chinese/English + Support/Marketing/QA/Compliance tasks.
D. Two meaningful connected workflows operating on the same case.
E. At least two qualifying validation categories: market-law and platform-rule with source IDs.
F. At least two feedback forms: visible risk badges AND annotated/diff text.
G. At least TWO typed and saved user-driven conversational edits: same artifact v1->v2->v3, checks rerun.
H. Actual AI invocation and actual persisted database/spec/rule retrieval.
I. Stable, repeatable understand -> generate -> check -> feedback -> revise and human review loop.
J. Explain input/data/model/validation/user return path and error handling.
K. Complete source, README, platform/config export, third-party component declaration, poster 0.8x1.8m, 3-minute pitch/demo, and tag hackathon-final.
Voice input/output is NOT mandatory in the supplied brief. It is an optional feedback mechanism. Do not trade away core acceptance tests to implement it.
L. Chinese and English voice input must function in the initial instruction and conversational revision workflows. Users must preview/edit transcriptions before submission. Typing must remain available.

24-HOUR DELIVERY CONSTRAINT
H0-H2: agree architecture, Zod/DB contracts, sources, role boundaries, seeded case, GitHub foundation.
H2-H6: Chinese/English case creation + actual DB reads + evidence and support workflow.
H6-H10: three listing adapters + supported market and platform rules.
H10-H14: two conversational revisions, task/review persistence, both feedback methods.
H14-H18: integration and regression testing, deployment, feature freeze, two end-to-end demos.
H18-H24: presentation, poster, source/config/README, final rehearsal, tag.
Cut in order if behind: Arabic first, German natural language generation second (retain Amazon DE platform/reviewer brief), decorative analytics third. Never cut Chinese/English, any of three platform contexts, validation categories, two feedback methods, two revisions, live calls or safeguards.

TASK FOR THIS PLANNING SESSION ONLY
DO NOT begin coding yet. Inspect the existing repository, and produce a detailed, reviewable implementation plan with:
1. Explicit interpretation of business scenario, user stories, two workflows and all three platform outputs.
2. Requirement-by-requirement matrix mapping the organizer's original Chinese requirements to an actual runnable test.
3. Minimal system architecture diagram (ASCII or Mermaid) and exact data lifecycle.
4. Folder tree and file ownership boundaries to prevent three people overwriting the same work (consult the team playbook; don't personally assume a specific role).
5. Database schema with primary/foreign keys, constraints, indexes, seeds and reset procedure.
6. Zod schema/type definitions (proposed), language-capability enum, channel adapters and evidence/rule findings schema.
7. Exact API contracts with sample valid JSON request and response for each endpoint.
8. AI extraction/generation/revision stages, prompt constraints, fallback and JSON validation behavior.
9. Rule/evidence check design with deterministic test cases, official source inventory, B2C/B2B scope and unknown-evidence handling.
10. Frontend pages, interactions and status states (Chinese-first, English guaranteed, honest German/Arabic availability, Arabic RTL if enabled).
11. GitHub branching/merge strategy, human signoff checkpoints and executable commands for project scaffold/build/test.
12. An hour-by-hour critical-path plan with short milestone gates and scope cuts.
13. At least 18 concrete acceptance/negative tests with expected outputs, including two successful resets/rehearsals.
14. Three-minute live demo script outline: Chinese input, English output, three platform cards, two separate checks, two typed revisions, approval, task and evidence URLs.
15. Risks and assumptions; prominently flag anything requiring current platform-rule verification or actual team credentials.
16. After-plan checklist naming exactly what the human team must approve before implementation.
17. Voice recording states, transcript confirmation, permission denial, unsupported browser, and transcription failures.

PLANNING OUTPUT MUST BE SELF-CONSISTENT. Do not claim German/Arabic are guaranteed. Do not claim Shopify, Amazon or Alibaba accounts are connected. Do not call an evidence mismatch a second legal validation category. Do not fabricate rules, source URLs, merchant prices/MOQs, certificates or tests. Prefer small working features over broad conceptual architecture.

STOP AFTER THE PLAN. Wait for human approval before making broad code changes.
```

## END MASTER CURSOR PROMPT

---

## Quick acceptance review for the Cursor plan

Before approving the generated plan, check every item:

- [ ] Clearly says **Chinese and English guaranteed**; **German then Arabic best effort**.
- [ ] Distinguishes **three platforms** and **DTC vs Amazon B2C vs Alibaba B2B** outputs.
- [ ] Both workflows share a **real saved case**.
- [ ] `evidence`, `market_law`, `platform_rule` are different categories; the last two qualify for competition scoring.
- [ ] Sources/market applicability for official rules are included; inaccessible Amazon DE rule remains unverified.
- [ ] Two **actual** revisions are saved (`v1→v2→v3`) with rechecking.
- [ ] Risk labels **and** inline annotations/diff are both in the implementation plan.
- [ ] The proposed architecture is doable by 3 people in **24 hours**.
- [ ] Staging, error handling, real model and database calls are planned.
- [ ] Repo, test, poster, pitch, README, component declaration and final tag are planned.
- [ ] Chinese and English voice transcription works in both input contexts.
- [ ] Recorded speech becomes editable text before being submitted.
- [ ] Microphone permission failures do not block text input.

## After the plan is approved

Do not instruct one AI agent to implement the entire application simultaneously with other developers editing the same files. First scaffold the shared project and freeze the API/database schemas in `main`; then split implementation into separate human-owned branches per the team playbook. Use local Cursor Agent for bounded implementation. Multitask is useful **only when tasks are isolated**, and Run in Cloud is **optional**.

**This prompt is for understanding and planning the entire project, not for your personal frontend coding task.** A later role-specific prompt can turn the approved architecture into your own checklist and code instructions.
