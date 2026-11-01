-- Transactional operations used only by the trusted backend service role.
create function public.reloop_save_evidence_findings(p_case_id uuid, p_findings jsonb)
returns void language plpgsql set search_path = public as $$
declare item jsonb; target_product uuid;
begin
  select product_id into target_product from cases where id = p_case_id for update;
  if not found then raise exception 'case not found' using errcode = 'P0002'; end if;
  for item in select * from jsonb_array_elements(p_findings) loop
    if not exists (select 1 from platform_listings where id = item->>'listingId' and product_id = target_product) then
      raise exception 'listing does not belong to case' using errcode = '22023';
    end if;
    if exists (select 1 from jsonb_array_elements_text(item->'sourceIds') s(id)
      where not exists (select 1 from evidence_sources where id = s.id and product_id = target_product)
      and not exists (select 1 from platform_listings where id = s.id and product_id = target_product)) then
      raise exception 'invalid source' using errcode = '22023';
    end if;
    if not exists (select 1 from findings where case_id = p_case_id and listing_id = item->>'listingId'
      and artifact_version_id is null and category = 'evidence' and code = item->>'code'
      and source_ids = array(select jsonb_array_elements_text(item->'sourceIds'))) then
      insert into findings(case_id, listing_id, category, severity, code, evidence_status, source_ids, explanation_zh, explanation_en)
      values (p_case_id, item->>'listingId', 'evidence', (item->>'severity')::reloop_severity,
        item->>'code', (item->>'status')::reloop_evidence_status,
        array(select jsonb_array_elements_text(item->'sourceIds')), item->>'explanationZh', item->>'explanationEn');
    end if;
  end loop;
