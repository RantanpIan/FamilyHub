export const calendarModule = {
  id: "calendar",
  status: "in_progress",
  statusLabel: "Einzel- und Serientermine in Entwicklung",
} as const;

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  interval: number;
  byWeekdays?: number[];
  byMonthDay?: number;
  count?: number;
  until?: string;
};

export type RecurringSeries = {
  isAllDay: boolean;
  startsAt: string | null;
  endsAt: string | null;
  startDate: string | null;
  endDateExclusive: string | null;
  timeZone: string;
  rule: string;
};

export type RecurrenceWindow = { from: string; to: string };

export type RecurringOccurrence = {
  occurrenceKey: string;
  localStart: string;
  localEnd: string;
  startsAt: string | null;
  endsAt: string | null;
  startDate: string | null;
  endDateExclusive: string | null;
};

const MAX_OCCURRENCES = 500;
const WEEKDAY_NAMES = new Map([
  ["MO", 1], ["TU", 2], ["WE", 3], ["TH", 4],
  ["FR", 5], ["SA", 6], ["SU", 7],
]);

function invalid(message: string): never {
  throw new Error(`Ungültige Wiederholungsregel: ${message}`);
}

function assertDate(value: string, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid(`${field} muss ein lokales Datum sein.`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    invalid(`${field} ist kein gültiges Datum.`);
  }
}

function dateFrom(value: string): Date {
  assertDate(value, "Datum");
  return new Date(`${value}T00:00:00Z`);
}

function dateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  const date = dateFrom(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateString(date);
}

function addMonths(value: string, months: number): string {
  const date = dateFrom(value);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  return dateString(date);
}

function weekday(value: string): number {
  const day = dateFrom(value).getUTCDay();
  return day === 0 ? 7 : day;
}

function localDateTimeParts(value: string, timeZone: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) invalid("startsAt/endsAt muss ein ISO-Zeitpunkt sein.");
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      calendar: "iso8601",
      numberingSystem: "latn",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value;
    const result = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(result)) return result;
  } catch {
    // The explicit error below is more useful than the platform Intl error.
  }
  invalid(`Zeitzone ${timeZone} ist nicht verfügbar.`);
}

function localDateTimeToDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(value);
  if (!match) invalid("lokale Zeit ist ungültig.");
  const [, year, month, day, hour, minute, second] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
}

function localScalar(value: string): number {
  return localDateTimeToDate(value).getTime();
}

