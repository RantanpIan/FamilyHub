import { useEffect, useRef, useState, type FormEvent } from "react";
import { EmptyState, ErrorState, LoadingState } from "@familyhub/ui";
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

function two(n: number) {
  return String(n).padStart(2, "0");
}

function localDay(date: Date): string {
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

function localTimeInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return `${localDay(date)}T${two(date.getHours())}:${two(date.getMinutes())}`;
}

function nextDay(localDate: string): string {
  const utc = new Date(`${localDate}T00:00:00.000Z`);
  utc.setUTCDate(utc.getUTCDate() + 1);
  return utc.toISOString().slice(0, 10);
}

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
  editing,
  onSaved,
  onCancel,
}: {
  familyId: string;
  editing: CalendarEntry | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [allDay, setAllDay] = useState(editing?.is_all_day ?? false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // An identischer Formularanfrage bleibt die ID über Retry/Netzfehler gleich.
  const requestId = useRef(crypto.randomUUID());
  const now = new Date();
  const today = localDay(now);
  const startDefault = `${today}T16:00`;
  const endDefault = `${today}T17:00`;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const day = String(data.get("day") ?? "");
    const start = String(data.get("startsAt") ?? "");
    const end = String(data.get("endsAt") ?? "");

    if (!title || title.length > 180) {
      setError("Bitte gib einen Titel mit maximal 180 Zeichen ein.");
      return;
    }
    if (allDay && !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      setError("Bitte wähle ein gültiges Datum.");
      return;
    }
    if (!allDay && (
      !start || !end ||
      !Number.isFinite(Date.parse(start)) ||
      !Number.isFinite(Date.parse(end)) ||
      Date.parse(start) >= Date.parse(end)
    )) {
      setError("Die Endzeit muss nach der Startzeit liegen.");
      return;
    }

    const input: CalendarEventInput = {
      title,
      isAllDay: allDay,
      startsAt: allDay ? null : new Date(start).toISOString(),
      endsAt: allDay ? null : new Date(end).toISOString(),
      startDate: allDay ? day : null,
      endDateExclusive: allDay ? nextDay(day) : null,
      timeZone: zone,
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
        <label className="calendar-all-day">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.currentTarget.checked)} />
          Ganztägiger Termin
        </label>
        {allDay ? (
          <label>
            Datum
            <input name="day" type="date" required defaultValue={editing?.start_date ?? today} />
          </label>
        ) : (
          <div className="calendar-time-fields">
            <label>
              Beginn
              <input name="startsAt" type="datetime-local" required
                defaultValue={localTimeInput(editing?.starts_at ?? null) || startDefault} />
            </label>
            <label>
              Ende
              <input name="endsAt" type="datetime-local" required
                defaultValue={localTimeInput(editing?.ends_at ?? null) || endDefault} />
            </label>
          </div>
        )}
        {editing ? (
          <p className="calendar-hint">
            Sichtbarkeit: {editing.resource.visibility === "private" ? "Privat" : "Familie"}.
            Änderungen an der Sichtbarkeit folgen separat.
          </p>
        ) : (
          <label>
            Sichtbarkeit
            <select name="visibility" defaultValue="private">
              <option value="private">Privat – nur für mich</option>
              <option value="family">Familie – für angemeldete Mitglieder sichtbar</option>
            </select>
          </label>
        )}
        <p className="calendar-hint">
          Zeitzone: {zone}. Einzeltermine, noch ohne Wiederholungen und Erinnerungen.
        </p>
        {editing && editing.time_zone !== zone && (
          <p className="calendar-hint">
            Hinweis: Beim Speichern wird die Terminzeit in deine lokale Zeitzone übertragen.
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
