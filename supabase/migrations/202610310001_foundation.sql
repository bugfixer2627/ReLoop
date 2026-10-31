-- ReLoop foundation. Apply once using scripts/database.mjs or Supabase SQL editor.
-- Dedicated DEMO project only. Supabase provides anon/authenticated/service_role.

create type public.reloop_platform as enum ('shopify_us', 'amazon_de', 'alibaba_intl');
create type public.reloop_locale as enum ('zh-CN', 'en-US', 'de-DE', 'ar-AE');
create type public.reloop_role as enum ('support', 'marketing', 'qa', 'compliance');
create type public.reloop_review_status as enum ('draft', 'pending_review', 'approved', 'changes_requested', 'rejected', 'blocked');
create type public.reloop_finding_category as enum ('evidence', 'market_law', 'platform_rule');
create type public.reloop_severity as enum ('info', 'warning', 'blocker');
create type public.reloop_evidence_status as enum ('supported', 'documented_mismatch', 'needs_evidence', 'unverified_observation');
create type public.reloop_rule_status as enum ('verified', 'needs_rule_verification');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique check (length(sku) > 0),
  name text not null,
  attributes_json jsonb not null default '{}' check (jsonb_typeof(attributes_json) = 'object'),
  source_version text not null,
  synthetic boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.evidence_sources (
  id text primary key,
  product_id uuid not null references public.products(id),
  kind text not null check (kind in ('specification', 'support_policy')),
  content text not null,
  numeric_claim_json jsonb,
  test_conditions jsonb not null default '{}' check (jsonb_typeof(test_conditions) = 'object'),
  source_version text not null,
  provenance text not null,
  verification_status text not null check (verification_status in ('documented', 'needs_evidence')),
  synthetic boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.platform_listings (
  id text primary key,
  product_id uuid not null references public.products(id),
  platform public.reloop_platform not null,
  market text not null,
  locale public.reloop_locale not null,
  segment text not null check (segment in ('b2c', 'b2b')),
  fields_json jsonb not null check (jsonb_typeof(fields_json) = 'object'),
  numeric_claim_json jsonb,
  snapshot_version text not null,
  synthetic boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, platform, snapshot_version),
  check ((platform = 'shopify_us' and market = 'US' and segment = 'b2c')
    or (platform = 'amazon_de' and market = 'DE' and segment = 'b2c')
    or (platform = 'alibaba_intl' and market = 'global_b2b' and segment = 'b2b'))
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  channel public.reloop_platform not null,
  feedback_text text not null check (length(trim(feedback_text)) between 1 and 10000),
  feedback_locale public.reloop_locale not null,
  merchant_instruction text not null check (length(trim(merchant_instruction)) between 1 and 4000),
  merchant_locale public.reloop_locale not null check (merchant_locale in ('zh-CN', 'en-US')),
  status text not null default 'open' check (status in ('open', 'investigating', 'pending_review', 'closed')),
  synthetic boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.rules (
  id text primary key,
  category text not null check (category in ('market_law', 'platform_rule', 'merchant_policy')),
  market text not null,
  platform public.reloop_platform,
  segment text not null check (segment in ('b2c', 'b2b', 'all')),
  source_url text not null check (source_url ~ '^https://'),
  excerpt text,
  checked_at timestamptz,
  applicability text not null,
  verification_status public.reloop_rule_status not null default 'needs_rule_verification',
  check (category <> 'platform_rule' or platform is not null),
  check (verification_status <> 'verified' or (length(trim(excerpt)) > 0 and excerpt is not null and checked_at is not null))
);

-- Artifact = stable identity; versions below hold immutable generated content.
create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id),
  kind text not null check (kind in ('investigation_summary', 'support_reply', 'listing_correction')),
  platform public.reloop_platform,
  market text not null,
  segment text not null check (segment in ('b2c', 'b2b', 'internal')),
  latest_version integer not null default 1 check (latest_version > 0),
  created_at timestamptz not null default now(),
  unique (id, case_id),
  check (kind = 'investigation_summary' or platform is not null),
  check ((kind = 'investigation_summary' and platform is null and segment = 'internal')
    or (kind = 'support_reply' and platform = 'shopify_us' and market = 'US' and segment = 'b2c')
    or (kind = 'listing_correction' and (
      (platform = 'shopify_us' and market = 'US' and segment = 'b2c')
      or (platform = 'amazon_de' and market = 'DE' and segment = 'b2c')
      or (platform = 'alibaba_intl' and market = 'global_b2b' and segment = 'b2b'))))
);

create table public.artifact_versions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null,
  case_id uuid not null,
  version integer not null check (version > 0),
  locale public.reloop_locale not null,
  language_status text not null check (language_status in ('ready', 'beta', 'unavailable')),
  content_json jsonb not null check (jsonb_typeof(content_json) = 'object'),
  source_ids text[] not null check (cardinality(source_ids) > 0),
  review_status public.reloop_review_status not null default 'draft',
  validation_status text not null default 'pending' check (validation_status in ('pending', 'checked', 'needs_evidence', 'needs_rule_verification', 'blocked')),
  created_at timestamptz not null default now(),
  foreign key (artifact_id, case_id) references public.artifacts(id, case_id),
  unique (artifact_id, version),
  unique (artifact_id, case_id, version),
  unique (id, case_id),
  unique (id, artifact_id, case_id, version)
);

