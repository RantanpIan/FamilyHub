# Migrations

`20261022220000_create_user_profiles.sql` creates one private profile per
Supabase Auth user. Profile creation is idempotently ensured after an
authenticated session exists. No `auth.users` trigger is used, so a profile
write failure cannot silently roll back or block registration; the client
surfaces the error and retries profile creation on the next authenticated
session/load.

Authenticated users can read and insert only their own profile and update only
`display_name`. The `user_id` column is not update-granted, and no delete access
is granted. The migration contains no family, role, or authorization tables.

Later application tables must keep family data tenant-scoped and use
PostgreSQL Row Level Security (RLS). Do not store real personal data in tests.
