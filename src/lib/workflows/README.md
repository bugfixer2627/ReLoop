# Person 2: workflow implementation boundary

Implement support and listing repair against one `caseId`, using Person 3's repositories and checkers. API routes in this foundation return HTTP 501 until real implementations replace them.

Both `support_reply` and `listing_correction` support unlimited revisions. The demo must show **two follow-up instructions for the support reply and two for at least one listing correction**, each reaching saved v1 → v2 → v3. Every other listing is also revisable through the same API. This is the user's clarification, not a new organizer requirement.

Use source-linked structured generation, Zod validation and deterministic checks. Preserve the previous valid version on model/DB failure. Atomic writes and `expectedVersion` prevent competing revisions from silently overwriting each other. An approved v1 does not approve v2.

Speech input is P0 for both initial and revision instructions. `/api/transcribe` returns text only; it must not submit a workflow automatically. Show an editable preview and require user confirmation. Keep typing available; do not persist raw audio or print audio/transcripts/secrets in server logs.