alter table public.artifacts add constraint artifacts_head_version_fk
  foreign key (id, case_id, latest_version)
  references public.artifact_versions(artifact_id, case_id, version)
  deferrable initially deferred;

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id),
  artifact_version_id uuid,
  listing_id text references public.platform_listings(id),
  category public.reloop_finding_category not null,
  severity public.reloop_severity not null,
  code text not null,
  rule_id text references public.rules(id),
  rule_status public.reloop_rule_status,
  evidence_status public.reloop_evidence_status,
  source_ids text[] not null check (cardinality(source_ids) > 0),
  original_span text,
  proposed_span text,
  explanation_zh text not null,
  explanation_en text not null,
  created_at timestamptz not null default now(),
  foreign key (artifact_version_id, case_id) references public.artifact_versions(id, case_id),
  check ((category = 'evidence' and evidence_status is not null)
    or (category in ('market_law', 'platform_rule') and rule_id is not null and rule_status is not null))
);

create table public.revision_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  artifact_id uuid not null,
  prompt_text text not null check (length(trim(prompt_text)) between 1 and 4000),
  prompt_locale public.reloop_locale not null check (prompt_locale in ('zh-CN', 'en-US')),
  from_version integer not null check (from_version > 0),
  to_version integer not null check (to_version = from_version + 1),
  created_at timestamptz not null default now(),
  foreign key (artifact_id, case_id, from_version) references public.artifact_versions(artifact_id, case_id, version),
  foreign key (artifact_id, case_id, to_version) references public.artifact_versions(artifact_id, case_id, version),
  unique (artifact_id, to_version)
);

create table public.artifact_reviews (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null,
  artifact_id uuid not null,
  artifact_version_id uuid not null,
  version integer not null,
  reviewer_role public.reloop_role not null,
  decision public.reloop_review_status not null check (decision in ('approved', 'changes_requested', 'rejected')),
  comment text not null default '' check (length(comment) <= 2000),
  created_at timestamptz not null default now(),
  foreign key (artifact_version_id, artifact_id, case_id, version)
    references public.artifact_versions(id, artifact_id, case_id, version)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id),
  assigned_role public.reloop_role not null,
  kind text not null check (kind in ('qa_investigation', 'compliance_review')),
  title text not null check (length(trim(title)) between 1 and 200),
  description text not null check (length(trim(description)) between 1 and 4000),
  state text not null default 'open' check (state in ('open', 'in_progress', 'done')),
  source_ids text[] not null check (cardinality(source_ids) > 0),
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id),
  actor_role public.reloop_role not null,
  action text not null,
  entity_id text not null,
  payload_json jsonb not null default '{}' check (jsonb_typeof(payload_json) = 'object'),
  created_at timestamptz not null default now()
);

create index evidence_product_idx on public.evidence_sources(product_id);
create index listings_product_idx on public.platform_listings(product_id);
create index cases_product_idx on public.cases(product_id, created_at desc);
create index artifacts_case_idx on public.artifacts(case_id);
create index versions_case_idx on public.artifact_versions(case_id);
create index findings_case_idx on public.findings(case_id, artifact_version_id);
create index rules_applicability_idx on public.rules(category, market, platform);
create index revisions_case_idx on public.revision_events(case_id, created_at);
create index reviews_case_idx on public.artifact_reviews(case_id, artifact_id, version);
create index tasks_case_idx on public.tasks(case_id);
create index audit_case_idx on public.audit_events(case_id, created_at);

-- Content/history cannot be rewritten. Only review/check status can advance.
create function public.reloop_protect_version_content() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Artifact versions are immutable; use the explicit demo reset.';
  end if;
  if (to_jsonb(new) - 'review_status' - 'validation_status') is distinct from
     (to_jsonb(old) - 'review_status' - 'validation_status') then
    raise exception 'Artifact content is immutable; create a new version.';
  end if;
  return new;
end;
$$;
create trigger protect_version_content before update or delete on public.artifact_versions
  for each row execute function public.reloop_protect_version_content();

create function public.reloop_protect_event() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'History is append-only; use the explicit demo reset.';
end;
$$;
create trigger protect_audit before update or delete on public.audit_events for each row execute function public.reloop_protect_event();
create trigger protect_revision before update or delete on public.revision_events for each row execute function public.reloop_protect_event();
create trigger protect_review before update or delete on public.artifact_reviews for each row execute function public.reloop_protect_event();
create trigger protect_evidence before update or delete on public.evidence_sources for each row execute function public.reloop_protect_event();
create trigger protect_listing before update or delete on public.platform_listings for each row execute function public.reloop_protect_event();

-- No public/anonymous access, even if a project has permissive default grants.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'products', 'evidence_sources', 'platform_listings', 'cases', 'rules',
    'artifacts', 'artifact_versions', 'findings', 'revision_events',
    'artifact_reviews', 'tasks', 'audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end;
$$;
