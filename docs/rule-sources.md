# Evidence and rule-source inventory

The canonical synthetic fixture is `src/lib/fixtures/demo.json`. These are source records, not automatic legal determinations. Original project documents remain unchanged in `docs/source/`.

| Record | Context | Content / verification boundary |
|---|---|---|
| SPEC-001 | Fictional RL-LAMP-01 | Documented synthetic maximum 4-hour runtime under stated brightness, starting charge, ambient temperature and protocol; source/snapshot versions must match |
| POLICY-MERCHANT-001 | Fictional merchant policy | Support-policy context; generated replies must not invent refund, warranty or certification commitments |
| LIST-SHOP-001 | Shopify US, B2C | Stored 12-hour listing snapshot, not a live seller connection |
| LIST-AMZ-001 | Amazon Germany, B2C | Stored German 12-hour claim; output remains a labeled English internal brief |
| LIST-ALI-001 | Alibaba International, B2B | Stored wholesale snapshot; MOQ/lead time require explicit evidence |

Exact IDs and conditions in the fixture/database govern when aliases above differ. Customer-reported 2 hours is an unverified observation, never proof of a defect. Missing conditions, undocumented sources, different products/versions, or differing qualifiers cannot establish a documented contradiction.

| Rule ID | Market/platform | Official candidate source | Committed fixture state |
|---|---|---|---|
| LAW-US-FTC-001 | US / Shopify | [FTC substantiation policy](https://www.ftc.gov/legal-library/browse/ftc-policy-statement-regarding-advertising-substantiation) | needs_rule_verification; no checked excerpt/date |
| LAW-EU-UCPD-001 | Germany B2C / Amazon | [Directive 2005/29/EC](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32005L0029) | needs_rule_verification; no checked excerpt/date |
| PLAT-ALI-001 | Global B2B / Alibaba | [Alibaba legal agreement candidate](https://terms.alicdn.com/legal-agreement/terms/suit_bu1_b2b/suit_bu1_b2b202111301159_44306.html) | needs_rule_verification; exact listing-rule scope requires review |
| PLAT-AMZ-DE-001 | Germany / Amazon | [Seller Central candidate](https://sellercentral.amazon.de/help/hub/reference/external/G200335450) | needs_rule_verification; access/applicability not accepted |

The hosted database contains additional records marked verified. The read-only test counted 10 such records; it did not establish their substantive legal correctness or evaluate proposed content against them. This milestone does not update rule records or the hosted database.

The current checker emits separate evidence, market-law and platform-rule findings. `RULE_REQUIRES_VERIFICATION` never makes an artifact checked, even when its source record is marked verified. Human source/applicability review and substantive content evaluation remain release gates. No legal compliance certification is offered.
