# Required dependencies

| Package/tool | Verified version | Purpose |
| --- | --- | --- |
| Node.js | 24.14.1 (Next 16 minimum 20.9) | Existing app toolchain |
| next | 16.2.12 | App Router, next/link, next/navigation and metadata types |
| react / react-dom | 19.2.4 / 19.2.4 | Rendering and local state |
| typescript | 5.9.3 | TS/TSX checks |
| @types/node | 20.19.43 | Toolchain types |
| @types/react / @types/react-dom | 19.2.18 / 19.2.7 | React types |
| tailwindcss | 3.4.19 | Existing @tailwind directives in globals.css |
| postcss / autoprefixer | 8.5.32 / 10.4.27 | Existing CSS pipeline |

These are tested versions, not instructions to downgrade or replace an existing compatible application. Next 14/15 and React 18 were not checked as part of this handoff. A Tailwind 4 host requires an explicit CSS/preflight migration review; do not assume the reference PostCSS configuration works unchanged.

No Bootstrap, Framer Motion, icon package, chart package, auth SDK, speech SDK, or API client is required by the copied UI. Inter and brand graphics are served locally. `tslib@2.8.1` appears in the lab's declared dependencies but is not directly imported by this UI; no new direct tslib dependency is required just to consume these components.

The asset derivation utility uses the lab's existing `sharp` installation only when regenerating favicon derivatives. Sharp is not a required UI runtime dependency. No packages were installed for this handoff.
