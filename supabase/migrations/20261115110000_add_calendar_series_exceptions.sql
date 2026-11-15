-- FH-CX-012: single-occurrence overrides for the FH-CX-011 series projection.
-- An exception is never a second resource. It inherits family, ownership and
-- visibility from the series resource and is therefore fail-closed through the
-- same resource access registry.

create table public.calendar_series_exceptions (
  series_resource_id uuid not null,
  family_id uuid not null,
  occurrence_key text not null
    constraint calendar_series_exception_key_length
    check (char_length(btrim(occurrence_key)) between 10 and 64),
  exception_version integer not null default 1
    constraint calendar_series_exception_version_positive
    check (exception_version > 0),
  is_cancelled boolean not null default false,
  title text,
  is_all_day boolean,
  starts_at timestamptz,
  ends_at timestamptz,
  start_date date,
  end_date_exclusive date,
  time_zone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (series_resource_id, occurrence_key),
  constraint calendar_series_exception_series_fk
    foreign key (series_resource_id, family_id)
    references public.calendar_series (resource_id, family_id)
    on delete cascade,
  constraint calendar_series_exception_shape_check check (
    (
      is_cancelled = true
      and title is null and is_all_day is null
      and starts_at is null and ends_at is null
      and start_date is null and end_date_exclusive is null
      and time_zone is null
    )
    or (
      is_cancelled = false
      and title is not null
      and is_all_day is not null
      and time_zone is not null
      and (
        (
          is_all_day = false
          and starts_at is not null and ends_at is not null
          and starts_at < ends_at
          and start_date is null and end_date_exclusive is null
        )
        or (
          is_all_day = true
          and starts_at is null and ends_at is null
          and start_date is not null and end_date_exclusive is not null
          and start_date < end_date_exclusive
        )
      )
    )
  )
);

create index calendar_series_exceptions_family_idx
  on public.calendar_series_exceptions (family_id, series_resource_id);

alter table public.calendar_series_exceptions enable row level security;

create policy "Read calendar series exceptions through series access"
  on public.calendar_series_exceptions
  for select to authenticated
  using (public.can_read_resource(series_resource_id));

revoke all on table public.calendar_series_exceptions
  from public, anon, authenticated;
grant select on table public.calendar_series_exceptions to authenticated;

