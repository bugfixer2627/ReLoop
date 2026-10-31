# Interaction specification: actual preserved behavior

All state is local to a component instance. No localStorage, database, server action, fetch call, API route, or persistent session is implemented. Remount/reload resets state; component persistence during route transitions should not be assumed.

| Surface | Trigger | Actual visible behavior | Integration requirement |
| --- | --- | --- | --- |
| Brand | Click wordmark/mark | Navigate to / | Preserve approved logo; map host root if needed |
| Landing | Header/hero CTA | Book a demo, Log in, Launch ReLoop all navigate to /login | Host decides auth vs actual booking destination |
| Landing | Process nodes | Open /feedback, /investigation, or /fix-approve | Preserve link affordances |
| Landing | Section links | Anchor scrolling | Retain ids and reduced-motion behavior |
| Login | Show/Hide | Toggles type of fixed demo password | Host owns actual form/security behavior |
| Login | Enter demo workspace | preventDefault then router.push('/dashboard') | Not authentication; replace with host auth |
| Shell | Mobile menu button | Toggles sidebar open class | Preserve responsive state |
| Shell | Create | Opens/closes local quick menu | Menu links navigate to workflow pages |
| Shell | EN / 中文 | Toggles only the displayed language label | Does not translate content or change html lang/direction |
| Shell | Desktop menu, globe, search button, notification, profile | Visual controls without action handlers (search input accepts text) | Real collapse/search/notifications/profile are host work |
| Dashboard | New case / inbox links | Navigate to /feedback | Case selection is not persisted |
| Dashboard | Export report, 30/90 days, row arrow buttons | Visual placeholders | No export/filter/case drilldown operation |
| Feedback | Text fields/selects | Native editable inputs, uncontrolled defaults | Not submitted or saved; selected SKU/platform do not affect analysis |
| Feedback | Mic | Toggles recording styling/wave state | No permission request, audio capture, STT or stream lifecycle |
| Feedback | Stop | Ends visual recording and resets sample transcript | No transcription occurs; no dedicated cancel flow exists |
| Feedback | Transcript edit | Controlled local text update | Does not drive analysis data |
| Feedback | Run mock analysis | Sets analyzed=true; shows fixed example finding | No pending/error/retry or real result computation |
| Feedback | Import example | Visual placeholder | No file chooser/import behavior |
| Feedback | Open example investigation | Navigate to /investigation | No created case payload is transferred |
| Investigation | Continue to fix | Navigate to /fix-approve | All evidence/findings remain fixed examples |
| Investigation | Save note and source-reference rows | Visual placeholders | Reference rows are not working download/source links |
| Fix & Approve | Platform tab | Changes active tab and locale badge | One shared English draft remains across all tabs; no localized draft generation |
| Fix & Approve | Edit draft | Controlled local draft text | Original highlights and success note do not recalculate |
| Fix & Approve | Send / Enter in revision input | Adds user message and fixed mock reply; clears input | Does not change draft, invoke AI or save a version, despite mock reply wording |
| Fix & Approve | Approve revision | Toggles local approved flag and QA/badge text | No authorization, persistence, publish or approval audit record |
| Fix & Approve | Save draft | Visual placeholder | No persistence |
| Fix & Approve | Revision history | Three static display entries | No version selection, comparison, rollback or snapshot storage |
| Design Lab | Palette | Changes local swatches | Main app tokens remain unchanged |
| Design Lab | Loading sample | 1300ms timer changes label/spinner | Not tied to request state |
| Design Lab | Save/confirm | Shows toast; timer clears after 2200ms | Toast text is demo feedback, not a saved preference |
| Design Lab | Voice sample | Toggles a boolean | No recording/transcription |
| Design Lab | Workspace menu | Opens menu; each item closes it | No account/session action |
| Design Lab | Dialog | Opens; closes by Cancel, close icon, backdrop, confirm | role/aria-modal present; no focus trap, Escape handler or restoration is implemented |

## Before/after comparison semantics

Preserve `.compare`, `.compare-col`, `.compare-label`, `.compare-text`, `.highlight` and `.highlight-green` styling. The current comparison is hand-authored markup, not an automatic diff algorithm. An edited draft does not recompute highlights or evidence support. Host-generated diffs must be rendered as escaped text nodes with annotated spans, preserving this appearance. Never render arbitrary listing HTML directly.

## Production state transitions to connect later

- Intake: editable -> validating/submitting -> saved or error, using the host case model.
- Voice: idle -> permission request -> recording -> stopped -> transcribing -> editable transcript; denied/error/cancel and MediaStream cleanup require real host implementation.
- Review: loading -> source-backed comparison or empty/error state; a discrepancy is not root-cause verification.
- Draft: original -> edited -> saving -> saved/error; maintain one authoritative version per platform/locale and detect stale writes.
- Approval: pending -> submitting -> server-approved/error; publish remains a separate authorized operation. Do not trust the local demo boolean as approval.

These are integration specifications, not features implemented by the handoff. Preserve current visuals while connecting the host's actual workflow.
