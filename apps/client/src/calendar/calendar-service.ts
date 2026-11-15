import type { Database } from "../auth/database.types";
import { browserAuthConfig } from "../auth/auth-client";

type EventRow = Database["public"]["Tables"]["calendar_events"]["Row"];
type SeriesRow = Database["public"]["Tables"]["calendar_series"]["Row"];
type SeriesOccurrenceRow = Database["public"]["Tables"]["calendar_series_occurrences"]["Row"];
type SeriesExceptionRow = Database["public"]["Tables"]["calendar_series_exceptions"]["Row"];
type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];

export type CalendarEntry = EventRow & {
  resource: Pick<ResourceRow, "id" | "owner_member_id" | "visibility" | "version">;
};

export type CalendarSeriesEntry = SeriesRow & {
  resource: Pick<ResourceRow, "id" | "owner_member_id" | "visibility" | "version">;
};

export type CalendarSeriesOccurrence = SeriesOccurrenceRow;
export type CalendarSeriesException = SeriesExceptionRow;

export type CalendarEventInput = {
  title: string;
  isAllDay: boolean;
  startsAt: string | null;
  endsAt: string | null;
  startDate: string | null;
  endDateExclusive: string | null;
  timeZone: string;
};

export type CalendarSeriesInput = CalendarEventInput & {
  recurrenceRule: string;
};

export type CalendarSeriesExceptionInput = {
  action: "override" | "cancel";
  title: string | null;
  isAllDay: boolean | null;
  startsAt: string | null;
  endsAt: string | null;
  startDate: string | null;
  endDateExclusive: string | null;
  timeZone: string | null;
};

function requireClient() {
  if (!browserAuthConfig.configured) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }
  return browserAuthConfig.client;
}

export async function listCalendarEvents(familyId: string): Promise<CalendarEntry[]> {
  const client = requireClient();
  const [events, resources] = await Promise.all([
    client.from("calendar_events").select("*").eq("family_id", familyId),
    client.from("resources")
      .select("id, owner_member_id, visibility, version")
      .eq("family_id", familyId)
      .eq("resource_type", "calendar_event"),
  ]);
  if (events.error) throw events.error;
  if (resources.error) throw resources.error;

  // PostgreSQL RLS filters both queries. Do not fabricate resource metadata
  // when the actor cannot read its corresponding access-registry record.
  const allowedResources = new Map((resources.data ?? []).map((row) => [row.id, row]));
  return (events.data ?? [])
    .flatMap((event) => {
      const resource = allowedResources.get(event.resource_id);
      return resource ? [{ ...event, resource }] : [];
    })
    .sort((a, b) =>
      (a.start_date ?? a.starts_at ?? "").localeCompare(b.start_date ?? b.starts_at ?? ""),
    );
}

export async function listCalendarSeries(familyId: string): Promise<CalendarSeriesEntry[]> {
  const client = requireClient();
  const [series, resources] = await Promise.all([
    client.from("calendar_series").select("*").eq("family_id", familyId),
    client.from("resources")
      .select("id, owner_member_id, visibility, version")
      .eq("family_id", familyId)
      .eq("resource_type", "calendar_series"),
  ]);
  if (series.error) throw series.error;
  if (resources.error) throw resources.error;

  const allowedResources = new Map((resources.data ?? []).map((row) => [row.id, row]));
  return (series.data ?? [])
    .flatMap((item) => {
      const resource = allowedResources.get(item.resource_id);
      return resource ? [{ ...item, resource }] : [];
    })
    .sort((a, b) =>
      (a.start_date ?? a.starts_at ?? "").localeCompare(b.start_date ?? b.starts_at ?? ""),
    );
}

export async function listCalendarSeriesOccurrences(
  familyId: string,
  from: string,
  to: string,
): Promise<CalendarSeriesOccurrence[]> {
  const { data, error } = await requireClient()
    .from("calendar_series_occurrences")
    .select("*")
    .eq("family_id", familyId)
    .or(`and(start_date.gte.${from},start_date.lte.${to}),and(starts_at.gte.${from}T00:00:00Z,starts_at.lte.${to}T23:59:59Z)`);
  if (error) throw error;
  return data ?? [];
}

export async function listCalendarSeriesExceptions(
  seriesResourceId: string,
): Promise<CalendarSeriesException[]> {
  const { data, error } = await requireClient()
    .from("calendar_series_exceptions")
    .select("*")
    .eq("series_resource_id", seriesResourceId)
    .order("occurrence_key");
  if (error) throw error;
  return data ?? [];
}

function payload(input: CalendarEventInput) {
  return {
    p_title: input.title.trim(),
    p_is_all_day: input.isAllDay,
    p_starts_at: input.isAllDay ? null : input.startsAt,
    p_ends_at: input.isAllDay ? null : input.endsAt,
    p_start_date: input.isAllDay ? input.startDate : null,
    p_end_date_exclusive: input.isAllDay ? input.endDateExclusive : null,
    p_time_zone: input.timeZone,
  };
}

export async function createCalendarEvent(
  familyId: string,
  input: CalendarEventInput,
  visibility: "private" | "family",
  requestId: string,
  subjectMemberId: string,
): Promise<string> {
  const { data, error } = await requireClient().rpc("create_calendar_event_for_member", {
    p_family_id: familyId,
    ...payload(input),
    p_visibility: visibility,
    p_request_id: requestId,
    p_subject_member_id: subjectMemberId,
  });
  if (error) throw error;
  if (!data) throw new Error("Der Termin konnte nicht bestätigt werden.");
  return data;
}

