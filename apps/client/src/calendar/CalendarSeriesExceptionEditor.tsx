import { useState, type FormEvent } from "react";
import { ErrorState } from "@familyhub/ui";
import {
  deleteCalendarSeriesException,
  setCalendarSeriesException,
  type CalendarSeriesExceptionInput,
} from "./calendar-service";
import {
  dateInZone,
  dateTimeInputInZone,
  dateTimeInputToIso,
  nextLocalDate,
} from "./calendar-utils";
import {
  effectiveSeriesOccurrence,
  type CalendarSeriesOccurrenceView,
} from "./calendar-series-exception-utils";
import "./calendar-series-exceptions.css";

export function CalendarSeriesExceptionEditor({
  view,
  onSaved,
  onCancel,
}: {
  view: CalendarSeriesOccurrenceView;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const effective = effectiveSeriesOccurrence(view) ?? {
    title: view.series.title,
    is_all_day: view.occurrence.start_date !== null,
    starts_at: view.occurrence.starts_at,
    ends_at: view.occurrence.ends_at,
    start_date: view.occurrence.start_date,
    end_date_exclusive: view.occurrence.end_date_exclusive,
    time_zone: view.series.time_zone,
  };
  const [title, setTitle] = useState(effective.title);
  const [allDay, setAllDay] = useState(effective.is_all_day);
  const [day, setDay] = useState(
    effective.start_date ?? dateInZone(effective.starts_at ?? "", effective.time_zone),
  );
  const [start, setStart] = useState(dateTimeInputInZone(effective.starts_at, effective.time_zone));
  const [end, setEnd] = useState(dateTimeInputInZone(effective.ends_at, effective.time_zone));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const exceptionVersion = view.exception?.exception_version ?? 0;
  const seriesVersion = view.series.resource.version;
  const requestId = () => crypto.randomUUID();

  async function saveOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startsAt = allDay ? null : dateTimeInputToIso(start, effective.time_zone);
    const endsAt = allDay ? null : dateTimeInputToIso(end, effective.time_zone);
    if (!title.trim() || (allDay && !/^\d{4}-\d{2}-\d{2}$/.test(day))) {
      setError("Bitte Titel und Datum vollständig angeben.");
      return;
    }
    if (!allDay && (!startsAt || !endsAt || startsAt >= endsAt)) {
      setError("Die Endzeit muss nach dem Beginn liegen.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const input: CalendarSeriesExceptionInput = {
        action: "override",
        title: title.trim(),
        isAllDay: allDay,
        startsAt,
        endsAt,
        startDate: allDay ? day : null,
        endDateExclusive: allDay ? nextLocalDate(day) : null,
        timeZone: effective.time_zone,
      };
      await setCalendarSeriesException(
        view.series.resource_id,
        view.occurrence.occurrence_key,
        requestId(),
        seriesVersion,
        exceptionVersion,
        input,
      );
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Die Ausnahme konnte nicht gespeichert werden.");
    } finally {
      setPending(false);
    }
  }

  async function cancelOccurrence() {
    setPending(true);
    setError(null);
    try {
      await setCalendarSeriesException(
        view.series.resource_id,
        view.occurrence.occurrence_key,
        requestId(),
        seriesVersion,
        exceptionVersion,
        {
          action: "cancel",
          title: null,
          isAllDay: null,
          startsAt: null,
          endsAt: null,
          startDate: null,
          endDateExclusive: null,
          timeZone: null,
        },
      );
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Das Vorkommen konnte nicht abgesagt werden.");
    } finally {
      setPending(false);
    }
  }

  async function resetOccurrence() {
    if (!view.exception) return;
    setPending(true);
    setError(null);
    try {
      await deleteCalendarSeriesException(
        view.series.resource_id,
        view.occurrence.occurrence_key,
        requestId(),
        seriesVersion,
        view.exception.exception_version,
      );
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Die Ausnahme konnte nicht zurückgesetzt werden.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="calendar-series-editor" aria-label="Serienvorkommen bearbeiten">
      <h4>Einzelnes Serienvorkommen bearbeiten</h4>
      {error && <ErrorState description={error} />}
      <form className="auth-form" onSubmit={(event) => void saveOverride(event)}>
        <label>
          Titel
          <input value={title} maxLength={180} required onChange={(event) => setTitle(event.currentTarget.value)} />
        </label>
        <label className="calendar-all-day">
          <input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.currentTarget.checked)} />
          Ganztägiges Vorkommen
        </label>
        {allDay ? (
          <label>
            Datum
            <input type="date" value={day} required onChange={(event) => setDay(event.currentTarget.value)} />
          </label>
        ) : (
          <div className="calendar-time-fields">
            <label>
              Beginn
              <input type="datetime-local" value={start} required onChange={(event) => setStart(event.currentTarget.value)} />
            </label>
            <label>
              Ende
              <input type="datetime-local" value={end} required onChange={(event) => setEnd(event.currentTarget.value)} />
            </label>
          </div>
        )}
        <p className="calendar-hint">Zeitzone der Serie: {effective.time_zone}. Nur dieses eine Vorkommen wird geändert.</p>
        <div className="calendar-actions">
          <button type="submit" className="primary-button" disabled={pending}>
            {pending ? "Wird gespeichert …" : "Vorkommen speichern"}
          </button>
          <button type="button" className="text-button" disabled={pending} onClick={() => void cancelOccurrence()}>
            Vorkommen absagen
          </button>
          {view.exception && (
            <button type="button" className="text-button" disabled={pending} onClick={() => void resetOccurrence()}>
              Ausnahme zurücksetzen
            </button>
          )}
          <button type="button" className="text-button" disabled={pending} onClick={onCancel}>
            Abbrechen
          </button>
        </div>
      </form>
    </section>
  );
}

