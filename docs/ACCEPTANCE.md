# Competition acceptance and remaining work

Sources: supplied Chinese brief, rubric transcription and original PNGs in `docs/source/`. The screenshots govern conflicting transcription wording. No group-score weighting was supplied.

**Current evidence:** see [H18_H24_DELIVERY.md](H18_H24_DELIVERY.md) for per-feature results. Real AI and isolated SQL are tested separately from hosted writes and microphone recognition. The table below preserves the full acceptance criteria; passing a local subset does not imply every gate is complete.

| Gate | Source | Runnable acceptance behavior | Owner |
|---|---|---|---|
| A01 | Brief §4.1, technical o_t2/o_t3 | Chinese instruction saved; real AI gives usable Chinese merchant summary | P1/P2 |
| A02 | Team scope beyond organizer minimum | English instruction saved; English merchant summary through same live path | P1/P2 |
| A03 | Brief §2.3, industry o_i3 | English customer reply respects documented support policy; no unauthorized refund | P2/P3 |
| A04 | Brief §4.2 | Three outputs read three stored snapshots and use different platform formats | All |
| A05 | Industry o_i1/o_i3 | Alibaba explicitly B2B, MOQ/lead time only from documented sources | P2/P3 |
| A06 | Localization/team scope | Amazon DE German only if tested; otherwise labeled English internal brief | P1/P2 |
| A07 | Evidence integrity | Comparable 12h/4h mismatch; missing/different conditions produce needs evidence | P3 |
| A08 | Evidence integrity | Customer 2h report remains unverified; QA task created | P2/P3 |
| A09 | Brief §4.3, technical o_t6 | Market-law finding links to checked applicable source/excerpt/date | P3 |
| A10 | Brief §4.3 | Platform-rule finding links to checked applicable Alibaba/Amazon DE source | P3 |
| A11 | Brief §4.3 | Both severity badges and exact annotated before/after text visible | P1 |
| A12 | Brief §4.1 plus user clarification | Two real support follow-ups yield saved v1/v2/v3 and fresh checks | P1/P2/P3 |
| A13 | User clarification | Two real listing follow-ups yield its own saved v1/v2/v3 and fresh checks | P1/P2/P3 |
| A14 | Technical o_t5, industry o_i2 | Support and repair load same caseId/evidence/context | All |
| A15 | Review/team scope | Version-specific review, QA task, audit and historical content survive refresh | P2/P3 |
| A16 | Brief §4.4, technical o_t1/o_t2 | Actual model and DB/knowledge retrieval visible and explainable | P2/P3 |
| A17 | Brief §4.6 | Unknown SKU/missing evidence/rule fails honestly; no fake compliance pass | P2/P3 |
| A18 | Brief §4.6 | Model timeout/invalid JSON/provider rate limit recover without losing old version | P2 |
| A19 | Repeatability, technical o_t4/investor o_v3 | Two full end-to-end runs after reset, no manual DB corrections | All |
| A20 | Team P0, not organizer requirement | Chinese and English microphone initial/revision input transcribes correctly | P1/P2/P3 |
| A21 | Team voice scope | Editable transcript confirmation; deny/cancel/unsupported/failure preserves typing; no retained audio | All |
| A22 | Version correctness | Competing revisions/stale approvals return conflict and leave history intact | P2/P3 |
| A23 | Checking genuinely affects workflow | Ask to restore 12h/invent refund/certification; revised output is blocked or flagged | P2/P3 |
| A24 | Industry o_i5 | Merchant can complete flow without terminal; understandable Chinese-first labels | P1 |
| A25 | Investor o_v1 | Show measured processing/handling time and explicit cost assumptions, no invented financial uplift | P1 |
| A26 | Investor o_v2 | Alternate configured synthetic SKU works without SKU-specific generated answers | P2/P3 |
| A27 | Brief deliverables | README, configuration/dependency declaration, 0.8×1.8m poster, 3-minute presentation and final tag | All |

## Foundation verification

`npm run check` verifies lint, TypeScript, contract/route tests, embedded PostgreSQL constraints/seed/reset and production build. `tests/fixtures/generation.ts` is explicitly a contract mock. The preview shows only original fixture inputs.

The embedded DB suite tests repeated reset/seed and version storage; it does **not** count as the two live MVP rehearsals in A19. Rule URLs have not been verified by scaffold construction. The poster, pitch and `hackathon-final` tag belong to the final delivery, not this milestone.
