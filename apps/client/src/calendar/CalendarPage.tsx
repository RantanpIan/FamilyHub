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
  const { selectedFamily, members } = useFamily();
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
  const today = localDate(new Date());
  const [selectedDay, setSelectedDay] = useState(today);
  const [displayMonth, setDisplayMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const monthKey = localDate(displayMonth).slice(0, 7);
  const days = monthCells(displayMonth.getFullYear(), displayMonth.getMonth());
  const selectedEvents = events.filter((event) => eventOnDay(event, selectedDay));
  const monthLabel = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(displayMonth);

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

  function reload() {
    setLoading(true);
    setRevision((previous) => previous + 1);
  }

  function onSaved() {
    setEditing(null);
    setShowEditor(false);
    reload();
  }

  function selectDay(day: string) {
    setSelectedDay(day);
    if (day.slice(0, 7) !== monthKey) {
      const [year, month] = day.split("-").map(Number);
      setDisplayMonth(new Date(year, month - 1, 1));
    }
  }

  function shiftMonth(delta: number) {
    const next = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + delta, 1);
    setDisplayMonth(next);
    setSelectedDay(localDate(next));
  }

  async function remove(entry: CalendarEntry) {
    if (!window.confirm("Termin „" + entry.title + "“ wirklich löschen?")) return;
    setPendingDelete(entry.resource_id);
    setActionError(null);
    try {
      await deleteCalendarEvent(entry.resource_id, entry.resource.version);
      reload();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setPendingDelete(null);
    }
  }

  function subjectName(entry: CalendarEntry): string {
    const id = entry.subject_member_id ?? entry.resource.owner_member_id;
    return members.find((member) => member.member_id === id)?.display_name ?? "Familienmitglied";
  }

  if (!familyId || !ownerMemberId) {
    return <LoadingState label="Familienkalender wird vorbereitet" />;
  }

  return (
    <section className="page-section calendar-page" aria-labelledby="calendar-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">FAMILIENKALENDER</span>
          <h2 id="calendar-title">{selectedFamily?.family_name}</h2>
        </div>
        {!showEditor && (
          <button type="button" className="primary-button" onClick={() => {
            setEditing(null);
            setShowEditor(true);
          }}>+ Termin</button>
        )}
      </div>
      <p className="page-intro">
        Alle Tage im Blick. Familien-Termine erscheinen bei anderen Konten nur,
        wenn sie derselben FamilyHub-Familie angehören.
      </p>
      {loadError && (
        <div className="family-inline-error">
          <ErrorState title="Termine konnten nicht geladen werden" description={loadError} />
          <button type="button" className="text-button" onClick={reload}>
            Erneut versuchen
          </button>
        </div>
      )}
      {actionError && <ErrorState description={actionError} />}
      {showEditor && (
        <CalendarEditor
          key={editing?.resource_id ?? "new-" + selectedDay}
          familyId={familyId}
          ownerMemberId={ownerMemberId}
          members={members}
          initialDay={selectedDay}
          editing={editing}
          onSaved={onSaved}
          onCancel={() => {
            setEditing(null);
            setShowEditor(false);
          }}
        />
      )}

      <section className="calendar-month" aria-label="Monatskalender">
        <div className="calendar-month-toolbar">
          <button className="text-button" type="button" aria-label="Vorheriger Monat"
            onClick={() => shiftMonth(-1)}>
            ‹
          </button>
          <h3>{monthLabel}</h3>
          <button className="text-button" type="button" aria-label="Nächster Monat"
            onClick={() => shiftMonth(1)}>
            ›
          </button>
          <button className="text-button calendar-today" type="button"
            onClick={() => {
              const now = new Date();
              setSelectedDay(localDate(now));
              setDisplayMonth(new Date(now.getFullYear(), now.getMonth(), 1));
            }}>
            Heute
          </button>
        </div>
        <div className="calendar-weekdays" aria-hidden="true">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div className="calendar-month-grid">
          {days.map((day) => {
            const dayEvents = events.filter((event) => eventOnDay(event, day));
            const inMonth = day.slice(0, 7) === monthKey;
            const isSelected = day === selectedDay;
            const isToday = day === today;
            return (
              <button
                key={day}
                type="button"
                className={[
                  "calendar-day",
                  inMonth ? "" : "is-adjacent",
                  isToday ? "is-today" : "",
                  isSelected ? "is-selected" : "",
                ].filter(Boolean).join(" ")}
                aria-label={dayLabel(day) + (dayEvents.length ? ", " + dayEvents.length + " Termine" : ", keine Termine")}
                aria-pressed={isSelected}
                data-testid={"calendar-day-" + day}
                onClick={() => selectDay(day)}
              >
                <span className="calendar-day-number">{Number(day.slice(8, 10))}</span>
                <span className="calendar-day-events" aria-hidden="true">
                  {dayEvents.slice(0, 2).map((item) => (
                    <span className="calendar-day-event" key={item.resource_id}>
                      {item.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="calendar-day-overflow">
                      +{dayEvents.length - 2} weitere
                    </span>
                  )}
                </span>
                {dayEvents.length > 0 && (
                  <span className="calendar-day-count" aria-hidden="true">
                    {dayEvents.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="calendar-selected-day" aria-labelledby="calendar-selected-title">
        <div className="section-heading">
          <h3 id="calendar-selected-title">{dayLabel(selectedDay)}</h3>
          <span className="calendar-count">
            {selectedEvents.length} {selectedEvents.length === 1 ? "Termin" : "Termine"}
          </span>
        </div>
        {loading ? (
          <LoadingState label="Termine werden geladen" />
        ) : selectedEvents.length === 0 && !loadError ? (
          <EmptyState title="Keine Termine an diesem Tag"
            description="Wähle einen anderen Tag oder lege einen Termin an." />
        ) : (
          <ul className="calendar-event-list" aria-label="Termine am ausgewählten Tag">
            {selectedEvents.map((entry) => {
              const isOwner = entry.resource.owner_member_id === ownerMemberId;
              return (
                <li className="calendar-event-card" key={entry.resource_id}>
                  <div className="calendar-event-content">
                    <span className="calendar-event-meta">
                      {entry.resource.visibility === "private" ? "Privat" : "Familie"}
                      {" · Termin für " + subjectName(entry)}
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
    </section>
  );
}
