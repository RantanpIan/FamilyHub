# Migrations

`20261022220000_create_user_profiles.sql` creates one private profile per
Supabase Auth user. Profile creation is idempotently ensured after an
authenticated session exists. No `auth.users` trigger is used, so a profile
write failure cannot silently roll back or block registration; the client
surfaces the error and retries profile creation on the next authenticated
session/load.

Authenticated users can read and insert only their own profile and update only
`display_name`. The `user_id` column is not update-granted, and no delete access
is granted. `20261023070000_create_families.sql` adds tenant-scoped families,
people and authenticated memberships. Composite foreign keys prevent a membership from
combining a member with a different family. Partial unique indexes enforce at
most one active account per family and at most one active account per member.
Managed people have no `auth.users` row or synthetic login association.

`create_family` is the only client-callable family bootstrap write. It derives
identity from `auth.uid()` and atomically creates the family, the creator's
adult member record and the initial `family_admin` membership. A private
per-user request ledger makes retries idempotent. Direct client writes to
families and memberships are not granted. Family member insertion and name
updates require an active family administrator through RLS. Other authenticated
members can read only families to which they actively belong.

The narrowly scoped `SECURITY DEFINER` helpers and RPCs pin `search_path`,
qualify database objects and are executable only by `authenticated`. The
family-listing RPC is `SECURITY INVOKER`. No role or membership can be changed
from user metadata or browser input.

Later application tables must keep family data tenant-scoped and use
PostgreSQL Row Level Security (RLS). Do not store real personal data in tests.
