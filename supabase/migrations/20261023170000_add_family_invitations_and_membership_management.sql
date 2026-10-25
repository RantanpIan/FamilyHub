create extension if not exists pgcrypto with schema extensions;

create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  target_member_id uuid not null,
  invited_email text not null
    constraint family_invitations_email_length
    check (char_length(invited_email) between 3 and 254),
  role text not null default 'adult'
    constraint family_invitations_role_allowed
    check (role = 'adult'),
  token_hash bytea not null
    constraint family_invitations_token_hash_length
    check (octet_length(token_hash) = 32),
  status text not null default 'pending'
    constraint family_invitations_status_allowed
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete restrict,
  revoked_at timestamptz,
  constraint family_invitations_member_family_fk
    foreign key (target_member_id, family_id)
    references public.family_members (id, family_id)
    on delete cascade,
  constraint family_invitations_status_timestamps
    check (
      (status = 'accepted' and accepted_at is not null and accepted_by is not null)
      or (status <> 'accepted' and accepted_at is null and accepted_by is null)
    ),
  constraint family_invitations_revocation_timestamp
    check ((status = 'revoked') = (revoked_at is not null))
);

create unique index family_invitations_token_hash_unique
  on public.family_invitations (token_hash);
create unique index family_invitations_one_pending_member
  on public.family_invitations (family_id, target_member_id)
  where status = 'pending';
create unique index family_invitations_one_pending_email
  on public.family_invitations (family_id, invited_email)
  where status = 'pending';
create index family_invitations_expiration_idx
  on public.family_invitations (family_id, expires_at)
  where status = 'pending';

alter table public.family_invitations enable row level security;
revoke all on table public.family_invitations from public, anon, authenticated;

