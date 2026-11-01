# Third-party component declaration — UI integration

Exact resolved versions and transitive packages are in `package-lock.json`. No marketplace SDK is used. The server-side compatible chat adapter uses native fetch and the organizer's TokenHubCloud service; its audio endpoint is unavailable. Backend transcription can use an independently configured compatible audio service.

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
| Playwright | Development-only real-browser regression and local SQL/AI workflow tests | Apache-2.0 |
| faster-whisper / CTranslate2 / Whisper base weights | Optional separate local CPU transcription runtime / model | MIT (upstream implementations/model); see pinned Python runtime lock |
| PyAV / ONNX Runtime / NumPy | Local audio decoding, VAD and numeric inference support | BSD-3-Clause / MIT / BSD-3-Clause; bundled native libraries retain their licenses |
| PGlite | Embedded PostgreSQL tests | Apache-2.0; bundled PostgreSQL uses PostgreSQL License |
| ESLint / eslint-config-next | Static analysis | MIT |
| @types/node/react/react-dom/pg | Development type declarations | MIT |
| Inter variable Latin font | Self-hosted UI typography from the approved handoff | SIL OFL 1.1 (`public/brand/Inter-OFL.txt`) |
| Spark Admin UI source | Supplied shell/component implementation, integrated without a runtime package | Supplied attribution states MIT; see `docs/UI_ATTRIBUTION.md` |
| Crypgo UI source | Supplied public landing composition, integrated without a runtime package | Supplied attribution states MIT; see `docs/UI_ATTRIBUTION.md` |
| ReLoop brand graphics | Supplied wordmarks, icons, process art and favicon | Project-owner supplied assets; use within authorized project scope |

Transitive native/runtime components retain their own licenses in installed packages. No stock imagery or marketplace assets are used. The Spark sample avatar is excluded so the interface does not show a fictional person as a real user. The three rubric PNGs and Markdown source documents are user-supplied competition/project references; they are not claimed as ReLoop's original work. Merchant/product/customer/test data are synthetic and labeled. Rule links are public candidate references, not copied verified rule content or legal endorsements.

Node/npm, GitHub Actions and hosting/database/model services are tools/services, not evidence of live integrations. Production/provider terms and data-handling settings must be reviewed when actual service credentials are configured.

Optional browser SpeechRecognition/Web Speech is a browser/platform service, not an added runtime library. Chrome/Edge availability and vendor service terms apply; audio may leave the device for recognition. The UI discloses this before capture. ReLoop retains no raw recording in browser mode. Real vendor recognition must be independently accepted in Chinese and English; injected test events do not establish accuracy.
