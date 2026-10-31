-- Run only through npm run db:reset against a dedicated demo project.
-- Preserve products, evidence, snapshots and any human-verified rule records.
do $$
begin
  if exists (select 1 from public.products where not synthetic)
    or exists (select 1 from public.cases where not synthetic) then
    raise exception 'Reset refused: non-synthetic product/case records exist.';
  end if;
end;
$$;

-- Flush any deferred head checks before truncating within the same transaction.
set constraints artifacts_head_version_fk immediate;
truncate table public.artifact_reviews, public.revision_events, public.findings,
  public.tasks, public.audit_events, public.artifact_versions, public.artifacts,
  public.cases;
set constraints artifacts_head_version_fk deferred;
