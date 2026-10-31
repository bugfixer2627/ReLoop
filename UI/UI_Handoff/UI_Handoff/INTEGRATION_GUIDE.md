# Production integration guide

## Scope and preservation guarantee

This is a source-only handoff prepared without inspecting or changing the separate production ReLoop application. `src/`, existing `public/` assets and screenshots are exact copies of the brand-kit UI Lab. SOURCE_MANIFEST.json contains per-file SHA-256 hashes. UI_Handoff is not a new production app or an npm-built component library. No UI routes, interactions or styles were redesigned during packaging.

The reviewed implementation is the baseline: official ReLoop PNG wordmark/infinity art, local Inter with CJK system fallbacks, forest/lime tokens, Spark application geometry and Crypgo marketing composition. `reference-docs` preserves earlier documentation; this guide, BRAND_ASSETS.md and the effective CSS describe the current state.

## 1. Prepare an isolated destination later

Use the production team's ordinary branch/isolated preview workflow when integration is authorized. Inventory the host App Router, installed Next/React/TypeScript versions, CSS pipeline, existing routes, auth, locale direction and design tokens. No destination paths or APIs have been assumed here. Read DEPENDENCIES.md before installing anything. Reuse compatible installed packages; no new UI library is necessary.

Do not copy the handoff root package.json over the host manifest. It records tested peers/tooling, not host scripts, deploy configuration or environment variables. No environment files or runtime configuration are included.

## 2. Port the actual source

For a host with the same src convention, copy the three files under `src/components` to a collision-free UI namespace or merge the exports deliberately. Copy selected page compositions from `src/app` to the host's chosen route folders. Do not overwrite the host `src/app/layout.tsx`; use it as a reference for CSS order and metadata, then preserve the host's existing providers/session setup and html/body ownership.

The imports `@/components/*` assume `@/*` resolves to `src/*`. Either retain that alias with compatible component paths, or update every affected import together. This bundle intentionally preserves original import paths rather than imposing a new namespace.

Preserve client boundaries: WorkspaceShell, LoginPage, FeedbackPage, FixApprovePage and DesignLabPage include `use client`. Landing, Dashboard and Investigation can stay server-rendered compositions around the client shell. Do not move secrets or service tokens into these client files. Existing pages accept no data props; see COMPONENT_API.md before introducing host-controlled adapters.

Optional: keep `/design-lab` only as an internal review route. Its link is in the preserved sidebar/landing navigation; handle both route and links deliberately. Do not accidentally publish its simulated save/approval controls as production workflows.

## 3. Preserve style order and review global scope

Import `globals.css` first and `brand.css` second from the host's allowed global-style entry point. The second file overrides earlier exploratory fonts, branding and marketing treatments. Reversing order changes the design. Both files, media queries, keyframes and inline TSX styles are required for pixel fidelity; `design-tokens/tokens.json` is a reference, not a stylesheet replacement.

The styles are global and include generic selectors such as body, a, button, .card, .btn, .input and .tab. They are not CSS Modules or a completely isolated library. Start with isolated route-group validation in the host; if conflicts occur, scope the copied rules to a ReLoop route wrapper (and handle portals/body/font roots explicitly) while comparing screenshots. Route groups do not automatically isolate global CSS. Do not blindly apply generic rules to unrelated production pages.

Tailwind 3 directives in globals.css use the existing PostCSS pipeline. The files in `build-reference` are merge examples; copying them verbatim over host configuration is not prescribed. Add the destination source paths to Tailwind content globs. Avoid combining Bootstrap global CSS with this app; Spark geometry is already translated into React/CSS. No Bootstrap runtime is required.

Official tokens: forest #051C12, lime #B4F105, background #F4F6F5, white #FFFFFF, primary text #0B130F, borders #E9EFEF. Retain 280px desktop sidebar, 24px cards and the existing responsive rules. Extra muted/system colors remain in the CSS inventory.

## 4. Port assets and typography

Merge `public/brand` and `public/spark-avatar.png` without overwriting host assets of the same name silently. The JSX/CSS uses absolute URLs `/brand/*` and `/spark-avatar.png`. A basePath/CDN/nested mount requires consistent asset URL mapping in Brand, landing image tags and the CSS font-face. The URLs do not inherit a route prefix automatically.

