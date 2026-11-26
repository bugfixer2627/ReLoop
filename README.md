<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/brand/reloop-wordmark-on-dark.png">
    <img src="public/brand/reloop-wordmark-on-light.png" alt="ReLoop" width="220">
  </picture>
</p>

# ReLoop AI

**From customer feedback to evidence-backed listing corrections.**

面向跨境商家的商品承诺核验、客服回复与多平台商品信息修正工作台。

ReLoop connects a customer complaint to a saved case. Merchants can compare what a listing promised with product evidence, draft a customer reply, and prepare corrections for Shopify, Amazon DE, and Alibaba.com. The workspace supports Chinese and English instructions.

## How it works

| Step | In the workspace |
| --- | --- |
| **Capture** | Register a private product or load the synthetic example. Save the SKU, redacted customer message, and merchant instruction in Feedback. |
| **Investigate** | Add specifications, support policies, listing snapshots, and checked rule excerpts in Rules & Sources. Run the investigation after supplying missing evidence. |
| **Fix & Approve** | Generate and revise drafts, assign a reviewer by account ID, and sign off on each saved version against its sources. |
| **Resolve** | Finish outstanding follow-up tasks and record a resolution note. Search and export matching cases from Case Management. |

Approved drafts stay in ReLoop for human handoff. The app does not send customer replies or publish listings to marketplaces.

## Run locally

Use the Node.js version in [`.node-version`](.node-version) and npm.

```sh
git clone https://github.com/bugfixer2627/ReLoop.git
cd ReLoop
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000) to preview the public landing page. For the workspace, configure the services below, restart the server, and sign in at [`/login`](http://localhost:3000/login) with a provisioned Supabase Auth account.

### Configure the workspace

Copy [`.env.example`](.env.example) to `.env.local` if you don't already have one. Keep credentials server-side and out of Git.

| Capability | Settings |
| --- | --- |
| Sign-in and saved cases | `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for a dedicated demo project |
| Demo database setup | `DATABASE_URL` and, if needed, `DATABASE_SSL_CA_FILE` for the CLI |
| AI drafts and translation previews | `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` for an OpenAI-compatible chat service |
| Voice instructions | Configured `TRANSCRIPTION_*` settings, local Whisper, or supported browser recognition. See [Voice setup](docs/VOICE_SETUP.md). |

For a **new, dedicated demo database**, run these commands from the repository root. They apply the schema, load synthetic demo data, and create a Supabase Auth user. Save the printed credentials privately.

```sh
npm run db:apply
npm run db:seed
npm run auth:create-demo-user
```

For an existing demo database, run `npm run db:apply` before starting this version. [Database notes](src/lib/db/README.md) cover migration and reset behavior.

### Rehearse the demo

1. Run `npm run auth:create-demo-user` once per tester. Each account starts with its own case list. Use **Feedback** and load the synthetic example to create a case.
2. In **Fix & Approve**, generate corrections and select **Shopify US**. Open the listed rule sources and compare them with the saved draft.
3. Confirm the source check, enter your rationale, and submit the approval. ReLoop records your account, source links, and decision for that version. Revising the draft opens a new review.

### Use the private product workflow

1. Register a SKU in **Feedback** and save the case. Open **Rules & Sources** to add the product specification, support policy, and a snapshot for each platform you want to correct. Redact customer identifiers before submitting text to the configured AI provider.
2. Add a checked market-law source and platform-rule source for each listing you plan to approve. Record the relevant excerpt, applicability, and checked date. Amazon DE drafts use German copy for private products. Existing English briefs can be revised into German from **Fix & Approve**.
3. Have the reviewer share their account ID from **Settings**. Assign them in **Manage case**. Their case list will include the assignment, and they can review drafts while the owner manages the case and sources.

<details>
<summary>Local network and startup options</summary>

- If you use a proxy, add `HTTPS_PROXY`, `NODE_USE_ENV_PROXY=1`, and `NO_PROXY=localhost,127.0.0.1` to `.env.local`, then restart. For access from another device on your local network, add its ReLoop hostname or IP to `RELOOP_DEV_ORIGINS` and `NO_PROXY`.
- On Windows, if npm fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, try `$env:NODE_USE_SYSTEM_CA = '1'` in PowerShell before rerunning `npm.cmd ci`.
- To preview a production build locally, run `npm run build` followed by `npm start`.

</details>

## Verify

```sh
npm run check
npx playwright install chromium
npm run test:browser
```

CI runs these checks against a local fixture database and AI endpoint. With the app running, `npm run smoke` checks basic HTTP behavior. See [verification](docs/VERIFICATION.md) for hosted, browser, and speech test coverage.

## Project map

| Path | What lives there |
| --- | --- |
| [`src/app/`](src/app/) | Next.js App Router pages and API handlers |
| [`src/lib/`](src/lib/) | Zod contracts, AI adapters, evidence and rule evaluation, and persistence |
| [`supabase/`](supabase/) | PostgreSQL migrations and synthetic seed data |
| [`scripts/`](scripts/) and [`tests/`](tests/) | Local service launchers, database tooling, and verification |

[Architecture](docs/ARCHITECTURE.md) · [API contract](docs/API_CONTRACT.md) · [Acceptance criteria](docs/ACCEPTANCE.md) · [Third-party credits](docs/THIRD_PARTY_COMPONENTS.md)

## License

ReLoop's original software is available under the [MIT License](LICENSE). The
ReLoop name, logos, and brand artwork are excluded from that grant. Third-party
materials retain their own terms. See [UI attribution](docs/UI_ATTRIBUTION.md)
and the [third-party credits](docs/THIRD_PARTY_COMPONENTS.md).
