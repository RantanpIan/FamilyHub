-- FH-CX-011: bounded recurring calendar series.
--
-- The series is a resource in the existing access registry. Occurrences are
-- projections owned by that series resource; they do not introduce a second
-- visibility or ownership model. The supported rule is a bounded RFC-5545
-- subset: FREQ=DAILY|WEEKLY|MONTHLY, optional INTERVAL, optional BYDAY for
-- weekly rules, optional BYMONTHDAY for monthly rules, and exactly one COUNT
-- or UNTIL end condition. A maximum of 500 materialized occurrences keeps
-- every request bounded and prevents accidental unbounded work.

alter table public.resources
  drop constraint resources_type_allowed;

alter table public.resources
  add constraint resources_type_allowed
  check (resource_type in (
    'calendar_event', 'calendar_series', 'school_item', 'import_artifact',
    'task', 'document'
  ));

create table public.calendar_series (
  resource_id uuid primary key,
  family_id uuid not null,
  subject_member_id uuid,
  resource_type text not null default 'calendar_series'
    constraint calendar_series_resource_type_check
    check (resource_type = 'calendar_series'),
  title text not null
    constraint calendar_series_title_length
    check (char_length(btrim(title)) between 1 and 180),
  is_all_day boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  start_date date,
  end_date_exclusive date,
  time_zone text not null
    constraint calendar_series_time_zone_length
    check (char_length(btrim(time_zone)) between 1 and 64),
  recurrence_rule text not null,
  recurrence_frequency text not null
    constraint calendar_series_frequency_check
    check (recurrence_frequency in ('DAILY', 'WEEKLY', 'MONTHLY')),
  recurrence_interval integer not null default 1
    constraint calendar_series_interval_check
    check (recurrence_interval between 1 and 366),
  recurrence_by_weekdays smallint[],
  recurrence_by_month_day smallint,
  recurrence_count integer
    constraint calendar_series_count_check
    check (recurrence_count is null or recurrence_count between 1 and 500),
  recurrence_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_series_resource_family_fk
    foreign key (resource_id, family_id, resource_type)
    references public.resources (id, family_id, resource_type)
    on delete cascade,
  constraint calendar_series_resource_family_unique
    unique (resource_id, family_id),
  constraint calendar_series_subject_family_fk
    foreign key (subject_member_id, family_id)
    references public.family_members (id, family_id)
    on delete no action deferrable initially deferred,
  constraint calendar_series_valid_interval check (
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
  ),
  constraint calendar_series_end_condition_check check (
    (recurrence_count is not null) <> (recurrence_until is not null)
  )
);

create index calendar_series_family_idx
  on public.calendar_series (family_id, recurrence_frequency);

create table public.calendar_series_occurrences (
  series_resource_id uuid not null,
  family_id uuid not null,
  occurrence_key text not null,
  local_start timestamp,
  local_end timestamp,
  starts_at timestamptz,
  ends_at timestamptz,
  start_date date,
  end_date_exclusive date,
  created_at timestamptz not null default now(),
  primary key (series_resource_id, occurrence_key),
  constraint calendar_series_occurrence_series_fk
    foreign key (series_resource_id, family_id)
    references public.calendar_series (resource_id, family_id)
    on delete cascade,
  constraint calendar_series_occurrence_shape_check check (
    (
      start_date is null and end_date_exclusive is null
      and local_start is not null and local_end is not null
      and starts_at is not null and ends_at is not null
      and starts_at < ends_at
    )
    or (
      start_date is not null and end_date_exclusive is not null
      and start_date < end_date_exclusive
      and local_start is null and local_end is null
      and starts_at is null and ends_at is null
    )
  )
);

create index calendar_series_occurrences_family_start_idx
  on public.calendar_series_occurrences (family_id, start_date, starts_at);

alter table public.calendar_series enable row level security;
alter table public.calendar_series_occurrences enable row level security;

create policy "Read calendar series through resource access"
  on public.calendar_series
  for select to authenticated
  using (public.can_read_resource(resource_id));

