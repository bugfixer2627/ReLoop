import { describe, expect, it, vi } from "vitest";
import { createRevision, recordReview, upsertTask } from "@/lib/db/workflows";
vi.mock("server-only", () => ({}));

const task = { caseId: "case", assignedRole: "qa", kind: "qa_investigation", title: "Check", description: "Compare", state: "open", sourceIds: ["SPEC-001"] };
const review = { caseId: "case", artifactId: "artifact", version: 1, reviewerRole: "support", decision: "changes_requested", comment: "Check sources" };
const revision = { caseId: "case", artifactId: "artifact", expectedVersion: 1, promptText: "Shorten", promptLocale: "zh-CN" as const, locale: "en-US" as const, languageStatus: "beta" as const, content: { format: "support_reply" as const, subject: "Details", body: "Confirm conditions" }, sourceIds: ["SPEC-001"], validationStatus: "needs_evidence" as const, findings: [{ category: "evidence" as const, severity: "warning" as const, code: "CHECK", source_ids: ["SPEC-001"], evidence_status: "needs_evidence" as const, explanation_zh: "核对", explanation_en: "Check" }] };
function client(result: unknown) {
  const rpc = vi.fn().mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } }).mockResolvedValueOnce({ data: result, error: null });
  return { rpc, db: { rpc } as never };
}
describe("P2/P3 RPC signature compatibility", () => {
  it.each(["CONFLICT", "NOT_FOUND", "REVIEW_BLOCKED", "INVALID_REQUEST"])("preserves plain-object %s errors", async (code) => {
    const db = { rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "P0001", message: code } }) };
    await expect(recordReview(db as never, review)).rejects.toThrow(code);
  });
  it("maps P3 revision findings and persisted identifiers", async () => {
    const { rpc, db } = client({ version: { id: "v2", version: 2 }, revision: { id: "r1" } });
    expect(await createRevision(db, revision)).toEqual({ artifact_id: "artifact", version_id: "v2", version: 2, revision_id: "r1" });
    expect(rpc.mock.calls[1][0]).toBe("reloop_save_revision");
    expect(rpc.mock.calls[1][1].p_findings[0].sourceIds).toEqual(["SPEC-001"]);
    expect(rpc.mock.calls[1][1].p_revision.expectedVersion).toBe(1);
  });
  it("uses the P3 JSON task signature only after a confirmed missing signature", async () => {
    const { rpc, db } = client({ task: { id: "task" }, audit: { id: "audit" } });
    expect(await upsertTask(db, task)).toEqual({ task_id: "task", audit_id: "audit" });
    expect(rpc.mock.calls[1]).toEqual(["reloop_upsert_task", { p_case_id: "case", p_task: { ...task, caseId: undefined } }]);
  });
  it("maps the P3 review result", async () => {
    const { rpc, db } = client({ artifactId: "artifact", version: { id: "version" }, audit: { id: "audit" } });
    expect(await recordReview(db, review)).toEqual({ artifact_id: "artifact", version_id: "version", audit_id: "audit" });
    expect(rpc.mock.calls[1][0]).toBe("reloop_review_artifact");
  });
  it.each([["40001", "CONFLICT"], ["P0002", "NOT_FOUND"], ["22023", "INVALID_REQUEST"], ["XX000", "Database workflow write failed"]])("never retries an ambiguous or semantic %s failure", async (code, message) => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code } });
    await expect(upsertTask({ rpc } as never, task)).rejects.toThrow(message);
    expect(rpc).toHaveBeenCalledOnce();
  });
  it("does not fall back after a successful write", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ task_id: "task", audit_id: "audit" }], error: null });
    expect(await upsertTask({ rpc } as never, task)).toEqual({ task_id: "task", audit_id: "audit" });
    expect(rpc).toHaveBeenCalledOnce();
  });
});
