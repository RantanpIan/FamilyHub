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

`20261023170000_add_family_invitations_and_membership_management.sql` adds a
hash-only invitation table with no direct client table grants. Its authenticated
RPCs bind creation/listing/revocation to a current family administrator;
preview and acceptance require a confirmed Auth email matching the invitation.
Acceptance locks the invitation and target member and inserts/reactivates the
existing member's membership atomically. Codes are server-generated, 256-bit,
one-use, and expire after seven days. Repeated acceptance by the same account
is idempotent. Membership deactivation is admin-only, preserves the person and
resources, and cannot remove the last active family administrator. The current
role is fixed to `adult`; uncertain child or role-change permissions remain
disabled pending `FH-OPEN-001`.

Later application tables must keep family data tenant-scoped and use
PostgreSQL Row Level Security (RLS). Do not store real personal data in tests.


`20261112180000_create_calendar_events.sql` is the incremental FH-CX-008 calendar
data-model foundation. `calendar_events` stores one real event's content;
a composite FK (`resource_id`, `family_id`, `resource_type`) ties the
content to a matching `calendar_event` resource in the existing access registry.
There is no second owner or visibility column. RLS on the payload uses
`can_read_resource(resource_id)` and all direct authenticated writes to the
payload are denied. The resource registry's existing owner/family/grant
semantics remain authoritative.

Timed events use two `timestamptz` instants and a display time-zone name;
all-day events use local dates with an exclusive end date. An interval CHECK
disallows inverted intervals and mixed representations. Strict IANA zone
validation before accepting client writes is a required follow-up. This schema
does not implement recurring events, occurrence exceptions, reminders,
participants, school projections, learner plans or calendar UI. Crucially,
an authorized atomic create/update RPC has **not** yet been introduced,
so normal users cannot create a calendar event payload until that separate
use case is developed and tested.

`tests/integration/calendar-events.rls.test.ts` covers read isolation,
owner privacy, same-family sharing, anonymous/direct-write denial, duration
constraints, all-day dates, mismatched resource linkage, and access revocation.
Tests use only disposable local Supabase data. Do not apply this migration
to the linked cloud project before successful CI, migration review and
explicit approval.


`20261112193000_add_calendar_event_commands.sql` adds a narrow authenticated
RPC boundary for single events: `create_calendar_event`,
`update_calendar_event`, and `delete_calendar_event`. The create RPC derives
the owner member from an active auth membership in the requested family,
atomically creates a `resources` row and the matching `calendar_events`
payload, and uses a private request ledger to make retries with the same
user/request ID idempotent. Reusing a request ID with changed payload fails
closed. Returned IDs are scoped to the requester; a deleted request cannot
recreate its previous event.

Updates/deletions require current resource ownership and match the caller's
`expectedVersion`, preventing silent concurrent overwrites. The payload
table continues to deny direct browser writes; users may only call the narrow
SECURITY DEFINER operations. Inputs are validated in PostgreSQL, including
IANA time zone names through `pg_timezone_names`. Permission tests cover
private/family visibility, cross-family reads and writes, idempotency and
stale-version denial.

**Deployment order:** apply the FH-CX-008 table migration first, then this
new RPC migration in a reviewed development-cloud rollout. GitHub pull
requests and CI do not migrate the connected cloud automatically. Run no
cloud `db reset`, and do not upload real family data into disposable CI.


`20261112210000_add_calendar_event_subject.sql` is an additive calendar
migration: `subject_member_id` describes the family member **for whom**
an appointment was created, independently of the resource owner (creator).
It is foreign-keyed to a member of the same family. Existing records are
backfilled from the resource owner; the legacy create RPC remains functional
with NULL meaning own appointment. The new authenticated RPC
`create_calendar_event_for_member` is atomic and preserves the original
create-request idempotency contract, adding a private request-to-subject
ledger to prevent a retry changing its target. For private appointments
whose subject is not their creator, the RPC creates an explicit
`resource_grants` read permission for that subject only; unrelated
members never gain access. The subject has no permission to edit or delete.
The SQL migration does **not** link user accounts to families; that must
use the existing invitation workflow.

Deploy only after the disposable CI migration and RLS tests and code review.
No data reset; all existing migrations remain immutable.
