-- FH-CX-008 (inkrementell): persistente Einzeltermine, ohne Serien/Erinnerungen.
-- Die Eigentümerschaft und Sichtbarkeit liegen ausschließlich im vorhandenen
-- Ressourcenregister. Der Kalender führt keine zweite Berechtigungsquelle.

-- Ein zusammengesetzter FK verhindert, dass ein Kalendertermin an eine
-- Ressource einer anderen Familie oder eines anderen Fachtyps angehängt wird.
alter table public.resources
  add constraint resources_id_family_type_unique
  unique (id, family_id, resource_type);

create table public.calendar_events (
  resource_id uuid primary key,
  family_id uuid not null,
  resource_type text not null default 'calendar_event'
    constraint calendar_events_resource_type_check
    check (resource_type = 'calendar_event'),
  title text not null
    constraint calendar_events_title_length
    check (char_length(btrim(title)) between 1 and 180),
  is_all_day boolean not null default false,
  -- Zeitgebundene Termine: absolute Zeitpunkte plus lokale Anzeige-Zeitzone.
  starts_at timestamptz,
  ends_at timestamptz,
  -- Ganztägige Termine: reine lokale Kalenderdaten, Ende exklusiv.
  start_date date,
  end_date_exclusive date,
  time_zone text not null
    constraint calendar_events_time_zone_length
    check (char_length(btrim(time_zone)) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_resource_type_family_fk
    foreign key (resource_id, family_id, resource_type)
    references public.resources (id, family_id, resource_type)
    on delete cascade,
  constraint calendar_events_valid_interval check (
    (
      is_all_day = false
      and starts_at is not null
      and ends_at is not null
      and starts_at < ends_at
      and start_date is null
      and end_date_exclusive is null
    )
    or (
      is_all_day = true
      and starts_at is null
      and ends_at is null
      and start_date is not null
      and end_date_exclusive is not null
      and start_date < end_date_exclusive
    )
  )
);

create index calendar_events_timed_family_start_idx
  on public.calendar_events (family_id, starts_at)
  where is_all_day = false;

create index calendar_events_all_day_family_date_idx
  on public.calendar_events (family_id, start_date)
  where is_all_day = true;

alter table public.calendar_events enable row level security;

-- Fachinhalte sind nur über die Berechtigungen der verknüpften Ressource lesbar.
-- Diese Funktion prüft aktive Mitgliedschaft, Ownership, Sichtbarkeit und Grants.
create policy "Read calendar events through resource access"
  on public.calendar_events
  for select
  to authenticated
  using (public.can_read_resource(resource_id));

-- Keine direkten Client-Schreibrechte. Das atomare Erstellen von Ressourcen
-- und Terminen sowie CAS-/Idempotenzmutation folgen als eigener, RLS-getesteter
-- Kalender-Use-Case. Bis dahin ist die Tabelle nur über Test-/Administrations-
-- Kontexte befüllbar, nicht durch normale angemeldete Benutzer.
revoke all on table public.calendar_events from public, anon, authenticated;
grant select on table public.calendar_events to authenticated;

comment on table public.calendar_events is
  'FH-CX-008: single calendar events; resource_id points to the access registry. No timetable projections, recurrence or reminders.';
comment on column public.calendar_events.end_date_exclusive is
  'Exclusive local date after the final all-day date (date ranges are half-open).';
