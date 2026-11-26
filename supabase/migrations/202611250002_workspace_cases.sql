-- Extend the demo workspace without reassigning existing cases or changing historical versions.
alter table public.products add column owner_user_id uuid;
alter table public.products drop constraint products_sku_key;
create unique index products_shared_sku_idx on public.products(sku) where owner_user_id is null;
create unique index products_owner_sku_idx on public.products(owner_user_id, sku) where owner_user_id is not null;

alter table public.rules add column owner_user_id uuid;
create index rules_owner_idx on public.rules(owner_user_id);
alter table public.cases add column reviewer_user_id uuid;
alter table public.cases add constraint case_reviewer_distinct
  check (reviewer_user_id is null or (owner_user_id is not null and reviewer_user_id <> owner_user_id));
create index cases_reviewer_created_idx on public.cases(reviewer_user_id, created_at desc) where reviewer_user_id is not null;

create function public.reloop_page_cases(
  p_actor_id uuid, p_query text, p_status text, p_channel public.reloop_platform,
  p_oldest boolean, p_page integer, p_size integer, p_summary boolean
) returns table(items jsonb, total bigint, counts jsonb, intake jsonb)
language sql stable set search_path = public as $$
  with visible as materialized (
    select c.*, p.sku from public.cases c join public.products p on p.id = c.product_id
    where (p_actor_id is null and c.owner_user_id is null)
       or (p_actor_id is not null and p_actor_id in (c.owner_user_id, c.reviewer_user_id))
  ), matched as materialized (
    select * from visible
    where (p_status is null or status = p_status)
      and (p_channel is null or channel = p_channel)
      and (p_query = '' or position(lower(p_query) in lower(concat_ws(' ', id, sku, feedback_text, merchant_instruction))) > 0)
  ), page_rows as (
    select id, product_id, sku, channel, feedback_text, feedback_locale, merchant_instruction, merchant_locale, status, synthetic, created_at
    from matched
    order by case when p_oldest then created_at end, case when not p_oldest then created_at end desc, id
    limit p_size offset (p_page - 1) * p_size
  ), daily as (
    select (created_at at time zone 'UTC')::date as date, count(*) as count
    from visible
    where created_at >= (date_trunc('day', now() at time zone 'UTC') - interval '89 days') at time zone 'UTC'
    group by 1
  )
  select coalesce((select jsonb_agg(to_jsonb(r) order by case when p_oldest then r.created_at end,
      case when not p_oldest then r.created_at end desc, r.id) from page_rows r), '[]'::jsonb),
    case when p_summary then (select count(*) from matched) else null end,
    case when p_summary then (select jsonb_build_object('open', count(*) filter (where status = 'open'),
      'pending_review', count(*) filter (where status = 'pending_review'),
      'clear', count(*) filter (where status = 'clear')) from visible) end,
    case when p_summary then coalesce((select jsonb_agg(to_jsonb(d) order by d.date) from daily d), '[]'::jsonb) end;
$$;

create function public.reloop_manage_case(
  p_case_id uuid, p_actor_id uuid, p_action text, p_status text, p_expected_status text,
  p_reviewer_id uuid, p_note text
) returns table(case_id uuid)
language plpgsql set search_path = public as $$
declare
  v_case public.cases%rowtype;
begin
  select c.* into v_case from public.cases c
  where c.id = p_case_id and c.owner_user_id = p_actor_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  if p_action = 'reviewer' then
    if p_reviewer_id = p_actor_id then raise exception 'INVALID_REQUEST'; end if;
    if v_case.reviewer_user_id is not distinct from p_reviewer_id then
      return query select p_case_id;
      return;
    end if;
    update public.cases set reviewer_user_id = p_reviewer_id where id = p_case_id;
    insert into public.audit_events(case_id, actor_role, action, entity_id, payload_json)
    values (p_case_id, 'support', 'reviewer_assigned', p_case_id::text,
      jsonb_build_object('userId', p_actor_id, 'previousReviewerUserId', v_case.reviewer_user_id, 'reviewerUserId', p_reviewer_id));
  elsif p_action = 'status' then
    if p_status not in ('open', 'pending_review', 'clear') or nullif(trim(p_note), '') is null then
      raise exception 'INVALID_REQUEST';
    end if;
    if v_case.status <> p_expected_status then raise exception 'CONFLICT'; end if;
    if v_case.status = p_status then
      return query select p_case_id;
      return;
    end if;
    if p_status = 'clear' and exists (select 1 from public.tasks t where t.case_id = p_case_id and t.state <> 'done') then
      raise exception 'REVIEW_BLOCKED';
    end if;
    update public.cases set status = p_status where id = p_case_id;
    insert into public.audit_events(case_id, actor_role, action, entity_id, payload_json)
    values (p_case_id, 'support', 'case_status_changed', p_case_id::text,
      jsonb_build_object('userId', p_actor_id, 'from', v_case.status, 'to', p_status, 'note', p_note));
  else
    raise exception 'INVALID_REQUEST';
  end if;
  return query select p_case_id;
end;
$$;

revoke all on function public.reloop_page_cases(uuid,text,text,public.reloop_platform,boolean,integer,integer,boolean) from public, anon, authenticated;
grant execute on function public.reloop_page_cases(uuid,text,text,public.reloop_platform,boolean,integer,integer,boolean) to service_role;
revoke all on function public.reloop_manage_case(uuid,uuid,text,text,text,uuid,text) from public, anon, authenticated;
grant execute on function public.reloop_manage_case(uuid,uuid,text,text,text,uuid,text) to service_role;

create function public.reloop_reopen_case_for_task() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.state = 'done' then return new; end if;
  perform 1 from public.cases where id = new.case_id for update;
  update public.cases set status = 'open' where id = new.case_id and status = 'clear';
  if found then
    insert into public.audit_events(case_id, actor_role, action, entity_id, payload_json)
    values (new.case_id, new.assigned_role, 'case_status_changed', new.case_id::text,
      jsonb_build_object('from', 'clear', 'to', 'open', 'taskId', new.id));
  end if;
  return new;
end;
$$;
create trigger reopen_case_for_task before insert or update of state on public.tasks
for each row execute function public.reloop_reopen_case_for_task();
