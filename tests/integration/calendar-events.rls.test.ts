import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../apps/client/src/auth/database.types";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`FH-CX-008 benötigt ${name} einer lokalen, wegwerfbaren Supabase-Instanz.`);
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
const password = "Synthetic-Calendar-Password-2026!";

async function user(label: string) {
  const email = `fh-cx-008-${randomUUID()}@example.com`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: label },
  });
  if (error || !data.user) throw error ?? new Error("User fixture missing.");
  createdUsers.push(data.user.id);
  // create_family requires a profile record. Supabase Auth creates only the
  // auth.users row; production creates user_profiles after confirmation.
  // Keep this isolated test fixture consistent with that actual contract.
  const { error: profileError } = await service.from("user_profiles").upsert({
    user_id: data.user.id,
    display_name: label,
  });
  if (profileError) throw profileError;
  const client = createClient<Database, "public">(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const signed = await client.auth.signInWithPassword({ email, password });
  if (signed.error) throw signed.error;
  return { client, id: data.user.id };
}

async function family(actor: Awaited<ReturnType<typeof user>>) {
  const { data, error } = await actor.client.rpc("create_family", {
    p_name: `Synthetic calendar family ${randomUUID()}`,
    p_request_id: randomUUID(),
  });
  if (error || !data?.[0]) throw error ?? new Error("Family fixture missing.");
  createdFamilies.push(data[0].family_id);
  return data[0];
}

async function addAdult(familyId: string, actor: Awaited<ReturnType<typeof user>>) {
  const member = await service.from("family_members").insert({
    family_id: familyId,
    display_name: "Synthetic calendar reader",
    member_type: "adult",
  }).select("id").single();
  if (member.error || !member.data) throw member.error ?? new Error("Member fixture missing.");
  const membership = await service.from("family_memberships").insert({
    family_id: familyId,
    member_id: member.data.id,
    user_id: actor.id,
    role: "adult",
    status: "active",
  });
  if (membership.error) throw membership.error;
  return member.data.id;
}

async function createResource(
  actor: Awaited<ReturnType<typeof user>>,
  familyId: string,
  ownerMemberId: string,
  resourceType: "calendar_event" | "school_item",
  visibility: "private" | "family" = "private",
) {
  const { data, error } = await actor.client.from("resources").insert({
    family_id: familyId,
    owner_member_id: ownerMemberId,
    resource_type: resourceType,
    visibility,
  }).select("id").single();
  if (error || !data) throw error ?? new Error("Resource fixture missing.");
  return data.id;
}

function timed(resourceId: string, familyId: string) {
  return {
    resource_id: resourceId,
    family_id: familyId,
    title: "Synthetic private appointment",
    is_all_day: false,
    starts_at: "2026-11-16T17:00:00+01:00",
    ends_at: "2026-11-16T18:00:00+01:00",
    time_zone: "Europe/Berlin",
  };
}