create policy "Read calendar series occurrences through series access"
  on public.calendar_series_occurrences
  for select to authenticated
  using (public.can_read_resource(series_resource_id));

revoke all on table public.calendar_series, public.calendar_series_occurrences
  from public, anon, authenticated;
grant select on table public.calendar_series, public.calendar_series_occurrences
  to authenticated;

create table private.calendar_series_create_requests (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  request_payload jsonb not null,
  series_resource_id uuid,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

create table private.calendar_series_update_requests (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  resource_id uuid not null,
  request_payload jsonb not null,
  result_version integer,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

create table private.calendar_series_split_requests (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  resource_id uuid not null,
  new_resource_id uuid,
  request_payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

alter table private.calendar_series_create_requests enable row level security;
alter table private.calendar_series_update_requests enable row level security;
alter table private.calendar_series_split_requests enable row level security;
revoke all on table private.calendar_series_create_requests,
  private.calendar_series_update_requests,
  private.calendar_series_split_requests
  from public, anon, authenticated;

create function private.parse_calendar_rrule(p_rule text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
declare
  v_part text;
  v_key text;
  v_value text;
  v_separator integer;
  v_frequency text;
  v_interval integer := 1;
  v_count integer;
  v_until date;
  v_by_month_day smallint;
  v_weekdays smallint[];
  v_day text;
  v_weekday smallint;
  v_end_count integer := 0;
  v_seen_interval boolean := false;
begin
  if p_rule is null or btrim(p_rule) = '' then
    raise exception using errcode = '22023', message = 'Wiederholungsregel fehlt';
  end if;

  for v_part in
    select regexp_split_to_table(upper(btrim(p_rule)), ';')
  loop
    v_separator := strpos(v_part, '=');
    if v_separator <= 1 or v_separator = char_length(v_part) then
      raise exception using errcode = '22023', message = 'Wiederholungsregel ist ungültig';
    end if;
    v_key := left(v_part, v_separator - 1);
    v_value := substr(v_part, v_separator + 1);
    if v_key not in ('FREQ', 'INTERVAL', 'COUNT', 'UNTIL', 'BYDAY', 'BYMONTHDAY') then
      raise exception using errcode = '22023', message = 'Nicht unterstützter Wiederholungsschlüssel';
    end if;
    if v_key = 'FREQ' then
      if v_frequency is not null then raise exception using errcode = '22023', message = 'FREQ doppelt'; end if;
      v_frequency := v_value;
    elsif v_key = 'INTERVAL' then
      if v_seen_interval or v_value !~ '^[0-9]+$' then
        raise exception using errcode = '22023', message = 'INTERVAL ist ungültig';
      end if;
      v_seen_interval := true;
      v_interval := v_value::integer;
    elsif v_key = 'COUNT' then
      if v_count is not null or v_value !~ '^[0-9]+$' then raise exception using errcode = '22023', message = 'COUNT ist ungültig'; end if;
      v_count := v_value::integer;
      v_end_count := v_end_count + 1;
    elsif v_key = 'UNTIL' then
      if v_until is not null or v_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception using errcode = '22023', message = 'UNTIL ist ungültig'; end if;
      v_until := v_value::date;
      if to_char(v_until, 'YYYY-MM-DD') <> v_value then raise exception using errcode = '22023', message = 'UNTIL ist ungültig'; end if;
      v_end_count := v_end_count + 1;
    elsif v_key = 'BYDAY' then
      if v_weekdays is not null then raise exception using errcode = '22023', message = 'BYDAY doppelt'; end if;
      v_weekdays := array[]::smallint[];
      foreach v_day in array string_to_array(v_value, ',')
      loop
        v_weekday := case v_day
          when 'MO' then 1 when 'TU' then 2 when 'WE' then 3
          when 'TH' then 4 when 'FR' then 5 when 'SA' then 6 when 'SU' then 7
          else null end;
        if v_weekday is null or v_weekdays @> array[v_weekday]::smallint[] then
          raise exception using errcode = '22023', message = 'BYDAY ist ungültig';
        end if;
        v_weekdays := array_append(v_weekdays, v_weekday);
      end loop;
      v_weekdays := (select array_agg(item order by item) from unnest(v_weekdays) item);
    elsif v_key = 'BYMONTHDAY' then
      if v_by_month_day is not null or v_value !~ '^-?[0-9]+$' then raise exception using errcode = '22023', message = 'BYMONTHDAY ist ungültig'; end if;
      v_by_month_day := v_value::smallint;
    end if;
  end loop;

  if v_frequency not in ('DAILY', 'WEEKLY', 'MONTHLY')
     or v_interval not between 1 and 366
     or v_end_count <> 1
     or (v_count is not null and v_count not between 1 and 500)
     or (v_frequency <> 'WEEKLY' and v_weekdays is not null)
     or (v_frequency <> 'MONTHLY' and v_by_month_day is not null)
     or (v_by_month_day is not null and (v_by_month_day = 0 or v_by_month_day < -31 or v_by_month_day > 31))
  then
    raise exception using errcode = '22023', message = 'Wiederholungsregel ist außerhalb des erlaubten Umfangs';
  end if;

  return jsonb_build_object(
    'frequency', v_frequency,
    'interval', v_interval,
    'by_weekdays', coalesce(to_jsonb(v_weekdays), '[]'::jsonb),
    'by_month_day', v_by_month_day,
    'count', v_count,
    'until', v_until
  );
end;
$$;

create function private.validate_calendar_series_input(
  p_title text,
  p_is_all_day boolean,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_start_date date,
  p_end_date_exclusive date,
  p_time_zone text,
  p_rule text
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
declare
  v_rule jsonb;
  v_start_date date;
begin
  if p_title is null or char_length(btrim(p_title)) not between 1 and 180
     or p_is_all_day is null or p_time_zone is null
     or char_length(btrim(p_time_zone)) not between 1 and 64
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone)
  then raise exception using errcode = '22023', message = 'Ungültige Seriendaten'; end if;
  if not ((not p_is_all_day and p_starts_at is not null and p_ends_at is not null and p_starts_at < p_ends_at and p_start_date is null and p_end_date_exclusive is null)
      or (p_is_all_day and p_starts_at is null and p_ends_at is null and p_start_date is not null and p_end_date_exclusive is not null and p_start_date < p_end_date_exclusive))
  then raise exception using errcode = '22023', message = 'Ungültiges Serienintervall'; end if;
  v_rule := private.parse_calendar_rrule(p_rule);
  v_start_date := case when p_is_all_day then p_start_date else (p_starts_at at time zone p_time_zone)::date end;
  if (v_rule->>'until') is not null and (v_rule->>'until')::date < v_start_date then
    raise exception using errcode = '22023', message = 'Ende der Serie liegt vor dem Beginn';
  end if;
  return v_rule;
end;
$$;

create function private.insert_calendar_series_occurrence(
  p_series_resource_id uuid,
  p_occurrence_date date
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_series record;
  v_local_start timestamp;
  v_local_end timestamp;
  v_duration interval;
  v_duration_days integer;
  v_key text;
begin
  select * into v_series from public.calendar_series where resource_id = p_series_resource_id;
  if not found then raise exception using errcode = 'P0001', message = 'Serie nicht gefunden'; end if;
  if v_series.is_all_day then
    v_duration_days := v_series.end_date_exclusive - v_series.start_date;
    v_key := p_occurrence_date::text;
    insert into public.calendar_series_occurrences (
      series_resource_id, family_id, occurrence_key, start_date, end_date_exclusive
    ) values (
      v_series.resource_id, v_series.family_id, v_key,
      p_occurrence_date, p_occurrence_date + v_duration_days
    ) on conflict do nothing;
  else
    v_local_start := p_occurrence_date + ((v_series.starts_at at time zone v_series.time_zone)::time);
    v_duration := (v_series.ends_at at time zone v_series.time_zone) - (v_series.starts_at at time zone v_series.time_zone);
    v_local_end := v_local_start + v_duration;
    v_key := to_char(v_local_start, 'YYYY-MM-DD"T"HH24:MI:SS');
    insert into public.calendar_series_occurrences (
      series_resource_id, family_id, occurrence_key, local_start, local_end,
      starts_at, ends_at
    ) values (
      v_series.resource_id, v_series.family_id, v_key, v_local_start, v_local_end,
      v_local_start at time zone v_series.time_zone,
      v_local_end at time zone v_series.time_zone
    ) on conflict do nothing;
  end if;
end;
$$;

create function private.populate_calendar_series_occurrences(p_series_resource_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_series record;
  v_start_date date;
  v_until date;
  v_period integer := 0;
  v_iterations integer := 0;
  v_created integer := 0;
  v_limit integer;
  v_candidate date;
  v_week_start date;
  v_month_start date;
  v_last_day date;
  v_day_number integer;
  v_weekday smallint;
  v_days smallint[];
begin
  select * into v_series from public.calendar_series where resource_id = p_series_resource_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'Serie nicht gefunden'; end if;
  delete from public.calendar_series_occurrences where series_resource_id = p_series_resource_id;
  v_start_date := case when v_series.is_all_day then v_series.start_date else (v_series.starts_at at time zone v_series.time_zone)::date end;
  v_until := coalesce(v_series.recurrence_until, date '9999-12-31');
  v_limit := coalesce(v_series.recurrence_count, 500);
  v_days := coalesce(v_series.recurrence_by_weekdays, array[extract(isodow from v_start_date)::smallint]);

  while v_created < v_limit and v_iterations < 100000 loop
    if v_series.recurrence_frequency = 'DAILY' then
      v_candidate := v_start_date + (v_period * v_series.recurrence_interval);
      exit when v_candidate > v_until;
      perform private.insert_calendar_series_occurrence(p_series_resource_id, v_candidate);
      v_created := v_created + 1;
      v_period := v_period + 1;
    elsif v_series.recurrence_frequency = 'WEEKLY' then
      v_week_start := date_trunc('week', v_start_date::timestamp)::date + (v_period * v_series.recurrence_interval * 7);
      exit when v_week_start > v_until;
      foreach v_weekday in array v_days loop
        v_candidate := v_week_start + (v_weekday - 1);
        if v_candidate >= v_start_date and v_candidate <= v_until and v_created < v_limit then
          perform private.insert_calendar_series_occurrence(p_series_resource_id, v_candidate);
          v_created := v_created + 1;
        end if;
      end loop;
      v_period := v_period + 1;
    else
      v_month_start := (date_trunc('month', v_start_date::timestamp) + make_interval(months => v_period * v_series.recurrence_interval))::date;
      exit when v_month_start > v_until;
      v_last_day := (date_trunc('month', v_month_start::timestamp) + interval '1 month - 1 day')::date;
      v_day_number := coalesce(v_series.recurrence_by_month_day, extract(day from v_start_date)::integer);
      if v_day_number < 0 then v_candidate := v_last_day + v_day_number + 1;
      elsif v_day_number <= extract(day from v_last_day)::integer then v_candidate := v_month_start + v_day_number - 1;
      else v_candidate := null;
      end if;
      if v_candidate is not null and v_candidate >= v_start_date and v_candidate <= v_until then
        perform private.insert_calendar_series_occurrence(p_series_resource_id, v_candidate);
        v_created := v_created + 1;
      end if;
      v_period := v_period + 1;
    end if;
    v_iterations := v_iterations + 1;
  end loop;
  if v_iterations >= 100000 then raise exception using errcode = '22023', message = 'Serie konnte nicht begrenzt erzeugt werden'; end if;
  if v_created = 0 then raise exception using errcode = '22023', message = 'Serie erzeugt keine Vorkommen'; end if;
end;
$$;

create function private.build_calendar_rrule(
  p_frequency text, p_interval integer, p_weekdays smallint[],
  p_month_day smallint, p_count integer, p_until date
)
returns text
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
declare
  v_days text;
begin
  if p_weekdays is not null then
    select string_agg(case item when 1 then 'MO' when 2 then 'TU' when 3 then 'WE' when 4 then 'TH' when 5 then 'FR' when 6 then 'SA' else 'SU' end, ',' order by item)
      into v_days from unnest(p_weekdays) item;
  end if;
  return 'FREQ=' || p_frequency || ';INTERVAL=' || p_interval
    || case when v_days is not null then ';BYDAY=' || v_days else '' end
    || case when p_month_day is not null then ';BYMONTHDAY=' || p_month_day else '' end
    || case when p_count is not null then ';COUNT=' || p_count else ';UNTIL=' || to_char(p_until, 'YYYY-MM-DD') end;
end;
$$;

create function public.create_calendar_series_for_member(
  p_family_id uuid, p_title text, p_is_all_day boolean,
  p_starts_at timestamptz, p_ends_at timestamptz,
  p_start_date date, p_end_date_exclusive date, p_time_zone text,
  p_visibility text, p_request_id uuid, p_subject_member_id uuid,
  p_recurrence_rule text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
  v_series uuid;
  v_existing_payload jsonb;
  v_payload jsonb;
  v_rule jsonb;
begin
  if v_uid is null or p_family_id is null or p_request_id is null or p_subject_member_id is null
     or p_visibility not in ('private', 'family') then
    raise exception using errcode = '42501', message = 'Kalenderaktion nicht erlaubt';
  end if;
  v_rule := private.validate_calendar_series_input(
    p_title, p_is_all_day, p_starts_at, p_ends_at,
    p_start_date, p_end_date_exclusive, p_time_zone, p_recurrence_rule
  );
  select m.member_id into v_owner
  from public.family_memberships m
  join public.family_members fm on fm.id = m.member_id and fm.family_id = m.family_id
  join public.families f on f.id = m.family_id
  where m.user_id = v_uid and m.family_id = p_family_id
    and m.status = 'active' and fm.status = 'active' and f.status = 'active'
  for share of m, fm, f;
  if v_owner is null or not exists (select 1 from public.family_members where id = p_subject_member_id and family_id = p_family_id and status = 'active') then
    raise exception using errcode = '42501', message = 'Kalenderaktion nicht erlaubt';
  end if;
  v_payload := jsonb_build_object('family_id', p_family_id, 'title', btrim(p_title), 'is_all_day', p_is_all_day, 'starts_at', p_starts_at, 'ends_at', p_ends_at, 'start_date', p_start_date, 'end_date_exclusive', p_end_date_exclusive, 'time_zone', p_time_zone, 'visibility', p_visibility, 'subject_member_id', p_subject_member_id, 'recurrence_rule', upper(btrim(p_recurrence_rule)));
  insert into private.calendar_series_create_requests(user_id, request_id, request_payload)
    values (v_uid, p_request_id, v_payload) on conflict (user_id, request_id) do nothing;
  select request_payload, series_resource_id into v_existing_payload, v_series
    from private.calendar_series_create_requests where user_id = v_uid and request_id = p_request_id for update;
  if v_existing_payload is distinct from v_payload then raise exception using errcode = 'P0001', message = 'Anfragekennung bereits anderweitig verwendet'; end if;
  if v_series is not null then return v_series; end if;

  insert into public.resources(family_id, owner_member_id, resource_type, visibility)
    values (p_family_id, v_owner, 'calendar_series', p_visibility) returning id into v_series;
  insert into public.calendar_series(
    resource_id, family_id, subject_member_id, title, is_all_day, starts_at, ends_at,
    start_date, end_date_exclusive, time_zone, recurrence_rule, recurrence_frequency,
    recurrence_interval, recurrence_by_weekdays, recurrence_by_month_day,
    recurrence_count, recurrence_until
  ) values (
    v_series, p_family_id, p_subject_member_id, btrim(p_title), p_is_all_day, p_starts_at, p_ends_at,
    p_start_date, p_end_date_exclusive, p_time_zone, upper(btrim(p_recurrence_rule)),
    v_rule->>'frequency', (v_rule->>'interval')::integer,
    (select array_agg(item::smallint) from jsonb_array_elements_text(v_rule->'by_weekdays') item),
    nullif(v_rule->>'by_month_day', '')::smallint,
    nullif(v_rule->>'count', '')::integer, nullif(v_rule->>'until', '')::date
  );
  perform private.populate_calendar_series_occurrences(v_series);
  if p_visibility = 'private' and p_subject_member_id <> v_owner then
    insert into public.resource_grants(resource_id, family_id, grantee_member_id, permission, status)
      values (v_series, p_family_id, p_subject_member_id, 'read', 'active')
      on conflict (resource_id, family_id, grantee_member_id) do update set permission = 'read', status = 'active', revoked_at = null, updated_at = now();
  end if;
  update private.calendar_series_create_requests set series_resource_id = v_series where user_id = v_uid and request_id = p_request_id;
  return v_series;
end;
$$;

create function public.update_calendar_series(
  p_resource_id uuid, p_expected_version integer, p_request_id uuid,
  p_title text, p_is_all_day boolean, p_starts_at timestamptz, p_ends_at timestamptz,
  p_start_date date, p_end_date_exclusive date, p_time_zone text, p_recurrence_rule text
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid uuid := (select auth.uid());
  v_version integer;
  v_payload jsonb;
  v_old_payload jsonb;
  v_old_version integer;
  v_rule jsonb;
begin
  if v_uid is null or p_resource_id is null or p_expected_version is null or p_expected_version < 1 or p_request_id is null or not public.owns_resource(p_resource_id) then
    raise exception using errcode = '42501', message = 'Kalenderaktion nicht erlaubt';
  end if;
  v_rule := private.validate_calendar_series_input(p_title, p_is_all_day, p_starts_at, p_ends_at, p_start_date, p_end_date_exclusive, p_time_zone, p_recurrence_rule);
  v_payload := jsonb_build_object('resource_id', p_resource_id, 'title', btrim(p_title), 'is_all_day', p_is_all_day, 'starts_at', p_starts_at, 'ends_at', p_ends_at, 'start_date', p_start_date, 'end_date_exclusive', p_end_date_exclusive, 'time_zone', p_time_zone, 'recurrence_rule', upper(btrim(p_recurrence_rule)));
  insert into private.calendar_series_update_requests(user_id, request_id, resource_id, request_payload)
    values (v_uid, p_request_id, p_resource_id, v_payload) on conflict (user_id, request_id) do nothing;
  select request_payload, result_version into v_old_payload, v_version from private.calendar_series_update_requests where user_id = v_uid and request_id = p_request_id for update;
  if v_old_payload is distinct from v_payload then raise exception using errcode = 'P0001', message = 'Anfragekennung bereits anderweitig verwendet'; end if;
  if v_version is not null then return v_version; end if;

  select r.version into v_old_version from public.resources r join public.calendar_series s on s.resource_id = r.id where r.id = p_resource_id and r.resource_type = 'calendar_series' and public.owns_resource(r.id) for update of r;
  if v_old_version is null then raise exception using errcode = '42501', message = 'Kalenderaktion nicht erlaubt'; end if;
  if v_old_version <> p_expected_version then raise exception using errcode = 'P0001', message = 'Serie wurde zwischenzeitlich geändert'; end if;
  update public.calendar_series set title = btrim(p_title), is_all_day = p_is_all_day, starts_at = p_starts_at, ends_at = p_ends_at, start_date = p_start_date, end_date_exclusive = p_end_date_exclusive, time_zone = p_time_zone, recurrence_rule = upper(btrim(p_recurrence_rule)), recurrence_frequency = v_rule->>'frequency', recurrence_interval = (v_rule->>'interval')::integer, recurrence_by_weekdays = (select array_agg(item::smallint) from jsonb_array_elements_text(v_rule->'by_weekdays') item), recurrence_by_month_day = nullif(v_rule->>'by_month_day', '')::smallint, recurrence_count = nullif(v_rule->>'count', '')::integer, recurrence_until = nullif(v_rule->>'until', '')::date, updated_at = now() where resource_id = p_resource_id;
  perform private.populate_calendar_series_occurrences(p_resource_id);
  update public.resources set version = version + 1, updated_at = now() where id = p_resource_id returning version into v_version;
  update private.calendar_series_update_requests set result_version = v_version where user_id = v_uid and request_id = p_request_id;
  return v_version;
end;
$$;

create function public.split_calendar_series(
  p_resource_id uuid,
  p_expected_version integer,
  p_request_id uuid,
  p_effective_date date,
  p_new_recurrence_rule text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid uuid := (select auth.uid());
  v_series record;
  v_old_version integer;
  v_new_resource uuid;
  v_new_starts_at timestamptz;
  v_new_ends_at timestamptz;
  v_new_start_date date;
  v_new_end_date_exclusive date;
  v_new_rule jsonb;
  v_payload jsonb;
  v_old_rule text;
  v_existing_payload jsonb;
  v_existing_resource uuid;
  v_duration_days integer;
begin
  if v_uid is null or p_resource_id is null or p_expected_version is null
     or p_expected_version < 1 or p_request_id is null or p_effective_date is null
     or p_new_recurrence_rule is null
  then
    raise exception using errcode = '42501', message = 'Kalenderaktion nicht erlaubt';
  end if;

  v_payload := jsonb_build_object(
    'resource_id', p_resource_id,
    'expected_version', p_expected_version,
    'effective_date', p_effective_date,
    'new_recurrence_rule', upper(btrim(p_new_recurrence_rule))
  );
  insert into private.calendar_series_split_requests(user_id, request_id, resource_id, request_payload)
    values (v_uid, p_request_id, p_resource_id, v_payload)
    on conflict (user_id, request_id) do nothing;
  select request_payload, new_resource_id
    into v_existing_payload, v_existing_resource
    from private.calendar_series_split_requests
    where user_id = v_uid and request_id = p_request_id
    for update;
  if v_existing_payload is distinct from v_payload then
    raise exception using errcode = 'P0001', message = 'Anfragekennung bereits anderweitig verwendet';
  end if;
  if v_existing_resource is not null then return v_existing_resource; end if;

  select s.*, r.version as resource_version, r.owner_member_id, r.visibility
    into v_series
    from public.calendar_series s
    join public.resources r on r.id = s.resource_id
      and r.family_id = s.family_id
      and r.resource_type = 'calendar_series'
    where s.resource_id = p_resource_id
      and public.owns_resource(s.resource_id)
    for update of s, r;
  if not found then
    raise exception using errcode = '42501', message = 'Kalenderaktion nicht erlaubt';
  end if;
  v_old_version := v_series.resource_version;
  if v_old_version <> p_expected_version then
    raise exception using errcode = 'P0001', message = 'Serie wurde zwischenzeitlich geändert';
  end if;

  if p_effective_date <= (
      case when v_series.is_all_day
        then v_series.start_date
        else (v_series.starts_at at time zone v_series.time_zone)::date
      end
    )
     or not exists (
       select 1 from public.calendar_series_occurrences o
       where o.series_resource_id = p_resource_id
         and left(o.occurrence_key, 10) = p_effective_date::text
     )
  then
    raise exception using errcode = '22023', message = 'Aufteilung muss auf ein vorhandenes zukünftiges Vorkommen zeigen';
  end if;

  if v_series.is_all_day then
    v_duration_days := v_series.end_date_exclusive - v_series.start_date;
    v_new_start_date := p_effective_date;
    v_new_end_date_exclusive := p_effective_date + v_duration_days;
    v_new_rule := private.validate_calendar_series_input(
      v_series.title, true, null, null, v_new_start_date,
      v_new_end_date_exclusive, v_series.time_zone, p_new_recurrence_rule
    );
  else
    v_new_starts_at := (p_effective_date + ((v_series.starts_at at time zone v_series.time_zone)::time))
      at time zone v_series.time_zone;
    v_new_ends_at := v_new_starts_at + (v_series.ends_at - v_series.starts_at);
    v_new_rule := private.validate_calendar_series_input(
      v_series.title, false, v_new_starts_at, v_new_ends_at, null, null,
      v_series.time_zone, p_new_recurrence_rule
    );
  end if;

  v_old_rule := private.build_calendar_rrule(
    v_series.recurrence_frequency,
    v_series.recurrence_interval,
    v_series.recurrence_by_weekdays,
    v_series.recurrence_by_month_day,
    null,
    p_effective_date - 1
  );
  update public.calendar_series
  set recurrence_rule = v_old_rule,
      recurrence_count = null,
      recurrence_until = p_effective_date - 1,
      updated_at = now()
  where resource_id = p_resource_id;
  perform private.populate_calendar_series_occurrences(p_resource_id);
  update public.resources
  set version = version + 1, updated_at = now()
  where id = p_resource_id;

  insert into public.resources(family_id, owner_member_id, resource_type, visibility)
    values (v_series.family_id, v_series.owner_member_id, 'calendar_series', v_series.visibility)
    returning id into v_new_resource;
  insert into public.calendar_series(
    resource_id, family_id, subject_member_id, title, is_all_day, starts_at, ends_at,
    start_date, end_date_exclusive, time_zone, recurrence_rule, recurrence_frequency,
    recurrence_interval, recurrence_by_weekdays, recurrence_by_month_day,
    recurrence_count, recurrence_until
  ) values (
    v_new_resource, v_series.family_id, v_series.subject_member_id, v_series.title,
    v_series.is_all_day,
    case when v_series.is_all_day then null else v_new_starts_at end,
    case when v_series.is_all_day then null else v_new_ends_at end,
    case when v_series.is_all_day then v_new_start_date else null end,
    case when v_series.is_all_day then v_new_end_date_exclusive else null end,
    v_series.time_zone, upper(btrim(p_new_recurrence_rule)),
    v_new_rule->>'frequency', (v_new_rule->>'interval')::integer,
    (select array_agg(item::smallint) from jsonb_array_elements_text(v_new_rule->'by_weekdays') item),
    nullif(v_new_rule->>'by_month_day', '')::smallint,
    nullif(v_new_rule->>'count', '')::integer, nullif(v_new_rule->>'until', '')::date
  );
  perform private.populate_calendar_series_occurrences(v_new_resource);

  insert into public.resource_grants(resource_id, family_id, grantee_member_id, permission, status)
    select v_new_resource, family_id, grantee_member_id, permission, 'active'
    from public.resource_grants
    where resource_id = p_resource_id and status = 'active'
    on conflict (resource_id, family_id, grantee_member_id) do update
      set permission = excluded.permission, status = 'active', revoked_at = null, updated_at = now();

  update private.calendar_series_split_requests
  set new_resource_id = v_new_resource
  where user_id = v_uid and request_id = p_request_id;
  return v_new_resource;
end;
$$;

revoke all on function public.create_calendar_series_for_member(uuid, text, boolean, timestamptz, timestamptz, date, date, text, text, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.update_calendar_series(uuid, integer, uuid, text, boolean, timestamptz, timestamptz, date, date, text, text) from public, anon, authenticated;
revoke all on function public.split_calendar_series(uuid, integer, uuid, date, text) from public, anon, authenticated;
grant execute on function public.create_calendar_series_for_member(uuid, text, boolean, timestamptz, timestamptz, date, date, text, text, uuid, uuid, text) to authenticated;
grant execute on function public.update_calendar_series(uuid, integer, uuid, text, boolean, timestamptz, timestamptz, date, date, text, text) to authenticated;
grant execute on function public.split_calendar_series(uuid, integer, uuid, date, text) to authenticated;

comment on table public.calendar_series is 'FH-CX-011: bounded recurring calendar series. Rule is a restricted RFC-5545 subset; occurrences are materialized projections under the series resource access model.';
comment on table public.calendar_series_occurrences is 'FH-CX-011: deterministic series occurrences. Single occurrence exceptions are handled by FH-CX-012.';
