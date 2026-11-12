-- FH-CAL-001: Person, fuer die ein Termin ist, von der Eigentuemergeschaeftsrolle
-- des erstellenden Familienmitglieds trennen. Bestehende Termine bleiben erhalten.
alter table public.calendar_events
  add column subject_member_id uuid;

alter table public.calendar_events
  add constraint calendar_events_subject_family_fk
  foreign key (subject_member_id, family_id)
  references public.family_members (id, family_id)
  on delete restrict;

-- Alttermine sind weiterhin fuer ihren bisherigen Eigentümer bestimmt.
update public.calendar_events as event
  set subject_member_id = resource.owner_member_id
from public.resources as resource
where resource.id = event.resource_id
  and resource.family_id = event.family_id;

-- Altes create_calendar_event bleibt fuer bestehende Clients erreichbar. Dort
-- bedeutet NULL: der Eigentümer der Ressource ist zugleich die Terminperson.
comment on column public.calendar_events.subject_member_id is
  'Person, fuer die der Termin stattfindet; NULL in alten Client-Anfragen bedeutet Ressourcen-Eigentümer. Nur innerhalb derselben Familie.';

create table private.calendar_subject_requests (
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  subject_member_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);
alter table private.calendar_subject_requests enable row level security;
revoke all on private.calendar_subject_requests from public, anon, authenticated;

-- Der vorhandene idempotente create_calendar_event-Use-Case bleibt
-- Autorisierungs- und Transaktionsgrundlage. Das neue Kommando prueft die
-- Terminperson und speichert sie atomar im selben Datenbank-Transaktionskontext.
create function public.create_calendar_event_for_member(
  p_family_id uuid,
  p_title text,
  p_is_all_day boolean,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_start_date date,
  p_end_date_exclusive date,
  p_time_zone text,
  p_visibility text,
  p_request_id uuid,
  p_subject_member_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid uuid := (select auth.uid());
  v_event_id uuid;
  v_owner_member_id uuid;
  v_ledger_subject uuid;
begin
  if v_uid is null or p_family_id is null
    or p_request_id is null or p_subject_member_id is null
  then
    raise exception using errcode = 'P0001', message = 'Kalenderaktion nicht erlaubt';
  end if;

  -- Nur ein aktives Personenprofil der angeforderten Familie darf als
  -- Terminperson gespeichert werden. Es werden keine Konto-IDs angenommen.
  if not exists (
    select 1
    from public.family_members as fm
    where fm.id = p_subject_member_id
      and fm.family_id = p_family_id
      and fm.status = 'active'
  ) then
    raise exception using errcode = 'P0001',
      message = 'Terminperson nicht in der aktiven Familie';
  end if;

  -- Wiederholte Anfragekennung darf nicht stillschweigend die Terminperson
  -- wechseln. Sperre erlaubt identische parallele Wiederholungen.
  insert into private.calendar_subject_requests (
    user_id, request_id, subject_member_id
  ) values (v_uid, p_request_id, p_subject_member_id)
  on conflict (user_id, request_id) do nothing;

  select ledger.subject_member_id into v_ledger_subject
  from private.calendar_subject_requests as ledger
  where ledger.user_id = v_uid and ledger.request_id = p_request_id
  for update;

  if v_ledger_subject is distinct from p_subject_member_id then
    raise exception using errcode = 'P0001',
      message = 'Anfragekennung bereits fuer andere Terminperson verwendet';
  end if;

  v_event_id := public.create_calendar_event(
    p_family_id, p_title, p_is_all_day, p_starts_at, p_ends_at,
    p_start_date, p_end_date_exclusive, p_time_zone, p_visibility, p_request_id
  );

  select owner_member_id into v_owner_member_id
  from public.resources
  where id = v_event_id and family_id = p_family_id
    and resource_type = 'calendar_event';

  if v_owner_member_id is null then
    raise exception using errcode = 'P0001', message = 'Kalenderaktion nicht erlaubt';
  end if;

  -- Nur diese Terminperson darf durch diesen Use-Case gesetzt werden.
  -- Bei wiederholten identischen Requests ist das Update idempotent.
  update public.calendar_events
     set subject_member_id = p_subject_member_id
   where resource_id = v_event_id
     and family_id = p_family_id
     and (subject_member_id is null
       or subject_member_id = p_subject_member_id
       or subject_member_id = v_owner_member_id);
  if not found then
    raise exception using errcode = 'P0001', message = 'Terminperson kann nicht geaendert werden';
  end if;

  -- Ein privater Termin fuer eine andere Person wird automatisch fuer genau
  -- diese Person lesbar, nicht fuer die gesamte Familie. Kein Schreibrecht.
  if p_visibility = 'private' and p_subject_member_id <> v_owner_member_id then
    insert into public.resource_grants (
      resource_id, family_id, grantee_member_id, permission, status
    ) values (
      v_event_id, p_family_id, p_subject_member_id, 'read', 'active'
    )
    on conflict (resource_id, family_id, grantee_member_id)
    do update set
      permission = 'read', status = 'active', revoked_at = null,
      updated_at = now();
  end if;

  return v_event_id;
end;
$$;

revoke all on function public.create_calendar_event_for_member(
  uuid, text, boolean, timestamptz, timestamptz, date, date, text, text, uuid, uuid
) from public, anon, authenticated;

grant execute on function public.create_calendar_event_for_member(
  uuid, text, boolean, timestamptz, timestamptz, date, date, text, text, uuid, uuid
) to authenticated;

comment on function public.create_calendar_event_for_member(
  uuid, text, boolean, timestamptz, timestamptz, date, date, text, text, uuid, uuid
) is 'Ersteller bleibt Ressourceneigentümer. Zielperson wird nur familienintern zugeordnet; private Fremdpersonen-Termine erhalten gezieltes Leserecht.';
