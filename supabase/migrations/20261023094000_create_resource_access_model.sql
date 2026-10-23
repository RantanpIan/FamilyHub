create table public.resources (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  owner_member_id uuid not null,
  resource_type text not null
    constraint resources_type_allowed
    check (resource_type in (
      'calendar_event',
      'school_item',
      'import_artifact',
      'task',
      'document'
    )),
  visibility text not null default 'private'
    constraint resources_visibility_allowed
    check (visibility in ('private', 'family')),
  version integer not null default 1
    constraint resources_version_positive
    check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_id_family_unique unique (id, family_id),
  constraint resources_owner_member_family_fk
    foreign key (owner_member_id, family_id)
    references public.family_members (id, family_id)
    on delete cascade
);

create index resources_family_visibility_idx
  on public.resources (family_id, visibility);
create index resources_owner_family_idx
  on public.resources (owner_member_id, family_id);

create table public.resource_grants (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null,
  family_id uuid not null,
  grantee_member_id uuid not null,
  permission text not null default 'read'
    constraint resource_grants_permission_allowed
    check (permission = 'read'),
  status text not null default 'active'
    constraint resource_grants_status_allowed
    check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint resource_grants_resource_family_fk
    foreign key (resource_id, family_id)
    references public.resources (id, family_id)
    on delete cascade,
  constraint resource_grants_member_family_fk
    foreign key (grantee_member_id, family_id)
    references public.family_members (id, family_id)
    on delete cascade,
  constraint resource_grants_unique_recipient
    unique (resource_id, family_id, grantee_member_id),
  constraint resource_grants_revocation_time_consistent
    check ((status = 'active' and revoked_at is null)
      or (status = 'revoked' and revoked_at is not null))
);

create index resource_grants_recipient_status_idx
  on public.resource_grants (family_id, grantee_member_id, status);

alter table public.resources enable row level security;
alter table public.resource_grants enable row level security;

revoke all on table public.resources, public.resource_grants
  from public, anon, authenticated;

grant select on public.resources to authenticated;
grant insert (family_id, owner_member_id, resource_type, visibility)
  on public.resources to authenticated;
grant delete on public.resources to authenticated;
grant select on public.resource_grants to authenticated;

create function public.resource_actor_is_active_member(
  p_family_id uuid,
  p_member_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.family_memberships as membership
    join public.family_members as member
      on member.id = membership.member_id
      and member.family_id = membership.family_id
    join public.families as family on family.id = membership.family_id
    where membership.family_id = p_family_id
      and membership.member_id = p_member_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and member.status = 'active'
      and family.status = 'active'
  );
$$;

create function public.owns_resource(p_resource_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.resources as resource
    join public.family_memberships as membership
      on membership.family_id = resource.family_id
      and membership.member_id = resource.owner_member_id
    join public.family_members as member
      on member.id = membership.member_id
      and member.family_id = membership.family_id
    join public.families as family on family.id = resource.family_id
    where resource.id = p_resource_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and member.status = 'active'
      and family.status = 'active'
  );
$$;

create function public.can_read_resource(p_resource_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.resources as resource
    join public.families as family on family.id = resource.family_id
    where resource.id = p_resource_id
      and family.status = 'active'
      and exists (
        select 1
        from public.family_memberships as actor_membership
        join public.family_members as actor_member
          on actor_member.id = actor_membership.member_id
          and actor_member.family_id = actor_membership.family_id
        where actor_membership.family_id = resource.family_id
          and actor_membership.user_id = (select auth.uid())
          and actor_membership.status = 'active'
          and actor_member.status = 'active'
          and (
            actor_membership.member_id = resource.owner_member_id
            or resource.visibility = 'family'
            or exists (
              select 1
              from public.resource_grants as resource_grant
              where resource_grant.resource_id = resource.id
                and resource_grant.family_id = resource.family_id
                and resource_grant.grantee_member_id = actor_membership.member_id
                and resource_grant.permission = 'read'
                and resource_grant.status = 'active'
            )
          )
      )
  );
$$;