export async function updateCalendarEvent(
  eventId: string,
  expectedVersion: number,
  input: CalendarEventInput,
): Promise<number> {
  const { data, error } = await requireClient().rpc("update_calendar_event", {
    p_resource_id: eventId,
    p_expected_version: expectedVersion,
    ...payload(input),
  });
  if (error) throw error;
  if (typeof data !== "number") {
    throw new Error("Die Terminänderung konnte nicht bestätigt werden.");
  }
  return data;
}

function seriesPayload(input: CalendarSeriesInput) {
  return {
    p_title: input.title.trim(),
    p_is_all_day: input.isAllDay,
    p_starts_at: input.isAllDay ? null : input.startsAt,
    p_ends_at: input.isAllDay ? null : input.endsAt,
    p_start_date: input.isAllDay ? input.startDate : null,
    p_end_date_exclusive: input.isAllDay ? input.endDateExclusive : null,
    p_time_zone: input.timeZone,
    p_recurrence_rule: input.recurrenceRule.trim(),
  };
}

export async function createCalendarSeries(
  familyId: string,
  input: CalendarSeriesInput,
  visibility: "private" | "family",
  requestId: string,
  subjectMemberId: string,
): Promise<string> {
  const { data, error } = await requireClient().rpc("create_calendar_series_for_member", {
    p_family_id: familyId,
    ...seriesPayload(input),
    p_visibility: visibility,
    p_request_id: requestId,
    p_subject_member_id: subjectMemberId,
  });
  if (error) throw error;
  if (!data) throw new Error("Die Terminserie konnte nicht bestätigt werden.");
  return data;
}

export async function updateCalendarSeries(
  resourceId: string,
  expectedVersion: number,
  requestId: string,
  input: CalendarSeriesInput,
): Promise<number> {
  const { data, error } = await requireClient().rpc("update_calendar_series", {
    p_resource_id: resourceId,
    p_expected_version: expectedVersion,
    p_request_id: requestId,
    ...seriesPayload(input),
  });
  if (error) throw error;
  if (typeof data !== "number") {
    throw new Error("Die Serienänderung konnte nicht bestätigt werden.");
  }
  return data;
}

export async function splitCalendarSeries(
  resourceId: string,
  expectedVersion: number,
  requestId: string,
  effectiveDate: string,
  newRecurrenceRule: string,
): Promise<string> {
  const { data, error } = await requireClient().rpc("split_calendar_series", {
    p_resource_id: resourceId,
    p_expected_version: expectedVersion,
    p_request_id: requestId,
    p_effective_date: effectiveDate,
    p_new_recurrence_rule: newRecurrenceRule.trim(),
  });
  if (error) throw error;
  if (!data) throw new Error("Die Terminserie konnte nicht aufgeteilt werden.");
  return data;
}

export async function setCalendarSeriesException(
  seriesResourceId: string,
  occurrenceKey: string,
  requestId: string,
  expectedSeriesVersion: number,
  expectedExceptionVersion: number,
  input: CalendarSeriesExceptionInput,
): Promise<number> {
  const { data, error } = await requireClient().rpc("set_calendar_series_exception", {
    p_series_resource_id: seriesResourceId,
    p_occurrence_key: occurrenceKey,
    p_request_id: requestId,
    p_expected_series_version: expectedSeriesVersion,
    p_expected_exception_version: expectedExceptionVersion,
    p_action: input.action,
    p_title: input.action === "override" ? input.title?.trim() ?? null : null,
    p_is_all_day: input.action === "override" ? input.isAllDay : null,
    p_starts_at: input.action === "override" ? input.startsAt : null,
    p_ends_at: input.action === "override" ? input.endsAt : null,
    p_start_date: input.action === "override" ? input.startDate : null,
    p_end_date_exclusive: input.action === "override" ? input.endDateExclusive : null,
    p_time_zone: input.action === "override" ? input.timeZone : null,
  });
  if (error) throw error;
  if (typeof data !== "number") {
    throw new Error("Die Ausnahme konnte nicht bestätigt werden.");
  }
  return data;
}

export async function deleteCalendarSeriesException(
  seriesResourceId: string,
  occurrenceKey: string,
  requestId: string,
  expectedSeriesVersion: number,
  expectedExceptionVersion: number,
): Promise<number> {
  const { data, error } = await requireClient().rpc("delete_calendar_series_exception", {
    p_series_resource_id: seriesResourceId,
    p_occurrence_key: occurrenceKey,
    p_request_id: requestId,
    p_expected_series_version: expectedSeriesVersion,
    p_expected_exception_version: expectedExceptionVersion,
  });
  if (error) throw error;
  if (typeof data !== "number") {
    throw new Error("Die Ausnahme konnte nicht zurückgesetzt werden.");
  }
  return data;
}

export async function deleteCalendarEvent(
  eventId: string,
  expectedVersion: number,
): Promise<void> {
  const { data, error } = await requireClient().rpc("delete_calendar_event", {
    p_resource_id: eventId,
    p_expected_version: expectedVersion,
  });
  if (error) throw error;
  if (data !== true) throw new Error("Der Termin konnte nicht gelöscht werden.");
}

