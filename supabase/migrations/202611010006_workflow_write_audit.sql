-- Additive fixes for Person 2 workflow RPCs. Published migrations stay immutable.
-- Serialize initial artifact allocation by case, including NULL-platform summaries.
-- Persist generation/revision audit entries in the same transaction as versions.
create or replace function public.reloop_create_artifact_version(
  p_case_id uuid, p_kind text, p_platform public.reloop_platform,
  p_market text, p_segment text, p_locale public.reloop_locale,
  p_language_status text, p_content jsonb, p_source_ids text[],
  p_validation_status text default 'pending', p_findings jsonb default '[]'::jsonb
) returns table(artifact_id uuid, version_id uuid, version integer)
language plpgsql security definer set search_path = public as $$
declare
  v_artifact uuid;
  v_version integer;
  v_version_id uuid;
begin
  perform c.id from public.cases c where c.id = p_case_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  select a.id, a.latest_version into v_artifact, v_version from public.artifacts a
  where a.case_id = p_case_id and a.kind = p_kind and a.platform is not distinct from p_platform for update;
  if v_artifact is not null then
    select av.id into v_version_id from public.artifact_versions av
    where av.artifact_id = v_artifact and av.version = v_version;
    return query select v_artifact, v_version_id, v_version;
    return;
  end if;
  insert into public.artifacts(case_id, kind, platform, market, segment, latest_version)
  values (p_case_id, p_kind, p_platform, p_market, p_segment, 1) returning id into v_artifact;
  insert into public.artifact_versions(artifact_id, case_id, version, locale, language_status, content_json, source_ids, review_status, validation_status)
  values (v_artifact, p_case_id, 1, p_locale, p_language_status, p_content, p_source_ids, 'draft', p_validation_status)
  returning id into v_version_id;
  insert into public.findings(case_id, artifact_version_id, listing_id, category, severity, code, rule_id, rule_status, evidence_status, source_ids, original_span, proposed_span, explanation_zh, explanation_en)
  select p_case_id, v_version_id, f.listing_id, f.category::public.reloop_finding_category,
    f.severity::public.reloop_severity, f.code, f.rule_id,
    f.rule_status::public.reloop_rule_status, f.evidence_status::public.reloop_evidence_status,
    array(select jsonb_array_elements_text(f.source_ids)), f.original_span, f.proposed_span, f.explanation_zh, f.explanation_en
  from jsonb_to_recordset(coalesce(p_findings, '[]'::jsonb)) as f(
    listing_id text, category text, severity text, code text, rule_id text, rule_status text,
    evidence_status text, source_ids jsonb, original_span text, proposed_span text, explanation_zh text, explanation_en text
  );
  insert into public.audit_events(case_id, actor_role, action, entity_id, payload_json)
  values (p_case_id, case when p_kind = 'listing_correction' then 'marketing'::public.reloop_role else 'support'::public.reloop_role end,
    'artifact_generated', v_artifact::text, jsonb_build_object('version', 1, 'kind', p_kind, 'sourceIds', p_source_ids));
  return query select v_artifact, v_version_id, 1;
end;
$$;

create or replace function public.reloop_create_revision(
  p_case_id uuid, p_artifact_id uuid, p_expected_version integer,
  p_prompt_text text, p_prompt_locale public.reloop_locale, p_locale public.reloop_locale,
  p_language_status text, p_content jsonb, p_source_ids text[],
  p_validation_status text default 'pending', p_findings jsonb default '[]'::jsonb
) returns table(artifact_id uuid, version_id uuid, version integer, revision_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_artifact public.artifacts%rowtype;
  v_version_id uuid;
  v_revision_id uuid;
begin
  select a.* into v_artifact from public.artifacts a
  where a.id = p_artifact_id and a.case_id = p_case_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_artifact.latest_version <> p_expected_version then raise exception 'CONFLICT'; end if;
  insert into public.artifact_versions(artifact_id, case_id, version, locale, language_status, content_json, source_ids, review_status, validation_status)
  values (p_artifact_id, p_case_id, v_artifact.latest_version + 1, p_locale, p_language_status, p_content, p_source_ids, 'draft', p_validation_status)
  returning id into v_version_id;
  insert into public.findings(case_id, artifact_version_id, listing_id, category, severity, code, rule_id, rule_status, evidence_status, source_ids, original_span, proposed_span, explanation_zh, explanation_en)
  select p_case_id, v_version_id, f.listing_id, f.category::public.reloop_finding_category,
    f.severity::public.reloop_severity, f.code, f.rule_id,
    f.rule_status::public.reloop_rule_status, f.evidence_status::public.reloop_evidence_status,
    array(select jsonb_array_elements_text(f.source_ids)), f.original_span, f.proposed_span, f.explanation_zh, f.explanation_en
  from jsonb_to_recordset(coalesce(p_findings, '[]'::jsonb)) as f(
    listing_id text, category text, severity text, code text, rule_id text, rule_status text,
    evidence_status text, source_ids jsonb, original_span text, proposed_span text, explanation_zh text, explanation_en text
  );
  insert into public.revision_events(case_id, artifact_id, prompt_text, prompt_locale, from_version, to_version)
  values (p_case_id, p_artifact_id, p_prompt_text, p_prompt_locale, v_artifact.latest_version, v_artifact.latest_version + 1)
  returning id into v_revision_id;
  update public.artifacts a set latest_version = v_artifact.latest_version + 1 where a.id = p_artifact_id;
  insert into public.audit_events(case_id, actor_role, action, entity_id, payload_json)
  values (p_case_id, case when v_artifact.kind = 'listing_correction' then 'marketing'::public.reloop_role else 'support'::public.reloop_role end,
    'artifact_revised', p_artifact_id::text, jsonb_build_object('fromVersion', v_artifact.latest_version, 'toVersion', v_artifact.latest_version + 1, 'sourceIds', p_source_ids));
  return query select p_artifact_id, v_version_id, v_artifact.latest_version + 1, v_revision_id;
end;
$$;

revoke all on function public.reloop_create_artifact_version(uuid, text, public.reloop_platform, text, text, public.reloop_locale, text, jsonb, text[], text, jsonb) from public, anon, authenticated;
revoke all on function public.reloop_create_revision(uuid, uuid, integer, text, public.reloop_locale, public.reloop_locale, text, jsonb, text[], text, jsonb) from public, anon, authenticated;
grant execute on function public.reloop_create_artifact_version(uuid, text, public.reloop_platform, text, text, public.reloop_locale, text, jsonb, text[], text, jsonb) to service_role;
grant execute on function public.reloop_create_revision(uuid, uuid, integer, text, public.reloop_locale, public.reloop_locale, text, jsonb, text[], text, jsonb) to service_role;