create function public.can_update_resource(p_resource_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select public.owns_resource(p_resource_id);
$$;

create function public.can_delete_resource(p_resource_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select public.owns_resource(p_resource_id);
$$;

revoke all on function public.resource_actor_is_active_member(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.owns_resource(uuid)
  from public, anon, authenticated;
revoke all on function public.can_read_resource(uuid)
  from public, anon, authenticated;
revoke all on function public.can_update_resource(uuid)
  from public, anon, authenticated;
revoke all on function public.can_delete_resource(uuid)
  from public, anon, authenticated;
grant execute on function public.resource_actor_is_active_member(uuid, uuid)
  to authenticated;
grant execute on function public.owns_resource(uuid)
  to authenticated;
grant execute on function public.can_read_resource(uuid)
  to authenticated;
grant execute on function public.can_update_resource(uuid)
  to authenticated;
grant execute on function public.can_delete_resource(uuid)
  to authenticated;

create policy "Authorized members can read resources"
  on public.resources
  for select
  to authenticated
  using (public.can_read_resource(id));

create policy "Members can create resources for their linked profile"
  on public.resources
  for insert
  to authenticated
  with check (
    visibility in ('private', 'family')
    and public.resource_actor_is_active_member(family_id, owner_member_id)
  );

create policy "Owners can update their resources"
  on public.resources
  for update
  to authenticated
  using (public.can_update_resource(id))
  with check (public.can_update_resource(id));

create policy "Owners can delete their resources"
  on public.resources
  for delete
  to authenticated
  using (public.can_delete_resource(id));

create policy "Owners can inspect their resource grants"
  on public.resource_grants
  for select
  to authenticated
  using (public.owns_resource(resource_id));

create function public.set_resource_visibility(
  p_resource_id uuid,
  p_visibility text,
  p_expected_version integer
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_family_id uuid;
  v_owner_member_id uuid;
  v_version integer;
begin
  if p_visibility is null
    or p_visibility not in ('private', 'family')
    or p_expected_version is null
    or p_expected_version < 1 then
    raise exception using
      errcode = '22023',
      message = 'Invalid visibility or expected version';
  end if;

  select resource.family_id, resource.owner_member_id, resource.version
    into v_family_id, v_owner_member_id, v_version
    from public.resources as resource
    join public.family_memberships as membership
      on membership.family_id = resource.family_id
      and membership.member_id = resource.owner_member_id
    join public.family_members as member
      on member.id = membership.member_id
      and member.family_id = membership.family_id
    join public.families as family on family.id = resource.family_id
    where resource.id = p_resource_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and member.status = 'active'
      and family.status = 'active'
    for update of resource, membership;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Resource owner access required';
  end if;

  if v_version <> p_expected_version then
    raise exception using
      errcode = '40001',
      message = 'Resource version conflict';
  end if;

  update public.resources
    set visibility = p_visibility,
        version = version + 1,
        updated_at = clock_timestamp()
    where id = p_resource_id
      and family_id = v_family_id
      and owner_member_id = v_owner_member_id
      and version = p_expected_version
  returning version into v_version;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'Resource version conflict';
  end if;

  return v_version;
end;
$$;

create function public.grant_resource_read(
  p_resource_id uuid,
  p_grantee_member_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_family_id uuid;
  v_owner_member_id uuid;
  v_grant_id uuid;
begin
  select resource.family_id, resource.owner_member_id
    into v_family_id, v_owner_member_id
    from public.resources as resource
    join public.family_memberships as membership
      on membership.family_id = resource.family_id
      and membership.member_id = resource.owner_member_id
    join public.family_members as member
      on member.id = membership.member_id
      and member.family_id = membership.family_id
    join public.families as family on family.id = resource.family_id
    where resource.id = p_resource_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and member.status = 'active'
      and family.status = 'active'
    for update of resource, membership;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Resource owner access required';
  end if;

  if p_grantee_member_id = v_owner_member_id
    or not exists (
      select 1
      from public.family_members as grantee
      where grantee.id = p_grantee_member_id
        and grantee.family_id = v_family_id
        and grantee.status = 'active'
    ) then
    raise exception using
      errcode = '22023',
      message = 'Invalid grant recipient';
  end if;

  insert into public.resource_grants (
    resource_id, family_id, grantee_member_id, permission, status
  )
  values (p_resource_id, v_family_id, p_grantee_member_id, 'read', 'active')
  on conflict (resource_id, family_id, grantee_member_id)
  do update set
    permission = 'read',
    status = 'active',
    revoked_at = null,
    updated_at = clock_timestamp()
  returning id into v_grant_id;

  return v_grant_id;
end;
$$;

create function public.revoke_resource_read(
  p_resource_id uuid,
  p_grantee_member_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_family_id uuid;
  v_updated boolean;
begin
  select resource.family_id
    into v_family_id
    from public.resources as resource
    join public.family_memberships as membership
      on membership.family_id = resource.family_id
      and membership.member_id = resource.owner_member_id
    join public.family_members as member
      on member.id = membership.member_id
      and member.family_id = membership.family_id
    join public.families as family on family.id = resource.family_id
    where resource.id = p_resource_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and member.status = 'active'
      and family.status = 'active'
    for update of resource, membership;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Resource owner access required';
  end if;

  update public.resource_grants
    set status = 'revoked',
        revoked_at = coalesce(revoked_at, clock_timestamp()),
        updated_at = clock_timestamp()
    where resource_id = p_resource_id
      and family_id = v_family_id
      and grantee_member_id = p_grantee_member_id
      and status = 'active';

  v_updated := found;
  return v_updated;
end;
$$;

revoke all on function public.set_resource_visibility(uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.grant_resource_read(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.revoke_resource_read(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.set_resource_visibility(uuid, text, integer)
  to authenticated;
grant execute on function public.grant_resource_read(uuid, uuid)
  to authenticated;
grant execute on function public.revoke_resource_read(uuid, uuid)
  to authenticated;

comment on table public.resources is
  'Family-scoped authorization registry; contains no calendar, school, or document payload.';
comment on table public.resource_grants is
  'Member-scoped read grants only; changes are owner-authorized through dedicated RPCs.';
comment on function public.set_resource_visibility(uuid, text, integer) is
  'Changes visibility for the linked active owner and enforces optimistic version checks.';
comment on function public.grant_resource_read(uuid, uuid) is
  'Idempotently grants read access to an active member of the resource family.';
comment on function public.revoke_resource_read(uuid, uuid) is
  'Revokes a member read grant; subsequent row-level reads are denied.';
