# Person 3: evidence and rule checks

No legal/platform checks are implemented or verified by this foundation. Official URLs are candidate inventory only.

Implement the following independently from AI generation:

- Compare normalized metrics and units only when SKU, source versions and test conditions support comparison. Missing/different conditions yield `needs_evidence`, not an assumed mismatch.
- Customer testimony remains `unverified_observation`; a numerical discrepancy does not prove a defect.
- Keep `evidence`, `market_law`, and `platform_rule` findings separate. Only the last two satisfy the chosen competition validation categories.
- Verify official source excerpts, checked dates, market, platform and B2C/B2B applicability. Missing rules remain `needs_rule_verification`; never invent a Shopify platform rule or apply EU consumer rules to Alibaba wholesale automatically.
- Recheck revised output, including unauthorized refunds, unsupported quantities/specifications/certifications, omitted test conditions and attempts to restore the 12h claim. Do not silently copy findings from an earlier version.
- Preserve original-listing findings after fixing a draft. UI must distinguish the source listing from the proposed version.
- Approval must not bypass a blocker or turn missing evidence into a supported claim.
