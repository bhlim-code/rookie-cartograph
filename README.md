# Cartograph

Maps of TypeScript and JavaScript codebases, owned by the organization that
needs them.

Phase 1 covers authentication and teams: Clerk sign-in, organizations, an app
shell, and a server-side organization read. Phase 2 adds the tenancy schema,
row-level security, seeded analyses, and the analysis dashboard. Phase 3 adds
the standalone parser: it turns a directory into files, edges and a coverage
report, and writes that result as a typed data file.

## Run locally

```bash
cp .env.example .env.local
# fill in the values below
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Environment values are validated when the server starts, so a missing key fails
at boot instead of surfacing as a confusing request error later.

## Clerk and Supabase setup

1. Create a Clerk application. Enable the sign-in methods you want in the Clerk
   dashboard. The UI in `app/sign-in` and `app/sign-up` uses Clerk's prebuilt
   components, so adding or removing a method is configuration only.
2. Add this app's origin (`http://localhost:3000` in development) as an allowed
   origin.
3. Create a Clerk JWT template named `supabase`. It must include:
   - `role: authenticated`
   - the active organization. Clerk v2 nests it under `o.id`; the database
     helper also accepts a top-level `org_id` for v1 tokens.
4. In Supabase, add a third-party auth integration for the Clerk issuer
   (`https://<instance>.clerk.accounts.dev`).
5. Put the project URL and publishable key in `.env.local`. Do not add
   `@supabase/ssr` or any Supabase session refresh: Clerk owns the session, and
   the Supabase client only forwards the Clerk token.

The application reads the active organization from Clerk's session claims during
server rendering. Supabase access uses the same organization claim on the
`supabase` JWT template, so row-level security can scope rows without asking
Clerk at query time.

## Database

Schema changes live in `supabase/migrations`. The first migration creates
`projects`, `analyses`, `files`, `edges`, `routes`, `explanations`, `file_roles`,
and `insights`; every table owns its rows through an `organization_id` foreign
key that cascades when the organization is deleted. Row-level security is
enabled on all eight tables, and the policies read the organization claim from
the auth token through `current_organization_id()`.

`supabase/seed.sql` contains demo analyses for two organizations because nothing
creates real analyses yet. Every insert is idempotent.

With the Supabase CLI initialized and linked to the project, apply pending
migrations with `supabase db push`. `supabase db reset` applies the migrations
and `seed.sql` to a local stack. The hosted project already has both migration
versions recorded, so they will be skipped there.

The dashboard query deliberately has no organization filter. The token issued
for the request selects the rows; switching the Clerk organization changes the
claim and therefore the list.

## Parser

The parser lives in `lib/parser` and imports no web framework, UI library or
database client. It takes a directory path; cloning or fetching is the caller's
job. Run it from a terminal with nothing else started:

```bash
pnpm parse . --all
pnpm parse . --out .cartograph/repo.json
pnpm parse --read .cartograph/repo.json
pnpm parse . --compare .cartograph/old.json
pnpm parse:typed . --out .cartograph/repo.mts
```

`pnpm parse` prints a summary and writes or reads plain JSON. `--all` lists every
route and unresolved import rather than a sample; `--compare` checks that the
edges an older result already had are byte-identical. `pnpm parse:typed` uses
the typed-module path instead: `.json` is JSON, any other extension is a
TypeScript module whose annotation is checked by `pnpm exec tsc --noEmit`.

The shape is `ParseResult` in `lib/parser/types.ts`. `lib/parser/contract.ts`
checks every field and cross-reference, plus the whole-result invariants: counts
must add up, every edge must name a parsed file, fan-in and fan-out must follow
from the deduped edges, and every file's `module` must be its containing folder.

Coverage reports every import as internal, external, deliberately excluded or
unresolved. Every unresolved import is kept with its file, line, specifier,
kind, reason and detail. Parser tests run with `pnpm test`.

## Routes

| Route                | Purpose                                                    |
| -------------------- | ---------------------------------------------------------- |
| `/`                  | Analyses for the active organization, plus members.        |
| `/start`             | Resolves or creates the first organization, then opens `/`. |
| `/sign-in`           | Clerk's prebuilt sign-in component.                        |
| `/sign-up`           | Clerk's prebuilt sign-up component.                        |

`proxy.ts` protects `/` and `/start` before the page renders.
Signed-out requests are redirected to `/sign-in`; pending or organization-less
sessions go to `/start`.

The workspace lives in `app/(workspace)`. That group's layout renders the app
shell and does not appear in the URL.

## Theme

The theme control offers system, light, and dark. The choice is stored in the
`cartograph-theme` cookie and applied to `<html data-theme="...">` by an inline
script before paint. Colours are semantic CSS variables in `app/globals.css`.

## Checks

```bash
pnpm lint
pnpm test
pnpm exec tsc --noEmit
pnpm build
```
