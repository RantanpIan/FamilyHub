import { describe, expect, it } from "vitest";
import {
  effectiveSeriesOccurrence,
  seriesOccurrenceOnDay,
  type CalendarSeriesOccurrenceView,
} from "../../apps/client/src/calendar/calendar-series-exception-utils";

const baseView = {
  series: {
    resource_id: "10000000-0000-4000-8000-000000000001",
    title: "Basisserie",
    is_all_day: false,
    starts_at: "2026-11-16T16:00:00.000Z",
    ends_at: "2026-11-16T17:00:00.000Z",
    start_date: null,
    end_date_exclusive: null,
    time_zone: "Europe/Berlin",
    resource: {
      id: "10000000-0000-4000-8000-000000000001",
      owner_member_id: "20000000-0000-4000-8000-000000000001",
      visibility: "private" as const,
      version: 1,
    },
  },
  occurrence: {
    series_resource_id: "10000000-0000-4000-8000-000000000001",
    family_id: "30000000-0000-4000-8000-000000000001",
    occurrence_key: "2026-11-16T17:00:00",
    local_start: "2026-11-16T17:00:00",
    local_end: "2026-11-16T18:00:00",
    starts_at: "2026-11-16T16:00:00.000Z",
    ends_at: "2026-11-16T17:00:00.000Z",
    start_date: null,
    end_date_exclusive: null,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  exception: null,
} as unknown as CalendarSeriesOccurrenceView;

describe("calendar series exceptions", () => {
  it("uses an override for display and moves only that occurrence", () => {
    const view: CalendarSeriesOccurrenceView = {
      ...baseView,
      exception: {
        series_resource_id: baseView.occurrence.series_resource_id,
        family_id: baseView.occurrence.family_id,
        occurrence_key: baseView.occurrence.occurrence_key,
        exception_version: 1,
        is_cancelled: false,
        title: "Verschoben",
        is_all_day: false,
        starts_at: "2026-11-17T16:00:00.000Z",
        ends_at: "2026-11-17T17:00:00.000Z",
        start_date: null,
        end_date_exclusive: null,
        time_zone: "Europe/Berlin",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    };
    expect(effectiveSeriesOccurrence(view)?.title).toBe("Verschoben");
    expect(seriesOccurrenceOnDay(view, "2026-11-16")).toBe(false);
    expect(seriesOccurrenceOnDay(view, "2026-11-17")).toBe(true);
  });

  it("keeps a cancelled occurrence addressable on its original day", () => {
    const view: CalendarSeriesOccurrenceView = {
      ...baseView,
      exception: {
        series_resource_id: baseView.occurrence.series_resource_id,
        family_id: baseView.occurrence.family_id,
        occurrence_key: baseView.occurrence.occurrence_key,
        exception_version: 1,
        is_cancelled: true,
        title: null,
        is_all_day: null,
        starts_at: null,
        ends_at: null,
        start_date: null,
        end_date_exclusive: null,
        time_zone: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    };
    expect(effectiveSeriesOccurrence(view)).toBeNull();
    expect(seriesOccurrenceOnDay(view, "2026-11-16")).toBe(true);
  });
});

