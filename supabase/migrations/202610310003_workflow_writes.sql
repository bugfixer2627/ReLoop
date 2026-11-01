-- Person 2 workflow writes. These functions keep artifact heads, immutable
-- versions, revisions, reviews and audit rows in one database transaction.

create or replace function public.reloop_create_artifact_version(
  p_case_id uuid,
  p_kind text,
  p_platform public.reloop_platform,
  p_market text,
  p_segment text,
  p_locale public.reloop_locale,
  p_language_status text,
  p_content jsonb,
  p_source_ids text[],
  p_validation_status text default 'pending',
  p_findings jsonb default '[]'::jsonb
) returns table(artifact_id uuid, version_id uuid, version integer)
language plpgsql security definer set search_path = public as $$
declare
  v_artifact uuid;
  v_version integer;
  v_version_id uuid;
begin
  select id, latest_version into v_artifact, v_version
  from public.artifacts
  where case_id = p_case_id and kind = p_kind and platform is not distinct from p_platform
  for update;
  if v_artifact is not null then
    select av.id into v_version_id from public.artifact_versions av
    where av.artifact_id = v_artifact and av.version = v_version;
    return query select v_artifact, v_version_id, v_version;
    return;
  end if;

  insert into public.artifacts(case_id, kind, platform, market, segment, latest_version)
  values (p_case_id, p_kind, p_platform, p_market, p_segment, 1)
  returning id into v_artifact;

  insert into public.artifact_versions(
    artifact_id, case_id, version, locale, language_status, content_json,
    source_ids, review_status, validation_status
  ) values (
    v_artifact, p_case_id, 1, p_locale, p_language_status, p_content,
    p_source_ids, 'draft', p_validation_status
  ) returning id into v_version_id;

  insert into public.findings(
    case_id, artifact_version_id, listing_id, category, severity, code,
    rule_id, rule_status, evidence_status, source_ids, original_span,
    proposed_span, explanation_zh, explanation_en
  )
  select p_case_id, v_version_id, f.listing_id, f.category::public.reloop_finding_category,
    f.severity::public.reloop_severity, f.code, f.rule_id,
    f.rule_status::public.reloop_rule_status, f.evidence_status::public.reloop_evidence_status,
    array(select jsonb_array_elements_text(f.source_ids)), f.original_span,
    f.proposed_span, f.explanation_zh, f.explanation_en
  from jsonb_to_recordset(coalesce(p_findings, '[]'::jsonb)) as f(
    listing_id text, category text, severity text, code text, rule_id text,
    rule_status text, evidence_status text, source_ids jsonb, original_span text,
    proposed_span text, explanation_zh text, explanation_en text
  );

  return query select v_artifact, v_version_id, 1;
end;
$$;

