-- FH-CX-009 (inkrementeller Entwurf): atomare Einzeltermin-Operationen.
-- Keine direkten Client-Schreibrechte auf calendar_events; resources-RLS bleibt
-- die einzige Quelle fuer Ownership und Sichtbarkeit.

create table private.calendar_create_requests (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  request_payload jsonb not null,
  event_id uuid,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);
alter table private.calendar_create_requests enable row level security;
revoke all on private.calendar_create_requests from public, anon, authenticated;

create function private.validate_calendar_event_input(
  p_title text,
  p_is_all_day boolean,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_start_date date,
  p_end_date_exclusive date,
  p_time_zone text
)
returns void
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
begin
  if p_title is null or char_length(btrim(p_title)) not between 1 and 180
    or p_is_all_day is null
    or p_time_zone is null
    or char_length(btrim(p_time_zone)) not between 1 and 64
    or not exists (
      select 1 from pg_catalog.pg_timezone_names tz
      where tz.name = p_time_zone
    )
    or not (
      (p_is_all_day = false
        and p_starts_at is not null and p_ends_at is not null
        and p_starts_at < p_ends_at
        and p_start_date is null and p_end_date_exclusive is null)
      or
      (p_is_all_day = true
        and p_starts_at is null and p_ends_at is null
        and p_start_date is not null and p_end_date_exclusive is not null
        and p_start_date < p_end_date_exclusive)
    )
  then
    raise exception using errcode = 'P0001',
      message = 'Ungueltige Kalenderdaten';
  end if;
end;
$$;
revoke all on function private.validate_calendar_event_input(
  text, boolean, timestamptz, timestamptz, date, date, text
) from public, anon, authenticated;

