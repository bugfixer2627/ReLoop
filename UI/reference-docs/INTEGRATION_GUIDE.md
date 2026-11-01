# Integration Guide

The prototype is intentionally independent of the production ReLoop application. To transfer the UI, move the relevant route layouts and components into the production Next.js App Router and connect them to that project's existing design tokens, localization, authentication, data, and authorization layers.

## Portable UI pieces

- `src/components/Brand.tsx`: replace the text mark with the approved brand asset when supplied.
- `src/components/WorkspaceShell.tsx`: application sidebar, responsive shell, route navigation, page heading, and status badge.
- `src/components/icons.tsx`: lightweight line icon names used by the prototype.
- `src/app/globals.css`: reference styling and responsive layout. Copy selected tokens/rules into the production design system instead of importing the whole file blindly.
- Route pages under `src/app`: page composition and responsive examples.

## Mock state to replace

- `src/app/login/page.tsx`: demo route transition; replace with production authentication.
- `src/app/feedback/page.tsx`: static input examples, simulated microphone toggle, example transcript, and mock analysis result; connect the production intake and transcription workflow.
- `src/app/fix-approve/page.tsx`: mock platform drafts, revision chat, version history, and local approval toggle; connect production revision and approval APIs.
- `src/app/design-lab/page.tsx`: comparison-only samples and local interactions; this page can remain outside production.
- `src/app/investigation/page.tsx` and `src/app/dashboard/page.tsx`: all metrics, evidence, legal/policy notes, dates, and cases are fixtures for visual review.

No component in this project calls an API or persists data. Before transfer, replace example findings with reviewed source-backed content, implement permission checks, and confirm localized content fit including Arabic RTL layouts.
