-- Person 2 RPC fix only. Keep published 003/004 migration contents unchanged.
-- Qualify column names that otherwise collide with RETURNS TABLE variables.
-- Enforce the same review guard inside the transaction as in the API handler.
create or replace function public.reloop_record_review(
  p_case_id uuid, p_artifact_id uuid, p_version integer,
  p_reviewer_role public.reloop_role, p_decision public.reloop_review_status, p_comment text
) returns table(artifact_id uuid, version_id uuid, audit_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_artifact public.artifacts%rowtype;
  v_version public.artifact_versions%rowtype;
  v_audit_id uuid;
begin
  select a.* into v_artifact from public.artifacts a
  where a.id = p_artifact_id and a.case_id = p_case_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_artifact.latest_version <> p_version then raise exception 'CONFLICT'; end if;
  select av.* into v_version from public.artifact_versions av
  where av.artifact_id = p_artifact_id and av.case_id = p_case_id and av.version = p_version for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not ((v_artifact.kind = 'support_reply' and p_reviewer_role = 'support') or
    (v_artifact.kind = 'listing_correction' and p_reviewer_role in ('marketing', 'compliance'))) then
    raise exception 'INVALID_REQUEST';
  end if;
  if p_decision = 'approved' and (v_version.validation_status <> 'checked' or exists (
    select 1 from public.findings f where f.artifact_version_id = v_version.id
    and (f.severity = 'blocker' or f.evidence_status = 'needs_evidence' or f.rule_status = 'needs_rule_verification')
  )) then raise exception 'REVIEW_BLOCKED'; end if;
  insert into public.artifact_reviews(case_id, artifact_id, artifact_version_id, version, reviewer_role, decision, comment)
  values (p_case_id, p_artifact_id, v_version.id, p_version, p_reviewer_role, p_decision, coalesce(p_comment, ''));
  update public.artifact_versions av set review_status = p_decision where av.id = v_version.id;
  insert into public.audit_events(case_id, actor_role, action, entity_id, payload_json)
  values (p_case_id, p_reviewer_role, 'artifact_reviewed', p_artifact_id::text,
    jsonb_build_object('version', p_version, 'decision', p_decision)) returning id into v_audit_id;
  return query select p_artifact_id, v_version.id, v_audit_id;
end;
$$;
revoke all on function public.reloop_record_review(uuid, uuid, integer, public.reloop_role, public.reloop_review_status, text) from public, anon, authenticated;
grant execute on function public.reloop_record_review(uuid, uuid, integer, public.reloop_role, public.reloop_review_status, text) to service_role;