describe("FH-CX-008 calendar event schema and RLS", () => {
  let owner: Awaited<ReturnType<typeof user>>;
  let reader: Awaited<ReturnType<typeof user>>;
  let outsider: Awaited<ReturnType<typeof user>>;
  let familyId: string;
  let otherFamilyId: string;
  let ownerMemberId: string;
  let privateId: string;
  let sharedId: string;

  beforeAll(async () => {
    owner = await user("Calendar owner");
    reader = await user("Calendar family member");
    outsider = await user("Calendar other-family owner");
    const home = await family(owner);
    const away = await family(outsider);
    familyId = home.family_id;
    otherFamilyId = away.family_id;
    ownerMemberId = home.member_id;
    await addAdult(familyId, reader);
    privateId = await createResource(owner, familyId, ownerMemberId, "calendar_event");
    sharedId = await createResource(owner, familyId, ownerMemberId, "calendar_event", "family");
    const privateEvent = await service.from("calendar_events")
      .insert(timed(privateId, familyId));
    const sharedEvent = await service.from("calendar_events")
      .insert({ ...timed(sharedId, familyId), title: "Synthetic family event" });
    if (privateEvent.error) throw privateEvent.error;
    if (sharedEvent.error) throw sharedEvent.error;
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

  it("CAL-DB-T01: owner reads their own private event and unrelated family events stay invisible", async () => {
    const own = await owner.client.from("calendar_events")
      .select("resource_id, title").eq("resource_id", privateId);
    const foreign = await outsider.client.from("calendar_events")
      .select("resource_id, title").eq("family_id", familyId);
    expect(own.error).toBeNull();
    expect(own.data).toHaveLength(1);
    expect(foreign.error).toBeNull();
    expect(foreign.data).toEqual([]);
  });

  it("CAL-DB-T02: family membership does not expose private titles, but family-shared events are readable", async () => {
    const hidden = await reader.client.from("calendar_events")
      .select("resource_id, title").eq("resource_id", privateId);
    const visible = await reader.client.from("calendar_events")
      .select("resource_id, title").eq("resource_id", sharedId);
    expect(hidden.error).toBeNull();
    expect(hidden.data).toEqual([]);
    expect(visible.error).toBeNull();
    expect(visible.data).toEqual([{ resource_id: sharedId, title: "Synthetic family event" }]);
  });

  it("CAL-DB-T03: direct authenticated writes and anonymous reads are denied", async () => {
    const directWrite = await owner.client.from("calendar_events").insert(
      timed(randomUUID(), familyId),
    );
    expect(directWrite.error).not.toBeNull();
    const anonClient = createClient<Database, "public">(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const read = await anonClient.from("calendar_events").select("resource_id");
    expect(read.error).not.toBeNull();
  });

  it("CAL-DB-T04: invalid intervals and mixed date/time representations are rejected", async () => {
    const resource = await createResource(owner, familyId, ownerMemberId, "calendar_event");
    const invalid = await service.from("calendar_events").insert({
      ...timed(resource, familyId),
      ends_at: "2026-11-16T15:00:00+01:00",
    });
    expect(invalid.error?.code).toBe("23514");
    const mixed = await service.from("calendar_events").insert({
      ...timed(resource, familyId),
      start_date: "2026-11-16",
    });
    expect(mixed.error?.code).toBe("23514");
  });

  it("CAL-DB-T05: all-day events use local dates with an exclusive end date", async () => {
    const resource = await createResource(owner, familyId, ownerMemberId, "calendar_event");
    const event = await service.from("calendar_events").insert({
      resource_id: resource,
      family_id: familyId,
      title: "Synthetic all-day event",
      is_all_day: true,
      start_date: "2026-11-16",
      end_date_exclusive: "2026-11-17",
      time_zone: "Europe/Berlin",
    });
    expect(event.error).toBeNull();
    const read = await owner.client.from("calendar_events")
      .select("start_date, end_date_exclusive, starts_at, ends_at")
      .eq("resource_id", resource).single();
    expect(read.error).toBeNull();
    expect(read.data).toEqual({
      start_date: "2026-11-16",
      end_date_exclusive: "2026-11-17",
      starts_at: null,
      ends_at: null,
    });
  });

  it("CAL-DB-T06: resource foreign key prevents wrong family or wrong resource type", async () => {
    const wrongFamily = await service.from("calendar_events")
      .insert({ ...timed(randomUUID(), otherFamilyId), resource_id: privateId });
    expect(wrongFamily.error?.code).toBe("23503");
    const school = await createResource(owner, familyId, ownerMemberId, "school_item");
    const wrongType = await service.from("calendar_events")
      .insert(timed(school, familyId));
    expect(wrongType.error?.code).toBe("23503");
  });

  it("CAL-DB-T07: removal of access revokes calendar reads immediately", async () => {
    const revoke = await owner.client.rpc("set_resource_visibility", {
      p_resource_id: sharedId,
      p_visibility: "private",
      p_expected_version: 1,
    });
    expect(revoke.error).toBeNull();
    const hidden = await reader.client.from("calendar_events")
      .select("resource_id").eq("resource_id", sharedId);
    expect(hidden.error).toBeNull();
    expect(hidden.data).toEqual([]);
  });
});
