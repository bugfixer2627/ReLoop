import { describe, expect, it } from "vitest";
import { demoBundle } from "@/lib/fixtures/demo";
import { compareListingEvidence, customerObservationStatus } from "@/lib/rules/evidence";

describe("listing evidence comparison", () => {
  it("flags the demo's comparable 12-hour and 4-hour claims", () => {
    expect(compareListingEvidence(demoBundle.listings[0], demoBundle.evidence[0])).toBe("documented_mismatch");
  });
  it("supports matching claims with matching documented conditions", () => {
    const listing = structuredClone(demoBundle.listings[0]);
    listing.numericClaim!.value = 4;
    expect(compareListingEvidence(listing, demoBundle.evidence[0])).toBe("supported");
  });
  it("does not assume a lower maximum has been tested", () => {
    const listing = structuredClone(demoBundle.listings[0]);
    listing.numericClaim!.value = 2;
    expect(compareListingEvidence(listing, demoBundle.evidence[0])).toBe("needs_evidence");
  });
  it("requires matching products, versions and complete conditions", () => {
    const listing = structuredClone(demoBundle.listings[0]);
    listing.productId = "00000000-0000-4000-8000-000000000999";
    expect(compareListingEvidence(listing, demoBundle.evidence[0])).toBe("needs_evidence");
    listing.productId = demoBundle.product.id;
    listing.snapshotVersion = "other";
    expect(compareListingEvidence(listing, demoBundle.evidence[0])).toBe("needs_evidence");
    listing.snapshotVersion = demoBundle.listings[0].snapshotVersion;
    delete listing.numericClaim!.conditions.protocol;
    expect(compareListingEvidence(listing, demoBundle.evidence[0])).toBe("needs_evidence");
  });
  it("does not treat unverified sources or customer reports as proof", () => {
    const evidence = structuredClone(demoBundle.evidence[0]);
    evidence.verificationStatus = "needs_evidence";
    expect(compareListingEvidence(demoBundle.listings[0], evidence)).toBe("needs_evidence");
    expect(customerObservationStatus()).toBe("unverified_observation");
  });
});
