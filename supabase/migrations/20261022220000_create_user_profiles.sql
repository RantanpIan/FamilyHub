create table public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'FamilyHub-Mitglied'
    constraint user_profiles_display_name_length
    check (char_length(btrim(display_name)) between 1 and 80),
  locale text not null default 'de'
    constraint user_profiles_locale_format
    check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  timezone text not null default 'Europe/Berlin'
    constraint user_profiles_timezone_not_empty
    check (char_length(btrim(timezone)) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

revoke all on table public.user_profiles from anon, authenticated;
grant select on table public.user_profiles to authenticated;
grant insert (user_id, display_name) on table public.user_profiles to authenticated;
grant update (display_name) on table public.user_profiles to authenticated;

create policy "Users can read their own profile"
  on public.user_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own profile"
  on public.user_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own profile"
  on public.user_profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function public.set_user_profiles_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.set_user_profiles_updated_at() from public, anon, authenticated;

create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row
  execute function public.set_user_profiles_updated_at();

comment on table public.user_profiles is
  'One private application profile per Supabase Auth user. Profile creation is idempotently ensured by the authenticated client after session establishment; no auth.users trigger is used.';
