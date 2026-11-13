alter table public.family_invitations
  add column if not exists declined_at timestamptz,
  add column if not exists declined_by uuid references auth.users (id) on delete restrict;

alter table public.family_invitations
  drop constraint if exists family_invitations_status_allowed;

alter table public.family_invitations
  add constraint family_invitations_status_allowed
  check (status in ('pending', 'accepted', 'declined', 'revoked', 'expired'));

alter table public.family_invitations
  add constraint family_invitations_decline_timestamp
  check ((status = 'declined') = (declined_at is not null and declined_by is not null));

create index if not exists family_invitations_pending_email_idx
  on public.family_invitations (invited_email, created_at)
  where status = 'pending';

create function public.list_my_pending_family_invitations()
returns table (
  invitation_id uuid,
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
  if v_user_id is null then
    return;
  end if;

  select lower(btrim(auth_user.email)), auth_user.email_confirmed_at
    into v_email, v_email_confirmed_at
    from auth.users as auth_user
    where auth_user.id = v_user_id;

  if v_email is null or v_email_confirmed_at is null then
    return;
  end if;

  return query
    select invitation.id,
      family.id,
      family.name,
      member.id,
      member.display_name,
      invitation.role,
      invitation.expires_at
    from public.family_invitations as invitation
    join public.families as family
      on family.id = invitation.family_id
      and family.status = 'active'
    join public.family_members as member
      on member.id = invitation.target_member_id
      and member.family_id = invitation.family_id
      and member.status = 'active'
    where invitation.invited_email = v_email
      and invitation.status = 'pending'
      and invitation.expires_at > now()
    order by invitation.created_at, invitation.id;
end;
$$;

create function public.respond_to_family_invitation(
  p_invitation_id uuid,
  p_decision text
)
returns table (
  family_id uuid,
  decision text
)
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
  if p_decision not in ('accepted', 'declined', 'remind_later') then
    raise exception using errcode = '22023', message = 'Valid invitation decision required';
  end if;

  if v_user_id is null then
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
    where invitation.id = p_invitation_id
    for update;

  if not found
    or v_invitation.invited_email <> v_email then
    raise exception using errcode = '42501', message = 'Valid invitation and confirmed account required';
  end if;

  if v_invitation.status = 'accepted'
    and v_invitation.accepted_by = v_user_id
    and p_decision = 'accepted' then
    return query select v_invitation.family_id, 'accepted'::text;
    return;
  end if;

  if v_invitation.status = 'declined'
    and v_invitation.declined_by = v_user_id
    and p_decision = 'declined' then
    return query select v_invitation.family_id, 'declined'::text;
    return;
  end if;

  if v_invitation.status <> 'pending'
    or v_invitation.expires_at <= now() then
    raise exception using errcode = '42501', message = 'Valid invitation and confirmed account required';
  end if;

  if p_decision = 'remind_later' then
    return query select null::uuid, 'remind_later'::text;
    return;
  end if;

  if p_decision = 'declined' then
    update public.family_invitations
      set status = 'declined',
          declined_at = now(),
          declined_by = v_user_id
      where id = v_invitation.id;
    return query select v_invitation.family_id, 'declined'::text;
    return;
  end if;

  select member.*
    into v_member
    from public.family_members as member
    join public.families as family
      on family.id = member.family_id
    where member.id = v_invitation.target_member_id
      and member.family_id = v_invitation.family_id
      and member.member_type = 'adult'
      and member.status = 'active'
      and family.status = 'active'
    for update of member;

  if not found then
    raise exception using errcode = '42501', message = 'Valid invitation and confirmed account required';
  end if;

  if exists (
    select 1
    from public.family_memberships as membership
    where membership.family_id = v_invitation.family_id
      and membership.user_id = v_user_id
      and membership.status = 'active'
      and membership.member_id <> v_invitation.target_member_id
  ) then
    raise exception using errcode = '23505', message = 'Account already belongs to this family';
  end if;

  if exists (
    select 1
    from public.family_memberships as membership
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

  return query select v_invitation.family_id, 'accepted'::text;
end;
$$;

revoke all on function public.list_my_pending_family_invitations()
  from public, anon, authenticated;
revoke all on function public.respond_to_family_invitation(uuid, text)
  from public, anon, authenticated;
grant execute on function public.list_my_pending_family_invitations()
  to authenticated;
grant execute on function public.respond_to_family_invitation(uuid, text)
  to authenticated;

comment on function public.list_my_pending_family_invitations() is
  'Returns only non-expired invitations matching the authenticated, confirmed Auth email; no token or invited email is exposed.';
comment on function public.respond_to_family_invitation(uuid, text) is
  'Atomically accepts, declines, or defers one email-bound invitation without merging families; repeated accept/decline calls by the same user are idempotent.';

