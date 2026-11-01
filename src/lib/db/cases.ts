import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { caseBundleSchema, caseSchema, createCaseRequestSchema } from "@/lib/contracts";
import type { z } from "zod";

type Row = Record<string, unknown>;
type CreateCase = z.infer<typeof createCaseRequestSchema>;

// Convert column names only: keys inside JSON content are already API-shaped.
export function mapRow(row: Row, aliases: Record<string, string> = {}): Row {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    aliases[key] ?? key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), value,
  ]));
}

function resultData<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw new Error("Database query failed");
  return result.data;
}

export async function listCases(db: SupabaseClient) {
  const rows = resultData(await db.from("cases").select("*, products!inner(sku)").order("created_at", { ascending: false }));
  return (rows ?? []).map((row: Row) => {
    const product = row.products as Row;
    return caseSchema.parse({ ...mapRow(row), sku: product.sku });
  });
}

export async function createCase(db: SupabaseClient, input: CreateCase) {
  const product = resultData(await db.from("products").select("id, synthetic").eq("sku", input.sku).maybeSingle());
  if (!product || !product.synthetic) return null;
  const row = resultData(await db.from("cases").insert({
    product_id: product.id, channel: input.channel, feedback_text: input.feedbackText,
    feedback_locale: input.feedbackLocale, merchant_instruction: input.merchantInstruction,
    merchant_locale: input.merchantLocale, synthetic: true,
  }).select("id").single());
  if (!row) throw new Error("Database returned no case");
  return row.id as string;
}

export async function getCaseBundle(db: SupabaseClient, id: string) {
  const caseRow = resultData(await db.from("cases").select("*").eq("id", id).maybeSingle());
  if (!caseRow) return null;
  const productId = caseRow.product_id;
  const [product, evidence, listings, rules, artifacts, versions, findings, revisions, tasks, audit] = await Promise.all([
    db.from("products").select("*").eq("id", productId).single(),
    db.from("evidence_sources").select("*").eq("product_id", productId),
    db.from("platform_listings").select("*").eq("product_id", productId),
    db.from("rules").select("*"),
    db.from("artifacts").select("*").eq("case_id", id),
    db.from("artifact_versions").select("*").eq("case_id", id),
    db.from("findings").select("*").eq("case_id", id),
    db.from("revision_events").select("*").eq("case_id", id),
    db.from("tasks").select("*").eq("case_id", id),
    db.from("audit_events").select("*").eq("case_id", id),
  ]);
  const productRow = resultData(product);
  const rows = (result: { data: Row[] | null; error: unknown }, aliases?: Record<string, string>) =>
    (resultData(result) ?? []).map((row) => mapRow(row, aliases));
  return caseBundleSchema.parse({
    case: { ...mapRow(caseRow), sku: productRow.sku },
    product: mapRow(productRow, { attributes_json: "attributes" }),
    evidence: rows(evidence, { numeric_claim_json: "numericClaim" }),
    listings: rows(listings, { fields_json: "fields", numeric_claim_json: "numericClaim" }),
    rules: rows(rules, { verification_status: "status" }),
    artifacts: rows(artifacts), versions: rows(versions, { content_json: "content" }),
    findings: rows(findings), revisions: rows(revisions), tasks: rows(tasks),
    audit: rows(audit, { payload_json: "payload" }),
  });
}
