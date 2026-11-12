import type { Database } from "../auth/database.types";
import { browserAuthConfig } from "../auth/auth-client";

type EventRow = Database["public"]["Tables"]["calendar_events"]["Row"];
type ResourceRow = Database["public"]["Tables"]["resources"]["Row"];

export type CalendarEntry = EventRow & {
  resource: Pick<ResourceRow, "id" | "owner_member_id" | "visibility" | "version">;
};

export type CalendarEventInput = {
  title: string;
  isAllDay: boolean;
  startsAt: string | null;
  endsAt: string | null;
  startDate: string | null;
  endDateExclusive: string | null;
  timeZone: string;
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
): Promise<string> {
  const { data, error } = await requireClient().rpc("create_calendar_event", {
    p_family_id: familyId,
    ...payload(input),
    p_visibility: visibility,
    p_request_id: requestId,
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
