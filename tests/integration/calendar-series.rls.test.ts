import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../apps/client/src/auth/database.types";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`FH-CX-011 benötigt ${name} einer lokalen, wegwerfbaren Supabase-Instanz.`);
  }
  return value;
}

const url = required("SUPABASE_TEST_URL");
const anon = required("SUPABASE_TEST_ANON_KEY");
const serviceKey = required("SUPABASE_TEST_SERVICE_ROLE_KEY");
if (anon === serviceKey) {
  throw new Error("Integrationstests benötigen getrennte Anon- und Service-Role-Keys.");
}

const service = createClient<Database, "public">(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const createdUsers: string[] = [];
const createdFamilies: string[] = [];
const password = "Synthetic-Calendar-Series-Password-2026!";

async function user(label: string) {
  const email = `fh-cx-011-${randomUUID()}@example.com`;
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: label },
  });
  if (created.error || !created.data.user) throw created.error ?? new Error("User fixture missing.");
  createdUsers.push(created.data.user.id);
  const profile = await service.from("user_profiles").upsert({
    user_id: created.data.user.id,
    display_name: label,
  });
  if (profile.error) throw profile.error;
  const client = createClient<Database, "public">(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signed = await client.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  return { client, id: created.data.user.id };
}

async function family(actor: Awaited<ReturnType<typeof user>>) {
  const result = await actor.client.rpc("create_family", {
    p_name: `Synthetic recurring family ${randomUUID()}`,
    p_request_id: randomUUID(),
  });
  if (result.error || !result.data?.[0]) throw result.error ?? new Error("Family fixture missing.");
  createdFamilies.push(result.data[0].family_id);
  return result.data[0];
}

function createArgs(familyId: string, subjectMemberId: string, requestId = randomUUID()) {
  return {
    p_family_id: familyId,
    p_title: "Synthetic recurring appointment",
    p_is_all_day: false,
    p_starts_at: "2026-11-16T17:00:00+01:00",
    p_ends_at: "2026-11-16T18:00:00+01:00",
    p_start_date: null,
    p_end_date_exclusive: null,
    p_time_zone: "Europe/Berlin",
    p_visibility: "private" as const,
    p_request_id: requestId,
    p_subject_member_id: subjectMemberId,
    p_recurrence_rule: "FREQ=DAILY;COUNT=4",
  };
}