create or replace function public.reloop_create_revision(
  p_case_id uuid,
  p_artifact_id uuid,
  p_expected_version integer,
  p_prompt_text text,
  p_prompt_locale public.reloop_locale,
  p_locale public.reloop_locale,
  p_language_status text,
  p_content jsonb,
  p_source_ids text[],
  p_validation_status text default 'pending',
  p_findings jsonb default '[]'::jsonb
) returns table(artifact_id uuid, version_id uuid, version integer, revision_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_latest integer;
  v_version_id uuid;
  v_revision_id uuid;
begin
  select latest_version into v_latest from public.artifacts
  where id = p_artifact_id and case_id = p_case_id for update;
  if v_latest is null then raise exception 'NOT_FOUND'; end if;
  if v_latest <> p_expected_version then raise exception 'CONFLICT'; end if;

  insert into public.artifact_versions(
    artifact_id, case_id, version, locale, language_status, content_json,
    source_ids, review_status, validation_status
  ) values (
    p_artifact_id, p_case_id, v_latest + 1, p_locale, p_language_status,
    p_content, p_source_ids, 'draft', p_validation_status
  ) returning id into v_version_id;

  insert into public.findings(
    case_id, artifact_version_id, listing_id, category, severity, code,
    rule_id, rule_status, evidence_status, source_ids, original_span,
    proposed_span, explanation_zh, explanation_en
  )
  select p_case_id, v_version_id, f.listing_id, f.category::public.reloop_finding_category,
    f.severity::public.reloop_severity, f.code, f.rule_id,
    f.rule_status::public.reloop_rule_status, f.evidence_status::public.reloop_evidence_status,
    array(select jsonb_array_elements_text(f.source_ids)), f.original_span,
    f.proposed_span, f.explanation_zh, f.explanation_en
  from jsonb_to_recordset(coalesce(p_findings, '[]'::jsonb)) as f(
    listing_id text, category text, severity text, code text, rule_id text,
    rule_status text, evidence_status text, source_ids jsonb, original_span text,
    proposed_span text, explanation_zh text, explanation_en text
  );

  insert into public.revision_events(
    case_id, artifact_id, prompt_text, prompt_locale, from_version, to_version
  ) values (
    p_case_id, p_artifact_id, p_prompt_text, p_prompt_locale, v_latest, v_latest + 1
  ) returning id into v_revision_id;

  update public.artifacts set latest_version = v_latest + 1 where id = p_artifact_id;
  return query select p_artifact_id, v_version_id, v_latest + 1, v_revision_id;
end;
$$;

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
begin
  select id into v_version_id from public.artifact_versions
  where artifact_id = p_artifact_id and case_id = p_case_id and version = p_version;
  if v_version_id is null then raise exception 'NOT_FOUND'; end if;

  insert into public.artifact_reviews(
    case_id, artifact_id, artifact_version_id, version, reviewer_role, decision, comment
  ) values (
    p_case_id, p_artifact_id, v_version_id, p_version, p_reviewer_role, p_decision, coalesce(p_comment, '')
  );
  update public.artifact_versions set review_status = p_decision
  where id = v_version_id;
  insert into public.audit_events(case_id, actor_role, action, entity_id, payload_json)
  values (p_case_id, p_reviewer_role, 'artifact_reviewed', p_artifact_id::text,
    jsonb_build_object('version', p_version, 'decision', p_decision))
  returning id into v_audit_id;
  return query select p_artifact_id, v_version_id, v_audit_id;
end;
$$;

create or replace function public.reloop_upsert_task(
  p_case_id uuid,
  p_task_id uuid,
  p_assigned_role public.reloop_role,
  p_kind text,
  p_title text,
  p_description text,
  p_state text,
  p_source_ids text[]
) returns table(task_id uuid, audit_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_task_id uuid := coalesce(p_task_id, gen_random_uuid());
  v_audit_id uuid;
begin
  if p_task_id is null then
    insert into public.tasks(id, case_id, assigned_role, kind, title, description, state, source_ids)
    values (v_task_id, p_case_id, p_assigned_role, p_kind, p_title, p_description, p_state, p_source_ids);
  else
    update public.tasks set assigned_role = p_assigned_role, kind = p_kind, title = p_title,
      description = p_description, state = p_state, source_ids = p_source_ids
    where id = p_task_id and case_id = p_case_id;
    if not found then raise exception 'NOT_FOUND'; end if;
  end if;
  insert into public.audit_events(case_id, actor_role, action, entity_id, payload_json)
  values (p_case_id, p_assigned_role, 'task_upserted', v_task_id::text,
    jsonb_build_object('state', p_state, 'kind', p_kind))
  returning id into v_audit_id;
  return query select v_task_id, v_audit_id;
end;
$$;

revoke all on function public.reloop_create_artifact_version(uuid, text, public.reloop_platform, text, text, public.reloop_locale, text, jsonb, text[], text, jsonb) from public, anon, authenticated;
revoke all on function public.reloop_create_revision(uuid, uuid, integer, text, public.reloop_locale, public.reloop_locale, text, jsonb, text[], text, jsonb) from public, anon, authenticated;
revoke all on function public.reloop_record_review(uuid, uuid, integer, public.reloop_role, public.reloop_review_status, text) from public, anon, authenticated;
revoke all on function public.reloop_upsert_task(uuid, uuid, public.reloop_role, text, text, text, text, text[]) from public, anon, authenticated;
grant execute on function public.reloop_create_artifact_version(uuid, text, public.reloop_platform, text, text, public.reloop_locale, text, jsonb, text[], text, jsonb) to service_role;
grant execute on function public.reloop_create_revision(uuid, uuid, integer, text, public.reloop_locale, public.reloop_locale, text, jsonb, text[], text, jsonb) to service_role;
grant execute on function public.reloop_record_review(uuid, uuid, integer, public.reloop_role, public.reloop_review_status, text) to service_role;
grant execute on function public.reloop_upsert_task(uuid, uuid, public.reloop_role, text, text, text, text, text[]) to service_role;
