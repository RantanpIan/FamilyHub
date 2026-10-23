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

`20261023094000_create_resource_access_model.sql` adds an authorization
registry, not calendar/school/document payload tables. A resource references
its family and owner member through a composite foreign key. `resource_grants`
references both resource and recipient member in the same family, permits
only `read`, and has one durable row per recipient so grant/revoke/regrant
operations are idempotent.

Resources default to `private` as a provisional security default. The product
default remains open. An authenticated account can create a resource only for
an active member profile linked to that account in that family. Active
same-family members can read `family` resources; private resources are readable
only by the linked owner or by an explicitly granted active member. Admin
roles confer no private-resource exception. Owner-only operations are required
for visibility changes, grants, revocations and deletion; read grants never
grant update/delete access.

SELECT, INSERT, UPDATE and DELETE have separate resource policies. Client table
privileges do not permit resource field updates or direct grant writes.
Visibility updates use an optimistic `expectedVersion` check. The narrow
`SECURITY DEFINER` RPCs verify `auth.uid()`, current family/member status and
ownership, set a fixed `search_path`, and are executable only by
`authenticated`. Authorization helper functions return booleans and do not
return resource metadata to non-readers.

The migrations `20261022220000_create_user_profiles.sql` and
`20261023070000_create_families.sql` are already applied in the development
cloud project. Do not modify or rerun them as a correction; the new resource
model is a separate additive migration and must only be applied in disposable
test environments during this task.

`20261023145000_fix_resource_returning_select_policy.sql` is an additive
correction for authenticated `INSERT ... RETURNING`: the SELECT policy evaluates
the current resource row values directly rather than re-querying the row being
inserted. It retains active-family, active-membership, owner, family-visibility
and read-grant checks.

`20261023150000_use_application_conflict_sqlstate.sql` preserves the
optimistic-version check for visibility changes but reports stale versions as
an application error (`P0001`), not SQLSTATE `40001` which denotes a database
serialization failure. This prevents the PostgREST transaction layer from
retrying a known application-level conflict.

Later application tables must keep family data tenant-scoped and use
PostgreSQL Row Level Security (RLS). Do not store real personal data in tests.
