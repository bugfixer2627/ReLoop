# Verification

`npm run check` runs lint, TypeScript, the default Vitest suite, and the production build. The default tests cover route behavior, contracts, and embedded PostgreSQL without requiring hosted credentials. Live suites are opt-in.

After `npm run build`, run `npx playwright install chromium` and `npm run test:browser` for the CI browser suite. It uses Next.js, Chromium, embedded PostgreSQL, a loopback AI fixture, and a signed test session. It covers browser navigation during feedback entry, partial generation and retry, multi-version review, tasks, and reload. `node scripts/test-browser-workflows.mjs` runs the configured AI provider with the same isolated SQL boundary.

With the app running, `npm run smoke` checks basic page responses, access protection, health, and speech request handling. `GET /api/health` probes database reachability and reports whether model and speech adapters are configured.

## Recorded results

| Report | Coverage |
| --- | --- |
| [Hosted workflow and translation](WORKFLOW_VERIFICATION_2026-11-01.md) | Real-provider HTTP requests, hosted Supabase persistence, and Chinese/English translation |
| [Local browser and speech delivery](H18_H24_DELIVERY.md) | Isolated browser workflows, real-audio replay, and user-confirmed local microphone recognition |
| [Voice setup](VOICE_SETUP.md#real-audio-test-boundary) | How to repeat speech checks and which microphone scenarios were covered |
| [Competition acceptance](ACCEPTANCE.md) | Criteria for the full merchant rehearsal and submission |

Run `node scripts/verify-services.mjs` for a read-only service check against a configured demo project. The recorded reports describe prior runs in specific environments. Browser-native speech and the complete hosted browser rehearsal need separate acceptance.

## Historical material

The pre-cleanup Git snapshot retains the [standalone UI handoff](https://github.com/bugfixer2627/ReLoop/tree/b67f1071b4f529e58f4313f75c3d307643a011ea/UI) and [earlier integration reports and team handoffs](https://github.com/bugfixer2627/ReLoop/tree/b67f1071b4f529e58f4313f75c3d307643a011ea/docs).
