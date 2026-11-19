import { describe, expect, it } from "vitest";
import {
  generateRecurringOccurrences,
  parseRecurrenceRule,
} from "../../packages/calendar-domain/src/index";

describe("calendar recurrence domain", () => {
  it("requires exactly one bounded end condition", () => {
    expect(parseRecurrenceRule("FREQ=DAILY;COUNT=3")).toEqual({
      frequency: "DAILY",
      interval: 1,
      count: 3,
    });
    expect(() => parseRecurrenceRule("FREQ=WEEKLY;COUNT=3;UNTIL=2026-12-31"))
      .toThrow("genau eine Endbedingung");
    expect(() => parseRecurrenceRule("FREQ=YEARLY;COUNT=3"))
      .toThrow("FREQ muss DAILY");
  });

  it("generates deterministic daily occurrences", () => {
    const series = {
      isAllDay: false,
      startsAt: "2026-01-01T09:00:00.000Z",
      endsAt: "2026-01-01T10:00:00.000Z",
      startDate: null,
      endDateExclusive: null,
      timeZone: "Europe/Berlin",
      rule: "FREQ=DAILY;COUNT=3",
    } as const;
    const first = generateRecurringOccurrences(series, { from: "2026-01-01", to: "2026-01-10" });
    const second = generateRecurringOccurrences(series, { from: "2026-01-01", to: "2026-01-10" });
    expect(first).toEqual(second);
    expect(first.map((item) => item.occurrenceKey)).toEqual([
      "2026-01-01T10:00:00",
      "2026-01-02T10:00:00",
      "2026-01-03T10:00:00",
    ]);
  });

  it("supports selected weekly weekdays and monthly end-of-month dates", () => {
    const weekly = generateRecurringOccurrences({
      isAllDay: true,
      startsAt: null,
      endsAt: null,
      startDate: "2026-01-05",
      endDateExclusive: "2026-01-06",
      timeZone: "Europe/Berlin",
      rule: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4",
    }, { from: "2026-01-01", to: "2026-01-31" });
    expect(weekly.map((item) => item.occurrenceKey)).toEqual([
      "2026-01-05", "2026-01-07", "2026-01-12", "2026-01-14",
    ]);

    const monthly = generateRecurringOccurrences({
      isAllDay: true,
      startsAt: null,
      endsAt: null,
      startDate: "2026-01-31",
      endDateExclusive: "2026-02-01",
      timeZone: "Europe/Berlin",
      rule: "FREQ=MONTHLY;BYMONTHDAY=-1;COUNT=3",
    }, { from: "2026-01-01", to: "2026-04-30" });
    expect(monthly.map((item) => item.occurrenceKey)).toEqual([
      "2026-01-31", "2026-02-28", "2026-03-31",
    ]);
  });

  it("keeps local wall-clock time across the Europe/Berlin DST change", () => {
    const occurrences = generateRecurringOccurrences({
      isAllDay: false,
      startsAt: "2026-03-27T09:00:00.000Z",
      endsAt: "2026-03-27T10:00:00.000Z",
      startDate: null,
      endDateExclusive: null,
      timeZone: "Europe/Berlin",
      rule: "FREQ=DAILY;COUNT=5",
    }, { from: "2026-03-27", to: "2026-04-01" });
    expect(occurrences.map((item) => item.localStart)).toEqual([
      "2026-03-27T10:00:00", "2026-03-28T10:00:00", "2026-03-29T10:00:00",
      "2026-03-30T10:00:00", "2026-03-31T10:00:00",
    ]);
    expect(new Set(occurrences.map((item) => item.occurrenceKey)).size).toBe(5);
  });
});
