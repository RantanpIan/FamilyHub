import { describe, expect, it } from "vitest";
import {
  adjustEndAfterStart,
  dayLabel,
  eventOnDay,
  monthCells,
  nextLocalDate,
  oneHourAfter,
  toLocalDateTimeInZone,
  zonedDateTimeToIso,
} from "../../apps/client/src/calendar/calendar-utils";

describe("calendar date helpers", () => {
  it.each([
    ["2026-03-28T23:00:00Z", "2026-03-29T22:00:00Z", "Europe/Berlin", "2026-03-29"],
    ["2026-10-24T22:00:00Z", "2026-10-25T23:00:00Z", "Europe/Berlin", "2026-10-25"],
    ["2026-12-31T10:00:00Z", "2027-01-01T10:00:00Z", "Pacific/Honolulu", "2026-12-31"],
  ])("ordnet exklusive Tagesgrenzen in %s bis %s (%s) ohne Zusatzvorkommen zu", (starts_at, ends_at, time_zone, day) => {
    const event = { is_all_day: false, starts_at, ends_at, time_zone, start_date: null, end_date_exclusive: null };
    const visibleDays = [...monthCells(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1)]
      .filter((candidate) => eventOnDay(event, candidate));
    expect(visibleDays).toEqual([day]);
  });

  it("builds 42 visible days from Monday through Sunday including neighboring months", () => {
    const november = monthCells(2026, 10);
    expect(november).toHaveLength(42);
    expect(november[0]).toBe("2026-10-26");
    expect(november[6]).toBe("2026-11-01");
    expect(november[41]).toBe("2026-12-06");
    expect(new Set(november).size).toBe(42);
    expect(november).toContain("2026-11-30");
  });

  it("automatically adjusts the end time when the start is moved to another day", () => {
    expect(oneHourAfter("2026-11-17T10:00")).toBe("2026-11-17T11:00");
    expect(adjustEndAfterStart("2026-11-21T14:30", "2026-11-17T11:00", false))
      .toBe("2026-11-21T15:30");
    expect(adjustEndAfterStart("2026-11-21T14:30", "2026-11-22T17:00", true))
      .toBe("2026-11-22T17:00");
    expect(adjustEndAfterStart("2026-11-23T14:30", "2026-11-22T17:00", true))
      .toBe("2026-11-23T15:30");
  });

  it("treats all-day end dates as exclusive", () => {
    const event = {
      is_all_day: true,
      start_date: "2026-11-20",
      end_date_exclusive: "2026-11-23",
      starts_at: null,
      ends_at: null,
      time_zone: "Europe/Berlin",
    };
    expect(eventOnDay(event, "2026-11-19")).toBe(false);
    expect(eventOnDay(event, "2026-11-20")).toBe(true);
    expect(eventOnDay(event, "2026-11-22")).toBe(true);
    expect(eventOnDay(event, "2026-11-23")).toBe(false);
    expect(nextLocalDate("2026-12-31")).toBe("2027-01-01");
  });

  it("shows overnight appointments on both days, but not a midnight-exclusive day", () => {
    const event = {
      is_all_day: false,
      starts_at: "2026-11-22T22:00:00Z",
      ends_at: "2026-11-22T23:00:00Z",
      start_date: null,
      end_date_exclusive: null,
      time_zone: "Europe/Berlin",
    };
    expect(eventOnDay(event, "2026-11-22")).toBe(true);
    expect(eventOnDay(event, "2026-11-23")).toBe(false);
    expect(dayLabel("2026-11-23")).toContain("23");
  });

  it("berücksichtigt Nachttermine und die Zeitumstellung in der Terminzeitzone", () => {
    const event = {
      is_all_day: false,
      starts_at: "2026-10-24T21:30:00Z",
      ends_at: "2026-10-25T02:30:00Z",
      start_date: null,
      end_date_exclusive: null,
      time_zone: "Europe/Berlin",
    };
    expect(eventOnDay(event, "2026-10-23")).toBe(false);
    expect(eventOnDay(event, "2026-10-24")).toBe(true);
    expect(eventOnDay(event, "2026-10-25")).toBe(true);
    expect(eventOnDay(event, "2026-10-26")).toBe(false);
    expect(monthCells(2027, 0)[0]).toBe("2026-12-28");
    expect(monthCells(2028, 1)).toContain("2028-02-29");
  });

  it("bearbeitet Zeiten in der Ereigniszeitzone statt in der Browserzeitzone", () => {
    const iso = zonedDateTimeToIso("2026-11-15T10:30", "Europe/Berlin");
    expect(iso).toBe("2026-11-15T09:30:00.000Z");
    expect(toLocalDateTimeInZone(iso, "Europe/Berlin")).toBe("2026-11-15T10:30");
    expect(oneHourAfter("2026-11-15T10:30", "Europe/Berlin")).toBe("2026-11-15T11:30");
  });

  it("weist nicht existente lokale Zeiten beim Frühjahrswechsel zurück", () => {
    expect(zonedDateTimeToIso("2026-03-29T02:30", "Europe/Berlin")).toBeNull();
    expect(zonedDateTimeToIso("2026-10-25T02:30", "Europe/Berlin")).toBe("2026-10-25T00:30:00.000Z");
  });
});
