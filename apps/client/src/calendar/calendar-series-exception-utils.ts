import type {
  CalendarSeriesEntry,
  CalendarSeriesException,
  CalendarSeriesOccurrence,
} from "./calendar-service";
import { eventOnDay } from "./calendar-utils";

export type CalendarSeriesOccurrenceView = {
  series: CalendarSeriesEntry;
  occurrence: CalendarSeriesOccurrence;
  exception: CalendarSeriesException | null;
};

type EffectiveOccurrence = {
  title: string;
  is_all_day: boolean;
  starts_at: string | null;
  ends_at: string | null;
  start_date: string | null;
  end_date_exclusive: string | null;
  time_zone: string;
};

export function effectiveSeriesOccurrence(
  view: CalendarSeriesOccurrenceView,
): EffectiveOccurrence | null {
  if (view.exception?.is_cancelled) return null;
  return {
    title: view.exception?.title ?? view.series.title,
    is_all_day: view.exception?.is_all_day ?? view.series.is_all_day,
    starts_at: view.exception?.starts_at ?? view.occurrence.starts_at,
    ends_at: view.exception?.ends_at ?? view.occurrence.ends_at,
    start_date: view.exception?.start_date ?? view.occurrence.start_date,
    end_date_exclusive: view.exception?.end_date_exclusive ?? view.occurrence.end_date_exclusive,
    time_zone: view.exception?.time_zone ?? view.series.time_zone,
  };
}

export function seriesOccurrenceOnDay(view: CalendarSeriesOccurrenceView, day: string): boolean {
  const effective = effectiveSeriesOccurrence(view);
  if (effective) return eventOnDay(effective, day);
  return eventOnDay(
    {
      is_all_day: view.occurrence.start_date !== null,
      starts_at: view.occurrence.starts_at,
      ends_at: view.occurrence.ends_at,
      start_date: view.occurrence.start_date,
      end_date_exclusive: view.occurrence.end_date_exclusive,
      time_zone: view.series.time_zone,
    },
    day,
  );
}

export function describeSeriesOccurrence(view: CalendarSeriesOccurrenceView): string {
  const effective = effectiveSeriesOccurrence(view);
  const value = effective ?? {
    title: view.series.title,
    is_all_day: view.occurrence.start_date !== null,
    starts_at: view.occurrence.starts_at,
    ends_at: view.occurrence.ends_at,
    start_date: view.occurrence.start_date,
    end_date_exclusive: view.occurrence.end_date_exclusive,
    time_zone: view.series.time_zone,
  };
  if (value.is_all_day) {
    return `Ganztägig: ${value.start_date} bis ${value.end_date_exclusive} (Ende exklusiv)`;
  }
  if (!value.starts_at || !value.ends_at) return "Terminzeit nicht darstellbar";
  try {
    const formatter = new Intl.DateTimeFormat("de-DE", {
      timeZone: value.time_zone,
      dateStyle: "medium",
      timeStyle: "short",
    });
    return `${formatter.format(new Date(value.starts_at))} – ${formatter.format(new Date(value.ends_at))}`;
  } catch {
    return "Terminzeit nicht darstellbar";
  }
}


