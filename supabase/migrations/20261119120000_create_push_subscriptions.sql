begin;

create table if not exists public.push_subscriptions (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('fcm', 'apns', 'web_push')),
  subscription_key uuid not null,
  credentials jsonb not null,
  primary key (user_id, family_id, provider, subscription_key)
);

create index if not exists push_subscriptions_family_idx
  on public.push_subscriptions (family_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public, anon, authenticated;

-- Bind both reads and commands to current account and membership state.
create or replace function private.push_subscription_actor(p_family_id uuid)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select m.user_id
  from public.family_memberships m
  join public.family_members fm on fm.id = m.member_id and fm.family_id = m.family_id
  join public.families f on f.id = m.family_id
  join auth.users u on u.id = m.user_id
  where m.user_id = auth.uid() and m.family_id = p_family_id
    and m.status = 'active' and fm.status = 'active' and f.status = 'active'
    and u.deleted_at is null and (u.banned_until is null or u.banned_until <= now())
  for share of m, fm, f, u;
$$;

revoke all on function private.push_subscription_actor(uuid) from public, anon, authenticated;
grant execute on function private.push_subscription_actor(uuid) to authenticated;

drop policy if exists push_subscriptions_read_own on public.push_subscriptions;
create policy push_subscriptions_read_own on public.push_subscriptions
  for select to authenticated
  using (user_id = private.push_subscription_actor(family_id));

create or replace function public.register_push_subscription_v1(
  p_family_id uuid, p_provider text, p_subscription_key uuid, p_credentials jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.push_subscription_actor(p_family_id);
begin
  if v_user_id is null then
    raise exception 'Push-Familienkontext nicht zulässig.' using errcode = '42501';
  end if;

  if p_subscription_key is null or p_provider is null
      or p_provider not in ('fcm', 'apns', 'web_push') then
    raise exception 'Ungültige Push-Subscription.' using errcode = '22023';
  end if;

  if octet_length(p_credentials::text) > 8192
      or not coalesce(case p_provider
        when 'web_push' then
          p_credentials = jsonb_build_object(
            'endpoint', p_credentials->>'endpoint',
            'p256dh', p_credentials->>'p256dh',
            'auth', p_credentials->>'auth'
          )
          and p_credentials->>'endpoint' ~ '^https://[^[:space:][:cntrl:]/?#@]+([/?#][^[:space:][:cntrl:]]*)?$'
          and char_length(p_credentials->>'p256dh') <= 256
          and p_credentials->>'p256dh' ~ '^[A-Za-z0-9_-]+$'
          and p_credentials->>'auth' ~ '^[A-Za-z0-9_-]{1,128}$'
        else
          p_credentials = jsonb_build_object('token', p_credentials->>'token')
          and char_length(p_credentials->>'token') <= 4096
          and p_credentials->>'token' ~ '^[^[:space:][:cntrl:]]+$'
      end, false) then
    raise exception 'Ungültige Push-Subscription.' using errcode = '22023';
  end if;

  begin
    insert into public.push_subscriptions as subscription
      (family_id, user_id, provider, subscription_key, credentials)
    values (p_family_id, v_user_id, p_provider, p_subscription_key, p_credentials)
    on conflict (user_id, family_id, provider, subscription_key)
    do update set credentials = excluded.credentials
    where subscription.credentials is distinct from excluded.credentials;
  exception when others then
    raise exception 'Push-Subscription konnte nicht gespeichert werden.';
  end;
end;
$$;

create or replace function public.revoke_push_subscription_v1(
  p_family_id uuid, p_provider text, p_subscription_key uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.push_subscription_actor(p_family_id);
begin
  if v_user_id is null then
    raise exception 'Push-Familienkontext nicht zulässig.' using errcode = '42501';
  end if;

  if p_subscription_key is null or p_provider is null
      or p_provider not in ('fcm', 'apns', 'web_push') then
    raise exception 'Ungültige Push-Subscription.' using errcode = '22023';
  end if;

  delete from public.push_subscriptions s
  where s.family_id = p_family_id and s.user_id = v_user_id
    and s.provider = p_provider and s.subscription_key = p_subscription_key;
end;
$$;

create or replace function public.list_push_subscriptions_v1(p_family_id uuid)
returns table (provider text, subscription_key uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := private.push_subscription_actor(p_family_id);
begin
  if v_user_id is null then
    raise exception 'Push-Familienkontext nicht zulässig.' using errcode = '42501';
  end if;

  return query select s.provider, s.subscription_key
  from public.push_subscriptions s
  where s.family_id = p_family_id and s.user_id = v_user_id;
end;
$$;

revoke all on function public.register_push_subscription_v1(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.revoke_push_subscription_v1(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.list_push_subscriptions_v1(uuid) from public, anon, authenticated;
grant execute on function public.register_push_subscription_v1(uuid, text, uuid, jsonb) to authenticated;
grant execute on function public.revoke_push_subscription_v1(uuid, text, uuid) to authenticated;
grant execute on function public.list_push_subscriptions_v1(uuid) to authenticated;

commit;
