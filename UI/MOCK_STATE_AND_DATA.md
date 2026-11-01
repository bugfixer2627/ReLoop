# Mock state and real-data boundaries

The canonical mock values remain embedded in the byte-identical TSX files. `mock-data/source-inventory.json` inventories literal UI text/input values and every useState binding without changing those pages. The supplemental fixture file is explicitly illustrative and is not imported by preserved routes.

## Every component with local/simulated state

| Component/file | State bindings | Nature | Real services/data required later |
| --- | --- | --- | --- |
| WorkspaceShell | open, lang, quickOpen | open/quickOpen are genuine ephemeral UI state; lang only changes a label | Profile/session, permissions, notification count, search, host locale and route mapping |
| LoginPage | show | Genuine password-visibility state; fixed demo credentials and routing are simulated auth | Host authentication/session and error handling |
| FeedbackPage | recording, analyzed, transcript | recording/analyzed are simulated; transcript is genuine local editing of canned text | Case input/validation, SKU/channel catalog, evidence upload, audio permission/recorder, transcription, job results |
| FixApprovePage | platform, approved, draft, chat, messages | Tab/editor/input are genuine local UI; approved and agent replies are simulated; history/QA static | Per-platform localized drafts, revision persistence/events, version history, permissions, authoritative approval and QA |
| DesignLabPage | modal, voice, loading, dropdown, palette, toast | Local comparison/menu/dialog state; voice/loading/save feedback are simulations | No API required for internal previews; exclude demo actions from production workflows |

No other page/component uses local React state. Brand, Icon, PageHeading and StatusBadge are presentational (Brand includes a link). LandingPage is static marketing composition. RootLayout is document/style composition. DashboardPage and InvestigationPage contain only mock data and visual controls, not data effects.

## Every data-bearing composition

- Dashboard: greeting/date (a fixed demo label, not a live calendar), all four metrics/trends, CSS chart, activity feed, cases, SKU mappings and relative timestamps are fabricated fixtures.
- Feedback: merchant instruction, complaint, transcript, SKU/platform options, recent cases, checklist and analysis result are fixtures. The `\\n` in the preserved defaultValue is literal source behavior; the handoff does not normalize it.
- Investigation: customer text, material/test assertions, evidence counts, score percentages, market/date, risk, country-law/platform summaries and source labels are illustrative. No actual PDF/JPG evidence or legally reviewed research is supplied.
- Fix/approve: original text, sample correction, assistant text, version labels, dates and QA statuses are fixtures. The draft is shared across platform tabs; no separate German/Chinese content is provided.
- Shell: Jasmine Li, email, avatar, locale label and notification dot are demo identity/context.
- Login: fixed demo credential text is not a real account or secret. Do not carry it into host authentication.
- Landing: current marketing copy and supplied brand art need no API. No real customer testimonials, verified root-cause statements, or marketing performance statistics are included.

Mock data is not internally normalized: the dashboard RL-2407 SKU differs from the investigation SKU, some case IDs refer to different example subjects between screens, and UI relative dates are static. Preserve them for visual reference, then derive a consistent case identity from the host data model during integration. Do not use those IDs as production seed records.

## API boundary

There are no `/api` handlers, mock servers or API clients to migrate. Every data API and mutation belongs to the destination app's existing architecture. The suggested TypeScript shapes in `contracts/` describe UI needs only; they do not assert any endpoint exists or prescribe a transport. Keep credentials/server tokens on the host server side.