describe("FH-CX-011 calendar series schema, RLS and commands", () => {
  let owner: Awaited<ReturnType<typeof user>>;
  let outsider: Awaited<ReturnType<typeof user>>;
  let familyId: string;
  let ownerMemberId: string;
  let otherFamilyId: string;
  let seriesId: string;

  beforeAll(async () => {
    owner = await user("Recurring calendar owner");
    outsider = await user("Recurring calendar outsider");
    const home = await family(owner);
    const away = await family(outsider);
    familyId = home.family_id;
    ownerMemberId = home.member_id;
    otherFamilyId = away.family_id;
  }, 60_000);

  afterAll(async () => {
    for (const familyId of createdFamilies.reverse()) {
      const result = await service.from("families").delete().eq("id", familyId);
      if (result.error) throw result.error;
    }
    for (const userId of createdUsers.reverse()) {
      const result = await service.auth.admin.deleteUser(userId);
      if (result.error) throw result.error;
    }
  }, 60_000);

  it("creates a bounded deterministic series and is idempotent", async () => {
    const args = createArgs(familyId, ownerMemberId, randomUUID());
    const first = await owner.client.rpc("create_calendar_series_for_member", args);
    const second = await owner.client.rpc("create_calendar_series_for_member", args);
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data).toBeTruthy();
    expect(second.data).toBe(first.data);

    seriesId = first.data!;
    const occurrences = await owner.client.from("calendar_series_occurrences")
      .select("occurrence_key").eq("series_resource_id", seriesId)
      .order("occurrence_key");
    expect(occurrences.error).toBeNull();
    expect(occurrences.data?.map((item) => item.occurrence_key)).toEqual([
      "2026-11-16T17:00:00",
      "2026-11-17T17:00:00",
      "2026-11-18T17:00:00",
      "2026-11-19T17:00:00",
    ]);

    const collision = await owner.client.rpc("create_calendar_series_for_member", {
      ...args,
      p_title: "Different payload",
    });
    expect(collision.error?.code).toBe("P0001");
  });

  it("rejects unbounded or unsupported rules and cross-family creation", async () => {
    const args = createArgs(familyId, ownerMemberId);
    const unbounded = await owner.client.rpc("create_calendar_series_for_member", {
      ...args,
      p_request_id: randomUUID(),
      p_recurrence_rule: "FREQ=DAILY",
    });
    expect(unbounded.error?.code).toBe("22023");

    const unsupported = await owner.client.rpc("create_calendar_series_for_member", {
      ...args,
      p_request_id: randomUUID(),
      p_recurrence_rule: "FREQ=YEARLY;COUNT=2",
    });
    expect(unsupported.error?.code).toBe("22023");

    const foreign = await owner.client.rpc("create_calendar_series_for_member", {
      ...args,
      p_family_id: otherFamilyId,
      p_request_id: randomUUID(),
    });
    expect(foreign.error?.code).toBe("42501");
  });

  it("updates with optimistic versioning and rejects stale writes", async () => {
    const modified = await owner.client.rpc("update_calendar_series", {
      p_resource_id: seriesId,
      p_expected_version: 1,
      p_request_id: randomUUID(),
      p_title: "Updated recurring appointment",
      p_is_all_day: false,
      p_starts_at: "2026-11-16T17:00:00+01:00",
      p_ends_at: "2026-11-16T18:00:00+01:00",
      p_start_date: null,
      p_end_date_exclusive: null,
      p_time_zone: "Europe/Berlin",
      p_recurrence_rule: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4",
    });
    expect(modified.error).toBeNull();
    expect(modified.data).toBe(2);

    const stale = await owner.client.rpc("update_calendar_series", {
      p_resource_id: seriesId,
      p_expected_version: 1,
      p_request_id: randomUUID(),
      p_title: "Stale recurring appointment",
      p_is_all_day: false,
      p_starts_at: "2026-11-16T17:00:00+01:00",
      p_ends_at: "2026-11-16T18:00:00+01:00",
      p_start_date: null,
      p_end_date_exclusive: null,
      p_time_zone: "Europe/Berlin",
      p_recurrence_rule: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4",
    });
    expect(stale.error?.code).toBe("P0001");
  });

  it("splits an existing occurrence into a new following series", async () => {
    const original = await owner.client.rpc("create_calendar_series_for_member", {
      ...createArgs(familyId, ownerMemberId),
      p_recurrence_rule: "FREQ=DAILY;COUNT=4",
    });
    expect(original.error).toBeNull();
    const split = await owner.client.rpc("split_calendar_series", {
      p_resource_id: original.data!,
      p_expected_version: 1,
      p_request_id: randomUUID(),
      p_effective_date: "2026-11-18",
      p_new_recurrence_rule: "FREQ=DAILY;COUNT=2",
    });
    expect(split.error).toBeNull();
    expect(split.data).toBeTruthy();

    const before = await owner.client.from("calendar_series_occurrences")
      .select("occurrence_key").eq("series_resource_id", original.data!);
    const after = await owner.client.from("calendar_series_occurrences")
      .select("occurrence_key").eq("series_resource_id", split.data!);
    expect(before.data?.map((item) => item.occurrence_key)).toEqual([
      "2026-11-16T17:00:00", "2026-11-17T17:00:00",
    ]);
    expect(after.data?.map((item) => item.occurrence_key)).toEqual([
      "2026-11-18T17:00:00", "2026-11-19T17:00:00",
    ]);
  });

  it("denies direct authenticated writes and cross-family reads", async () => {
    const direct = await owner.client.from("calendar_series").insert({
      resource_id: randomUUID(),
      family_id: familyId,
      title: "Direct write must fail",
      time_zone: "Europe/Berlin",
      recurrence_rule: "FREQ=DAILY;COUNT=1",
      recurrence_frequency: "DAILY",
    });
    expect(direct.error).not.toBeNull();
    const foreignRead = await outsider.client.from("calendar_series")
      .select("resource_id").eq("family_id", familyId);
    expect(foreignRead.error).toBeNull();
    expect(foreignRead.data).toEqual([]);
  });

  it("supports one-occurrence overrides, cancellation, reset and idempotent retries", async () => {
    const created = await owner.client.rpc("create_calendar_series_for_member", {
      ...createArgs(familyId, ownerMemberId),
      p_recurrence_rule: "FREQ=DAILY;COUNT=3",
    });
    expect(created.error).toBeNull();
    const exceptionSeriesId = created.data!;
    const occurrenceKey = "2026-11-16T17:00:00";
    const requestId = randomUUID();
    const override = {
      p_series_resource_id: exceptionSeriesId,
      p_occurrence_key: occurrenceKey,
      p_request_id: requestId,
      p_expected_series_version: 1,
      p_expected_exception_version: 0,
      p_action: "override" as const,
      p_title: "Verschobenes Vorkommen",
      p_is_all_day: false,
      p_starts_at: "2026-11-16T18:00:00+01:00",
      p_ends_at: "2026-11-16T19:00:00+01:00",
      p_start_date: null,
      p_end_date_exclusive: null,
      p_time_zone: "Europe/Berlin",
    };
    const first = await owner.client.rpc("set_calendar_series_exception", override);
    expect(first.error).toBeNull();
    expect(first.data).toBe(1);

    const retry = await owner.client.rpc("set_calendar_series_exception", override);
    expect(retry.error).toBeNull();
    expect(retry.data).toBe(1);

    const stored = await owner.client.from("calendar_series_exceptions")
      .select("occurrence_key, exception_version, title, is_cancelled")
      .eq("series_resource_id", exceptionSeriesId)
      .single();
    expect(stored.error).toBeNull();
    expect(stored.data).toMatchObject({
      occurrence_key: occurrenceKey,
      exception_version: 1,
      title: "Verschobenes Vorkommen",
      is_cancelled: false,
    });

    const foreignMutation = await outsider.client.rpc("set_calendar_series_exception", {
      ...override,
      p_request_id: randomUUID(),
    });
    expect(foreignMutation.error?.code).toBe("42501");

    const reset = await owner.client.rpc("delete_calendar_series_exception", {
      p_series_resource_id: exceptionSeriesId,
      p_occurrence_key: occurrenceKey,
      p_request_id: randomUUID(),
      p_expected_series_version: 2,
      p_expected_exception_version: 1,
    });
    expect(reset.error).toBeNull();
    expect(reset.data).toBe(3);

    const cancelled = await owner.client.rpc("set_calendar_series_exception", {
      ...override,
      p_occurrence_key: "2026-11-17T17:00:00",
      p_request_id: randomUUID(),
      p_expected_series_version: 3,
      p_expected_exception_version: 0,
      p_action: "cancel" as const,
      p_title: null,
      p_is_all_day: null,
      p_starts_at: null,
      p_ends_at: null,
      p_time_zone: null,
    });
    expect(cancelled.error).toBeNull();
    expect(cancelled.data).toBe(1);

    const cancelledRow = await owner.client.from("calendar_series_exceptions")
      .select("is_cancelled, title")
      .eq("series_resource_id", exceptionSeriesId)
      .eq("occurrence_key", "2026-11-17T17:00:00")
      .single();
    expect(cancelledRow.error).toBeNull();
    expect(cancelledRow.data).toEqual({ is_cancelled: true, title: null });
  });
});

