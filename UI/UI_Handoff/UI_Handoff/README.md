# ReLoop UI handoff

This folder preserves the reviewed standalone UI implementation for a later integration into an existing Next.js App Router + React + TypeScript application. No production project was accessed or modified. The UI Lab screens were not changed during packaging.

## Start here

Read INTEGRATION_GUIDE.md, then COMPONENT_API.md, ROUTE_MAP.md and INTERACTION_SPEC.md. MOCK_STATE_AND_DATA.md separates simulated state from production data needs and visual-only controls. DEPENDENCIES.md records the tested toolchain. VALIDATION.md records the checks actually run.

## Package contents

- `src/`: exact React/TypeScript routes, shared components, inline icons and required styles; source imports and local demo behavior are unchanged.
- `public/`: source wordmark/infinity assets, light/dark variants, process loop, waveform, local Inter with OFL notice, demo avatar and handoff-only favicon derivatives.
- `design-tokens/tokens.json`: reference inventory; CSS remains authoritative.
- `contracts/data-contracts.ts`: integration-facing data shapes only; not wired to existing pages and not a backend contract.
- `mock-data/`: explicitly labeled source-derived fixture/state inventory, plus guidance. Canonical mock values remain in the preserved source.
- `screenshots/`: six reviewed 1920×1080 page screenshots and two 390×844 mobile references, copied from the brand-kit preview.
- `build-reference/`: Tailwind 3/PostCSS examples to merge with the destination setup, not overwrite it.
- `reference-docs/`: original lab documentation preserved for provenance. Current handoff guidance takes precedence over older wording.
- `licenses/`: asset attribution and relevant license notices.
- `SOURCE_MANIFEST.json`: SHA-256 hashes tying copied files to their UI Lab originals.
- `tools/`: assembly, favicon derivation and integrity-check utilities; not application code or runtime dependencies.

There are no node_modules, .next, build outputs, environment files, credential files, mock API endpoints, browser profiles or production service implementations in this folder. `package.json` is a dependency/peer manifest, not a standalone deployable app scaffold. Integrate into an isolated copy/branch of the destination app and adapt to its existing services later.
