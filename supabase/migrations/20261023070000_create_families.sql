create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null
    constraint families_name_length
    check (char_length(btrim(name)) between 1 and 80),
  status text not null default 'active'
    constraint families_status_allowed
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  display_name text not null
    constraint family_members_display_name_length
    check (char_length(btrim(display_name)) between 1 and 80),
  member_type text not null
    constraint family_members_type_allowed
    check (member_type in ('adult', 'child')),
  status text not null default 'active'
    constraint family_members_status_allowed
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_members_id_family_unique unique (id, family_id)
);

create table public.family_memberships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  member_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null
    constraint family_memberships_role_allowed
    check (role in ('family_admin', 'adult', 'child')),
  status text not null default 'active'
    constraint family_memberships_status_allowed
    check (status in ('active', 'pending', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint family_memberships_member_family_fk
    foreign key (member_id, family_id)
    references public.family_members (id, family_id)
    on delete cascade
);

create unique index family_memberships_one_active_user_per_family
  on public.family_memberships (user_id, family_id)
  where status = 'active';

create unique index family_memberships_one_active_user_per_member
  on public.family_memberships (member_id)
  where status = 'active';

create index family_members_family_status_idx
  on public.family_members (family_id, status);

create index family_memberships_user_status_idx
  on public.family_memberships (user_id, status);

create table public.family_creation_requests (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  family_id uuid references public.families (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_memberships enable row level security;
alter table public.family_creation_requests enable row level security;

revoke all on table public.families, public.family_members,
  public.family_memberships, public.family_creation_requests
  from public, anon, authenticated;

grant select on public.families to authenticated;
grant select on public.family_members to authenticated;
grant insert (family_id, display_name, member_type)
  on public.family_members to authenticated;
grant update (display_name) on public.family_members to authenticated;
grant select on public.family_memberships to authenticated;

create function public.has_active_family_membership(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.family_memberships as membership
    where membership.family_id = p_family_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  );
$$;

create function public.is_family_admin(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.family_memberships as membership
    where membership.family_id = p_family_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role = 'family_admin'
  );
$$;

revoke all on function public.has_active_family_membership(uuid)
  from public, anon, authenticated;
revoke all on function public.is_family_admin(uuid)
  from public, anon, authenticated;
grant execute on function public.has_active_family_membership(uuid)
  to authenticated;
grant execute on function public.is_family_admin(uuid)
  to authenticated;

create policy "Active members can read their families"
  on public.families
  for select
  to authenticated
  using (public.has_active_family_membership(id));

create policy "Active members can read family members"
  on public.family_members
  for select
  to authenticated
  using (public.has_active_family_membership(family_id));

create policy "Family admins can add managed members"
  on public.family_members
  for insert
  to authenticated
  with check (
    status = 'active'
    and public.is_family_admin(family_id)
  );

create policy "Family admins can update member names"
  on public.family_members
  for update
  to authenticated
  using (public.is_family_admin(family_id))
  with check (public.is_family_admin(family_id));

create policy "Users can read their own memberships"
  on public.family_memberships
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create function public.list_my_families()
returns table (
  family_id uuid,
  family_name text,
  member_id uuid,
  role text
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select family.id, family.name, membership.member_id, membership.role
  from public.family_memberships as membership
  join public.families as family on family.id = membership.family_id
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and family.status = 'active'
  order by family.created_at, family.id;
$$;

create function public.list_family_members(p_family_id uuid)
returns table (
  family_id uuid,
  member_id uuid,
  display_name text,
  member_type text,
  status text,
  has_login boolean
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not exists (
    select 1
    from public.family_memberships as membership
    join public.families as family on family.id = membership.family_id
    where membership.family_id = p_family_id
      and membership.user_id = v_user_id
      and membership.status = 'active'
      and family.status = 'active'
  ) then
    raise exception using
      errcode = '42501',
      message = 'Active family membership required';
  end if;

  return query
    select
      member.family_id,
      member.id,
      member.display_name,
      member.member_type,
      member.status,
      exists (
        select 1
        from public.family_memberships as linked
        where linked.member_id = member.id
          and linked.status = 'active'
      )
    from public.family_members as member
    where member.family_id = p_family_id
    order by member.created_at, member.id;
end;
$$;

create function public.create_family(p_name text, p_request_id uuid)
returns table (
  family_id uuid,
  family_name text,
  member_id uuid,
  role text
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_family_id uuid;
  v_member_id uuid;
  v_name text := btrim(p_name);
  v_reserved boolean;
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authenticated user required';
  end if;

  if p_request_id is null or v_name is null
    or char_length(v_name) not between 1 and 80 then
    raise exception using
      errcode = '22023',
      message = 'Invalid family name or request id';
  end if;

  insert into public.family_creation_requests (user_id, request_id)
  values (v_user_id, p_request_id)
  on conflict (user_id, request_id) do nothing
  returning true into v_reserved;

  if not coalesce(v_reserved, false) then
    select request.family_id
      into v_family_id
      from public.family_creation_requests as request
      where request.user_id = v_user_id
        and request.request_id = p_request_id;

    if v_family_id is null then
      raise exception using
        errcode = '40001',
        message = 'Family creation request could not be completed';
    end if;

    return query
      select family.id, family.name, membership.member_id, membership.role
      from public.families as family
      join public.family_memberships as membership
        on membership.family_id = family.id
      where family.id = v_family_id
        and membership.user_id = v_user_id
        and membership.status = 'active';
    return;
  end if;

  insert into public.families (name)
  values (v_name)
  returning id into v_family_id;

  insert into public.family_members (family_id, display_name, member_type)
  select v_family_id, profile.display_name, 'adult'
  from public.user_profiles as profile
  where profile.user_id = v_user_id
  returning id into v_member_id;

  if v_member_id is null then
    raise exception using
      errcode = '23503',
      message = 'User profile required to create a family';
  end if;

  insert into public.family_memberships (
    family_id, member_id, user_id, role, status
  )
  values (v_family_id, v_member_id, v_user_id, 'family_admin', 'active');

  update public.family_creation_requests
    set family_id = v_family_id
    where user_id = v_user_id and request_id = p_request_id;

  return query
    select family.id, family.name, membership.member_id, membership.role
    from public.families as family
    join public.family_memberships as membership
      on membership.family_id = family.id
    where family.id = v_family_id
      and membership.user_id = v_user_id
      and membership.status = 'active';
end;
$$;

revoke all on function public.list_my_families()
  from public, anon, authenticated;
revoke all on function public.list_family_members(uuid)
  from public, anon, authenticated;
revoke all on function public.create_family(text, uuid)
  from public, anon, authenticated;
grant execute on function public.list_my_families() to authenticated;
grant execute on function public.list_family_members(uuid) to authenticated;
grant execute on function public.create_family(text, uuid) to authenticated;

create trigger families_set_updated_at
  before update on public.families
  for each row execute function public.set_user_profiles_updated_at();

create trigger family_members_set_updated_at
  before update on public.family_members
  for each row execute function public.set_user_profiles_updated_at();

create trigger family_memberships_set_updated_at
  before update on public.family_memberships
  for each row execute function public.set_user_profiles_updated_at();

comment on table public.families is
  'Tenant boundary for family organization data; every client query is filtered by active membership.';
comment on table public.family_members is
  'Family people are distinct from Auth accounts; managed members have no membership row.';
comment on table public.family_memberships is
  'Family-scoped Auth link and role; direct client writes are prohibited.';
comment on table public.family_creation_requests is
  'Private idempotency ledger used only by the authenticated atomic create_family RPC.';
