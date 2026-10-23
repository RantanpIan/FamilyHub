create or replace function public.set_resource_visibility(
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
      errcode = 'P0001',
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
      errcode = 'P0001',
      message = 'Resource version conflict';
  end if;

  return v_version;
end;
$$;

comment on function public.set_resource_visibility(uuid, text, integer) is
  'Changes visibility for the linked active owner and enforces optimistic version checks; stale versions use an application error code, not serialization failure.';