create function public.create_family_invitation(
  p_family_id uuid,
  p_target_member_id uuid,
  p_invited_email text
)
returns table (
  invitation_id uuid,
  target_member_name text,
  role text,
  expires_at timestamptz,
  invitation_token text
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(btrim(p_invited_email));
  v_token text := translate(
    rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='),
    '+/',
    '-_'
  );
  v_member public.family_members%rowtype;
  v_invitation_id uuid;
  v_expires_at timestamptz := now() + interval '7 days';
begin
  if v_user_id is null or not public.is_family_admin(p_family_id) then
    raise exception using errcode = '42501', message = 'Family administrator required';
  end if;

  if v_email is null
    or char_length(v_email) not between 3 and 254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = '22023', message = 'Valid invitation email required';
  end if;

  select member.*
    into v_member
    from public.family_members as member
    join public.families as family on family.id = member.family_id
    where member.id = p_target_member_id
      and member.family_id = p_family_id
      and member.member_type = 'adult'
      and member.status = 'active'
      and family.status = 'active'
    for update of member;

  if not found then
    raise exception using errcode = '22023', message = 'Eligible family member required';
  end if;

  if exists (
    select 1 from public.family_memberships as membership
    where membership.family_id = p_family_id
      and membership.member_id = p_target_member_id
      and membership.status = 'active'
  ) then
    raise exception using errcode = '23505', message = 'Family member already has an active account';
  end if;

  if exists (
    select 1
    from public.family_memberships as membership
    join auth.users as linked_user on linked_user.id = membership.user_id
    where membership.family_id = p_family_id
      and membership.member_id = p_target_member_id
      and (
        linked_user.email is null
        or lower(btrim(linked_user.email)) <> v_email
      )
  ) then
    raise exception using errcode = '23505', message = 'Family member is associated with a different account';
  end if;

  update public.family_invitations as invitation
    set status = 'expired'
    where invitation.family_id = p_family_id
      and invitation.status = 'pending'
      and invitation.expires_at <= now()
      and (
        invitation.target_member_id = p_target_member_id
        or invitation.invited_email = v_email
      );

  if exists (
    select 1 from public.family_invitations as invitation
    where invitation.family_id = p_family_id
      and invitation.status = 'pending'
      and invitation.expires_at > now()
      and (
        invitation.target_member_id = p_target_member_id
        or invitation.invited_email = v_email
      )
  ) then
    raise exception using errcode = '23505', message = 'An active invitation already exists';
  end if;

  insert into public.family_invitations (
    family_id,
    target_member_id,
    invited_email,
    token_hash,
    invited_by,
    expires_at
  )
  values (
    p_family_id,
    p_target_member_id,
    v_email,
    extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'),
    v_user_id,
    v_expires_at
  )
  returning id into v_invitation_id;

  return query
    select v_invitation_id, v_member.display_name, 'adult'::text, v_expires_at, v_token;
end;
$$;

create function public.list_family_memberships_admin(p_family_id uuid)
returns table (
  membership_id uuid,
  member_id uuid,
  role text,
  status text
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
begin
  if auth.uid() is null or not public.is_family_admin(p_family_id) then
    raise exception using errcode = '42501', message = 'Family administrator required';
  end if;

  return query
    select distinct on (membership.member_id)
      membership.id,
      membership.member_id,
      membership.role,
      membership.status
    from public.family_memberships as membership
    join public.family_members as member
      on member.id = membership.member_id
      and member.family_id = membership.family_id
    where membership.family_id = p_family_id
    order by membership.member_id, membership.updated_at desc,
      membership.created_at desc, membership.id desc;
end;
$$;

create function public.list_family_invitations_admin(p_family_id uuid)
returns table (
  invitation_id uuid,
  target_member_id uuid,
  target_member_name text,
  role text,
  status text,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
begin
  if auth.uid() is null or not public.is_family_admin(p_family_id) then
    raise exception using errcode = '42501', message = 'Family administrator required';
  end if;

  return query
    select
      invitation.id,
      invitation.target_member_id,
      member.display_name,
      invitation.role,
      case
        when invitation.status = 'pending' and invitation.expires_at <= now()
          then 'expired'
        else invitation.status
      end,
      invitation.created_at,
      invitation.expires_at
    from public.family_invitations as invitation
    join public.family_members as member
      on member.id = invitation.target_member_id
      and member.family_id = invitation.family_id
    where invitation.family_id = p_family_id
    order by invitation.created_at desc, invitation.id;
end;
$$;

create function public.preview_family_invitation(p_token text)
returns table (
  family_id uuid,
  family_name text,
  target_member_id uuid,
  target_member_name text,
  role text,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
begin
  if v_user_id is null or p_token is null or char_length(p_token) <> 43 then
    raise exception using errcode = '42501', message = 'Valid invitation and confirmed account required';
  end if;

  select lower(btrim(auth_user.email)), auth_user.email_confirmed_at
    into v_email, v_email_confirmed_at
    from auth.users as auth_user
    where auth_user.id = v_user_id;

  if v_email is null or v_email_confirmed_at is null then
    raise exception using errcode = '42501', message = 'Valid invitation and confirmed account required';
  end if;

  return query
    select family.id, family.name, member.id, member.display_name,
      invitation.role, invitation.expires_at
    from public.family_invitations as invitation
    join public.families as family on family.id = invitation.family_id
    join public.family_members as member
      on member.id = invitation.target_member_id
      and member.family_id = invitation.family_id
    where invitation.token_hash =
      extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
      and invitation.status = 'pending'
      and invitation.expires_at > now()
      and invitation.invited_email = v_email
      and family.status = 'active'
      and member.status = 'active';

  if not found then
    raise exception using errcode = '42501', message = 'Valid invitation and confirmed account required';
  end if;
end;
$$;

create function public.accept_family_invitation(p_token text)
returns table (family_id uuid)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
  v_invitation public.family_invitations%rowtype;
  v_member public.family_members%rowtype;
  v_membership_id uuid;
begin
  if v_user_id is null or p_token is null or char_length(p_token) <> 43 then
    raise exception using errcode = '42501', message = 'Valid invitation and confirmed account required';
  end if;

  select lower(btrim(auth_user.email)), auth_user.email_confirmed_at
    into v_email, v_email_confirmed_at
    from auth.users as auth_user
    where auth_user.id = v_user_id;

  if v_email is null or v_email_confirmed_at is null then
    raise exception using errcode = '42501', message = 'Valid invitation and confirmed account required';
  end if;

  select invitation.*
    into v_invitation
    from public.family_invitations as invitation
    where invitation.token_hash =
      extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
    for update;

  if not found
    or v_invitation.invited_email <> v_email
    or v_invitation.status not in ('pending', 'accepted')
    or (v_invitation.status = 'pending' and v_invitation.expires_at <= now())
    or (v_invitation.status = 'accepted' and v_invitation.accepted_by <> v_user_id) then
    raise exception using errcode = '42501', message = 'Valid invitation and confirmed account required';
  end if;

  if v_invitation.status = 'accepted' then
    return query select v_invitation.family_id;
    return;
  end if;

  select member.*
    into v_member
    from public.family_members as member
    join public.families as family on family.id = member.family_id
    where member.id = v_invitation.target_member_id
      and member.family_id = v_invitation.family_id
      and member.member_type = 'adult'
      and member.status = 'active'
      and family.status = 'active'
    for update of member;

  if not found then
    raise exception using errcode = '42501', message = 'Invitation target is no longer available';
  end if;

  if exists (
    select 1 from public.family_memberships as membership
    where membership.family_id = v_invitation.family_id
      and membership.user_id = v_user_id
      and membership.status = 'active'
      and membership.member_id <> v_invitation.target_member_id
  ) then
    raise exception using errcode = '23505', message = 'Account already belongs to this family';
  end if;

  if exists (
    select 1 from public.family_memberships as membership
    where membership.member_id = v_invitation.target_member_id
      and membership.user_id <> v_user_id
  ) then
    raise exception using errcode = '23505', message = 'Family member is associated with another account';
  end if;

  select membership.id
    into v_membership_id
    from public.family_memberships as membership
    where membership.member_id = v_invitation.target_member_id
      and membership.family_id = v_invitation.family_id
      and membership.user_id = v_user_id
      and membership.status = 'active'
    limit 1;

  if v_membership_id is null then
    select membership.id
      into v_membership_id
      from public.family_memberships as membership
      where membership.member_id = v_invitation.target_member_id
        and membership.family_id = v_invitation.family_id
        and membership.user_id = v_user_id
        and membership.status = 'revoked'
      order by membership.updated_at desc, membership.id desc
      limit 1
      for update;

    if v_membership_id is not null then
      update public.family_memberships
        set role = 'adult', status = 'active'
        where id = v_membership_id;
    else
      insert into public.family_memberships (
        family_id, member_id, user_id, role, status
      )
      values (
        v_invitation.family_id,
        v_invitation.target_member_id,
        v_user_id,
        'adult',
        'active'
      )
      returning id into v_membership_id;
    end if;
  end if;

  update public.family_invitations
    set status = 'accepted',
        accepted_at = now(),
        accepted_by = v_user_id
    where id = v_invitation.id;

  return query select v_invitation.family_id;
end;
$$;

create function public.revoke_family_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_family_id uuid;
begin
  select invitation.family_id
    into v_family_id
    from public.family_invitations as invitation
    where invitation.id = p_invitation_id
    for update;

  if not found or auth.uid() is null or not public.is_family_admin(v_family_id) then
    raise exception using errcode = '42501', message = 'Family administrator required';
  end if;

  update public.family_invitations
    set status = 'revoked', revoked_at = now()
    where id = p_invitation_id
      and status = 'pending'
      and expires_at > now();

  if not found then
    raise exception using errcode = '22023', message = 'Active invitation required';
  end if;
end;
$$;

create function public.deactivate_family_membership(p_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_family_id uuid;
  v_role text;
begin
  select membership.family_id, membership.role
    into v_family_id, v_role
    from public.family_memberships as membership
    where membership.id = p_membership_id
      and membership.status = 'active'
    for update;

  if not found or auth.uid() is null or not public.is_family_admin(v_family_id) then
    raise exception using errcode = '42501', message = 'Family administrator required';
  end if;

  perform 1
    from public.families as family
    where family.id = v_family_id
    for update;

  if v_role = 'family_admin' and (
    select count(*)
    from public.family_memberships as membership
    where membership.family_id = v_family_id
      and membership.role = 'family_admin'
      and membership.status = 'active'
  ) <= 1 then
    raise exception using errcode = '23514', message = 'The last family administrator cannot be deactivated';
  end if;

  update public.family_memberships
    set status = 'revoked'
    where id = p_membership_id
      and status = 'active';
end;
$$;

revoke all on function public.create_family_invitation(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.list_family_memberships_admin(uuid)
  from public, anon, authenticated;
revoke all on function public.list_family_invitations_admin(uuid)
  from public, anon, authenticated;
revoke all on function public.preview_family_invitation(text)
  from public, anon, authenticated;
revoke all on function public.accept_family_invitation(text)
  from public, anon, authenticated;
revoke all on function public.revoke_family_invitation(uuid)
  from public, anon, authenticated;
revoke all on function public.deactivate_family_membership(uuid)
  from public, anon, authenticated;
grant execute on function public.create_family_invitation(uuid, uuid, text)
  to authenticated;
grant execute on function public.list_family_memberships_admin(uuid)
  to authenticated;
grant execute on function public.list_family_invitations_admin(uuid)
  to authenticated;
grant execute on function public.preview_family_invitation(text)
  to authenticated;
grant execute on function public.accept_family_invitation(text)
  to authenticated;
grant execute on function public.revoke_family_invitation(uuid)
  to authenticated;
grant execute on function public.deactivate_family_membership(uuid)
  to authenticated;

comment on table public.family_invitations is
  'Private invitation records; only hash-only, seven-day tokens are stored and operations use authenticated RPCs.';
