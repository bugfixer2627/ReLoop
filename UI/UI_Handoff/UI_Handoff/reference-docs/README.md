# ReLoop AI UI Design Lab

An independent, visual-only prototype for ReLoop AI, designed for Chinese international trade merchants reviewing overseas customer complaints and product claims.

## Run locally

Requirements: Node.js 20.9 or newer and npm (Next.js 16).

```bash
npm install
npm run dev
```

Open http://localhost:3000. Use the demo login to enter the workspace. No credentials are required.

## Pages

- `/` Landing page
- `/login` Visual demo login
- `/dashboard` Workspace overview and recent cases
- `/feedback` Complaint input, SKU/platform selectors, sample voice recording, transcript, and mock analysis
- `/investigation` Claim comparison, risk signals, example law/platform findings, and references
- `/fix-approve` Localized platform tabs, editable draft, mock revision chat, history, QA timeline, approval state
- `/design-lab` Side-by-side UI comparisons and interactive component states

All case content and outcomes are labeled mock/example data. The interface has no backend, database, authentication, AI, speech transcription, or publishing connection.

## Structure

`src/app` contains route pages and global tokens. `src/components` contains the shared brand mark, workspace shell, and line icon set. State in the workflow pages and design lab is local React state only.

## Asset handling

The official ReLoop brand kit controls logos, colors, Inter typography, and graphics. Spark controls application structure; Crypgo controls marketing composition. Spark's avatar remains a demo profile asset. See [BRAND_ASSETS.md](./BRAND_ASSETS.md), [ASSET_LICENSES.md](./ASSET_LICENSES.md), and [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md). New screenshots are saved separately under `screenshots/brand-kit/`; previous comparisons are retained.
