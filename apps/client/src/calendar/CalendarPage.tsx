import { useEffect, useRef, useState, type FormEvent } from "react";
import { EmptyState, ErrorState, LoadingState } from "@familyhub/ui";
import {
  GrantResourceReadInputSchema,
  type FamilyMember,
  type ResourceGrant,
  type ResourceVisibility,
} from "@familyhub/contracts";
import { getErrorMessage } from "../auth/auth-utils";
import { useFamily } from "../family/useFamily";
import {
  grantResourceRead,
  listResourceGrants,
  revokeResourceRead,
  setResourceVisibility,
} from "../access/resource-access-service";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarSeries,
  listCalendarSeriesExceptions,
  listCalendarSeriesOccurrences,
  listCalendarEvents,
  updateCalendarEvent,
  type CalendarEntry,
  type CalendarEventInput,
  type CalendarSeriesEntry,
  type CalendarSeriesException,
  type CalendarSeriesOccurrence,
} from "./calendar-service";
import { CalendarSeriesExceptionEditor } from "./CalendarSeriesExceptionEditor";
import {
  describeSeriesOccurrence,
  effectiveSeriesOccurrence,
  seriesOccurrenceOnDay,
  type CalendarSeriesOccurrenceView,
} from "./calendar-series-exception-utils";
import {
  activeCalendarGrantMemberIds,
  eligibleCalendarGrantMembers,
} from "./calendar-sharing";
import "./calendar-sharing.css";

