import type { CalendarEntry } from "./calendar-service";

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function localDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function localDateTime(date: Date): string {
  return `${localDate(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function toLocalDateTime(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isFinite(date.valueOf()) ? localDateTime(date) : "";
}

export function oneHourAfter(startValue: string): string {
  if (!startValue) return "";
  const date = new Date(startValue);
  if (!Number.isFinite(date.valueOf())) return "";
  date.setMinutes(date.getMinutes() + 60);
  return localDateTime(date);
}

export function adjustEndAfterStart(
  startValue: string,
  endValue: string,
  endWasManuallyEdited: boolean,
): string {
  const defaultEnd = oneHourAfter(startValue);
  if (!defaultEnd) return endValue;
  if (
    !endWasManuallyEdited
    || !endValue
    || !Number.isFinite(new Date(endValue).getTime())
    || new Date(endValue).getTime() <= new Date(startValue).getTime()
  ) {
    return defaultEnd;
  }
  return endValue;
}

export function nextLocalDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function monthCells(year: number, monthIndex: number): string[] {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Monday=0
  first.setUTCDate(first.getUTCDate() - offset);
  const cells: string[] = [];
  for (let i = 0; i < 42; i += 1) {
    cells.push(first.toISOString().slice(0, 10));
    first.setUTCDate(first.getUTCDate() + 1);
  }
  return cells;
}

export function dateInZone(instant: string | number, timeZone: string): string {
  const date = new Date(instant);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function dateTimeInputInZone(instant: string | null, timeZone: string): string {
  if (!instant) return "";
  const date = new Date(instant);
  if (!Number.isFinite(date.valueOf())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

export function dateTimeInputToIso(value: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const naiveUtc = Date.UTC(
    Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0,
  );
  if (!Number.isFinite(naiveUtc)) return null;

  function offsetAt(instant: number): number {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(instant));
    const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
    return Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second")) - instant;
  }

  const first = naiveUtc - offsetAt(naiveUtc);
  const corrected = naiveUtc - offsetAt(first);
  return new Date(corrected).toISOString();
}

export function eventOnDay(
  event: Pick<CalendarEntry, "is_all_day" | "start_date" | "end_date_exclusive" | "starts_at" | "ends_at" | "time_zone">,
  day: string,
): boolean {
  if (event.is_all_day) {
    return !!event.start_date && !!event.end_date_exclusive
      && event.start_date <= day && day < event.end_date_exclusive;
  }
  if (!event.starts_at || !event.ends_at) return false;
  try {
    const start = dateInZone(event.starts_at, event.time_zone);
    // End instant is exclusive: an event ending at midnight does not
    // occupy the following local calendar date.
    const end = dateInZone(Date.parse(event.ends_at) - 1, event.time_zone);
    return start <= day && day <= end;
  } catch {
    return false;
  }
}

export function dayLabel(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "UTC",
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(date);
}

