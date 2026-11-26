import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { caseBundleSchema, caseSchema, createCaseRequestSchema, type caseListQuerySchema, type caseListResponseSchema } from "@/lib/contracts";
import type { z } from "zod";

type Row = Record<string, unknown>;
type CreateCase = z.infer<typeof createCaseRequestSchema>;
type CasePage = Extract<z.infer<typeof caseListResponseSchema>, { ok: true }>["data"];
export type CaseListQuery = z.infer<typeof caseListQuerySchema>;

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

export async function listCases(db: SupabaseClient, ownerUserId: string | null = null) {
  const query = db.from("cases").select("*, products!inner(sku)").order("created_at", { ascending: false });
  const rows = resultData(await (ownerUserId ? query.eq("owner_user_id", ownerUserId) : query.is("owner_user_id", null)));
  return (rows ?? []).map((row: Row) => {
    const product = row.products as Row;
    return caseSchema.parse({ ...mapRow(row), sku: product.sku });
  });
}

export async function pageCases(db: SupabaseClient, actorId: string | null, filters: CaseListQuery, { size = 25, summary = true } = {}): Promise<CasePage> {
  const data = resultData(await db.rpc("reloop_page_cases", {
    p_actor_id: actorId, p_query: filters.q, p_status: filters.status ?? null, p_channel: filters.channel ?? null,
    p_oldest: filters.sort === "oldest", p_page: filters.page, p_size: size, p_summary: summary,
  }).single());
  if (!data) throw new Error("Database returned no page");
  const page = data as { items: Row[]; total: number; counts: CasePage["counts"]; intake: CasePage["intake"] };
  return { cases: page.items.map((row) => caseSchema.parse(mapRow(row))), page: filters.page, pageSize: size,
    ...(summary && { total: page.total, counts: page.counts, intake: page.intake }) };
}

export async function createCase(db: SupabaseClient, input: CreateCase, ownerUserId: string | null = null) {
  const scoped = db.from("products").select("id, synthetic").eq("sku", input.sku);
  const owned = ownerUserId ? resultData(await scoped.eq("owner_user_id", ownerUserId).maybeSingle()) : null;
  const product = owned ?? resultData(await db.from("products").select("id, synthetic").eq("sku", input.sku).is("owner_user_id", null).eq("synthetic", true).maybeSingle());
  if (!product) return null;
  const row = resultData(await db.from("cases").insert({
    product_id: product.id, channel: input.channel, feedback_text: input.feedbackText,
    feedback_locale: input.feedbackLocale, merchant_instruction: input.merchantInstruction,
    merchant_locale: input.merchantLocale, synthetic: product.synthetic, owner_user_id: ownerUserId,
  }).select("id").single());
  if (!row) throw new Error("Database returned no case");
  return row.id as string;
}

export async function getCaseBundle(db: SupabaseClient, id: string, actorId: string | null = null, allowReviewer = false) {
  const query = db.from("cases").select("*").eq("id", id);
  let caseRow = resultData(await (actorId ? query.eq("owner_user_id", actorId) : query.is("owner_user_id", null)).maybeSingle());
  if (!caseRow && actorId && allowReviewer) {
    caseRow = resultData(await db.from("cases").select("*").eq("id", id).eq("reviewer_user_id", actorId).maybeSingle());
  }
  if (!caseRow) return null;
  const productId = caseRow.product_id;
  const owner = caseRow.owner_user_id as string | null;
  const [product, evidence, listings, rules, privateRules, artifacts, versions, findings, revisions, tasks, audit] = await Promise.all([
    db.from("products").select("*").eq("id", productId).single(),
    db.from("evidence_sources").select("*").eq("product_id", productId).order("created_at", { ascending: false }).order("id"),
    db.from("platform_listings").select("*").eq("product_id", productId).order("created_at", { ascending: false }).order("id"),
    db.from("rules").select("*").is("owner_user_id", null),
    owner ? db.from("rules").select("*").eq("owner_user_id", owner) : Promise.resolve({ data: [], error: null }),
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
    rules: [...rows(rules, { verification_status: "status" }), ...rows(privateRules, { verification_status: "status" })],
    artifacts: rows(artifacts), versions: rows(versions, { content_json: "content" }),
    findings: rows(findings), revisions: rows(revisions), tasks: rows(tasks),
    audit: rows(audit, { payload_json: "payload" }),
    ...(actorId && { access: { role: owner === actorId ? "owner" : "reviewer", reviewerUserId: caseRow.reviewer_user_id ?? null } }),
  });
}