Inter Latin WOFF2 is self-hosted. Keep its OFL license. CJK fallback fonts are not bundled; verify installed-font behavior on target devices. German is covered by Latin but full Arabic font loading/RTL is not implemented or tested here. Preserve readable direction and layout when adding host localization; the shell's language button currently toggles only a label.

Use official on-light/on-dark wordmark files; use infinity for compact applications. Dark derivatives recolor source pixels without drawing new logo geometry. Originals are retained. Raster edge quality is inherited from the supplied kit; no editable vector source was supplied.

Handoff-only favicons are generated from the official infinity source: `/favicon.ico`, `/brand/favicon-32.png`, and `/brand/apple-touch-icon.png`. They do not modify the source lab. Merge with the host's current icon/metadata strategy rather than adding a second conflicting app/icon route. Example host metadata entry:

```ts
icons: {
  icon: [{ url: '/favicon.ico' }, { url: '/brand/favicon-32.png', type: 'image/png', sizes: '32x32' }],
  apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180' }],
}
```

The demo avatar is not a real merchant identity. Replace its data source with the host profile model during integration, keeping the profile-card layout.

## 5. Map routes and state without inventing services

ROUTE_MAP.md lists the exact files and their URLs. Routes currently have fixed paths and no case IDs. Preserve visuals while mapping the host's real case routing, e.g. whichever dynamic case route it already uses; no URL pattern is mandated here.

Use contracts/data-contracts.ts as an input checklist, not as a new backend contract. Replace embedded fixtures with host-provided view data/callbacks later. Keep local menu, dialog, password visibility, draft editing and other view state near their owners. Host services remain authoritative for sessions, cases, evidence, draft versions, permissions and approval outcomes.

- Login: the current form always navigates into the demo; wire host auth before exposing a production workspace.
- Dashboard: obtain real metrics, case summaries/activity and series. The chart is decorative CSS, not a charting/data integration.
- Feedback: wire controlled form submission, validation, SKU/platform options and actual job results. Existing values are native/local inputs; analyze ignores the input and reveals fixed copy.
- Voice: visual record/stop and editable transcript only. Host must implement permission, capture, cancellation, duration, stream cleanup, transcription loading/errors and data retention. Do not label canned sample text as audio-derived results.
- Investigation: supply real evidence and source URLs. Mock legal/platform notes are not reviewed research; case/spec mismatch is not proof of physical root cause.
- Diff: preserved original/draft panels have hand-marked spans. A real diff algorithm or backend annotations must supply escaped text segments later; editing currently leaves highlight/success text unchanged.
- Revisions: tabs share one draft today; chat adds a fixed reply without changing it; version history is static. Bind real per-platform drafts, message events and immutable versions before claiming revisions were generated or saved.
- Approval: local toggle is not a production approval. Respect host authorization, pending/error state, concurrency/version checks and audit records. Publication is a separate operation.

INTERACTION_SPEC.md covers every implemented trigger and visual placeholder. MOCK_STATE_AND_DATA.md covers every stateful component and every real-data need. No API code is included and none should be inferred from a mock message.

## 6. Validate before any production adoption

Compare the six desktop reference PNGs at 1920×1080 and two mobile PNGs at 390×844 against the isolated host preview. Retain logo proportions, typography, negative space, hero art, shell geometry and card/form/diff states. The images are reference captures of the existing implementation, not newly captured handoff builds. Their filename-to-route map is in screenshots/README.md.

Run host build/type checks, inspect console/network/font loading, test all routes and reduced-motion handling, then verify real authentication, input persistence, voice denial/cancellation, per-platform draft isolation, stale save errors and authoritative approvals. Additional accessibility work is needed for production focus-trapped dialogs, keyboard behavior and some form associations; the current Design Lab dialog does not implement a full focus manager.

See VALIDATION.md for checks completed during packaging and their limits. No production build, API integration, deployment or live publishing was attempted. Stop at reviewing this folder until separate production integration is authorized.
