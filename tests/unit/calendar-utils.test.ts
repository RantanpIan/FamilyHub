import { describe, expect, it } from "vitest";
import {
  adjustEndAfterStart,
  dayLabel,
  eventOnDay,
  monthCells,
  nextLocalDate,
  oneHourAfter,
} from "../../apps/client/src/calendar/calendar-utils";

describe("calendar date helpers", () => {
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
});
