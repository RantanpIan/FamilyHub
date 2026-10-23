import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { familyA, familyB } from "../fixtures/families";
import type { Database } from "../../apps/client/src/auth/database.types";

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Familien-RLS-Tests benötigen ${name} einer lokalen, wegwerfbaren Supabase-Instanz.`,
    );
  }
  return value;
}

const supabaseUrl = requiredEnvironmentVariable("SUPABASE_TEST_URL");
const anonKey = requiredEnvironmentVariable("SUPABASE_TEST_ANON_KEY");
const serviceRoleKey = requiredEnvironmentVariable("SUPABASE_TEST_SERVICE_ROLE_KEY");
type TestClient = SupabaseClient<Database, "public">;
type SyntheticUser = { id: string; email: string };

const adminClient = createClient<Database, "public">(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const createdUserIds: string[] = [];
let adminA: SyntheticUser;
let adultA: SyntheticUser;
let adminB: SyntheticUser;
let userWithoutProfile: SyntheticUser;
let clientA: TestClient;
let clientAdultA: TestClient;
let clientB: TestClient;
let familyAId: string;
let familyBId: string;
let managedChildId: string;
let familyBLinkedMemberId: string;
let familyARequestId: ReturnType<typeof randomUUID>;
const sharedFamilyName = "Synthetic shared family name";

async function createSyntheticUser(label: string): Promise<SyntheticUser> {
  const email = `fh-cx-004-${randomUUID()}@example.com`;
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: "Synthetic-Family-Test-Password-2026!",
    email_confirm: true,
    user_metadata: { display_name: label },
  });
  if (error || !data.user) {
    throw error ?? new Error("Supabase Auth lieferte keinen synthetischen Testnutzer.");
  }
  createdUserIds.push(data.user.id);
  return { id: data.user.id, email };
}

async function signIn(user: SyntheticUser): Promise<TestClient> {
  const client = createClient<Database, "public">(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: "Synthetic-Family-Test-Password-2026!",
  });
  if (error) {
    throw error;
  }
  return client;
}

async function createFamily(
  client: TestClient,
  name: string,
  requestId: ReturnType<typeof randomUUID> = randomUUID(),
): Promise<{ familyId: string; memberId: string }> {
  const { data, error } = await client.rpc("create_family", {
    p_name: name,
    p_request_id: requestId,
  });
  if (error) {
    throw error;
  }
  const created = data[0];
  if (!created) {
    throw new Error("Supabase hat keine Familie zurückgegeben.");
  }
  return { familyId: created.family_id, memberId: created.member_id };
}

async function addServiceRoleMembership(input: {
  familyId: string;
  memberId: string;
  userId: string;
  role: "family_admin" | "adult" | "child";
}) {
  const { error } = await adminClient.from("family_memberships").insert({
    family_id: input.familyId,
    member_id: input.memberId,
    user_id: input.userId,
    role: input.role,
    status: "active",
  });
  if (error) {
    throw error;
  }
}

beforeAll(async () => {
  adminA = await createSyntheticUser("Synthetic Family A administrator");
  adultA = await createSyntheticUser("Synthetic Family A adult");
  adminB = await createSyntheticUser("Synthetic Family B administrator");
  userWithoutProfile = await createSyntheticUser("Synthetic user without profile");

  clientA = await signIn(adminA);
  clientAdultA = await signIn(adultA);
  clientB = await signIn(adminB);

  for (const [user, displayName] of [
    [adminA, "Synthetic Family A administrator"],
    [adultA, "Synthetic Family A adult"],
    [adminB, "Synthetic Family B administrator"],
  ] as const) {
    const { error } = await adminClient.from("user_profiles").insert({
      user_id: user.id,
      display_name: displayName,
    });
    if (error) {
      throw error;
    }
  }

  familyARequestId = randomUUID();
  const createdFamilyA = await createFamily(
    clientA,
    sharedFamilyName,
    familyARequestId,
  );
  familyAId = createdFamilyA.familyId;
  const createdFamilyB = await createFamily(clientB, sharedFamilyName);
  familyBId = createdFamilyB.familyId;

  const { data: managedChild, error: memberError } = await clientA
    .from("family_members")
    .insert({
      family_id: familyAId,
      display_name: familyA.members.managedChild.label,
      member_type: "child",
    })
    .select("id")
    .single();
  if (memberError) {
    throw memberError;
  }
  managedChildId = managedChild.id;

  const { data: adultMember, error: adultMemberError } = await clientA
    .from("family_members")
    .insert({
      family_id: familyAId,
      display_name: familyA.members.adult.label,
      member_type: "adult",
    })
    .select("id")
    .single();
  if (adultMemberError) {
    throw adultMemberError;
  }
  await addServiceRoleMembership({
    familyId: familyAId,
    memberId: adultMember.id,
    userId: adultA.id,
    role: "adult",
  });

  const { data: linkedMember, error: linkedMemberError } = await adminClient
    .from("family_members")
    .insert({
      family_id: familyBId,
      display_name: familyB.members.adult.label,
      member_type: "adult",
    })
    .select("id")
    .single();
  if (linkedMemberError) {
    throw linkedMemberError;
  }
  familyBLinkedMemberId = linkedMember.id;
  await addServiceRoleMembership({
    familyId: familyBId,
    memberId: familyBLinkedMemberId,
    userId: adminA.id,
    role: "adult",
  });
});

afterAll(async () => {
  for (const userId of createdUserIds) {
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      throw error;
    }
  }
});

describe("FamilyHub families and memberships PostgreSQL RLS", () => {
  it("FAM-T01, T02: creates the first family and its creator as family administrator", async () => {
    const { data, error } = await clientA.rpc("list_my_families");
    expect(error).toBeNull();
    const created = data?.find((family) => family.family_id === familyAId);
    expect(created).toMatchObject({
      family_name: sharedFamilyName,
      role: "family_admin",
    });

    const { data: members, error: memberError } = await clientA.rpc(
      "list_family_members",
      { p_family_id: familyAId },
    );
    expect(memberError).toBeNull();
    expect(members).toContainEqual(
      expect.objectContaining({
        member_id: created?.member_id,
        display_name: "Synthetic Family A administrator",
        member_type: "adult",
        has_login: true,
      }),
    );
  });

  it("FAM-T03: rejects family creation without an authenticated identity", async () => {
    const anonymousClient = createClient<Database, "public">(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await anonymousClient.rpc("create_family", {
      p_name: "Synthetic anonymous family",
      p_request_id: randomUUID(),
    });
    expect(error).not.toBeNull();
  });

  it("FAM-T04: returns the original family for a repeated request key", async () => {
    const replay = await createFamily(clientA, "A changed retry name", familyARequestId);
    expect(replay.familyId).toBe(familyAId);

    const { data, error } = await clientA.rpc("list_my_families");
    expect(error).toBeNull();
    expect(data?.filter((family) => family.family_id === familyAId)).toHaveLength(1);
  });

  it("FAM-T05: rolls back a valid family request that fails after family insertion", async () => {
    const requestId = randomUUID();
    const { error } = await (await signIn(userWithoutProfile)).rpc("create_family", {
      p_name: "Synthetic incomplete family",
      p_request_id: requestId,
    });
    expect(error?.code).toBe("23503");

    const { data: families, error: familyError } = await adminClient
      .from("families")
      .select("id")
      .eq("name", "Synthetic incomplete family");
    expect(familyError).toBeNull();
    expect(families).toEqual([]);

    const { data: requests, error: requestError } = await adminClient
      .from("family_creation_requests")
      .select("request_id")
      .eq("user_id", userWithoutProfile.id)
      .eq("request_id", requestId);
    expect(requestError).toBeNull();
    expect(requests).toEqual([]);
  });

  it("FAM-T07, T15: creates and lists a managed child profile without an Auth account", async () => {
    const { data, error } = await clientA.rpc("list_family_members", {
      p_family_id: familyAId,
    });
    expect(error).toBeNull();
    expect(data).toContainEqual(
      expect.objectContaining({
        member_id: managedChildId,
        member_type: "child",
        has_login: false,
      }),
    );
  });

  it("FAM-T08: an administrator can update a managed member's display name", async () => {
    const { data, error } = await clientA
      .from("family_members")
      .update({ display_name: "Synthetic managed child updated" })
      .eq("family_id", familyAId)
      .eq("id", managedChildId)
      .select("display_name")
      .single();
    expect(error).toBeNull();
    expect(data?.display_name).toBe("Synthetic managed child updated");
  });

  it("FAM-T09: an ordinary member cannot update another family member", async () => {
    const { data, error } = await clientAdultA
      .from("family_members")
      .update({ display_name: "Unauthorized synthetic change" })
      .eq("family_id", familyAId)
      .eq("id", managedChildId)
      .select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("FAM-T10, T11, T18: foreign and unknown family IDs reveal no member rows", async () => {
    const foreignRead = await clientA
      .from("family_members")
      .select("id")
      .eq("family_id", familyBId);
    expect(foreignRead.error).toBeNull();
    expect(foreignRead.data).toEqual([]);

    const unknownFamilyId = randomUUID();
    const unknownRead = await clientA
      .from("family_members")
      .select("id")
      .eq("family_id", unknownFamilyId);
    expect(unknownRead.error).toBeNull();
    expect(unknownRead.data).toEqual([]);

    const foreignList = await clientA.rpc("list_family_members", {
      p_family_id: familyBId,
    });
    expect(foreignList.error?.code).toBe("42501");
    const unknownList = await clientA.rpc("list_family_members", {
      p_family_id: unknownFamilyId,
    });
    expect(unknownList.error?.code).toBe("42501");
  });

  it("FAM-T12, T13: direct membership creation and role escalation are prohibited", async () => {
    const selfAdd = await clientAdultA.from("family_memberships").insert({
      family_id: familyBId,
      member_id: familyBLinkedMemberId,
      user_id: adultA.id,
      role: "family_admin",
      status: "active",
    });
    expect(selfAdd.error).not.toBeNull();

    const { data: ownMembership } = await clientA
      .from("family_memberships")
      .select("id")
      .eq("family_id", familyAId)
      .single();
    expect(ownMembership).not.toBeNull();
    const roleChange = await clientA
      .from("family_memberships")
      .update({ role: "adult" })
      .eq("id", ownMembership!.id);
    expect(roleChange.error).not.toBeNull();
  });

  it("FAM-T14: duplicate active account membership in one family conflicts", async () => {
    const { data: extraMember, error: memberError } = await clientA
      .from("family_members")
      .insert({
        family_id: familyAId,
        display_name: "Synthetic duplicate link target",
        member_type: "adult",
      })
      .select("id")
      .single();
    expect(memberError).toBeNull();
    const { error } = await adminClient.from("family_memberships").insert({
      family_id: familyAId,
      member_id: extraMember!.id,
      user_id: adminA.id,
      role: "adult",
      status: "active",
    });
    expect(error?.code).toBe("23505");
  });

  it("FAM-T16: the same account may be active in two families with family-specific roles", async () => {
    const { data, error } = await clientA.rpc("list_my_families");
    expect(error).toBeNull();
    expect(data).toEqual(expect.arrayContaining([
      expect.objectContaining({ family_id: familyAId, role: "family_admin" }),
      expect.objectContaining({ family_id: familyBId, role: "adult" }),
    ]));
  });

  it("FAM-T17: same-named families retain isolated member sets", async () => {
    const ownMembers = await clientA.rpc("list_family_members", {
      p_family_id: familyAId,
    });
    const secondFamilyMembers = await clientA.rpc("list_family_members", {
      p_family_id: familyBId,
    });
    expect(ownMembers.data?.[0]?.family_id).toBe(familyAId);
    expect(secondFamilyMembers.data?.[0]?.family_id).toBe(familyBId);
    expect(ownMembers.data?.map((member) => member.display_name)).not.toContain(
      familyB.members.adult.label,
    );
    expect(secondFamilyMembers.data?.map((member) => member.display_name)).not.toContain(
      familyA.members.managedChild.label,
    );
  });

  it("FAM-T19: a member's family_id cannot be changed through the REST API", async () => {
    const { data: sessionData, error: sessionError } = await clientA.auth.getSession();
    expect(sessionError).toBeNull();
    const accessToken = sessionData.session?.access_token;
    expect(accessToken).toBeTruthy();

    const response = await fetch(
      `${supabaseUrl}/rest/v1/family_members?id=eq.${managedChildId}`,
      {
        method: "PATCH",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ family_id: familyBId }),
      },
    );
    expect(response.ok).toBe(false);

    const { data, error } = await adminClient
      .from("family_members")
      .select("family_id")
      .eq("id", managedChildId)
      .single();
    expect(error).toBeNull();
    expect(data?.family_id).toBe(familyAId);
  });
});
