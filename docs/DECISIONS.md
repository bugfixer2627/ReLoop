# Shared foundation decisions — 31 October 2026

These record the user's implementation request and resolve conflicts in supplied references. Source files under `docs/source/` are preserved unchanged.

1. **Work now:** build shared runnable `main` before the human team splits. The user will subsequently take Person 1's role. The entire MVP is not this milestone.
2. **Existing repository:** use `https://github.com/bugfixer2627/ReLoop.git`. Local origin originally used its old `ReNingbo.git` name; both resolved to the same main/reference hashes during inspection. Do not create another repository.
3. **Reference branch:** `TEST_REFERENCE_OR_IGNORE` is optional reference only. This foundation starts from clean main and does not merge/depend on Cursor's implementation.
4. **Hierarchy:** current user direction → supplied competition brief/original screenshots for competition requirements → MVP scope for chosen team commitments → proposal/team playbook/master prompt. The master prompt is historical planning material, not the current execution request.
5. **Voice:** Chinese/English microphone input is a self-imposed P0 for initial and revision instructions. Editable transcript confirmation is required. Voice output is out of scope. Disregard the master prompt's leftover suggestion that voice input is optional/cuttable.
6. **Revisions, clarified by user:** both support reply and listing correction require revision. Demo gate: support v1→v2→v3 **and at least one listing correction v1→v2→v3**. All three listing formats use the revisable API. These are separate per-artifact histories sharing one case, beyond organizer minimums.
7. **Language:** merchant summaries follow selected Chinese/English locale; customer reply remains English for the US fixture. German is best effort; untested German generation yields a labeled English internal Amazon DE brief. Arabic is lower priority. Actual generation/speech capability statuses remain unavailable in the foundation.
8. **Three screens:** Inbox, Investigation, Fix & Approve. Voice controls belong inside Inbox/Fix & Approve; the master prompt's accidental fourth list item is not a fourth screen.
9. **Review vocabulary:** `draft | pending_review | approved | changes_requested | rejected | blocked`. Normalize older `requires_changes` to `changes_requested`. Human decisions: `approved | changes_requested | rejected`.
10. **Versions:** artifact IDs are stable. Successful revisions insert new versions; failed generation does not advance history. Reviews identify the exact version. New versions revalidate and start unapproved. `expectedVersion` protects concurrent edits. Repository implementation must save versions/findings/revision/audit atomically.
11. **Findings:** evidence, market law and platform rules stay separate. The last two are the selected competition categories. Original-listing findings remain distinct from revised-draft checks. Approval does not erase uncertainty or certify compliance.
12. **Demo evidence:** one fictional lamp/SKU. The three fictional snapshots explicitly use the same maximum-brightness/full-charge/23°C fictional protocol as the 4h maximum. Customer 2h feedback has unknown conditions and remains unverified. Fictional MOQ/lead time are explicitly documented in the seed, not guessed by AI.
13. **Rules:** URLs are candidate inventory, not verified rules. Seed rules start `needs_rule_verification`, without invented excerpts/dates. Person 3 must verify text and applicability.
14. **Access:** full accounts/RBAC are outside MVP, but shared deployment needs a server-enforced demo-access gate before service-role business endpoints are enabled. A role switch is presentation context, not authorization. Foundation business APIs return 501.
15. **Git:** commit the verified foundation to main. Feature branches come later from that commit after ownership is assigned. No final hackathon tag yet.

Each screenshot rubric totals 100 independently; sources do not state judge-group weighting. Do not invent an aggregate formula. Investor efficiency claims need measured time/cost assumptions, not fabricated sales/return reductions.
