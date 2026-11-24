-- Each provisioned demo account owns its cases. Existing seed/test cases
-- remain unowned so the legacy integration token can keep using its fixture.
alter table public.cases add column owner_user_id uuid;
create index cases_owner_created_idx on public.cases(owner_user_id, created_at desc);

create function public.reloop_record_owned_review(
  p_case_id uuid, p_artifact_id uuid, p_version integer,
  p_decision public.reloop_review_status, p_comment text, p_owner_user_id uuid,
  p_rule_checks jsonb
) returns table(artifact_id uuid, version_id uuid, audit_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_artifact public.artifacts%rowtype;
  v_version public.artifact_versions%rowtype;
  v_role public.reloop_role;
  v_rule_checks jsonb;
  v_audit_id uuid;
begin
  if p_owner_user_id is null then raise exception 'NOT_FOUND'; end if;
  select a.* into v_artifact from public.artifacts a
  join public.cases c on c.id = a.case_id
  where a.id = p_artifact_id and c.id = p_case_id and c.owner_user_id = p_owner_user_id
  for update of a;
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

  if p_rule_checks is not null then
    if p_decision <> 'approved' or v_artifact.kind <> 'listing_correction'
      or v_artifact.platform <> 'shopify_us' or coalesce(length(trim(p_comment)), 0) = 0 then
      raise exception 'INVALID_REQUEST';
    end if;

    select jsonb_agg(jsonb_build_object('ruleId', r.id, 'sourceUrl', r.source_url) order by r.id)
    into v_rule_checks from public.rules r
    where r.category in ('market_law', 'platform_rule')
      and r.market = v_artifact.market and (r.platform is null or r.platform = v_artifact.platform)
      and r.segment in ('all', v_artifact.segment);
    if v_rule_checks is null or v_rule_checks is distinct from (
      select jsonb_agg(entry order by entry ->> 'ruleId') from jsonb_array_elements(p_rule_checks) entry
    ) then raise exception 'REVIEW_BLOCKED'; end if;

    if v_version.validation_status not in ('needs_rule_verification', 'checked') or exists (
      select 1 from public.findings f where f.artifact_version_id = v_version.id
        and (f.severity = 'blocker' or f.evidence_status in ('needs_evidence', 'unverified_observation'))
    ) then raise exception 'REVIEW_BLOCKED'; end if;

    update public.findings f set
      rule_status = 'verified', code = 'RULE_REVIEWED_BY_ACCOUNT',
      explanation_zh = '审核人已对照所列来源核验此版本。',
      explanation_en = 'The reviewer checked this version against the linked source.'
    where f.artifact_version_id = v_version.id and f.code = 'RULE_REQUIRES_VERIFICATION'
      and exists (select 1 from jsonb_array_elements(v_rule_checks) entry where entry ->> 'ruleId' = f.rule_id);
    update public.artifact_versions av set validation_status = 'checked' where av.id = v_version.id;
  end if;

  if p_decision = 'approved' and (
    (p_rule_checks is null and v_version.validation_status <> 'checked') or exists (
      select 1 from public.findings f where f.artifact_version_id = v_version.id
        and (f.severity = 'blocker' or f.evidence_status in ('needs_evidence', 'unverified_observation')
          or f.rule_status = 'needs_rule_verification')
    )
  ) then raise exception 'REVIEW_BLOCKED'; end if;

  insert into public.artifact_reviews(case_id, artifact_id, artifact_version_id, version, reviewer_role, decision, comment)
  values (p_case_id, p_artifact_id, v_version.id, p_version, v_role, p_decision, coalesce(p_comment, ''));
  update public.artifact_versions av set review_status = p_decision where av.id = v_version.id;
  insert into public.audit_events(case_id, actor_role, action, entity_id, payload_json)
  values (p_case_id, v_role, 'artifact_reviewed', p_artifact_id::text,
    jsonb_build_object('version', p_version, 'decision', p_decision, 'reviewerUserId', p_owner_user_id,
      'ruleChecks', v_rule_checks, 'rationale', coalesce(p_comment, ''))) returning id into v_audit_id;
  return query select p_artifact_id, v_version.id, v_audit_id;
end;
$$;

revoke all on function public.reloop_record_owned_review(uuid, uuid, integer, public.reloop_review_status, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.reloop_record_owned_review(uuid, uuid, integer, public.reloop_review_status, text, uuid, jsonb)
  to service_role;
