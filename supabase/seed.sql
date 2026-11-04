-- Demo rows for development.
--
-- Nothing in the product creates an analysis yet, so the dashboard needs seed
-- data to prove that row-level security scopes the list to the active Clerk
-- organization. The organization ids below mirror the two Clerk organizations
-- this project is developed against. On a fresh database the rows are inserted
-- too; in a real deployment organizations are created by the Clerk sync path.
--
-- Every insert is idempotent, so running the seed twice is safe.

insert into public.organizations (id, name, slug)
values
  ('org_3LYOnW9J8L0fzGBN0GVph4TV16B', 'JSR', 'jsr-1793627701070622492'),
  ('org_3LYSbFAzsAG5l1wax9mtq94YjeU', 'Cartograph Demo', 'cartograph-demo-1793629577246568972')
on conflict do nothing;

insert into public.projects (id, organization_id, name, repository_url, default_branch, repo_owner, repo_name)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    'rookie-cartograph',
    'https://github.com/bhlim-code/rookie-cartograph',
    'main',
    'bhlim-code',
    'rookie-cartograph'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'org_3LYSbFAzsAG5l1wax9mtq94YjeU',
    'acme-api',
    'https://github.com/example/acme-api',
    'main',
    'example',
    'acme-api'
  )
on conflict do nothing;

insert into public.analyses (
  id,
  organization_id,
  project_id,
  status,
  status_message,
  failed_stage,
  error_message,
  commit_sha,
  framework,
  file_count,
  edge_count,
  route_count,
  coverage,
  started_at,
  finished_at,
  created_at,
  updated_at
)
values
  (
    'a1111111-1111-4111-8111-111111111112',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    '11111111-1111-4111-8111-111111111111',
    'failed',
    'Parsing failed',
    'parsing',
    'Unexpected token in src/legacy/parser.js',
    'aa11bb22cc33dd44ee55ff660011223344556677',
    null,
    0,
    0,
    0,
    '{}'::jsonb,
    '2026-11-01 14:27:52+00',
    '2026-11-01 14:28:04+00',
    '2026-11-01 14:27:52+00',
    '2026-11-02 14:27:52+00'
  ),
  (
    'a1111111-1111-4111-8111-111111111111',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    '11111111-1111-4111-8111-111111111111',
    'ready',
    'Analysis complete',
    null,
    null,
    'e1f61cc8f0d9b0f9d1a2c3b4d5e6f708192a3b4c',
    'nextjs',
    3,
    2,
    1,
    '{"parsed": 3, "excluded": 0, "external": 1, "resolved": 2, "unresolved": 0}'::jsonb,
    '2026-11-02 12:27:52+00',
    '2026-11-02 12:29:22+00',
    '2026-11-02 12:27:52+00',
    '2026-11-02 14:27:52+00'
  ),
  (
    'a1111111-1111-4111-8111-111111111113',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    '11111111-1111-4111-8111-111111111111',
    'parsing',
    'Reading imports',
    null,
    null,
    'bb22cc33dd44ee55ff6600112233445566778899',
    null,
    0,
    0,
    0,
    '{}'::jsonb,
    '2026-11-02 14:23:52+00',
    null,
    '2026-11-02 14:23:52+00',
    '2026-11-02 14:27:52+00'
  ),
  (
    'b1111111-1111-4111-8111-111111111111',
    'org_3LYSbFAzsAG5l1wax9mtq94YjeU',
    '22222222-2222-4222-8222-222222222222',
    'ready',
    'Analysis complete',
    null,
    null,
    'cc33dd44ee55ff6600112233445566778899aabb',
    'nestjs',
    3,
    2,
    1,
    '{"parsed": 3, "excluded": 0, "external": 1, "resolved": 2, "unresolved": 0}'::jsonb,
    '2026-10-30 14:27:52+00',
    '2026-10-30 14:29:52+00',
    '2026-10-30 14:27:52+00',
    '2026-11-02 14:27:52+00'
  ),
  (
    'b1111111-1111-4111-8111-111111111112',
    'org_3LYSbFAzsAG5l1wax9mtq94YjeU',
    '22222222-2222-4222-8222-222222222222',
    'pending',
    'Queued',
    null,
    null,
    null,
    null,
    0,
    0,
    0,
    '{}'::jsonb,
    null,
    null,
    '2026-11-02 14:17:52+00',
    '2026-11-02 14:27:52+00'
  )
