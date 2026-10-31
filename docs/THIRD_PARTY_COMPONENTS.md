# Third-party component declaration — UI integration

Exact resolved versions and transitive packages are in `package-lock.json`. This declaration must be updated when feature branches add providers/media libraries. No marketplace SDK or actual model/transcription provider is configured yet.

| Component | Purpose | License |
|---|---|---|
| Next.js | App/router/server/build | MIT |
| React / React DOM | UI | MIT |
| TypeScript | Type checking | Apache-2.0 |
| Tailwind CSS / PostCSS integration | Styling | MIT |
| Zod | Request/DTO/model-output validation | MIT |
| Supabase JS | Server-side Postgres API client | MIT |
| server-only | Server/client import boundary marker | MIT |
| node-postgres (`pg`) | Developer migration/seed/reset CLI | MIT |
| Vitest / Vite | Tests and transforms | MIT |
| PGlite | Embedded PostgreSQL tests | Apache-2.0; bundled PostgreSQL uses PostgreSQL License |
| ESLint / eslint-config-next | Static analysis | MIT |
| @types/node/react/react-dom/pg | Development type declarations | MIT |
| Inter variable Latin font | Self-hosted UI typography from the approved handoff | SIL OFL 1.1 (`public/brand/Inter-OFL.txt`) |
| Spark Admin UI source | Supplied shell/component implementation, integrated without a runtime package | Supplied attribution states MIT; see `docs/UI_ATTRIBUTION.md` |
| Crypgo UI source | Supplied public landing composition, integrated without a runtime package | Supplied attribution states MIT; see `docs/UI_ATTRIBUTION.md` |
| ReLoop brand graphics | Supplied wordmarks, icons, process art and favicon | Project-owner supplied assets; use within authorized project scope |

Transitive native/runtime components retain their own licenses in installed packages. No stock imagery or marketplace assets are used. The Spark sample avatar is excluded so the interface does not show a fictional person as a real user. The three rubric PNGs and Markdown source documents are user-supplied competition/project references; they are not claimed as ReLoop's original work. Merchant/product/customer/test data are synthetic and labeled. Rule links are public candidate references, not copied verified rule content or legal endorsements.

Node/npm, GitHub Actions and hosting/database/model services are tools/services, not evidence of live integrations. Production/provider terms and data-handling settings must be reviewed when actual service credentials are configured.
