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

function partsInZone(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(instant);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: value("year"), month: value("month"), day: value("day"),
    hour: value("hour"), minute: value("minute"),
  };
}

function utcMillis(year: number, month: number, day: number, hour: number, minute: number): number {
  const value = new Date(0);
  value.setUTCFullYear(year, month - 1, day);
  value.setUTCHours(hour, minute, 0, 0);
  return value.getTime();
}

function zoneOffsetMillis(instant: Date, timeZone: string): number {
  const parts = partsInZone(instant, timeZone);
  return utcMillis(
    Number(parts.year), Number(parts.month), Number(parts.day),
    Number(parts.hour), Number(parts.minute),
  ) - instant.getTime();
}

export function toLocalDateTimeInZone(iso: string | null, timeZone: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.valueOf())) return "";
  try {
    const parts = partsInZone(date, timeZone);
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  } catch {
    return "";
  }
}

/** Converts a datetime-local wall-clock value in an IANA zone to an instant.
 * A DST-gap value is rejected instead of silently normalizing to another time.
 * For a repeated local time the earlier occurrence is selected deterministically.
 */
export function zonedDateTimeToIso(value: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const wallMillis = utcMillis(Number(year), Number(month), Number(day), Number(hour), Number(minute));
  if (!Number.isFinite(wallMillis)) return null;
  let offsets: number[];
  try {
    offsets = [-24, -12, 0, 12, 24].map(
      (hours) => zoneOffsetMillis(new Date(wallMillis + hours * 60 * 60 * 1000), timeZone),
    );
  } catch {
    return null;
  }
  const candidates = [...new Set(offsets)].map((offset) => wallMillis - offset)
    .filter((candidate) => {
      if (!Number.isFinite(candidate)) return false;
      return toLocalDateTimeInZone(new Date(candidate).toISOString(), timeZone) === value;
    });
  if (candidates.length === 0) return null;
  return new Date(Math.min(...candidates)).toISOString();
}

export function oneHourAfter(startValue: string, timeZone?: string): string {
  if (!startValue) return "";
  const iso = timeZone ? zonedDateTimeToIso(startValue, timeZone) : startValue;
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.valueOf())) return "";
  date.setTime(date.getTime() + 60 * 60 * 1000);
  return timeZone ? toLocalDateTimeInZone(date.toISOString(), timeZone) : localDateTime(date);
}

export function adjustEndAfterStart(
  startValue: string,
  endValue: string,
  endWasManuallyEdited: boolean,
  timeZone?: string,
): string {
  const defaultEnd = oneHourAfter(startValue, timeZone);
  if (!defaultEnd) return endValue;
  const startInstant = timeZone ? zonedDateTimeToIso(startValue, timeZone) : startValue;
  const endInstant = timeZone ? zonedDateTimeToIso(endValue, timeZone) : endValue;
  if (
    !endWasManuallyEdited
    || !endValue
    || !startInstant || !endInstant
    || !Number.isFinite(new Date(endInstant).getTime())
    || new Date(endInstant).getTime() <= new Date(startInstant).getTime()
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
  if (!Number.isFinite(date.valueOf())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
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
    const endInstant = Date.parse(event.ends_at);
    if (!start || !Number.isFinite(endInstant)) return false;
    const end = dateInZone(endInstant - 1, event.time_zone);
    return start <= day && day <= end;
  } catch {
    return false;
  }
}

export function calendarEntryStartMillis(entry: Pick<CalendarEntry, "is_all_day" | "start_date" | "starts_at">): number {
  const value = entry.is_all_day
    ? entry.start_date ? `${entry.start_date}T00:00:00Z` : ""
    : entry.starts_at ?? "";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

export function dayLabel(day: string): string {
  const date = new Date(`${day}T12:00:00Z`);
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "UTC",
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(date);
}
