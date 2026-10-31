import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArtifactContent, InputLocale, Locale } from "@/lib/contracts";

export type WorkflowFinding = {
  listing_id?: string | null;
  category: "evidence" | "market_law" | "platform_rule";
  severity: "info" | "warning" | "blocker";
  code: string;
  rule_id?: string | null;
  rule_status?: "verified" | "needs_rule_verification" | null;
  evidence_status?: "supported" | "documented_mismatch" | "needs_evidence" | "unverified_observation" | null;
  source_ids: string[];
  original_span?: string | null;
  proposed_span?: string | null;
  explanation_zh: string;
  explanation_en: string;
};

function firstRow<T>(data: T | T[] | null) {
  return Array.isArray(data) ? data[0] ?? null : data;
}

function assertRpc<T extends Record<string, unknown>>(data: T | T[] | null, error: unknown) {
  if (error) {
    // PostgREST errors are plain objects, not Error instances.
    const message = typeof error === "object" && error !== null && "message" in error
      ? String(error.message) : String(error);
    if (/CONFLICT/i.test(message)) throw new Error("CONFLICT");
    if (/NOT_FOUND/i.test(message)) throw new Error("NOT_FOUND");
    if (/REVIEW_BLOCKED/i.test(message)) throw new Error("REVIEW_BLOCKED");
    if (/INVALID_REQUEST/i.test(message)) throw new Error("INVALID_REQUEST");
    throw new Error("Database workflow write failed");
  }
  const row = firstRow(data);
  if (!row) throw new Error("Database workflow write returned no row");
  return row;
}

export async function createArtifactVersion(
  db: SupabaseClient,
  input: {
    caseId: string;
    kind: "investigation_summary" | "support_reply" | "listing_correction";
    platform: "shopify_us" | "amazon_de" | "alibaba_intl" | null;
    market: string;
    segment: "b2c" | "b2b" | "internal";
    locale: Locale;
    languageStatus: "ready" | "beta" | "unavailable";
    content: ArtifactContent;
    sourceIds: string[];
    validationStatus: "pending" | "checked" | "needs_evidence" | "needs_rule_verification" | "blocked";
    findings?: WorkflowFinding[];
  },
) {
  const result = await db.rpc("reloop_create_artifact_version", {
    p_case_id: input.caseId,
    p_kind: input.kind,
    p_platform: input.platform,
    p_market: input.market,
    p_segment: input.segment,
    p_locale: input.locale,
    p_language_status: input.languageStatus,
    p_content: input.content,
    p_source_ids: input.sourceIds,
    p_validation_status: input.validationStatus,
    p_findings: input.findings ?? [],
  });
  return assertRpc<{ artifact_id: string; version_id: string; version: number }>(result.data, result.error);
}

export async function createRevision(
  db: SupabaseClient,
  input: {
    caseId: string;
    artifactId: string;
    expectedVersion: number;
    promptText: string;
    promptLocale: InputLocale;
    locale: Locale;
    languageStatus: "ready" | "beta" | "unavailable";
    content: ArtifactContent;
    sourceIds: string[];
    validationStatus: "pending" | "checked" | "needs_evidence" | "needs_rule_verification" | "blocked";
    findings?: WorkflowFinding[];
  },
) {
  const result = await db.rpc("reloop_create_revision", {
    p_case_id: input.caseId,
    p_artifact_id: input.artifactId,
    p_expected_version: input.expectedVersion,
    p_prompt_text: input.promptText,
    p_prompt_locale: input.promptLocale,
    p_locale: input.locale,
    p_language_status: input.languageStatus,
    p_content: input.content,
    p_source_ids: input.sourceIds,
    p_validation_status: input.validationStatus,
    p_findings: input.findings ?? [],
  });
  return assertRpc<{ artifact_id: string; version_id: string; version: number; revision_id: string }>(result.data, result.error);
}

export async function recordReview(
  db: SupabaseClient,
  input: { caseId: string; artifactId: string; version: number; reviewerRole: string; decision: string; comment: string },
) {
  const result = await db.rpc("reloop_record_review", {
    p_case_id: input.caseId,
    p_artifact_id: input.artifactId,
    p_version: input.version,
    p_reviewer_role: input.reviewerRole,
    p_decision: input.decision,
    p_comment: input.comment,
  });
  return assertRpc<{ artifact_id: string; version_id: string; audit_id: string }>(result.data, result.error);
}

export async function upsertTask(
  db: SupabaseClient,
  input: { caseId: string; taskId?: string; assignedRole: string; kind: string; title: string; description: string; state: string; sourceIds: string[] },
) {
  const result = await db.rpc("reloop_upsert_task", {
    p_case_id: input.caseId,
    p_task_id: input.taskId ?? null,
    p_assigned_role: input.assignedRole,
    p_kind: input.kind,
    p_title: input.title,
    p_description: input.description,
    p_state: input.state,
    p_source_ids: input.sourceIds,
  });
  return assertRpc<{ task_id: string; audit_id: string }>(result.data, result.error);
}
