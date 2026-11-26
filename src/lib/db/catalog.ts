import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { productSchema, type addSourceRequestSchema, type createProductRequestSchema } from "@/lib/contracts";
import { platformDefinitions } from "@/lib/config/platforms";
import { mapRow } from "./cases";

export async function registerProduct(db: SupabaseClient, userId: string, input: z.infer<typeof createProductRequestSchema>) {
  const shared = await db.from("products").select("id").eq("sku", input.sku).is("owner_user_id", null).maybeSingle();
  if (shared.error) throw new Error("DATABASE_UNAVAILABLE");
  if (shared.data) throw new Error("CONFLICT");
  const { data, error } = await db.from("products").insert({
    sku: input.sku, name: input.name, source_version: input.sourceVersion, owner_user_id: userId, synthetic: false,
  }).select().single();
  if (error?.code === "23505") throw new Error("CONFLICT");
  if (error || !data) throw new Error("DATABASE_UNAVAILABLE");
  return productSchema.parse(mapRow(data, { attributes_json: "attributes" }));
}

export async function addCaseSource(
  db: SupabaseClient, userId: string, caseId: string, input: z.output<typeof addSourceRequestSchema>,
) {
  const savedCase = await db.from("cases").select("product_id, synthetic").eq("id", caseId).eq("owner_user_id", userId).maybeSingle();
  if (savedCase.error) throw new Error("DATABASE_UNAVAILABLE");
  if (!savedCase.data) throw new Error("NOT_FOUND");

  const id = crypto.randomUUID();
  if (input.kind === "rule") {
    if (input.checkedDate > new Date().toISOString().slice(0, 10)) throw new Error("INVALID_REQUEST");
    const { market, segment } = platformDefinitions[input.platform];
    const { error } = await db.from("rules").insert({
      id, owner_user_id: userId, category: input.category, market, segment, platform: input.platform,
      source_url: input.sourceUrl, excerpt: input.excerpt, applicability: input.applicability,
      checked_at: input.checkedDate + "T00:00:00Z", verification_status: "verified",
    });
    if (error) throw new Error("DATABASE_UNAVAILABLE");
    return id;
  }
  if (savedCase.data.synthetic) throw new Error("CONFLICT");

  const product = await db.from("products").select("id").eq("id", savedCase.data.product_id).eq("owner_user_id", userId).maybeSingle();
  if (product.error) throw new Error("DATABASE_UNAVAILABLE");
  if (!product.data) throw new Error("NOT_FOUND");

  if (input.kind === "listing") {
    const { market, segment } = platformDefinitions[input.platform];
    const { error } = await db.from("platform_listings").insert({
      id, product_id: product.data.id, platform: input.platform, market, segment, locale: input.locale,
      fields_json: { title: input.title, description: input.content }, numeric_claim_json: input.numericClaim,
      snapshot_version: input.sourceVersion, synthetic: false,
    });
    if (error?.code === "23505") throw new Error("CONFLICT");
    if (error) throw new Error("DATABASE_UNAVAILABLE");
  } else {
    const { error } = await db.from("evidence_sources").insert({
      id, product_id: product.data.id, kind: input.kind, content: input.content, provenance: input.provenance,
      numeric_claim_json: input.numericClaim, test_conditions: input.numericClaim?.conditions ?? {},
      source_version: input.sourceVersion, verification_status: "documented", synthetic: false,
    });
    if (error) throw new Error("DATABASE_UNAVAILABLE");
  }
  return id;
}
