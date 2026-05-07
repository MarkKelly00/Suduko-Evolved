# Sudoku Evolved — Supabase backend

This folder holds Supabase Edge Function source. The SQL migrations live in
`../db/`.

## Project

- **Project ref:** `riwfohmydwwsgvnhnzfd`
- **URL:** `https://riwfohmydwwsgvnhnzfd.supabase.co`
- **Region:** us-east-1
- **Organization:** Mark Kelly Productions

## Local CLI

```sh
brew install supabase/tap/supabase
supabase login
supabase link --project-ref riwfohmydwwsgvnhnzfd
```

## Migrations

Migrations are sourced from `db/*.sql`. They were applied via the Supabase
MCP tool during initial provisioning. To re-apply manually:

```sh
supabase db push
# or, run files in order against any environment:
psql $DATABASE_URL -f db/001_schema.sql
psql $DATABASE_URL -f db/002_indexes.sql
psql $DATABASE_URL -f db/003_policies.sql
psql $DATABASE_URL -f db/004_views.sql
psql $DATABASE_URL -f db/005_storage.sql
psql $DATABASE_URL -f db/006_security_hardening.sql
```

## Type generation

```sh
npx supabase gen types typescript --project-id riwfohmydwwsgvnhnzfd \
  > src/services/supabase/supabaseTypes.ts
```

The current types file was generated through the MCP `generate_typescript_types`
tool and committed.

## Edge Functions

Placeholders for Phase 8+. They currently return `501 Not Implemented` and
exist so the deployment pipeline is wired ahead of time. To deploy:

```sh
supabase functions deploy submit-level-score
supabase functions deploy submit-challenge-attempt
```

The MVP path inserts directly via PostgREST + RLS; Edge Functions become
the canonical write path once we implement server-side score validation.

## Environment

Client-side env vars live in `../.env` (gitignored). Service-role keys must
**never** appear there — they are only used in Edge Functions and CI.
