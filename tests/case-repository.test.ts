import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { demoBundle } from "@/lib/fixtures/demo";

vi.mock("server-only", () => ({}));
import { getCaseBundle } from "@/lib/db/cases";

function dbRow(row: object, aliases: Record<string, string> = {}) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    aliases[key] ?? key.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase()), value,
  ]));
}

describe("case repository", () => {
  it("maps database rows into the complete case bundle contract", async () => {
    const { sku: _sku, ...caseData } = demoBundle.case;
    void _sku;
    const data: Record<string, object | object[]> = {
      cases: dbRow(caseData),
      products: dbRow(demoBundle.product, { attributes: "attributes_json" }),
      evidence_sources: demoBundle.evidence.map((row) => dbRow(row, { numericClaim: "numeric_claim_json" })),
      platform_listings: demoBundle.listings.map((row) => dbRow(row, { fields: "fields_json", numericClaim: "numeric_claim_json" })),
      rules: demoBundle.rules.map((row) => dbRow(row, { status: "verification_status" })),
      artifacts: [], artifact_versions: [], findings: [], revision_events: [], tasks: [], audit_events: [],
    };
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const table = new URL(input.toString()).pathname.split("/").pop()!;
      return new Response(JSON.stringify(data[table]), { status: 200, headers: { "content-type": "application/json" } });
    });
    const client = createClient("https://example.supabase.co", "test-key", { global: { fetch: fetcher as typeof fetch } });
    expect(await getCaseBundle(client, demoBundle.case.id)).toEqual(demoBundle);
    expect(fetcher).toHaveBeenCalledTimes(11);
  });
});