create table private.calendar_series_exception_requests (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  series_resource_id uuid not null,
  occurrence_key text not null,
  request_payload jsonb not null,
  result_exception_version integer,
  result_series_version integer,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

alter table private.calendar_series_exception_requests enable row level security;
revoke all on table private.calendar_series_exception_requests
  from public, anon, authenticated;

create function public.set_calendar_series_exception(
  p_series_resource_id uuid,
  p_occurrence_key text,
  p_request_id uuid,
  p_expected_series_version integer,
  p_expected_exception_version integer,
  p_action text,
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
  v_uid uuid := (select auth.uid());
  v_series record;
  v_occurrence record;
  v_current_exception_version integer;
  v_exception_version integer;
  v_series_version integer;
  v_payload jsonb;
  v_existing_payload jsonb;
  v_existing_exception_version integer;
  v_existing_series_version integer;
begin
  if v_uid is null
     or p_series_resource_id is null
     or p_occurrence_key is null
     or p_request_id is null
     or p_expected_series_version is null
     or p_expected_series_version < 1
     or p_expected_exception_version is null
     or p_expected_exception_version < 0
     or p_action not in ('override', 'cancel')
  then
    raise exception using errcode = 'P0001', message = 'Ausnahmeaktion nicht erlaubt';
  end if;

  select s.*, r.version as resource_version
    into v_series
    from public.calendar_series s
    join public.resources r
      on r.id = s.resource_id
      and r.family_id = s.family_id
      and r.resource_type = 'calendar_series'
    where s.resource_id = p_series_resource_id
      and public.owns_resource(s.resource_id)
    for update of r;
  if not found then
    raise exception using errcode = '42501', message = 'Kalenderaktion nicht erlaubt';
  end if;
  select * into v_occurrence
    from public.calendar_series_occurrences o
    where o.series_resource_id = p_series_resource_id
      and o.occurrence_key = p_occurrence_key;
  if not found then
    raise exception using errcode = '22023', message = 'Serienvorkommen nicht gefunden';
  end if;

  if p_action = 'override' then
    if p_time_zone <> v_series.time_zone then
      raise exception using errcode = '22023', message = 'Ausnahme muss die Zeitzone der Serie verwenden';
    end if;
    perform private.validate_calendar_event_input(
      p_title, p_is_all_day, p_starts_at, p_ends_at,
      p_start_date, p_end_date_exclusive, p_time_zone
    );
  elsif p_title is not null or p_is_all_day is not null
     or p_starts_at is not null or p_ends_at is not null
     or p_start_date is not null or p_end_date_exclusive is not null
     or p_time_zone is not null
  then
    raise exception using errcode = '22023', message = 'Absage darf keine geänderten Termindaten enthalten';
  end if;

  v_payload := jsonb_build_object(
    'series_resource_id', p_series_resource_id,
    'occurrence_key', p_occurrence_key,
    'expected_series_version', p_expected_series_version,
    'expected_exception_version', p_expected_exception_version,
    'action', p_action,
    'title', p_title,
    'is_all_day', p_is_all_day,
    'starts_at', p_starts_at,
    'ends_at', p_ends_at,
    'start_date', p_start_date,
    'end_date_exclusive', p_end_date_exclusive,
    'time_zone', p_time_zone
  );
  insert into private.calendar_series_exception_requests(
    user_id, request_id, series_resource_id, occurrence_key, request_payload
  ) values (
    v_uid, p_request_id, p_series_resource_id, p_occurrence_key, v_payload
  ) on conflict (user_id, request_id) do nothing;
  select request_payload, result_exception_version, result_series_version
    into v_existing_payload, v_existing_exception_version, v_existing_series_version
    from private.calendar_series_exception_requests
    where user_id = v_uid and request_id = p_request_id
    for update;
  if v_existing_payload is distinct from v_payload then
    raise exception using errcode = 'P0001', message = 'Anfragekennung bereits anderweitig verwendet';
  end if;
  if v_existing_exception_version is not null then
    return v_existing_exception_version;
  end if;

  if v_series.resource_version <> p_expected_series_version then
    raise exception using errcode = 'P0001', message = 'Serie wurde zwischenzeitlich geändert';
  end if;

  select exception_version into v_current_exception_version
    from public.calendar_series_exceptions
    where series_resource_id = p_series_resource_id
      and occurrence_key = p_occurrence_key
    for update;
  if coalesce(v_current_exception_version, 0) <> p_expected_exception_version then
    raise exception using errcode = 'P0001', message = 'Ausnahme wurde zwischenzeitlich geändert';
  end if;
  v_exception_version := coalesce(v_current_exception_version, 0) + 1;

  insert into public.calendar_series_exceptions(
    series_resource_id, family_id, occurrence_key, exception_version,
    is_cancelled, title, is_all_day, starts_at, ends_at,
    start_date, end_date_exclusive, time_zone
  ) values (
    p_series_resource_id, v_series.family_id, p_occurrence_key, v_exception_version,
    p_action = 'cancel',
    case when p_action = 'override' then btrim(p_title) else null end,
    case when p_action = 'override' then p_is_all_day else null end,
    case when p_action = 'override' then p_starts_at else null end,
    case when p_action = 'override' then p_ends_at else null end,
    case when p_action = 'override' then p_start_date else null end,
    case when p_action = 'override' then p_end_date_exclusive else null end,
    case when p_action = 'override' then p_time_zone else null end
  ) on conflict (series_resource_id, occurrence_key) do update set
    exception_version = excluded.exception_version,
    is_cancelled = excluded.is_cancelled,
    title = excluded.title,
    is_all_day = excluded.is_all_day,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    start_date = excluded.start_date,
    end_date_exclusive = excluded.end_date_exclusive,
    time_zone = excluded.time_zone,
    updated_at = now();

  update public.resources
    set version = version + 1, updated_at = now()
    where id = p_series_resource_id
    returning version into v_series_version;
  update private.calendar_series_exception_requests
    set result_exception_version = v_exception_version,
        result_series_version = v_series_version
    where user_id = v_uid and request_id = p_request_id;
  return v_exception_version;
end;
$$;

create function public.delete_calendar_series_exception(
  p_series_resource_id uuid,
  p_occurrence_key text,
  p_request_id uuid,
  p_expected_series_version integer,
  p_expected_exception_version integer
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid uuid := (select auth.uid());
  v_series record;
  v_current_exception_version integer;
  v_payload jsonb;
  v_existing_payload jsonb;
  v_existing_series_version integer;
  v_series_version integer;
begin
  if v_uid is null or p_series_resource_id is null or p_occurrence_key is null
     or p_request_id is null or p_expected_series_version is null
     or p_expected_series_version < 1 or p_expected_exception_version is null
     or p_expected_exception_version < 1 then
    raise exception using errcode = 'P0001', message = 'Ausnahmeaktion nicht erlaubt';
  end if;

  select s.*, r.version as resource_version
    into v_series
    from public.calendar_series s
    join public.resources r
      on r.id = s.resource_id
      and r.family_id = s.family_id
      and r.resource_type = 'calendar_series'
    where s.resource_id = p_series_resource_id
      and public.owns_resource(s.resource_id)
    for update of r;
  if not found then
    raise exception using errcode = '42501', message = 'Kalenderaktion nicht erlaubt';
  end if;
  v_payload := jsonb_build_object(
    'series_resource_id', p_series_resource_id,
    'occurrence_key', p_occurrence_key,
    'expected_series_version', p_expected_series_version,
    'expected_exception_version', p_expected_exception_version
  );
  insert into private.calendar_series_exception_requests(
    user_id, request_id, series_resource_id, occurrence_key, request_payload
  ) values (
    v_uid, p_request_id, p_series_resource_id, p_occurrence_key, v_payload
  ) on conflict (user_id, request_id) do nothing;
  select request_payload, result_series_version
    into v_existing_payload, v_existing_series_version
    from private.calendar_series_exception_requests
    where user_id = v_uid and request_id = p_request_id
    for update;
  if v_existing_payload is distinct from v_payload then
    raise exception using errcode = 'P0001', message = 'Anfragekennung bereits anderweitig verwendet';
  end if;
  if v_existing_series_version is not null then
    return v_existing_series_version;
  end if;

  if v_series.resource_version <> p_expected_series_version then
    raise exception using errcode = 'P0001', message = 'Serie wurde zwischenzeitlich geändert';
  end if;

  select exception_version into v_current_exception_version
    from public.calendar_series_exceptions
    where series_resource_id = p_series_resource_id
      and occurrence_key = p_occurrence_key
    for update;
  if v_current_exception_version is null then
    raise exception using errcode = '22023', message = 'Ausnahme nicht gefunden';
  end if;
  if v_current_exception_version <> p_expected_exception_version then
    raise exception using errcode = 'P0001', message = 'Ausnahme wurde zwischenzeitlich geändert';
  end if;

  delete from public.calendar_series_exceptions
    where series_resource_id = p_series_resource_id
      and occurrence_key = p_occurrence_key;
  update public.resources
    set version = version + 1, updated_at = now()
    where id = p_series_resource_id
    returning version into v_series_version;
  update private.calendar_series_exception_requests
    set result_series_version = v_series_version
    where user_id = v_uid and request_id = p_request_id;
  return v_series_version;
end;
$$;

revoke all on function public.set_calendar_series_exception(
  uuid, text, uuid, integer, integer, text, text, boolean,
  timestamptz, timestamptz, date, date, text
) from public, anon, authenticated;
revoke all on function public.delete_calendar_series_exception(
  uuid, text, uuid, integer, integer
) from public, anon, authenticated;
grant execute on function public.set_calendar_series_exception(
  uuid, text, uuid, integer, integer, text, text, boolean,
  timestamptz, timestamptz, date, date, text
) to authenticated;
grant execute on function public.delete_calendar_series_exception(
  uuid, text, uuid, integer, integer
) to authenticated;

comment on table public.calendar_series_exceptions is 'FH-CX-012: one deterministic override or cancellation per series occurrence. Visibility and ownership are inherited from the series resource.';


