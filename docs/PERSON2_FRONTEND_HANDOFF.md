# Person 2 backend handoff for Person 1

The backend uses one persisted `caseId` for the case bundle and all generated
artifacts. Protected browser calls may use the HttpOnly `reloop_demo_access`
cookie issued by `POST /api/access`; API clients may send
`Authorization: Bearer <DEMO_ACCESS_TOKEN>`. Do not place the token in client
JavaScript or a `NEXT_PUBLIC_*` variable.

## Endpoints

- `GET /api/health` is public and returns only availability states.
- `GET /api/cases`, `POST /api/cases`, and `GET /api/cases/:id` are protected.
- `POST /api/cases/:id/analyze` creates an investigation summary.
- `POST /api/cases/:id/support` creates the English support reply.
- `POST /api/cases/:id/repair` creates three distinct listing drafts for
  Shopify US, Amazon Germany, and Alibaba International.
- `POST /api/artifacts/:id/revise` accepts `{promptText,promptLocale,expectedVersion}`
  and creates the next immutable version. A stale `expectedVersion` returns
  `409 CONFLICT`.
- `POST /api/artifacts/:id/review` accepts the exact version and reviewer
  decision. It returns `422 REVIEW_BLOCKED` while required evidence/rule checks
  remain unresolved and `409 CONFLICT` for an old head.
- `POST /api/transcribe` accepts multipart `audio` and `locale` (`zh-CN` or
  `en-US`). It returns an editable transcript with `requiresConfirmation:true`;
  the UI must let the merchant edit/confirm before submitting a workflow.

## Rendering rules

Use the response `validationStatus`, findings, `ruleStatus`, and
`evidenceStatus` directly. `needs_rule_verification` is an unresolved state,
not a legal or platform violation. Keep evidence, market-law and platform-rule
findings visually separate. Amazon Germany is currently an English internal
brief (`internalBrief:true`); do not label it as a German customer listing.
No endpoint publishes, refunds, or sends an external message.

The merged frontend calls the actual case/workflow APIs and does not silently substitute fixtures. User-entered bearer access held in memory is supported for both business and speech routes. Login is required again after a full reload. See H14_H18_INTEGRATION.md for exact remaining integration work.
