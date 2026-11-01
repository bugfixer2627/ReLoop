-- Additive follow-up to 202610310003. The workflow write functions and their
-- signatures are already published by 003. Only tighten review concurrency
-- here so a review cannot approve a stale artifact head.

create or replace function public.reloop_record_review(
  p_case_id uuid,
  p_artifact_id uuid,
  p_version integer,
  p_reviewer_role public.reloop_role,
  p_decision public.reloop_review_status,
  p_comment text
) returns table(artifact_id uuid, version_id uuid, audit_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_version_id uuid;
  v_audit_id uuid;
  v_latest integer;
begin
  select latest_version into v_latest
  from public.artifacts
  where id = p_artifact_id and case_id = p_case_id
  for update;
  if v_latest is null then raise exception 'NOT_FOUND'; end if;
  if v_latest <> p_version then raise exception 'CONFLICT'; end if;

  select id into v_version_id
  from public.artifact_versions
  where artifact_id = p_artifact_id and case_id = p_case_id and version = p_version;
  if v_version_id is null then raise exception 'NOT_FOUND'; end if;

  insert into public.artifact_reviews(
    case_id, artifact_id, artifact_version_id, version, reviewer_role, decision, comment
  ) values (
    p_case_id, p_artifact_id, v_version_id, p_version, p_reviewer_role, p_decision, coalesce(p_comment, '')
  );
  update public.artifact_versions set review_status = p_decision where id = v_version_id;
  insert into public.audit_events(case_id, actor_role, action, entity_id, payload_json)
  values (p_case_id, p_reviewer_role, 'artifact_reviewed', p_artifact_id::text,
    jsonb_build_object('version', p_version, 'decision', p_decision))
  returning id into v_audit_id;
  return query select p_artifact_id, v_version_id, v_audit_id;
end;
$$;

revoke all on function public.reloop_record_review(uuid, uuid, integer, public.reloop_role, public.reloop_review_status, text) from public, anon, authenticated;
grant execute on function public.reloop_record_review(uuid, uuid, integer, public.reloop_role, public.reloop_review_status, text) to service_role;