function dateTimeString(value: Date): string {
  const year = value.getUTCFullYear().toString().padStart(4, "0");
  const month = (value.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = value.getUTCDate().toString().padStart(2, "0");
  const hour = value.getUTCHours().toString().padStart(2, "0");
  const minute = value.getUTCMinutes().toString().padStart(2, "0");
  const second = value.getUTCSeconds().toString().padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function resolveLocalDateTime(value: string, timeZone: string): Date {
  const desired = localScalar(value);
  const guess = new Date(desired);
  const guessedLocal = localDateTimeParts(guess.toISOString(), timeZone);
  const offset = localScalar(guessedLocal) - desired;
  const candidate = new Date(desired - offset);
  if (localDateTimeParts(candidate.toISOString(), timeZone) === value) return candidate;

  // A DST gap has no exact instant. Choose the first valid local minute after
  // the requested wall-clock time. A fall-back overlap selects its earliest
  // instant because the probes are checked in ascending order.
  for (let minutes = 0; minutes <= 360; minutes += 1) {
    const wanted = new Date(desired + minutes * 60_000);
    for (const delta of [-360, 360]) {
      const probe = new Date(wanted.getTime() - offset * 1_000 + delta * 60_000);
      if (localDateTimeParts(probe.toISOString(), timeZone) === dateTimeString(wanted)) return probe;
    }
  }
  invalid(`lokale Zeit ${value} liegt in einer nicht auflösbaren DST-Lücke.`);
}

function parseInteger(value: string, field: string, min: number, max: number): number {
  if (!/^\d+$/.test(value)) invalid(`${field} muss eine positive Ganzzahl sein.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    invalid(`${field} muss zwischen ${min} und ${max} liegen.`);
  }
  return parsed;
}

export function parseRecurrenceRule(input: string): RecurrenceRule {
  const parts = input.trim().toUpperCase().split(";").filter(Boolean);
  if (parts.length === 0) invalid("FREQ fehlt.");
  const values = new Map<string, string>();
  for (const part of parts) {
    const separator = part.indexOf("=");
    if (separator <= 0 || separator === part.length - 1) invalid(`Teil ${part} ist ungültig.`);
    const key = part.slice(0, separator);
    const value = part.slice(separator + 1);
    if (values.has(key)) invalid(`${key} darf nicht doppelt vorkommen.`);
    values.set(key, value);
  }

  const frequency = values.get("FREQ");
  if (frequency !== "DAILY" && frequency !== "WEEKLY" && frequency !== "MONTHLY") {
    invalid("FREQ muss DAILY, WEEKLY oder MONTHLY sein.");
  }
  const interval = parseInteger(values.get("INTERVAL") ?? "1", "INTERVAL", 1, 366);
  const endValues = [values.get("COUNT"), values.get("UNTIL")].filter(Boolean);
  if (endValues.length !== 1) invalid("genau eine Endbedingung COUNT oder UNTIL ist erforderlich.");

  const result: RecurrenceRule = { frequency, interval };
  const count = values.get("COUNT");
  if (count) result.count = parseInteger(count, "COUNT", 1, MAX_OCCURRENCES);
  const until = values.get("UNTIL");
  if (until) {
    assertDate(until, "UNTIL");
    result.until = until;
  }

  const byDay = values.get("BYDAY");
  if (byDay) {
    if (frequency !== "WEEKLY") invalid("BYDAY ist nur für WEEKLY erlaubt.");
    const days = byDay.split(",").map((day) => WEEKDAY_NAMES.get(day));
    if (days.some((day) => day === undefined)) invalid("BYDAY enthält einen unbekannten Wochentag.");
    result.byWeekdays = [...new Set(days as number[])].sort((a, b) => a - b);
  }

  const byMonthDay = values.get("BYMONTHDAY");
  if (byMonthDay) {
    if (frequency !== "MONTHLY") invalid("BYMONTHDAY ist nur für MONTHLY erlaubt.");
    if (!/^-?\d+$/.test(byMonthDay)) invalid("BYMONTHDAY ist ungültig.");
    const parsed = Number(byMonthDay);
    if (!Number.isInteger(parsed) || parsed === 0 || parsed < -31 || parsed > 31) {
      invalid("BYMONTHDAY muss zwischen -31 und -1 oder 1 und 31 liegen.");
    }
    result.byMonthDay = parsed;
  }

  for (const key of values.keys()) {
    if (!["FREQ", "INTERVAL", "COUNT", "UNTIL", "BYDAY", "BYMONTHDAY"].includes(key)) {
      invalid(`Schlüssel ${key} wird nicht unterstützt.`);
    }
  }
  return result;
}

function localDuration(series: RecurringSeries): { minutes: number; days: number } {
  if (series.isAllDay) {
    if (!series.startDate || !series.endDateExclusive) invalid("Ganztägige Serie benötigt Datumsgrenzen.");
    const days = Math.round((dateFrom(series.endDateExclusive).getTime() - dateFrom(series.startDate).getTime()) / 86_400_000);
    if (days < 1) invalid("Enddatum muss nach dem Startdatum liegen.");
    return { minutes: 0, days };
  }
  if (!series.startsAt || !series.endsAt) invalid("Zeitgebundene Serie benötigt Start und Ende.");
  const minutes = Math.round((new Date(series.endsAt).getTime() - new Date(series.startsAt).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) invalid("Ende muss nach dem Beginn liegen.");
  return { minutes, days: 0 };
}

function monthDay(yearMonth: string, requested: number): string | null {
  const monthStart = `${yearMonth}-01`;
  const lastDay = Number(addDays(addMonths(monthStart, 1), -1).slice(8, 10));
  const day = requested > 0 ? requested : lastDay + requested + 1;
  if (day < 1 || day > lastDay) return null;
  return `${yearMonth}-${day.toString().padStart(2, "0")}`;
}

function occurrenceDates(startDate: string, rule: RecurrenceRule): string[] {
  const result: string[] = [];
  const until = rule.until ?? "9999-12-31";
  let iterations = 0;
  let period = 0;
  while (result.length < (rule.count ?? MAX_OCCURRENCES) && iterations < 100_000) {
    if (rule.frequency === "DAILY") {
      const date = addDays(startDate, period * rule.interval);
      if (date > until) break;
      result.push(date);
      period += 1;
    } else if (rule.frequency === "WEEKLY") {
      const monday = addDays(startDate, -(weekday(startDate) - 1) + period * rule.interval * 7);
      const days = rule.byWeekdays ?? [weekday(startDate)];
      for (const day of days) {
        const date = addDays(monday, day - 1);
        if (date >= startDate && date <= until) result.push(date);
      }
      if (monday > until) break;
      period += 1;
    } else {
      const month = addMonths(`${startDate.slice(0, 7)}-01`, period * rule.interval).slice(0, 7);
      const requested = rule.byMonthDay ?? Number(startDate.slice(8, 10));
      const date = monthDay(month, requested);
      if (date && date >= startDate && date <= until) result.push(date);
      if (`${month}-01` > until) break;
      period += 1;
    }
    iterations += 1;
    if (result.length > MAX_OCCURRENCES) invalid(`Serie darf höchstens ${MAX_OCCURRENCES} Vorkommen erzeugen.`);
  }
  if (iterations >= 100_000) invalid("Serie konnte nicht deterministisch begrenzt werden.");
  return result.slice(0, rule.count ?? MAX_OCCURRENCES);
}

export function generateRecurringOccurrences(
  series: RecurringSeries,
  window: RecurrenceWindow,
): RecurringOccurrence[] {
  const rule = parseRecurrenceRule(series.rule);
  assertDate(window.from, "Fensteranfang");
  assertDate(window.to, "Fensterende");
  if (window.from > window.to) invalid("Fensteranfang muss vor dem Fensterende liegen.");
  const duration = localDuration(series);
  const startDate = series.isAllDay
    ? series.startDate
    : localDateTimeParts(series.startsAt!, series.timeZone).slice(0, 10);
  if (!startDate) invalid("Serienstart fehlt.");
  const dates = occurrenceDates(startDate, rule);
  const occurrences: RecurringOccurrence[] = [];
  const localTime = series.isAllDay ? null : localDateTimeParts(series.startsAt!, series.timeZone).slice(11);

  for (const date of dates) {
    if (date < window.from || date > window.to) continue;
    if (series.isAllDay) {
      const endDate = addDays(date, duration.days);
      occurrences.push({
        occurrenceKey: date, localStart: date, localEnd: endDate,
        startsAt: null, endsAt: null, startDate: date, endDateExclusive: endDate,
      });
      continue;
    }

    const startLocal = `${date}T${localTime}`;
    const endLocalDate = dateTimeString(new Date(localScalar(startLocal) + duration.minutes * 60_000));
    const startInstant = resolveLocalDateTime(startLocal, series.timeZone);
    const endInstant = resolveLocalDateTime(endLocalDate, series.timeZone);
    occurrences.push({
      occurrenceKey: startLocal, localStart: startLocal, localEnd: endLocalDate,
      startsAt: startInstant.toISOString(), endsAt: endInstant.toISOString(),
      startDate: null, endDateExclusive: null,
    });
  }
  return occurrences;
}

export const recurrenceLimits = { maxOccurrences: MAX_OCCURRENCES } as const;
