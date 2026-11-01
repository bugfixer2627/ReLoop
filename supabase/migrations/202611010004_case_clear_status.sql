-- Replace the old closed state with clear and remove the unused investigating state.
alter table public.cases drop constraint cases_status_check;
update public.cases set status = 'clear' where status = 'closed';
update public.cases set status = 'open' where status = 'investigating';
alter table public.cases add constraint cases_status_check
  check (status in ('open', 'pending_review', 'clear'));
