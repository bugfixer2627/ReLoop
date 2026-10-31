# Routes and component mapping

Paths below are relative to the handoff folder. Existing URLs are absolute app-root paths, not deployment-base-path aware.

| URL | Preserved file | Main implementation | Host integration |
| --- | --- | --- | --- |
| / | src/app/page.tsx | LandingPage; Brand, Icon; process-art with real links | Public marketing route; current Book a demo link opens /login, not a booking service |
| /login | src/app/login/page.tsx | LoginPage; centered brand card and demo form | Replace submit-to-dashboard with existing host authentication later |
| /dashboard | src/app/dashboard/page.tsx | DashboardPage; WorkspaceShell, PageHeading, StatusBadge, Icon | Metrics, activity and case summaries from host data |
| /feedback | src/app/feedback/page.tsx | FeedbackPage; complaint form, voice-box, editable transcript, example analysis | Case intake, SKU/channel lookup, audio/transcription and analysis job state |
| /investigation | src/app/investigation/page.tsx | InvestigationPage; compare panels, findings, static references | Evidence, specifications, claims, reviewed jurisdiction and platform findings |
| /fix-approve | src/app/fix-approve/page.tsx | FixApprovePage; tabs, original/draft panels, chat, history, QA and approval | Platform-specific drafts, revision events, review task and approval records |
| /design-lab | src/app/design-lab/page.tsx | DesignLabPage; comparisons and local demos | Optional internal preview route; do not expose by default without host routing decision |
| root layout | src/app/layout.tsx | RootLayout | Merge CSS imports and required assets, not the whole host document/metadata |

Shared components: `src/components/Brand.tsx` (official wordmark/compact mark), `WorkspaceShell.tsx` (shell plus PageHeading and StatusBadge exports), and `icons.tsx` (inline Icon). All page compositions are kept as they are; the voice, diff, revision and approval sections currently live inside their pages, not in separate pre-existing components. Extracting them later must preserve their existing markup/classes.

Required stylesheet order: `src/app/globals.css`, then `src/app/brand.css`. Asset URL roots: `/brand/*` and `/spark-avatar.png`. Update all source links, nav entries, redirects, process nodes and CSS font URLs together if mounting below a prefix. Do not create host `/api` routes from this package; none exist here.