on conflict do nothing;

insert into public.files (
  id,
  organization_id,
  analysis_id,
  path,
  directory,
  extension,
  language,
  lines,
  content_hash,
  fan_in,
  fan_out,
  is_entry_point
)
values
  (
    'f1111111-1111-4111-8111-111111111111',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    'a1111111-1111-4111-8111-111111111111',
    'app/page.tsx',
    'app',
    'tsx',
    'typescript',
    120,
    'hash-page',
    0,
    2,
    true
  ),
  (
    'f1111111-1111-4111-8111-111111111112',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    'a1111111-1111-4111-8111-111111111111',
    'components/nav.tsx',
    'components',
    'tsx',
    'typescript',
    48,
    'hash-nav',
    1,
    0,
    false
  ),
  (
    'f1111111-1111-4111-8111-111111111113',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    'a1111111-1111-4111-8111-111111111111',
    'lib/api.ts',
    'lib',
    'ts',
    'typescript',
    76,
    'hash-api',
    1,
    0,
    false
  ),
  (
    'f2222222-2222-4222-8222-222222222221',
    'org_3LYSbFAzsAG5l1wax9mtq94YjeU',
    'b1111111-1111-4111-8111-111111111111',
    'src/app.controller.ts',
    'src',
    'ts',
    'typescript',
    42,
    'hash-controller',
    1,
    1,
    true
  ),
  (
    'f2222222-2222-4222-8222-222222222222',
    'org_3LYSbFAzsAG5l1wax9mtq94YjeU',
    'b1111111-1111-4111-8111-111111111111',
    'src/app.service.ts',
    'src',
    'ts',
    'typescript',
    31,
    'hash-service',
    1,
    0,
    false
  ),
  (
    'f2222222-2222-4222-8222-222222222223',
    'org_3LYSbFAzsAG5l1wax9mtq94YjeU',
    'b1111111-1111-4111-8111-111111111111',
    'src/main.ts',
    'src',
    'ts',
    'typescript',
    18,
    'hash-main',
    0,
    1,
    true
  )
on conflict do nothing;

insert into public.edges (
  id,
  organization_id,
  analysis_id,
  source_file_id,
  target_file_id,
  kind
)
values
  (
    'e1111111-1111-4111-8111-111111111111',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    'a1111111-1111-4111-8111-111111111111',
    'f1111111-1111-4111-8111-111111111111',
    'f1111111-1111-4111-8111-111111111112',
    'import'
  ),
  (
    'e1111111-1111-4111-8111-111111111112',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    'a1111111-1111-4111-8111-111111111111',
    'f1111111-1111-4111-8111-111111111111',
    'f1111111-1111-4111-8111-111111111113',
    'import'
  ),
  (
    'e2222222-2222-4222-8222-222222222221',
    'org_3LYSbFAzsAG5l1wax9mtq94YjeU',
    'b1111111-1111-4111-8111-111111111111',
    'f2222222-2222-4222-8222-222222222221',
    'f2222222-2222-4222-8222-222222222222',
    'import'
  ),
  (
    'e2222222-2222-4222-8222-222222222222',
    'org_3LYSbFAzsAG5l1wax9mtq94YjeU',
    'b1111111-1111-4111-8111-111111111111',
    'f2222222-2222-4222-8222-222222222223',
    'f2222222-2222-4222-8222-222222222221',
    'import'
  )
on conflict do nothing;

insert into public.routes (
  id,
  organization_id,
  analysis_id,
  file_id,
  method,
  path,
  framework
)
values
  (
    '31111111-1111-4111-8111-111111111111',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    'a1111111-1111-4111-8111-111111111111',
    'f1111111-1111-4111-8111-111111111111',
    'GET',
    '/',
    'nextjs'
  ),
  (
    '32222222-2222-4222-8222-222222222221',
    'org_3LYSbFAzsAG5l1wax9mtq94YjeU',
    'b1111111-1111-4111-8111-111111111111',
    'f2222222-2222-4222-8222-222222222221',
    'GET',
    '/health',
    'nestjs'
  )
on conflict do nothing;

