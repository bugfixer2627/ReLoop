# Phase 2 inventory and Phase 3 proposals

1 November 2026. Inspection only: **no authenticated components changed**.

## Phase 1 design choices

Keep Inter, official wordmarks, process-loop/waveform artwork and current copy. Reuse forest `#051C12`, forest-2 `#0B2C1D`, lime `#B4F105`, muted leaf tones and off-white/cream surfaces. The hero is the single visually strong section: left-aligned type, restrained static ambient light/topographic rings, right-aligned existing loop art layered above an empty conceptual interface. Quieter product cards and the existing workflow provide contrast. No added business claims, metrics or fake AI results.

```text
desktop: [brand | navigation | access]
         [existing headline + CTAs | loop + labeled empty preview]
         [context heading         | existing short explanation]
         [capture card | evidence card | human-review card]
         [existing workflow explanation | linked steps]
mobile:  brand/access → copy/CTAs → loop/preview → stacked cards → workflow
```

Brief review: dark forest/lime comes directly from the requested references and existing brand. Keep it; avoid adding generic glow statistics, new fonts, repeated scroll reveals, decorative data or unrelated modules. A brief entrance sequence and hover feedback suffice. All new CSS is scoped to `.landing-v2`; `reloop-ui.css`, tokens, global stylesheet and workspace layouts are preserved. The Vercel guidelines were fetched fresh before implementation. The instructions' three image references were not attached; their written descriptions were used.

## Existing authenticated boxes

| Screen/component | Existing purpose and source | Phase 2 recommendation (not implemented) | Priority / effort |
|---|---|---|---|
| WorkspaceShell sidebar, topbar, quick menu, search, locale/access controls | Existing route navigation and in-memory access; query routes to case overview | Align compact row heights; reduce repeated title/context bands; retain keyboard labels and visible focus; plan focus containment/Escape for drawer/menu | High / medium |
| Dashboard four metric cards | Counts derived from `GET /api/cases` | Reduce identical vertical padding; distinguish metric label/value clearly; no new analytics | Medium / low |
| Dashboard case table and search/empty/error boxes | Real returned cases; source channel, timestamp, synthetic badge, link | Keep table scroll wrapper; compact row spacing and consistent action target; maintain readable long feedback and localization | Medium / low |
| Inbox form, example button and voice box | SKU/channel/instruction/feedback input, synthetic example, POST case/analyze | Reduce gaps between related fields; align input heights; stack with consistent rhythm on mobile; retain transcript preview/error area | High / medium |
| Inbox workflow status panel | Current explanatory status text including literal API names/501 | Once API contract is integrated, replace developer-facing status wording with honest user-level states; do not fake readiness | High / medium; backend dependent |
| Investigation summary and original-message panels | Bundle summary, complaint and merchant input | Group summary/uncertainty then sources; keep paragraphs readable; avoid extra nested cards | Medium / low |
| Investigation evidence/snapshots/rule cards/findings | Source/version/conditions, three snapshots and persisted findings | Align source metadata; reduce repeated badges; keep citations and three finding categories distinct | High / medium |
| Fix & Approve platform selector, original/draft comparison | Saved platform snapshot and matching artifact | Tighten panel headers and align columns; retain distinct fields and B2B context; do not turn empty drafts into examples | High / medium |
| ArtifactWorkspace revision/history/version/review boxes | Real revision prompt, versions and explicit review persistence | Compact repeated headings; readable version metadata; visible field labels and error focus; preserve original and latest/historical distinction | High / medium |
| Task and audit panels | Bundle tasks/audit; existing create-QA/compliance controls | Balanced side-by-side panels on desktop; consistent empty states; stack on mobile | Medium / low |
| Loading/empty/error/success states across screens | API-bound status, retry and last saved content | One visual rhythm and status semantics; keep actionable retry, explicit unavailable and server-only success | High / medium |
| Login access card | Bearer-token verification via case-list API | Copy/localization review separately; no new account/session capability | Medium / low |
| Dialogs | No shared modal/dialog implementation; existing menus/drawer are local shell state | Do not introduce new dialogs to fill space. Improve existing focus behavior when Phase 2 is authorized | Medium / medium |

Density targets for the next phase: a consistent 16–20px panel inset, 12–16px related-panel gaps, 44px minimum interactive targets, and less repeated vertical framing. These are proposals, not a request to shrink every control. Long Chinese/English content and source evidence still need comfortable line height. Review one existing box at a time and retain current workflow semantics.

## Phase 3 proposals (not implemented)

| Proposal | Content / source | Backend already provides it? | New API / DB change? | Immediately functional? |
|---|---|---|---|---|
| API-backed marketplace options in existing selector | Backend supported-platform config | No catalogue API; fixed shared definitions and enum exist | Proposed `GET /api/platforms`; no new table/migration needed for MVP | No; requires owner-approved contract and consumer |
| Existing form SKU picker | Synthetic products and persisted SKU | Product lookup used by create-case, but no list endpoint | Optional `GET /api/products`; existing table, no new schema | No; proposal only |
| Compact provenance row inside existing evidence panel | Existing evidence source/version/conditions | Yes, case bundle | Existing API; no DB changes | Data exists when configured; styling still awaits Phase 2 approval |

No new metrics, buyer profiles, notifications, publishing controls, account integrations or success charts are proposed. See `UI_BACKEND_HANDOFF.md` for exact owners, fields, states and acceptance tests.

## Preview interpretation

`ui-previews/landing-after-desktop.png` is a browser screenshot of the actual Phase 1 implementation (Mockup A). `ui-previews/workspace-concept.png` is a browser-rendered **layout concept only** (Mockup B), using the existing Fix & Approve panel vocabulary and empty states. Its standalone HTML is outside app routing, contains no API calls and adds no capabilities. It is not evidence of a logged-in session, generated results or working backend.