import {
  adjustEndAfterStart,
  dayLabel,
  eventOnDay,
  localDate,
  monthCells,
  nextLocalDate,
  dateTimeInputInZone,
  dateTimeInputToIso,
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
  const editorTimeZone = editing?.time_zone ?? browserZone;
  const [allDay, setAllDay] = useState(editing?.is_all_day ?? false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startDefault = initialDay + "T16:00";
  const [startValue, setStartValue] = useState(
    dateTimeInputInZone(editing?.starts_at ?? null, editorTimeZone) || startDefault,
  );
  const [endValue, setEndValue] = useState(
    dateTimeInputInZone(editing?.ends_at ?? null, editorTimeZone) || initialDay + "T17:00",
  );
  const [startDay, setStartDay] = useState(editing?.start_date ?? initialDay);
  const [endDay, setEndDay] = useState(
    editing?.end_date_exclusive ?? nextLocalDate(editing?.start_date ?? initialDay),
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
      adjustEndAfterStart(value, current, manuallyEditedEnd.current, editorTimeZone),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (!title || title.length > 180) {
      setError("Bitte gib einen Titel mit maximal 180 Zeichen ein.");
      return;
    }
    if (allDay && (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDay)
      || !/^\d{4}-\d{2}-\d{2}$/.test(endDay)
      || startDay >= endDay
    )) {
      setError("Bitte wähle einen gültigen Zeitraum mit exklusivem Enddatum.");
      return;
    }
    const startsAt = allDay ? null : dateTimeInputToIso(startValue, editorTimeZone);
    const endsAt = allDay ? null : dateTimeInputToIso(endValue, editorTimeZone);
    if (!allDay && (
      !startValue || !endValue ||
      !startsAt || !endsAt ||
      new Date(startsAt).getTime() >= new Date(endsAt).getTime()
    )) {
      setError("Die lokale Uhrzeit ist ungültig oder die Endzeit liegt nicht nach dem Beginn.");
      return;
    }

    const input: CalendarEventInput = {
      title,
      isAllDay: allDay,
      startsAt,
      endsAt,
      startDate: allDay ? startDay : null,
      endDateExclusive: allDay ? endDay : null,
      timeZone: editorTimeZone,
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
            Beginn
            <input name="day" type="date" required value={startDay}
              onChange={(event) => setStartDay(event.currentTarget.value)} />
            <span className="calendar-hint">Ende (exklusiv)</span>
            <input name="endDay" type="date" required value={endDay} min={startDay}
              onChange={(event) => setEndDay(event.currentTarget.value)} />
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
            <select name="visibility" defaultValue="private">
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
          Zeitzone: {editorTimeZone}. Einzeltermine ohne Wiederholungen oder Erinnerungen.
          Bei Änderung des Beginns wird das Ende standardmäßig auf eine Stunde später gesetzt.
        </p>
        {editing && editing.time_zone !== browserZone && (
          <p className="calendar-hint">
            Der Termin bleibt in seiner ursprünglichen Zeitzone; die Eingabefelder zeigen diese Zeitzone an.
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
  const [seriesOccurrences, setSeriesOccurrences] = useState<CalendarSeriesOccurrenceView[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [editingSeriesOccurrence, setEditingSeriesOccurrence] = useState<CalendarSeriesOccurrenceView | null>(null);
  const [detail, setDetail] = useState<CalendarEntry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const detailRequest = useRef(0);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const restoreDetailFocus = useRef(false);
  const [sharing, setSharing] = useState<{
    resourceId: string;
    grants: ResourceGrant[];
    loading: boolean;
    pendingMemberId: string | null;
    pendingVisibility: boolean;
    error: string | null;
  } | null>(null);
  const [revision, setRevision] = useState(0);
  const today = localDate(new Date());
  const [selectedDay, setSelectedDay] = useState(today);
  const [displayMonth, setDisplayMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const monthKey = localDate(displayMonth).slice(0, 7);
  const days = monthCells(displayMonth.getFullYear(), displayMonth.getMonth());
  const selectedEvents = events.filter((event) => eventOnDay(event, selectedDay));
  const selectedSeriesOccurrences = seriesOccurrences.filter((view) =>
    seriesOccurrenceOnDay(view, selectedDay),
  );
  const monthLabel = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(displayMonth);

  useEffect(() => {
    let active = true;
    setEvents([]);
    setLoading(Boolean(familyId));
    setLoadError(null);
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
  }, [familyId, ownerMemberId, revision]);

  useEffect(() => {
    let active = true;
    setSeriesOccurrences([]);
    setSeriesLoading(Boolean(familyId));
    setSeriesError(null);
    const rangeDays = monthCells(displayMonth.getFullYear(), displayMonth.getMonth());
    const rangeStart = rangeDays.at(0);
    const rangeEnd = rangeDays.at(-1);
    if (!familyId || !rangeStart || !rangeEnd) return;
    void Promise.all([
      listCalendarSeries(familyId),
      listCalendarSeriesOccurrences(familyId, rangeStart, rangeEnd),
    ])
      .then(async ([series, occurrences]) => {
        const exceptions = await Promise.all(
          series.map(async (item) => [
            item.resource_id,
            await listCalendarSeriesExceptions(item.resource_id),
          ] as const),
        );
        const exceptionMap = new Map<string, CalendarSeriesException[]>(exceptions);
        const seriesMap = new Map<string, CalendarSeriesEntry>(
          series.map((item) => [item.resource_id, item]),
        );
        const views = occurrences.flatMap((occurrence: CalendarSeriesOccurrence) => {
          const seriesEntry = seriesMap.get(occurrence.series_resource_id);
          if (!seriesEntry) return [];
          const exception = exceptionMap.get(seriesEntry.resource_id)?.find(
            (item) => item.occurrence_key === occurrence.occurrence_key,
          ) ?? null;
          return [{ series: seriesEntry, occurrence, exception }];
        });
        if (active) {
          setSeriesOccurrences(views);
          setSeriesError(null);
          setSeriesLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setSeriesOccurrences([]);
          setSeriesError(getErrorMessage(error));
          setSeriesLoading(false);
        }
      });
    return () => { active = false; };
  }, [familyId, ownerMemberId, monthKey, revision, displayMonth]);

  useEffect(() => {
    if (detail || detailLoading || detailError) {
      detailHeading.current?.focus();
    } else if (restoreDetailFocus.current) {
      restoreDetailFocus.current = false;
      if (detailTrigger.current?.isConnected) detailTrigger.current.focus();
      else document.getElementById("calendar-selected-title")?.focus();
    }
  }, [detail, detailLoading, detailError]);

  async function openDetail(entry: CalendarEntry, trigger: HTMLButtonElement) {
    if (!familyId) return;
    const request = ++detailRequest.current;
    detailTrigger.current = trigger;
    setEditing(null);
    setShowEditor(false);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const rows = await listCalendarEvents(familyId);
      if (request !== detailRequest.current) return;
      setEvents(rows);
      const current = rows.find((row) => row.resource_id === entry.resource_id);
      if (current) setDetail(current);
      else setDetailError("Der Termin ist nicht verfügbar oder du hast keinen Zugriff mehr.");
    } catch (error) {
      if (request !== detailRequest.current) return;
      setEvents([]);
      setDetailError(getErrorMessage(error));
    } finally {
      if (request === detailRequest.current) setDetailLoading(false);
    }
  }

  function closeDetail() {
    detailRequest.current += 1;
    setDetail(null);
    setDetailLoading(false);
    setDetailError(null);
    restoreDetailFocus.current = true;
  }

  function reload() {
    closeDetail();
    setLoading(true);
    setSeriesLoading(true);
    setRevision((previous) => previous + 1);
  }

  function onSaved() {
    setEditing(null);
    setShowEditor(false);
    reload();
  }

  function onSeriesExceptionSaved() {
    setEditingSeriesOccurrence(null);
    reload();
  }

  function selectDay(day: string) {
    setSelectedDay(day);
    if (day.slice(0, 7) !== monthKey) {
      const year = Number(day.slice(0, 4));
      const month = Number(day.slice(5, 7));
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

  async function openSharing(entry: CalendarEntry) {
    if (sharing?.resourceId === entry.resource_id) {
      setSharing(null);
      return;
    }

    setSharing({
      resourceId: entry.resource_id,
      grants: [],
      loading: true,
      pendingMemberId: null,
      pendingVisibility: false,
      error: null,
    });
    try {
      const grants = await listResourceGrants(entry.resource_id);
      setSharing((current) =>
        current?.resourceId === entry.resource_id
          ? { ...current, grants, loading: false }
          : current,
      );
    } catch (error) {
      setSharing((current) =>
        current?.resourceId === entry.resource_id
          ? { ...current, loading: false, error: getErrorMessage(error) }
          : current,
      );
    }
  }

  async function changeVisibility(entry: CalendarEntry, visibility: ResourceVisibility) {
    setSharing((current) =>
      current?.resourceId === entry.resource_id
        ? { ...current, pendingVisibility: true, error: null }
        : current,
    );
    try {
      await setResourceVisibility({
        resourceId: entry.resource_id,
        visibility,
        expectedVersion: entry.resource.version,
      });
      setSharing(null);
      reload();
    } catch (error) {
      setSharing((current) =>
        current?.resourceId === entry.resource_id
          ? { ...current, pendingVisibility: false, error: getErrorMessage(error) }
          : current,
      );
    }
  }

  async function changeGrant(entry: CalendarEntry, memberId: string, enabled: boolean) {
    setSharing((current) =>
      current?.resourceId === entry.resource_id
        ? { ...current, pendingMemberId: memberId, error: null }
        : current,
    );
    try {
      const input = GrantResourceReadInputSchema.parse({
        resourceId: entry.resource_id,
        granteeMemberId: memberId,
      });
      if (enabled) {
        await grantResourceRead(input);
      } else {
        await revokeResourceRead(input);
      }
      const grants = await listResourceGrants(entry.resource_id);
      setSharing((current) =>
        current?.resourceId === entry.resource_id
          ? { ...current, grants, pendingMemberId: null }
          : current,
      );
    } catch (error) {
      setSharing((current) =>
        current?.resourceId === entry.resource_id
          ? { ...current, pendingMemberId: null, error: getErrorMessage(error) }
          : current,
      );
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
      {(detail || detailLoading || detailError) && (
        <section className="calendar-detail" aria-labelledby="calendar-detail-title">
          <h3 id="calendar-detail-title" ref={detailHeading} tabIndex={-1}>Termindetails</h3>
          {detailLoading && <LoadingState label="Zugriff auf Termin wird geprüft" />}
          {detailError && <ErrorState description={detailError} />}
          {detail && <>
            <h4>{detail.title}</h4>
            <p>{describeEvent(detail)}</p>
            <p>{detail.resource.visibility === "private" ? "Privat" : "Familie"} · Termin für {subjectName(detail)}</p>
          </>}
          <button type="button" className="text-button" onClick={closeDetail}>Zurück zur Tagesansicht</button>
        </section>
      )}
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
      {editingSeriesOccurrence && (
        <CalendarSeriesExceptionEditor
          key={`${editingSeriesOccurrence.series.resource_id}-${editingSeriesOccurrence.occurrence.occurrence_key}`}
          view={editingSeriesOccurrence}
          onSaved={onSeriesExceptionSaved}
          onCancel={() => setEditingSeriesOccurrence(null)}
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
            {selectedEvents.length + selectedSeriesOccurrences.length} {
              selectedEvents.length + selectedSeriesOccurrences.length === 1 ? "Termin" : "Termine"
            }
          </span>
        </div>
        {loading || seriesLoading ? (
          <LoadingState label="Termine werden geladen" />
        ) : selectedEvents.length === 0 && selectedSeriesOccurrences.length === 0 && !loadError && !seriesError ? (
          <EmptyState title="Keine Termine an diesem Tag"
            description="Wähle einen anderen Tag oder lege einen Termin an." />
        ) : (
          <>
            {seriesError && <ErrorState title="Serientermine konnten nicht geladen werden" description={seriesError} />}
            {selectedEvents.length > 0 && (
              <ul className="calendar-event-list" aria-label="Einzeltermine am ausgewählten Tag">
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
                            onClick={(event) => void openDetail(entry, event.currentTarget)}>
                            Details zu „{entry.title}“
                          </button>
                          <button className="text-button" type="button"
                            onClick={() => { setEditing(entry); setShowEditor(true); }}>
                            Bearbeiten
                          </button>
                          <button className="text-button" type="button"
                            aria-expanded={sharing?.resourceId === entry.resource_id}
                            aria-controls={`calendar-sharing-${entry.resource_id}`}
                            onClick={() => void openSharing(entry)}>
                            Freigaben
                          </button>
                          <button className="text-button" type="button"
                            disabled={pendingDelete === entry.resource_id}
                            onClick={() => void remove(entry)}>
                            {pendingDelete === entry.resource_id ? "Wird gelöscht …" : "Löschen"}
                          </button>
                        </div>
                      )}
                      {isOwner && sharing?.resourceId === entry.resource_id && (
                        <div
                          className="calendar-sharing-panel"
                          id={`calendar-sharing-${entry.resource_id}`}
                          aria-label={`Freigaben für ${entry.title}`}
                        >
                          <h4>Lesefreigaben</h4>
                          {sharing.error && <ErrorState description={sharing.error} />}
                          {sharing.loading ? (
                            <LoadingState label="Freigaben werden geladen" />
                          ) : (
                            <>
                              <label>
                                Sichtbarkeit
                                <select
                                  value={entry.resource.visibility}
                                  disabled={sharing.pendingVisibility || sharing.pendingMemberId !== null}
                                  onChange={(event) =>
                                    void changeVisibility(
                                      entry,
                                      event.currentTarget.value as ResourceVisibility,
                                    )}
                                >
                                  <option value="private">Privat</option>
                                  <option value="family">Familie</option>
                                </select>
                              </label>
                              <p className="calendar-hint">
                                Die ausgewählten Personen erhalten ausschließlich Leserechte.
                                Du bleibst Eigentümer und behältst Änderungs- und Löschrechte.
                              </p>
                              <div className="calendar-sharing-members">
                                {eligibleCalendarGrantMembers(members, ownerMemberId).length === 0 ? (
                                  <p className="calendar-hint">
                                    Es gibt keine weiteren aktiven Familienkonten für eine explizite Freigabe.
                                  </p>
                                ) : (
                                  eligibleCalendarGrantMembers(members, ownerMemberId).map((member) => {
                                    const activeGrantIds = activeCalendarGrantMemberIds(sharing.grants);
                                    return (
                                      <label className="calendar-sharing-member" key={member.member_id}>
                                        <input
                                          type="checkbox"
                                          checked={activeGrantIds.has(member.member_id)}
                                          disabled={sharing.pendingVisibility || sharing.pendingMemberId !== null}
                                          onChange={(event) =>
                                            void changeGrant(
                                              entry,
                                              member.member_id,
                                              event.currentTarget.checked,
                                            )}
                                        />
                                        {member.display_name}
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {selectedSeriesOccurrences.length > 0 && (
              <ul className="calendar-event-list" aria-label="Serientermine am ausgewählten Tag">
                {selectedSeriesOccurrences.map((view) => {
                  const isOwner = view.series.resource.owner_member_id === ownerMemberId;
                  const effective = effectiveSeriesOccurrence(view);
                  return (
                    <li className="calendar-event-card" key={`${view.series.resource_id}-${view.occurrence.occurrence_key}`}>
                      <div className="calendar-event-content">
                        <span className="calendar-event-meta">
                          Serientermin · {view.exception?.is_cancelled ? "abgesagt" : view.exception ? "Ausnahme" : "Basisregel"}
                        </span>
                        <h3>{effective?.title ?? view.series.title}</h3>
                        <p>{describeSeriesOccurrence(view)}</p>
                      </div>
                      {isOwner && (
                        <div className="calendar-actions">
                          <button className="text-button" type="button"
                            onClick={() => setEditingSeriesOccurrence(view)}>
                            {view.exception ? "Ausnahme bearbeiten" : "Vorkommen ändern"}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </section>
    </section>
  );
}


