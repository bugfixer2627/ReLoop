# Component props and expected data

## Implemented shared component API

| Export/file | Actual props | Defaults and behavior |
| --- | --- | --- |
| Brand / components/Brand.tsx | dark?: boolean; compact?: boolean; className?: string | false / false / empty. Selects supplied on-light/on-dark wordmark or infinity PNG; links to /. Pure visual/link component |
| Icon / components/icons.tsx | name: string; size?: number; stroke?: number | size 18, stroke 1.8; inline decorative SVG. Caller provides accessible button/link label. Unknown names render no path |
| WorkspaceShell / components/WorkspaceShell.tsx | children: ReactNode; title: string | Current route from usePathname; title is visible breadcrumb. Hardcoded Jasmine demo profile, local menu/language state, fixed nav paths |
| PageHeading / components/WorkspaceShell.tsx | eyebrow?: string; title: string; description?: string; actions?: ReactNode | Presentational header; caller owns actions |
| StatusBadge / components/WorkspaceShell.tsx | status: 'risk' \| 'review' \| 'safe' \| 'neutral' | Displays High risk / Needs review / Clear / In progress. These labels are UI mappings, not a production risk determination |
| RootLayout / app/layout.tsx | children: ReactNode | Imports global then brand styles; returns html/body; carries prototype metadata |

Supported Icon names: grid, inbox, search, shield, check, arrow, bell, menu, plus, mic, globe, file, settings, sparkle, external. Reuse these paths and their stroke geometry.

## Page APIs and embedded UI sections

All seven page default exports currently take **no props** and do not load data. Their static values and local states are embedded in their files. Do not claim these pages already accept production data objects or API callbacks.

| Page/section | Current data source | Expected production input after an explicit host adapter |
| --- | --- | --- |
| LandingPage | Static marketing copy and supplied PNGs | Usually none; host CTA routes and approved copy if content-managed |
| LoginPage | Fixed demo email/password, show state | Existing host session/auth status and submit callback; no credentials from this package |
| DashboardPage | cases tuple array, metric/activity literals, CSS chart | Metric definitions/values, case summaries, activity timestamps, actual chart series |
| FeedbackPage form | defaultValue fields, hardcoded selects | Case input, SKU/platform options, validation, attachment/upload status |
| FeedbackPage voice/transcript | recording boolean, canned transcript | Permission/recorder lifecycle, transcription job state, editable transcript text; real Audio/Blob lifecycle belongs to host |
| InvestigationPage | Static claim/spec copy and score bars | Source-backed evidence, claim/spec comparison, risk labels, reviewed findings and resolvable references |
| FixApprovePage diff | Original inline spans + one draft string | Original text, per-platform draft, reviewed diff spans, edit callback and async save status |
| FixApprovePage revisions | messages local array, static history | Persisted conversation events and version snapshots keyed by case/platform/version |
| FixApprovePage approval | approved boolean and static QA steps | Authoritative workflow status, pending/error state, permissions, task timeline and approval callback |
| DesignLabPage | Comparisons, timers and booleans | None required; internal visual-only route |

`contracts/data-contracts.ts` suggests integration-side types for these boundaries. They are documentation types, not existing page props, backend DTOs, HTTP endpoints, or a change to the copied source. Map them to the host's actual models; pass adapters only when performing the later integration.

If voice/diff/revision/approval sections are extracted later, use controlled props (value/status + onChange/onAction), keep semantic markup and class names, and let the host own effects/persistence. Do not introduce a second source of truth alongside host state. Keep secrets and network services outside visual components.
