-- FH-CX-014: endliche Kalenderwerte, klarer Wertebereich und DST-sichere
-- Validierung für Einzeltermine und Terminserien.
--
-- Der unterstützte API-Bereich ist bewusst endlich und mit dem Client-Vertrag
-- kompatibel: 0001-01-01 bis 9999-12-31. PostgreSQL-Infinitywerte und Werte
-- außerhalb dieses Bereichs werden fail-closed abgelehnt. Diese Migration
-- wird nur in der lokalen/testweisen Datenbank angewendet; keine Cloud- oder
-- Produktionsmigration ist Bestandteil dieses Auftrags.

create or replace function private.validate_calendar_event_input(
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
        and isfinite(p_starts_at) and isfinite(p_ends_at)
        and p_starts_at >= timestamptz '0001-01-01 00:00:00+00'
        and p_ends_at <= timestamptz '9999-12-31 23:59:59.999999+00'
        and p_starts_at < p_ends_at
        and p_start_date is null and p_end_date_exclusive is null)
      or
      (p_is_all_day = true
        and p_starts_at is null and p_ends_at is null
        and p_start_date is not null and p_end_date_exclusive is not null
        and isfinite(p_start_date) and isfinite(p_end_date_exclusive)
        and p_start_date >= date '0001-01-01'
        and p_end_date_exclusive <= date '9999-12-31'
        and p_start_date < p_end_date_exclusive)
    )
  then
    raise exception using errcode = 'P0001',
      message = 'Ungueltige Kalenderdaten';
  end if;
end;
$$;

create or replace function private.validate_calendar_series_input(
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

  if not (
    (not p_is_all_day
      and p_starts_at is not null and p_ends_at is not null
      and isfinite(p_starts_at) and isfinite(p_ends_at)
      and p_starts_at >= timestamptz '0001-01-01 00:00:00+00'
      and p_ends_at <= timestamptz '9999-12-31 23:59:59.999999+00'
      and p_starts_at < p_ends_at
      and p_start_date is null and p_end_date_exclusive is null)
    or
    (p_is_all_day
      and p_starts_at is null and p_ends_at is null
      and p_start_date is not null and p_end_date_exclusive is not null
      and isfinite(p_start_date) and isfinite(p_end_date_exclusive)
      and p_start_date >= date '0001-01-01'
      and p_end_date_exclusive <= date '9999-12-31'
      and p_start_date < p_end_date_exclusive)
  )
  then raise exception using errcode = '22023', message = 'Ungültiges Serienintervall'; end if;

  v_rule := private.parse_calendar_rrule(p_rule);
  v_start_date := case when p_is_all_day then p_start_date else (p_starts_at at time zone p_time_zone)::date end;
  if (v_rule->>'until') is not null and (v_rule->>'until')::date < v_start_date then
    raise exception using errcode = '22023', message = 'Ende der Serie liegt vor dem Beginn';
  end if;
  return v_rule;
end;
$$;

comment on function private.validate_calendar_event_input(
  text, boolean, timestamptz, timestamptz, date, date, text
) is 'FH-CX-014: fail-closed validation of finite calendar values in the client-supported 0001-9999 range.';

comment on function private.validate_calendar_series_input(
  text, boolean, timestamptz, timestamptz, date, date, text, text
) is 'FH-CX-014: fail-closed validation of finite series values in the client-supported 0001-9999 range.';
