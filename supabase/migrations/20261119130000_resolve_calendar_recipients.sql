-- FH-CX-018: dieselbe Leseregel für RLS und Empfängerauflösung.
create function private.can_user_read_resource(p_resource_id uuid, p_user_id uuid)
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
          and actor_membership.user_id = p_user_id
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

revoke all on function private.can_user_read_resource(uuid, uuid)
  from public, anon, authenticated, service_role;

create or replace function public.can_read_resource(p_resource_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select private.can_user_read_resource(p_resource_id, (select auth.uid()));
$$;

create function public.resolve_calendar_recipients_v1(
  p_resource_id uuid,
  p_kind text,
  p_member_ids uuid[] default '{}'
)
returns table (member_id uuid, user_id uuid)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select membership.member_id, membership.user_id
  from public.resources as resource
  join public.family_memberships as membership on membership.family_id = resource.family_id
  where resource.id = p_resource_id
    and (
      exists (select 1 from public.calendar_events where resource_id = resource.id)
      or exists (select 1 from public.calendar_series where resource_id = resource.id)
    )
    and public.can_read_resource(resource.id)
    and (
      (p_kind = 'all' and cardinality(p_member_ids) = 0)
      or (p_kind = 'selected_members' and membership.member_id = any(p_member_ids))
    )
    and membership.status = 'active'
    and private.can_user_read_resource(resource.id, membership.user_id)
  order by membership.member_id;
$$;

revoke all on function public.resolve_calendar_recipients_v1(uuid, text, uuid[])
  from public, anon, authenticated, service_role;
grant execute on function public.resolve_calendar_recipients_v1(uuid, text, uuid[])
  to authenticated;
