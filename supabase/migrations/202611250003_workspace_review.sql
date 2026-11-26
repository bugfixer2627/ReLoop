-- Human sign-off on the exact saved version, with case-level reviewer authorization.
create or replace function public.reloop_record_owned_review(
  p_case_id uuid, p_artifact_id uuid, p_version integer,
  p_decision public.reloop_review_status, p_comment text, p_owner_user_id uuid,
  p_rule_checks jsonb
) returns table(artifact_id uuid, version_id uuid, audit_id uuid)
language plpgsql set search_path = public as $$
declare
  v_case public.cases%rowtype;
  v_artifact public.artifacts%rowtype;
  v_version public.artifact_versions%rowtype;
  v_role public.reloop_role;
  v_rule_inputs jsonb;
  v_sources jsonb;
  v_categories integer;
  v_audit_id uuid;
begin
  select c.* into v_case from public.cases c where c.id = p_case_id for update;
  if not found or p_owner_user_id is null or v_case.owner_user_id is null
    or not (p_owner_user_id = v_case.owner_user_id or p_owner_user_id is not distinct from v_case.reviewer_user_id)
  then raise exception 'NOT_FOUND'; end if;
  if (not v_case.synthetic or v_case.reviewer_user_id is not null)
    and p_owner_user_id is distinct from v_case.reviewer_user_id then raise exception 'REVIEW_BLOCKED'; end if;

  select a.* into v_artifact from public.artifacts a
  where a.id = p_artifact_id and a.case_id = p_case_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_artifact.latest_version <> p_version then raise exception 'CONFLICT'; end if;
  select av.* into v_version from public.artifact_versions av
  where av.artifact_id = p_artifact_id and av.version = p_version for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  case v_artifact.kind
    when 'support_reply' then v_role := 'support';
    when 'listing_correction' then v_role := 'compliance';
    else raise exception 'INVALID_REQUEST';
  end case;

  if p_rule_checks is not null and (p_decision <> 'approved' or v_artifact.kind <> 'listing_correction') then
    raise exception 'INVALID_REQUEST';
  end if;

  if p_decision = 'approved' then
    if nullif(trim(p_comment), '') is null
      or v_version.validation_status not in ('needs_rule_verification', 'checked')
      or exists (select 1 from public.findings f where f.artifact_version_id = v_version.id
        and (f.severity = 'blocker' or f.evidence_status in ('needs_evidence', 'unverified_observation')))
      or (v_artifact.platform = 'amazon_de' and v_version.locale <> 'de-DE') then
      raise exception 'REVIEW_BLOCKED';
    end if;

    if v_artifact.kind = 'support_reply' then
      select jsonb_agg(jsonb_build_object('sourceId', e.id, 'version', e.source_version, 'provenance', e.provenance) order by e.id)
      into v_sources from public.evidence_sources e
      where e.product_id = v_case.product_id and e.kind = 'support_policy' and e.verification_status = 'documented'
        and e.id = any(v_version.source_ids);
      if v_sources is null then raise exception 'REVIEW_BLOCKED'; end if;
    else
      select jsonb_agg(jsonb_build_object('ruleId', r.id, 'sourceUrl', r.source_url) order by r.id),
        jsonb_agg(jsonb_build_object('ruleId', r.id, 'sourceUrl', r.source_url, 'category', r.category,
          'excerpt', r.excerpt, 'checkedAt', r.checked_at, 'applicability', r.applicability) order by r.id),
        count(distinct r.category)
      into v_rule_inputs, v_sources, v_categories
      from public.rules r
      where r.category in ('market_law', 'platform_rule')
        and (r.owner_user_id is null or r.owner_user_id = v_case.owner_user_id)
        and r.market = v_artifact.market and (r.platform is null or r.platform = v_artifact.platform)
        and r.segment in ('all', v_artifact.segment)
        and (v_case.synthetic or r.verification_status = 'verified');
      if v_rule_inputs is null or (not v_case.synthetic and v_categories <> 2) or p_rule_checks is null
        or v_rule_inputs is distinct from (select jsonb_agg(entry order by entry ->> 'ruleId') from jsonb_array_elements(p_rule_checks) entry)
      then raise exception 'REVIEW_BLOCKED'; end if;

      -- Candidate references stay visible. Only sources checked for this version receive an attestation.
      update public.findings f set rule_status = 'verified', code = 'RULE_REVIEWED_BY_ACCOUNT',
        explanation_zh = '审核人已对照所列来源核验此版本。',
        explanation_en = 'The reviewer checked this version against the linked source.'
      where f.artifact_version_id = v_version.id and f.code = 'RULE_REQUIRES_VERIFICATION'
        and exists (select 1 from jsonb_array_elements(v_rule_inputs) entry where entry ->> 'ruleId' = f.rule_id);
    end if;
  end if;

  insert into public.artifact_reviews(case_id, artifact_id, artifact_version_id, version, reviewer_role, decision, comment)
  values (p_case_id, p_artifact_id, v_version.id, p_version, v_role, p_decision, coalesce(p_comment, ''));
  update public.artifact_versions av set review_status = p_decision,
    validation_status = case when p_decision = 'approved' then 'checked' else av.validation_status end
  where av.id = v_version.id;
  insert into public.audit_events(case_id, actor_role, action, entity_id, payload_json)
  values (p_case_id, v_role, 'artifact_reviewed', p_artifact_id::text,
    jsonb_build_object('version', p_version, 'decision', p_decision, 'reviewerUserId', p_owner_user_id,
      'ruleChecks', v_rule_inputs, 'sources', v_sources, 'rationale', coalesce(p_comment, ''))) returning id into v_audit_id;
  return query select p_artifact_id, v_version.id, v_audit_id;
end;
$$;
