create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create function private.can_read_resource_row(
  p_resource_id uuid,
  p_family_id uuid,
  p_owner_member_id uuid,
  p_visibility text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.families as family
    where family.id = p_family_id
      and family.status = 'active'
      and exists (
        select 1
        from public.family_memberships as actor_membership
        join public.family_members as actor_member
          on actor_member.id = actor_membership.member_id
          and actor_member.family_id = actor_membership.family_id
        where actor_membership.family_id = p_family_id
          and actor_membership.user_id = (select auth.uid())
          and actor_membership.status = 'active'
          and actor_member.status = 'active'
          and (
            actor_membership.member_id = p_owner_member_id
            or p_visibility = 'family'
            or exists (
              select 1
              from public.resource_grants as resource_grant
              where resource_grant.resource_id = p_resource_id
                and resource_grant.family_id = p_family_id
                and resource_grant.grantee_member_id = actor_membership.member_id
                and resource_grant.permission = 'read'
                and resource_grant.status = 'active'
            )
          )
      )
  );
$$;

revoke all on function private.can_read_resource_row(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function private.can_read_resource_row(uuid, uuid, uuid, text)
  to authenticated;

drop policy "Authorized members can read resources" on public.resources;

create policy "Authorized members can read resources"
  on public.resources
  for select
  to authenticated
  using (
    private.can_read_resource_row(id, family_id, owner_member_id, visibility)
  );

comment on function private.can_read_resource_row(uuid, uuid, uuid, text) is
  'Evaluates resource SELECT access from the current row values, including INSERT RETURNING, without re-querying the resource row.';
