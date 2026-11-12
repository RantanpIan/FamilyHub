import { useEffect, useRef, useState, type FormEvent } from "react";
import { EmptyState, ErrorState, LoadingState } from "@familyhub/ui";
import type { FamilyMember } from "@familyhub/contracts";
import { getErrorMessage } from "../auth/auth-utils";
import { useFamily } from "../family/useFamily";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
  type CalendarEntry,
  type CalendarEventInput,
} from "./calendar-service";

import {
  adjustEndAfterStart,
  dayLabel,
  eventOnDay,
  localDate,
  monthCells,
  nextLocalDate,
  toLocalDateTime,
} from "./calendar-utils";

function describeEvent(event: CalendarEntry): string {
  if (event.is_all_day) {
    return `Ganztägig: ${event.start_date} bis ${event.end_date_exclusive} (Ende exklusiv)`;
  }
  const options: Intl.DateTimeFormatOptions = {
    timeZone: event.time_zone,
    dateStyle: "medium",
    timeStyle: "short",
  };
  try {
    const formatter = new Intl.DateTimeFormat("de-DE", options);
    return `${formatter.format(new Date(event.starts_at!))} – ${formatter.format(new Date(event.ends_at!))}`;
  } catch {
    return "Terminzeit nicht darstellbar";
  }
}

