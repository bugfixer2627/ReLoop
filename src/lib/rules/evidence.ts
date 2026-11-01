import type { z } from "zod";
import { evidenceSourceSchema, listingSchema } from "@/lib/contracts";

type Evidence = z.infer<typeof evidenceSourceSchema>;
type Listing = z.infer<typeof listingSchema>;
type Status = "supported" | "documented_mismatch" | "needs_evidence";

export function compareListingEvidence(listing: Listing, evidence: Evidence): Status {
  const claim = listing.numericClaim;
  const source = evidence.numericClaim;
  if (listing.productId !== evidence.productId || listing.snapshotVersion !== evidence.sourceVersion ||
      evidence.kind !== "specification" || evidence.verificationStatus !== "documented" || !claim || !source ||
      claim.metric !== source.metric || claim.unit !== source.unit ||
      claim.qualifier !== "up_to" || source.qualifier !== "maximum") return "needs_evidence";

  const required = ["brightness", "startingCharge", "ambientTemperature", "protocol"];
  const conditions = (value: Record<string, string>) => Object.entries(value)
    .map(([key, entry]) => [key, entry.trim()] as const).sort(([a], [b]) => a.localeCompare(b));
  if (required.some((key) => !claim.conditions[key]?.trim() || !source.conditions[key]?.trim() || !evidence.testConditions[key]?.trim()) ||
      JSON.stringify(conditions(claim.conditions)) !== JSON.stringify(conditions(source.conditions)) ||
      JSON.stringify(conditions(source.conditions)) !== JSON.stringify(conditions(evidence.testConditions))) return "needs_evidence";

  if (claim.value > source.value) return "documented_mismatch";
  return claim.value === source.value ? "supported" : "needs_evidence";
}

export function customerObservationStatus(): "unverified_observation" {
  return "unverified_observation";
}