create function public.create_calendar_event(
  p_family_id uuid,
  p_title text,
  p_is_all_day boolean,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_start_date date,
  p_end_date_exclusive date,
  p_time_zone text,
  p_visibility text,
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_member_id uuid;
  v_input jsonb;
  v_stored_input jsonb;
  v_event_id uuid;
begin
  if v_user_id is null or p_family_id is null or p_request_id is null
     or p_visibility is null or p_visibility not in ('private','family')
  then
    raise exception using errcode = 'P0001',
      message = 'Kalenderaktion nicht erlaubt';
  end if;
  perform private.validate_calendar_event_input(
    p_title, p_is_all_day, p_starts_at, p_ends_at,
    p_start_date, p_end_date_exclusive, p_time_zone
  );

  -- Selbst angelegte Einzeltermine: Eigentümer aus der aktuellen Sitzung,
  -- niemals aus einer clientseitig behaupteten Member-ID.
  select m.member_id into v_member_id
  from public.family_memberships m
  join public.family_members fm
    on fm.id = m.member_id and fm.family_id = m.family_id
  join public.families f on f.id = m.family_id
  where m.user_id = v_user_id and m.family_id = p_family_id
    and m.status = 'active' and fm.status = 'active' and f.status = 'active'
  for share of m, fm, f;

  if v_member_id is null then
    raise exception using errcode = 'P0001',
      message = 'Kalenderaktion nicht erlaubt';
  end if;

  v_input := jsonb_build_object(
    'family_id', p_family_id,
    'title', btrim(p_title),
    'is_all_day', p_is_all_day,
    'starts_at', p_starts_at,
    'ends_at', p_ends_at,
    'start_date', p_start_date,
    'end_date_exclusive', p_end_date_exclusive,
    'time_zone', p_time_zone,
    'visibility', p_visibility
  );

  insert into private.calendar_create_requests(
    user_id, request_id, request_payload
  ) values (v_user_id, p_request_id, v_input)
  on conflict (user_id, request_id) do nothing;

  select request_payload, event_id into v_stored_input, v_event_id
  from private.calendar_create_requests
  where user_id = v_user_id and request_id = p_request_id
  for update;

  if v_stored_input is distinct from v_input then
    raise exception using errcode = 'P0001',
      message = 'Anfragekennung bereits anderweitig verwendet';
  end if;

  if v_event_id is not null then
    if not public.owns_resource(v_event_id) then
      raise exception using errcode = 'P0001',
        message = 'Kalenderaktion nicht erlaubt';
    end if;
    return v_event_id;
  end if;

  insert into public.resources (
    family_id, owner_member_id, resource_type, visibility
  ) values (
    p_family_id, v_member_id, 'calendar_event', p_visibility
  ) returning id into v_event_id;

  insert into public.calendar_events (
    resource_id, family_id, title, is_all_day,
    starts_at, ends_at, start_date, end_date_exclusive, time_zone
  ) values (
    v_event_id, p_family_id, btrim(p_title), p_is_all_day,
    p_starts_at, p_ends_at, p_start_date, p_end_date_exclusive, p_time_zone
  );

  update private.calendar_create_requests
    set event_id = v_event_id
    where user_id = v_user_id and request_id = p_request_id;

  return v_event_id;
end;
$$;

create function public.update_calendar_event(
  p_resource_id uuid,
  p_expected_version integer,
  p_title text,
  p_is_all_day boolean,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_start_date date,
  p_end_date_exclusive date,
  p_time_zone text
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_version integer;
begin
  if (select auth.uid()) is null
    or p_resource_id is null
    or p_expected_version is null or p_expected_version < 1
  then
    raise exception using errcode = 'P0001',
      message = 'Kalenderaktion nicht erlaubt';
  end if;

  perform private.validate_calendar_event_input(
    p_title, p_is_all_day, p_starts_at, p_ends_at,
    p_start_date, p_end_date_exclusive, p_time_zone
  );

  select r.version into v_version
  from public.resources r
  join public.calendar_events e on e.resource_id = r.id
  where r.id = p_resource_id and r.resource_type = 'calendar_event'
    and public.owns_resource(r.id)
  for update of r;

  if v_version is null then
    raise exception using errcode = 'P0001', message = 'Kalenderaktion nicht erlaubt';
  end if;
  if v_version <> p_expected_version then
    raise exception using errcode = 'P0001', message = 'Termin wurde zwischenzeitlich geaendert';
  end if;

  update public.calendar_events
  set title = btrim(p_title),
    is_all_day = p_is_all_day,
    starts_at = p_starts_at,
    ends_at = p_ends_at,
    start_date = p_start_date,
    end_date_exclusive = p_end_date_exclusive,
    time_zone = p_time_zone,
    updated_at = now()
  where resource_id = p_resource_id;

  update public.resources
    set version = version + 1, updated_at = now()
    where id = p_resource_id
    returning version into v_version;

  return v_version;
end;
$$;

create function public.delete_calendar_event(
  p_resource_id uuid,
  p_expected_version integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_version integer;
begin
  if (select auth.uid()) is null or p_resource_id is null
    or p_expected_version is null or p_expected_version < 1
  then
    raise exception using errcode = 'P0001', message = 'Kalenderaktion nicht erlaubt';
  end if;

  select r.version into v_version
  from public.resources r
  join public.calendar_events e on e.resource_id = r.id
  where r.id = p_resource_id and r.resource_type = 'calendar_event'
    and public.owns_resource(r.id)
  for update of r;

  if v_version is null then
    raise exception using errcode = 'P0001', message = 'Kalenderaktion nicht erlaubt';
  end if;
  if v_version <> p_expected_version then
    raise exception using errcode = 'P0001', message = 'Termin wurde zwischenzeitlich geaendert';
  end if;

  delete from public.resources where id = p_resource_id;
  return true;
end;
$$;

revoke all on function public.create_calendar_event(
  uuid, text, boolean, timestamptz, timestamptz, date, date, text, text, uuid
) from public, anon, authenticated;
revoke all on function public.update_calendar_event(
  uuid, integer, text, boolean, timestamptz, timestamptz, date, date, text
) from public, anon, authenticated;
revoke all on function public.delete_calendar_event(uuid, integer)
  from public, anon, authenticated;

grant execute on function public.create_calendar_event(
  uuid, text, boolean, timestamptz, timestamptz, date, date, text, text, uuid
) to authenticated;
grant execute on function public.update_calendar_event(
  uuid, integer, text, boolean, timestamptz, timestamptz, date, date, text
) to authenticated;
grant execute on function public.delete_calendar_event(uuid, integer)
  to authenticated;

comment on function public.create_calendar_event(
  uuid, text, boolean, timestamptz, timestamptz, date, date, text, text, uuid
) is 'Atomarer, idempotenter Einzeltermin. Eigentümer wird aus aktiver Mitgliedschaft abgeleitet.';