function CalendarEditor({
  familyId,
  ownerMemberId,
  members,
  initialDay,
  editing,
  onSaved,
  onCancel,
}: {
  familyId: string;
  ownerMemberId: string;
  members: FamilyMember[];
  initialDay: string;
  editing: CalendarEntry | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin";
  const [allDay, setAllDay] = useState(editing?.is_all_day ?? false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startDefault = initialDay + "T16:00";
  const [startValue, setStartValue] = useState(
    toLocalDateTime(editing?.starts_at ?? null) || startDefault,
  );
  const [endValue, setEndValue] = useState(
    toLocalDateTime(editing?.ends_at ?? null) || initialDay + "T17:00",
  );
  const manuallyEditedEnd = useRef(false);
  const [subjectMemberId, setSubjectMemberId] = useState(
    editing?.subject_member_id ?? editing?.resource.owner_member_id ?? ownerMemberId,
  );
  // Stabile Request-ID fuer die identische Anfrage nach einem Netzwerkfehler.
  const requestId = useRef(crypto.randomUUID());
  const activeMembers = members.filter((member) => member.status === "active");
  const participantOptions = activeMembers.some((member) => member.member_id === ownerMemberId)
    ? activeMembers
    : [
        {
          family_id: familyId,
          member_id: ownerMemberId,
          display_name: "Ich selbst",
          status: "active" as const,
          member_type: "adult" as const,
          has_login: true,
        },
        ...activeMembers,
      ];
  const subjectName = participantOptions.find(
    (member) => member.member_id === subjectMemberId,
  )?.display_name ?? "Familienmitglied";
  const isOtherSubject = subjectMemberId !== ownerMemberId;

  function onStartChanged(value: string) {
    setStartValue(value);
    setEndValue((current) =>
      adjustEndAfterStart(value, current, manuallyEditedEnd.current),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const day = String(data.get("day") ?? "");

    if (!title || title.length > 180) {
      setError("Bitte gib einen Titel mit maximal 180 Zeichen ein.");
      return;
    }
    if (allDay && !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      setError("Bitte wähle ein gültiges Datum.");
      return;
    }
    if (!allDay && (
      !startValue || !endValue ||
      !Number.isFinite(Date.parse(startValue)) ||
      !Number.isFinite(Date.parse(endValue)) ||
      new Date(startValue).getTime() >= new Date(endValue).getTime()
    )) {
      setError("Die Endzeit muss nach dem Beginn liegen.");
      return;
    }

    const input: CalendarEventInput = {
      title,
      isAllDay: allDay,
      startsAt: allDay ? null : new Date(startValue).toISOString(),
      endsAt: allDay ? null : new Date(endValue).toISOString(),
      startDate: allDay ? day : null,
      endDateExclusive: allDay ? nextLocalDate(day) : null,
      timeZone: browserZone,
    };

    setPending(true);
    setError(null);
    try {
      if (editing) {
        await updateCalendarEvent(editing.resource_id, editing.resource.version, input);
      } else {
        await createCalendarEvent(
          familyId,
          input,
          String(data.get("visibility")) === "family" ? "family" : "private",
          requestId.current,
          subjectMemberId,
        );
      }
      onSaved();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="calendar-editor" aria-label={editing ? "Termin bearbeiten" : "Termin anlegen"}>
      <h3>{editing ? "Termin bearbeiten" : "Neuen Termin anlegen"}</h3>
      {error && <ErrorState description={error} />}
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <label>
          Titel
          <input name="title" type="text" maxLength={180} required
            defaultValue={editing?.title ?? ""} />
        </label>
        {editing ? (
          <p className="calendar-hint">
            Termin für: {subjectName}. Die Terminperson bleibt bei der Bearbeitung unverändert.
          </p>
        ) : (
          <label>
            Termin für
            <select name="subjectMemberId" value={subjectMemberId}
              onChange={(event) => setSubjectMemberId(event.currentTarget.value)} required>
              {participantOptions.map((member) => (
                <option key={member.member_id} value={member.member_id}>
                  {member.display_name}
                  {member.member_id === ownerMemberId ? " (ich)" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="calendar-all-day">
          <input type="checkbox" checked={allDay}
            onChange={(event) => setAllDay(event.currentTarget.checked)} />
          Ganztägiger Termin
        </label>
        {allDay ? (
          <label>
            Datum
            <input name="day" type="date" required
              defaultValue={editing?.start_date ?? initialDay} />
          </label>
        ) : (
          <div className="calendar-time-fields">
            <label>
              Beginn
              <input name="startsAt" type="datetime-local" required
                value={startValue}
                onChange={(event) => onStartChanged(event.currentTarget.value)} />
            </label>
            <label>
              Ende
              <input name="endsAt" type="datetime-local" required
                min={startValue}
                value={endValue}
                onChange={(event) => {
                  manuallyEditedEnd.current = true;
                  setEndValue(event.currentTarget.value);
                }} />
            </label>
          </div>
        )}
        {editing ? (
          <p className="calendar-hint">
            Sichtbarkeit: {editing.resource.visibility === "private" ? "Privat" : "Familie"}.
            Sichtbarkeit und Terminperson können später separat geändert werden.
          </p>
        ) : (
          <label>
            Sichtbarkeit
            <select name="visibility" defaultValue="family">
              <option value="family">Familie – für alle angemeldeten Familienmitglieder</option>
              <option value="private">
                {isOtherSubject
                  ? "Privat – nur Ersteller und Terminperson"
                  : "Privat – nur für mich"}
              </option>
            </select>
          </label>
        )}
        <p className="calendar-hint">
          Zeitzone: {browserZone}. Einzeltermine ohne Wiederholungen oder Erinnerungen.
          Bei Änderung des Beginns wird das Ende standardmäßig auf eine Stunde später gesetzt.
        </p>
        {editing && editing.time_zone !== browserZone && (
          <p className="calendar-hint">
            Beim Speichern werden die Zeiten in deine lokale Zeitzone übertragen.
          </p>
        )}
        <div className="calendar-actions">
          <button type="submit" className="primary-button" disabled={pending}>
            {pending ? "Wird gespeichert …" : editing ? "Änderung speichern" : "Termin erstellen"}
          </button>
          <button type="button" className="text-button" onClick={onCancel} disabled={pending}>
            Abbrechen
          </button>
        </div>
      </form>
    </section>
  );
}

export function CalendarPage() {
  const { selectedFamily } = useFamily();
  const familyId = selectedFamily?.family_id ?? null;
  const ownerMemberId = selectedFamily?.member_id ?? null;
  const [events, setEvents] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [editing, setEditing] = useState<CalendarEntry | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    if (!familyId) return;
    void listCalendarEvents(familyId)
      .then((rows) => {
        if (active) {
          setEvents(rows);
          setLoading(false);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoading(false);
          setLoadError(getErrorMessage(error));
          setEvents([]);
        }
      });
    return () => { active = false; };
  }, [familyId, revision]);

  function onSaved() {
    setEditing(null);
    setShowEditor(false);
    setRevision((previous) => previous + 1);
  }

  async function remove(entry: CalendarEntry) {
    if (!window.confirm(`Termin „${entry.title}“ wirklich löschen?`)) return;
    setPendingDelete(entry.resource_id);
    setActionError(null);
    try {
      await deleteCalendarEvent(entry.resource_id, entry.resource.version);
      setRevision((previous) => previous + 1);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setPendingDelete(null);
    }
  }

  if (!familyId || !ownerMemberId) {
    return <LoadingState label="Familienkalender wird vorbereitet" />;
  }

  return (
    <section className="page-section calendar-page" aria-labelledby="calendar-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">FAMILIENKALENDER</span>
          <h2 id="calendar-title">Termine · {selectedFamily?.family_name}</h2>
        </div>
        {!showEditor && (
          <button type="button" className="primary-button" onClick={() => {
            setEditing(null);
            setShowEditor(true);
          }}>+ Termin</button>
        )}
      </div>
      <p className="page-intro">Einzeltermine für deine Familie – mit privater oder gemeinsamer Sichtbarkeit.</p>
      {loadError && (
        <div className="family-inline-error">
          <ErrorState title="Termine konnten nicht geladen werden" description={loadError} />
          <button type="button" className="text-button"
            onClick={() => { setLoading(true); setRevision((v) => v + 1); }}>Erneut versuchen</button>
        </div>
      )}
      {actionError && <ErrorState description={actionError} />}
      {showEditor && (
        <CalendarEditor key={editing?.resource_id ?? "new"} familyId={familyId}
          editing={editing} onSaved={onSaved} onCancel={() => {
            setEditing(null);
            setShowEditor(false);
          }} />
      )}
      {loading ? (
        <LoadingState label="Termine werden geladen" />
      ) : events.length === 0 && !loadError ? (
        <EmptyState title="Noch keine Termine"
          description="Erstelle euren ersten Termin. Private Einträge sehen nur berechtigte Familienmitglieder." />
      ) : (
        <ul className="calendar-event-list" aria-label="Kalendereinträge">
          {events.map((entry) => {
            const isOwner = entry.resource.owner_member_id === ownerMemberId;
            return (
              <li className="calendar-event-card" key={entry.resource_id}>
                <div className="calendar-event-content">
                  <span className="calendar-event-meta">
                    {entry.resource.visibility === "private" ? "Privat" : "Familie"}
                  </span>
                  <h3>{entry.title}</h3>
                  <p>{describeEvent(entry)}</p>
                </div>
                {isOwner && (
                  <div className="calendar-actions">
                    <button className="text-button" type="button"
                      onClick={() => { setEditing(entry); setShowEditor(true); }}>
                      Bearbeiten
                    </button>
                    <button className="text-button" type="button"
                      disabled={pendingDelete === entry.resource_id}
                      onClick={() => void remove(entry)}>
                      {pendingDelete === entry.resource_id ? "Wird gelöscht …" : "Löschen"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
