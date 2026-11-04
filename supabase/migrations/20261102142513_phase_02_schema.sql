-- Phase 2 — Dashboard and schema
--
-- Every row in the product belongs to exactly one Clerk organization. The
-- organization id travels in the access token (`org_id`); policies below read it
-- from `auth.jwt()` so authorization is a property of the database rather than a
-- filter the application remembers to add.
--
-- Tenancy is enforced twice:
--   1. every table carries `organization_id` with a cascading FK to organizations
--   2. child tables reference their parent on (id, organization_id), so a row
--      cannot point at another tenant's analysis or file even if it forges the
--      `organization_id` column
--
-- Deleting an organization cascades through every table below.

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------
-- Clerk owns the organization lifecycle. This table mirrors the ids so that
-- tenant-scoped rows can hold a real foreign key and cascade on deletion.

create table public.organizations (
  id text primary key,
  name text not null,
  slug text,
  created_at timestamptz not null default now()
);

comment on table public.organizations is
  'Mirror of Clerk organizations. Rows are created by the org sync path, not by users.';

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
-- A project is one repository inside one organization.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  name text not null,
  repository_url text not null,
  default_branch text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, repository_url)
);

-- ---------------------------------------------------------------------------
-- Analyses
-- ---------------------------------------------------------------------------
-- One parse run of a project. `status` is the value the dashboard renders.

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  project_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'fetching', 'selecting', 'parsing', 'storing', 'ready', 'failed')),
  status_message text,
  failed_stage text,
  error_message text,
  commit_sha text,
  framework text,
  file_count integer not null default 0 check (file_count >= 0),
  edge_count integer not null default 0 check (edge_count >= 0),
  route_count integer not null default 0 check (route_count >= 0),
  coverage jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Files
-- ---------------------------------------------------------------------------
-- A parsed source file. `directory` is carried explicitly because every map and
-- grouping view works from it (phase 3).