insert into public.explanations (
  id,
  organization_id,
  analysis_id,
  file_id,
  target_path,
  target_kind,
  content_hash,
  model,
  prompt_version,
  body,
  input_tokens,
  output_tokens
)
values
  (
    'c1111111-1111-4111-8111-111111111112',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    'a1111111-1111-4111-8111-111111111111',
    null,
    'app',
    'folder',
    'hash-app-folder',
    'claude-sonnet-4-5-20250929',
    'explain-v1',
    'The app folder holds the routable surface of the project.',
    280,
    32
  ),
  (
    'c1111111-1111-4111-8111-111111111111',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    'a1111111-1111-4111-8111-111111111111',
    'f1111111-1111-4111-8111-111111111111',
    'app/page.tsx',
    'file',
    'hash-page',
    'claude-sonnet-4-5-20250929',
    'explain-v1',
    'The home page renders the dashboard entry point and imports the navigation and API helpers.',
    320,
    48
  ),
  (
    'c2222222-2222-4222-8222-222222222221',
    'org_3LYSbFAzsAG5l1wax9mtq94YjeU',
    'b1111111-1111-4111-8111-111111111111',
    'f2222222-2222-4222-8222-222222222221',
    'src/app.controller.ts',
    'file',
    'hash-controller',
    'claude-sonnet-4-5-20250929',
    'explain-v1',
    'The controller exposes the health route and delegates work to the service.',
    300,
    40
  )
on conflict do nothing;

insert into public.file_roles (
  id,
  organization_id,
  analysis_id,
  file_id,
  role,
  source
)
values
  (
    'd1111111-1111-4111-8111-111111111112',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    'a1111111-1111-4111-8111-111111111111',
    'f1111111-1111-4111-8111-111111111112',
    'component',
    'adapter'
  ),
  (
    'd1111111-1111-4111-8111-111111111111',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    'a1111111-1111-4111-8111-111111111111',
    'f1111111-1111-4111-8111-111111111111',
    'page',
    'adapter'
  ),
  (
    'd1111111-1111-4111-8111-111111111113',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    'a1111111-1111-4111-8111-111111111111',
    'f1111111-1111-4111-8111-111111111113',
    'util',
    'adapter'
  ),
  (
    'd2222222-2222-4222-8222-222222222221',
    'org_3LYSbFAzsAG5l1wax9mtq94YjeU',
    'b1111111-1111-4111-8111-111111111111',
    'f2222222-2222-4222-8222-222222222221',
    'controller',
    'adapter'
  ),
  (
    'd2222222-2222-4222-8222-222222222223',
    'org_3LYSbFAzsAG5l1wax9mtq94YjeU',
    'b1111111-1111-4111-8111-111111111111',
    'f2222222-2222-4222-8222-222222222223',
    'entry',
    'fallback'
  ),
  (
    'd2222222-2222-4222-8222-222222222222',
    'org_3LYSbFAzsAG5l1wax9mtq94YjeU',
    'b1111111-1111-4111-8111-111111111111',
    'f2222222-2222-4222-8222-222222222222',
    'service',
    'adapter'
  )
on conflict do nothing;

insert into public.insights (
  id,
  organization_id,
  analysis_id,
  kind,
  payload
)
values
  (
    '91111111-1111-4111-8111-111111111112',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    'a1111111-1111-4111-8111-111111111111',
    'high_fan_in',
    '{"file_ids": ["f1111111-1111-4111-8111-111111111112", "f1111111-1111-4111-8111-111111111113"], "threshold": 2}'::jsonb
  ),
  (
    '91111111-1111-4111-8111-111111111111',
    'org_3LYOnW9J8L0fzGBN0GVph4TV16B',
    'a1111111-1111-4111-8111-111111111111',
    'unimported',
    '{"file_ids": ["f1111111-1111-4111-8111-111111111111"]}'::jsonb
  ),
  (
    '92222222-2222-4222-8222-222222222221',
    'org_3LYSbFAzsAG5l1wax9mtq94YjeU',
    'b1111111-1111-4111-8111-111111111111',
    'cycle',
    '{"file_ids": ["f2222222-2222-4222-8222-222222222221", "f2222222-2222-4222-8222-222222222222"]}'::jsonb
  ),
  (
    '92222222-2222-4222-8222-222222222222',
    'org_3LYSbFAzsAG5l1wax9mtq94YjeU',
    'b1111111-1111-4111-8111-111111111111',
    'oversized',
    '{"file_ids": ["f2222222-2222-4222-8222-222222222221"], "threshold": 400}'::jsonb
  )
on conflict do nothing;
