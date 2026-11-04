-- Fix the organization claim for Clerk v2 session tokens.
--
-- The Phase 2 schema read `auth.jwt() ->> 'org_id'`. Clerk v1 tokens carried the
-- active organization at the top level, but v2 tokens nest it:
--
--   { "o": { "id": "org_...", "rol": "admin", "slg": "..." },
--     "role": "authenticated", "sub": "user_...", "v": 2 }
--
-- The old predicate therefore evaluated to null and every policy returned no
-- rows. `current_organization_id()` reads the v2 claim and falls back to the v1
-- one, so the claim shape lives in exactly one place instead of nine policies.
--
-- Policies keep using `(select ...)` so the claim is evaluated once per query
-- rather than once per row.

create or replace function public.current_organization_id()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    auth.jwt() -> 'o' ->> 'id',
    auth.jwt() ->> 'org_id'
  );
$$;

comment on function public.current_organization_id() is
  'Active Clerk organization id from the access token (v2 `o.id`, v1 `org_id`).';

-- Organizations: a member may read only the organization they are currently in.
drop policy if exists "read own organization" on public.organizations;

create policy "read own organization"
  on public.organizations
  for select
  to authenticated
  using (id = (select public.current_organization_id()));

-- Every tenant table uses the same predicate. Separate FOR ALL policies keep the
-- read and write expressions identical, which is what makes "switch organization"
-- change the result without changing the query.

drop policy if exists "organization members manage projects" on public.projects;

create policy "organization members manage projects"
  on public.projects for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

drop policy if exists "organization members manage analyses" on public.analyses;

create policy "organization members manage analyses"
  on public.analyses for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

drop policy if exists "organization members manage files" on public.files;

create policy "organization members manage files"
  on public.files for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

drop policy if exists "organization members manage edges" on public.edges;

create policy "organization members manage edges"
  on public.edges for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

drop policy if exists "organization members manage routes" on public.routes;

create policy "organization members manage routes"
  on public.routes for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

drop policy if exists "organization members manage explanations" on public.explanations;

create policy "organization members manage explanations"
  on public.explanations for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

drop policy if exists "organization members manage file roles" on public.file_roles;

create policy "organization members manage file roles"
  on public.file_roles for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));

drop policy if exists "organization members manage insights" on public.insights;

create policy "organization members manage insights"
  on public.insights for all to authenticated
  using (organization_id = (select public.current_organization_id()))
  with check (organization_id = (select public.current_organization_id()));