end;
$$;
revoke all on function public.reloop_save_evidence_findings(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.reloop_save_evidence_findings(uuid, jsonb) to service_role;

create function public.reloop_upsert_task(p_case_id uuid, p_task jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare target_product uuid; task_row tasks%rowtype; event_row audit_events%rowtype; task_uuid uuid;
begin
  select product_id into target_product from cases where id = p_case_id for update;
  if not found then raise exception 'case not found' using errcode = 'P0002'; end if;
  if exists (select 1 from jsonb_array_elements_text(p_task->'sourceIds') s(id)
    where not exists (select 1 from evidence_sources where id = s.id and product_id = target_product)
    and not exists (select 1 from platform_listings where id = s.id and product_id = target_product)
    and not exists (select 1 from rules where id = s.id)) then
    raise exception 'invalid source' using errcode = '22023';
  end if;
  if p_task ? 'taskId' then
    task_uuid := (p_task->>'taskId')::uuid;
    update tasks set assigned_role = (p_task->>'assignedRole')::reloop_role, kind = p_task->>'kind',
      title = p_task->>'title', description = p_task->>'description', state = p_task->>'state',
      source_ids = array(select jsonb_array_elements_text(p_task->'sourceIds'))
      where id = task_uuid and case_id = p_case_id returning * into task_row;
    if not found then raise exception 'task not found' using errcode = 'P0002'; end if;
  else
    insert into tasks(case_id, assigned_role, kind, title, description, state, source_ids)
    values (p_case_id, (p_task->>'assignedRole')::reloop_role, p_task->>'kind', p_task->>'title',
      p_task->>'description', p_task->>'state', array(select jsonb_array_elements_text(p_task->'sourceIds')))
    returning * into task_row;
  end if;
  insert into audit_events(case_id, actor_role, action, entity_id, payload_json)
    values (p_case_id, task_row.assigned_role, 'task_saved', task_row.id::text, '{}'::jsonb) returning * into event_row;
  return jsonb_build_object('task', to_jsonb(task_row), 'audit', to_jsonb(event_row));
end;
$$;
revoke all on function public.reloop_upsert_task(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.reloop_upsert_task(uuid, jsonb) to service_role;

create function public.reloop_review_artifact(p_artifact_id uuid, p_review jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare a artifacts%rowtype; v artifact_versions%rowtype; e audit_events%rowtype; role_value reloop_role;
begin
  select * into a from artifacts where id = p_artifact_id for update;
  if not found then raise exception 'artifact not found' using errcode = 'P0002'; end if;
  if a.latest_version <> (p_review->>'version')::int then raise exception 'stale version' using errcode = '40001'; end if;
  select * into v from artifact_versions where artifact_id = a.id and version = a.latest_version for update;
  role_value := (p_review->>'reviewerRole')::reloop_role;
  if not ((a.kind = 'support_reply' and role_value = 'support') or
    (a.kind = 'listing_correction' and role_value in ('marketing', 'compliance'))) then
    raise exception 'review role not allowed' using errcode = '22023';
  end if;
  if p_review->>'decision' = 'approved' and (v.validation_status <> 'checked' or exists (
    select 1 from findings where artifact_version_id = v.id and (severity = 'blocker' or evidence_status = 'needs_evidence' or rule_status = 'needs_rule_verification')
  )) then raise exception 'review blocked' using errcode = 'P0001'; end if;
  insert into artifact_reviews(case_id, artifact_id, artifact_version_id, version, reviewer_role, decision, comment)
    values (a.case_id, a.id, v.id, v.version, role_value, (p_review->>'decision')::reloop_review_status, p_review->>'comment');
  update artifact_versions set review_status = (p_review->>'decision')::reloop_review_status where id = v.id returning * into v;
  insert into audit_events(case_id, actor_role, action, entity_id, payload_json)
    values (a.case_id, role_value, 'artifact_reviewed', a.id::text, jsonb_build_object('version', v.version, 'decision', p_review->>'decision')) returning * into e;
  return jsonb_build_object('caseId', a.case_id, 'artifactId', a.id, 'version', to_jsonb(v), 'audit', to_jsonb(e));
end;
$$;
revoke all on function public.reloop_review_artifact(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.reloop_review_artifact(uuid, jsonb) to service_role;

-- The caller must validate generated content and findings before invoking this function.
create function public.reloop_save_revision(p_artifact_id uuid, p_revision jsonb, p_version jsonb, p_findings jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare a artifacts%rowtype; v artifact_versions%rowtype; rev revision_events%rowtype; ev audit_events%rowtype; item jsonb; target_product uuid;
begin
  select * into a from artifacts where id = p_artifact_id for update;
  if not found then raise exception 'artifact not found' using errcode = 'P0002'; end if;
  if a.kind not in ('support_reply', 'listing_correction') then raise exception 'unsupported artifact' using errcode = '22023'; end if;
  if a.latest_version <> (p_revision->>'expectedVersion')::int then raise exception 'stale version' using errcode = '40001'; end if;
  select product_id into target_product from cases where id = a.case_id;
  if exists (select 1 from jsonb_array_elements_text(p_version->'sourceIds') s(id)
    where not exists (select 1 from evidence_sources where id = s.id and product_id = target_product)
    and not exists (select 1 from platform_listings where id = s.id and product_id = target_product)
    and not exists (select 1 from rules where id = s.id)) then
    raise exception 'invalid source' using errcode = '22023';
  end if;
  insert into artifact_versions(artifact_id, case_id, version, locale, language_status, content_json, source_ids, validation_status)
    values (a.id, a.case_id, a.latest_version + 1, (p_version->>'locale')::reloop_locale,
      p_version->>'languageStatus', p_version->'content', array(select jsonb_array_elements_text(p_version->'sourceIds')),
      p_version->>'validationStatus') returning * into v;
  for item in select * from jsonb_array_elements(p_findings) loop
    if exists (select 1 from jsonb_array_elements_text(item->'sourceIds') s(id)
      where not exists (select 1 from evidence_sources where id = s.id and product_id = target_product)
      and not exists (select 1 from platform_listings where id = s.id and product_id = target_product)
      and not exists (select 1 from rules where id = s.id)) then
      raise exception 'invalid source' using errcode = '22023';
    end if;
    insert into findings(case_id, artifact_version_id, category, severity, code, rule_id, rule_status, evidence_status,
      source_ids, original_span, proposed_span, explanation_zh, explanation_en)
    values (a.case_id, v.id, (item->>'category')::reloop_finding_category, (item->>'severity')::reloop_severity,
      item->>'code', item->>'ruleId', (item->>'ruleStatus')::reloop_rule_status, (item->>'evidenceStatus')::reloop_evidence_status,
      array(select jsonb_array_elements_text(item->'sourceIds')), item->>'originalSpan', item->>'proposedSpan',
      item->>'explanationZh', item->>'explanationEn');
  end loop;
  insert into revision_events(case_id, artifact_id, prompt_text, prompt_locale, from_version, to_version)
    values (a.case_id, a.id, p_revision->>'promptText', (p_revision->>'promptLocale')::reloop_locale, a.latest_version, v.version) returning * into rev;
  update artifacts set latest_version = v.version where id = a.id;
  insert into audit_events(case_id, actor_role, action, entity_id, payload_json)
    values (a.case_id, case when a.kind = 'support_reply' then 'support'::reloop_role else 'marketing'::reloop_role end,
      'artifact_revised', a.id::text, jsonb_build_object('fromVersion', rev.from_version, 'toVersion', rev.to_version)) returning * into ev;
  return jsonb_build_object('version', to_jsonb(v), 'revision', to_jsonb(rev), 'audit', to_jsonb(ev));
end;
$$;
revoke all on function public.reloop_save_revision(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.reloop_save_revision(uuid, jsonb, jsonb, jsonb) to service_role;
