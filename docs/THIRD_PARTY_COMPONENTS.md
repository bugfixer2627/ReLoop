# Third-party component declaration — foundation

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

Transitive native/runtime components retain their own licenses in installed packages. No external fonts, stock imagery, generated images or marketplace assets are used. The three rubric PNGs and Markdown source documents are user-supplied competition/project references; they are not claimed as ReLoop's original work. Merchant/product/customer/test data are synthetic and labeled. Rule links are public candidate references, not copied verified rule content or legal endorsements.

Node/npm, GitHub Actions and hosting/database/model services are tools/services, not evidence of live integrations. Production/provider terms and data-handling settings must be reviewed when actual service credentials are configured.