create table public.files (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  path text not null,
  directory text not null,
  extension text,
  language text,
  lines integer not null default 0 check (lines >= 0),
  content_hash text,
  fan_in integer not null default 0 check (fan_in >= 0),
  fan_out integer not null default 0 check (fan_out >= 0),
  is_entry_point boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (analysis_id, path),
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Edges
-- ---------------------------------------------------------------------------
-- A resolved import. Unresolved imports are not edges; they belong in coverage.
-- `kind` separates the syntaxes that produced the connection.

create table public.edges (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  source_file_id uuid not null,
  target_file_id uuid not null,
  kind text not null check (kind in ('import', 're-export', 'dynamic-import', 'require')),
  created_at timestamptz not null default now(),
  unique (analysis_id, source_file_id, target_file_id, kind),
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade,
  foreign key (source_file_id, organization_id)
    references public.files (id, organization_id) on delete cascade,
  foreign key (target_file_id, organization_id)
    references public.files (id, organization_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Routes
-- ---------------------------------------------------------------------------
-- Exact routes extracted by a framework adapter. A route is never approximated:
-- if method and full path are not both known, no row is written (phase 8).

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  file_id uuid not null,
  method text not null,
  path text not null,
  framework text,
  created_at timestamptz not null default now(),
  unique (analysis_id, method, path),
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade,
  foreign key (file_id, organization_id)
    references public.files (id, organization_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Explanations
-- ---------------------------------------------------------------------------
-- Cached model output for a file or a folded folder. The cache key includes the
-- content hash, model and prompt version so re-pinning a model invalidates only
-- its own entries (phase 10).

create table public.explanations (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  file_id uuid,
  target_path text not null,
  target_kind text not null check (target_kind in ('file', 'folder')),
  content_hash text not null,
  model text not null,
  prompt_version text not null,
  body text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  created_at timestamptz not null default now(),
  unique (analysis_id, target_path, target_kind, content_hash, model, prompt_version),
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade,
  foreign key (file_id, organization_id)
    references public.files (id, organization_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- File roles
-- ---------------------------------------------------------------------------
-- The role a file plays, and who decided it. Convention always wins; the model
-- may only fill files convention could not identify (phase 10).

create table public.file_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  file_id uuid not null,
  role text not null,
  source text not null check (source in ('adapter', 'fallback', 'ai')),
  created_at timestamptz not null default now(),
  unique (analysis_id, file_id),
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade,
  foreign key (file_id, organization_id)
    references public.files (id, organization_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Insights
-- ---------------------------------------------------------------------------
-- Facts computed from the edge list. Four fixed kinds, never a score or grade.

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  kind text not null check (kind in ('cycle', 'unimported', 'high_fan_in', 'oversized')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (analysis_id, organization_id)
    references public.analyses (id, organization_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
-- RLS policies filter on organization_id, so every table indexes it. Child
-- lookups by analysis also get an index.

create index projects_organization_id_idx on public.projects (organization_id);

create index analyses_organization_id_created_at_idx on public.analyses (organization_id, created_at desc);

create index analyses_project_id_idx on public.analyses (project_id);

create index files_organization_id_idx on public.files (organization_id);

create index files_analysis_id_idx on public.files (analysis_id);

create index files_analysis_id_directory_idx on public.files (analysis_id, directory);

create index edges_organization_id_idx on public.edges (organization_id);

create index edges_analysis_id_idx on public.edges (analysis_id);

create index edges_source_file_id_idx on public.edges (source_file_id);

create index edges_target_file_id_idx on public.edges (target_file_id);

create index routes_organization_id_idx on public.routes (organization_id);

create index routes_analysis_id_idx on public.routes (analysis_id);

create index routes_file_id_idx on public.routes (file_id);

create index explanations_organization_id_idx on public.explanations (organization_id);

create index explanations_analysis_id_idx on public.explanations (analysis_id);

create index explanations_file_id_idx on public.explanations (file_id);

create index file_roles_organization_id_idx on public.file_roles (organization_id);

create index file_roles_analysis_id_idx on public.file_roles (analysis_id);

create index file_roles_file_id_idx on public.file_roles (file_id);

create index insights_organization_id_idx on public.insights (organization_id);

create index insights_analysis_id_kind_idx on public.insights (analysis_id, kind);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger analyses_set_updated_at
  before update on public.analyses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
-- Enabled on every table before any policy is written. A table with RLS and no
-- policy returns nothing (visible); a table without RLS returns everything
-- (silent). The predicate is the Clerk organization claim, so the application
-- never needs to know which organization it is reading.

alter table public.organizations enable row level security;

alter table public.projects enable row level security;

alter table public.analyses enable row level security;

alter table public.files enable row level security;

alter table public.edges enable row level security;

alter table public.routes enable row level security;

alter table public.explanations enable row level security;

alter table public.file_roles enable row level security;

alter table public.insights enable row level security;

-- Organizations: a member may read only the organization they are currently in.
create policy "read own organization"
  on public.organizations
  for select
  to authenticated
  using (id = (select auth.jwt() ->> 'org_id'));

-- Every tenant table uses the same predicate. Separate FOR ALL policies keep the
-- read and write expressions identical, which is what makes "switch organization"
-- change the result without changing the query.

create policy "organization members manage projects"
  on public.projects for all to authenticated
  using (organization_id = (select auth.jwt() ->> 'org_id'))
  with check (organization_id = (select auth.jwt() ->> 'org_id'));

create policy "organization members manage analyses"
  on public.analyses for all to authenticated
  using (organization_id = (select auth.jwt() ->> 'org_id'))
  with check (organization_id = (select auth.jwt() ->> 'org_id'));

create policy "organization members manage files"
  on public.files for all to authenticated
  using (organization_id = (select auth.jwt() ->> 'org_id'))
  with check (organization_id = (select auth.jwt() ->> 'org_id'));

create policy "organization members manage edges"
  on public.edges for all to authenticated
  using (organization_id = (select auth.jwt() ->> 'org_id'))
  with check (organization_id = (select auth.jwt() ->> 'org_id'));

create policy "organization members manage routes"
  on public.routes for all to authenticated
  using (organization_id = (select auth.jwt() ->> 'org_id'))
  with check (organization_id = (select auth.jwt() ->> 'org_id'));

create policy "organization members manage explanations"
  on public.explanations for all to authenticated
  using (organization_id = (select auth.jwt() ->> 'org_id'))
  with check (organization_id = (select auth.jwt() ->> 'org_id'));

create policy "organization members manage file roles"
  on public.file_roles for all to authenticated
  using (organization_id = (select auth.jwt() ->> 'org_id'))
  with check (organization_id = (select auth.jwt() ->> 'org_id'));

create policy "organization members manage insights"
  on public.insights for all to authenticated
  using (organization_id = (select auth.jwt() ->> 'org_id'))
  with check (organization_id = (select auth.jwt() ->> 'org_id'));

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
-- RLS decides which rows are visible; grants decide whether the table is
-- reachable at all. `anon` gets nothing. `authenticated` is the Clerk-backed API
-- role.

grant usage on schema public to authenticated;

grant select on public.organizations to authenticated;

grant select, insert, update, delete on
  public.projects,
  public.analyses,
  public.files,
  public.edges,
  public.routes,
  public.explanations,
  public.file_roles,
  public.insights
to authenticated;
