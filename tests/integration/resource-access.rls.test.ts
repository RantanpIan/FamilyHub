import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../apps/client/src/auth/database.types";

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Ressourcen-RLS-Tests benötigen ${name} einer lokalen, wegwerfbaren Supabase-Instanz.`,
    );
  }
  return value;
}

const supabaseUrl = requiredEnvironmentVariable("SUPABASE_TEST_URL");
const anonKey = requiredEnvironmentVariable("SUPABASE_TEST_ANON_KEY");
const serviceRoleKey = requiredEnvironmentVariable("SUPABASE_TEST_SERVICE_ROLE_KEY");
type TestClient = SupabaseClient<Database, "public">;
type SyntheticUser = { id: string; email: string };
type ResourceRow = {
  id: string;
  family_id: string;
  owner_member_id: string;
  visibility: "private" | "family";
  version: number;
};

const serviceClient = createClient<Database, "public">(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const createdUserIds: string[] = [];
const createdFamilyIds: string[] = [];
let adminA: SyntheticUser;
let ownerA: SyntheticUser;
let childA: SyntheticUser;
let adminB: SyntheticUser;
let ownerB: SyntheticUser;
let clientAdminA: TestClient;
let clientOwnerA: TestClient;
let clientChildA: TestClient;
let clientAdminB: TestClient;
let clientOwnerB: TestClient;
let familyAId: string;
let familyBId: string;
let ownerAMemberId: string;
let childAMemberId: string;
let managedChildMemberId: string;
let ownerBMemberId: string;
let adminAMemberBId: string;
let privateA: ResourceRow;
let deletableA: ResourceRow;
let sharedA: ResourceRow;
let grantedA: ResourceRow;
let managedGrantA: ResourceRow;
let privateB: ResourceRow;
let sharedB: ResourceRow;

async function createSyntheticUser(label: string): Promise<SyntheticUser> {
  const email = `fh-cx-005-${randomUUID()}@example.com`;
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password: "Synthetic-Resource-Test-Password-2026!",
    email_confirm: true,
    user_metadata: { display_name: label },
  });
  if (error || !data.user) {
    throw error ?? new Error("Supabase lieferte keinen synthetischen Testnutzer.");
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
    password: "Synthetic-Resource-Test-Password-2026!",
  });
  if (error) {
    throw error;
  }
  return client;
}

async function createFamily(client: TestClient, name: string) {
  const { data, error } = await client.rpc("create_family", {
    p_name: name,
    p_request_id: randomUUID(),
  });
  if (error) {
    throw error;
  }
  const created = data[0];
  if (!created) {
    throw new Error("Supabase hat keine synthetische Testfamilie zurückgegeben.");
  }
  createdFamilyIds.push(created.family_id);
  return created;
}

async function createMember(
  client: TestClient,
  familyId: string,
  name: string,
  memberType: "adult" | "child",
): Promise<string> {
  const { data, error } = await client
    .from("family_members")
    .insert({
      family_id: familyId,
      display_name: name,
      member_type: memberType,
    })
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  return data.id;
}

async function linkMember(input: {
  familyId: string;
  memberId: string;
  user: SyntheticUser;
  role: "family_admin" | "adult" | "child";
}) {
  const { error } = await serviceClient.from("family_memberships").insert({
    family_id: input.familyId,
    member_id: input.memberId,
    user_id: input.user.id,
    role: input.role,
    status: "active",
  });
  if (error) {
    throw error;
  }
}

async function createResource(
  client: TestClient,
  familyId: string,
  ownerMemberId: string,
  visibility?: "private" | "family",
): Promise<ResourceRow> {
  const { data, error } = await client
    .from("resources")
    .insert({
      family_id: familyId,
      owner_member_id: ownerMemberId,
      resource_type: "calendar_event",
      ...(visibility ? { visibility } : {}),
    })
    .select("id, family_id, owner_member_id, visibility, version")
    .single();
  if (error) {
    throw error;
  }
  return data;
}

async function assertCanRead(
  client: TestClient,
  resourceId: string,
  expected: boolean,
) {
  const { data, error } = await client.rpc("can_read_resource", {
    p_resource_id: resourceId,
  });
  expect(error).toBeNull();
  expect(data).toBe(expected);
}

async function readResource(client: TestClient, resourceId: string) {
  return client
    .from("resources")
    .select("id, family_id, owner_member_id, visibility, version")
    .eq("id", resourceId);
}

beforeAll(async () => {
  adminA = await createSyntheticUser("Synthetic family A administrator");
  ownerA = await createSyntheticUser("Synthetic family A resource owner");
  childA = await createSyntheticUser("Synthetic family A child account");
  adminB = await createSyntheticUser("Synthetic family B administrator");
  ownerB = await createSyntheticUser("Synthetic family B resource owner");

  clientAdminA = await signIn(adminA);
  clientOwnerA = await signIn(ownerA);
  clientChildA = await signIn(childA);
  clientAdminB = await signIn(adminB);
  clientOwnerB = await signIn(ownerB);

  for (const [user, displayName] of [
    [adminA, "Synthetic family A administrator"],
    [ownerA, "Synthetic family A resource owner"],
    [childA, "Synthetic family A child account"],
    [adminB, "Synthetic family B administrator"],
    [ownerB, "Synthetic family B resource owner"],
  ] as const) {
    const { error } = await serviceClient.from("user_profiles").insert({
      user_id: user.id,
      display_name: displayName,
    });
    if (error) {
      throw error;
    }
  }

  const createdA = await createFamily(clientAdminA, "Synthetic resource family A");
  familyAId = createdA.family_id;
  const createdB = await createFamily(clientAdminB, "Synthetic resource family B");
  familyBId = createdB.family_id;

  ownerAMemberId = await createMember(
    clientAdminA,
    familyAId,
    "Synthetic resource owner A",
    "adult",
  );
  childAMemberId = await createMember(
    clientAdminA,
    familyAId,
    "Synthetic child account A",
    "child",
  );
  managedChildMemberId = await createMember(
    clientAdminA,
    familyAId,
    "Synthetic managed child A",
    "child",
  );
  await linkMember({
    familyId: familyAId,
    memberId: ownerAMemberId,
    user: ownerA,
    role: "adult",
  });
  await linkMember({
    familyId: familyAId,
    memberId: childAMemberId,
    user: childA,
    role: "child",
  });

  ownerBMemberId = await createMember(
    clientAdminB,
    familyBId,
    "Synthetic resource owner B",
    "adult",
  );
  await linkMember({
    familyId: familyBId,
    memberId: ownerBMemberId,
    user: ownerB,
    role: "adult",
  });

  adminAMemberBId = await createMember(
    clientAdminB,
    familyBId,
    "Synthetic A administrator linked in B",
    "adult",
  );
  await linkMember({
    familyId: familyBId,
    memberId: adminAMemberBId,
    user: adminA,
    role: "adult",
  });

  privateA = await createResource(clientOwnerA, familyAId, ownerAMemberId);
  deletableA = await createResource(
    clientOwnerA,
    familyAId,
    ownerAMemberId,
  );
  sharedA = await createResource(
    clientOwnerA,
    familyAId,
    ownerAMemberId,
    "family",
  );
  grantedA = await createResource(
    clientOwnerA,
    familyAId,
    ownerAMemberId,
    "private",
  );
  managedGrantA = await createResource(
    clientOwnerA,
    familyAId,
    ownerAMemberId,
    "private",
  );
  privateB = await createResource(
    clientOwnerB,
    familyBId,
    ownerBMemberId,
    "private",
  );
  sharedB = await createResource(
    clientOwnerB,
    familyBId,
    ownerBMemberId,
    "family",
  );
});

afterAll(async () => {
  for (const familyId of createdFamilyIds) {
    const { error } = await serviceClient.from("families").delete().eq("id", familyId);
    if (error) {
      throw error;
    }
  }
  for (const userId of createdUserIds) {
    const { error } = await serviceClient.auth.admin.deleteUser(userId);
    if (error) {
      throw error;
    }
  }
});

describe("FamilyHub resource access PostgreSQL RLS", () => {
  it("ACL-T01: the linked owner can read their private resource", async () => {
    const result = await readResource(clientOwnerA, privateA.id);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0]?.visibility).toBe("private");
    await assertCanRead(clientOwnerA, privateA.id, true);
    expect(await clientOwnerA.rpc("can_update_resource", {
      p_resource_id: privateA.id,
    })).toMatchObject({ data: true, error: null });
    expect(await clientOwnerA.rpc("can_delete_resource", {
      p_resource_id: privateA.id,
    })).toMatchObject({ data: true, error: null });
  });

  it("allows the linked owner to delete their own resource", async () => {
    const deletion = await clientOwnerA
      .from("resources")
      .delete()
      .eq("id", deletableA.id)
      .select("id");
    expect(deletion.error).toBeNull();
    expect(deletion.data).toEqual([{ id: deletableA.id }]);

    const verify = await serviceClient
      .from("resources")
      .select("id")
      .eq("id", deletableA.id);
    expect(verify.error).toBeNull();
    expect(verify.data).toEqual([]);
  });

  it("ACL-T02 and ACL-T03: another member and the family administrator cannot read private content", async () => {
    const memberRead = await readResource(clientChildA, privateA.id);
    expect(memberRead.error).toBeNull();
    expect(memberRead.data).toEqual([]);
    await assertCanRead(clientChildA, privateA.id, false);

    const administratorRead = await readResource(clientAdminA, privateA.id);
    expect(administratorRead.error).toBeNull();
    expect(administratorRead.data).toEqual([]);
    await assertCanRead(clientAdminA, privateA.id, false);
  });

  it("ACL-T04: an active same-family member can read family-visible resources", async () => {
    const result = await readResource(clientAdminA, sharedA.id);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    await assertCanRead(clientAdminA, sharedA.id, true);
  });

  it("ACL-T05: a user from another family cannot discover a known resource ID", async () => {
    const result = await readResource(clientOwnerA, privateB.id);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
    await assertCanRead(clientOwnerA, privateB.id, false);
  });

  it("ACL-T06: an owner can grant read access to a same-family member", async () => {
    const { data: grantId, error } = await clientOwnerA.rpc("grant_resource_read", {
      p_resource_id: grantedA.id,
      p_grantee_member_id: childAMemberId,
    });
    expect(error).toBeNull();
    expect(grantId).toMatch(/^[0-9a-f-]{36}$/i);

    const result = await readResource(clientChildA, grantedA.id);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);

    const grantDetails = await clientChildA
      .from("resource_grants")
      .select("id")
      .eq("resource_id", grantedA.id);
    expect(grantDetails.error).toBeNull();
    expect(grantDetails.data).toEqual([]);
  });

  it("ACL-T07: revoking a grant denies subsequent reads", async () => {
    const { data: revoked, error } = await clientOwnerA.rpc("revoke_resource_read", {
      p_resource_id: grantedA.id,
      p_grantee_member_id: childAMemberId,
    });
    expect(error).toBeNull();
    expect(revoked).toBe(true);

    const result = await readResource(clientChildA, grantedA.id);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it("ACL-T08: an owner cannot grant access to a member from another family", async () => {
    const { error } = await clientOwnerA.rpc("grant_resource_read", {
      p_resource_id: privateA.id,
      p_grantee_member_id: ownerBMemberId,
    });
    expect(error?.code).toBe("22023");

    const result = await readResource(clientOwnerB, privateA.id);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });

  it("ACL-T09: a foreign non-owner cannot update or delete a resource", async () => {
    const update = await clientAdminA
      .from("resources")
      .update({ visibility: "family" })
      .eq("id", privateA.id)
      .select("id");
    expect(update.error).not.toBeNull();

    const deletion = await clientAdminA
      .from("resources")
      .delete()
      .eq("id", privateA.id)
      .select("id");
    expect(deletion.error).toBeNull();
    expect(deletion.data).toEqual([]);

    const verify = await serviceClient
      .from("resources")
      .select("id, visibility")
      .eq("id", privateA.id)
      .single();
    expect(verify.error).toBeNull();
    expect(verify.data).toMatchObject({ id: privateA.id, visibility: "private" });
    expect(await clientAdminA.rpc("can_update_resource", {
      p_resource_id: privateA.id,
    })).toMatchObject({ data: false, error: null });
    expect(await clientAdminA.rpc("can_delete_resource", {
      p_resource_id: privateA.id,
    })).toMatchObject({ data: false, error: null });
  });

  it("ACL-T10: clients cannot change family or owner fields or create a forged owner resource", async () => {
    const changed = await clientOwnerA
      .from("resources")
      .update({
        family_id: familyBId,
        owner_member_id: ownerBMemberId,
      })
      .eq("id", privateA.id);
    expect(changed.error).not.toBeNull();

    const forged = await clientOwnerA.from("resources").insert({
      family_id: familyAId,
      owner_member_id: ownerBMemberId,
      resource_type: "calendar_event",
      visibility: "private",
    });
    expect(forged.error).not.toBeNull();

    const forgedGrant = await clientOwnerA.from("resource_grants").insert({
      resource_id: privateA.id,
      family_id: familyAId,
      grantee_member_id: ownerBMemberId,
      permission: "read",
    });
    expect(forgedGrant.error).not.toBeNull();

    const invalidResourceReference = await serviceClient.from("resources").insert({
      family_id: familyAId,
      owner_member_id: ownerBMemberId,
      resource_type: "calendar_event",
    });
    expect(invalidResourceReference.error?.code).toBe("23503");

    const invalidGrantReference = await serviceClient.from("resource_grants").insert({
      resource_id: privateA.id,
      family_id: familyBId,
      grantee_member_id: adminAMemberBId,
      permission: "read",
    });
    expect(invalidGrantReference.error?.code).toBe("23503");
  });

  it("ACL-T11: a deactivated membership loses access on subsequent requests", async () => {
    const { error: revokeError } = await serviceClient
      .from("family_memberships")
      .update({ status: "revoked" })
      .eq("family_id", familyAId)
      .eq("member_id", ownerAMemberId)
      .eq("user_id", ownerA.id);
    expect(revokeError).toBeNull();

    let accessError: unknown;
    try {
      const result = await readResource(clientOwnerA, privateA.id);
      expect(result.error).toBeNull();
      expect(result.data).toEqual([]);
      await assertCanRead(clientOwnerA, privateA.id, false);
    } catch (error) {
      accessError = error;
    }

    const { error: restoreError } = await serviceClient
      .from("family_memberships")
      .update({ status: "active" })
      .eq("family_id", familyAId)
      .eq("member_id", ownerAMemberId)
      .eq("user_id", ownerA.id);
    if (restoreError) {
      throw restoreError;
    }
    if (accessError) {
      throw accessError;
    }

    const { error: deactivateMemberError } = await serviceClient
      .from("family_members")
      .update({ status: "inactive" })
      .eq("id", ownerAMemberId)
      .eq("family_id", familyAId);
    expect(deactivateMemberError).toBeNull();
    const deactivatedMemberRead = await readResource(clientOwnerA, privateA.id);
    expect(deactivatedMemberRead.error).toBeNull();
    expect(deactivatedMemberRead.data).toEqual([]);
    const { error: activateMemberError } = await serviceClient
      .from("family_members")
      .update({ status: "active" })
      .eq("id", ownerAMemberId)
      .eq("family_id", familyAId);
    expect(activateMemberError).toBeNull();
  });

  it("ACL-T12: anonymous callers cannot read resources or call authorization helpers", async () => {
    const anonymousClient = createClient<Database, "public">(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const result = await readResource(anonymousClient, sharedA.id);
    expect(result.error).not.toBeNull();
    expect(result.data).toBeNull();

    const check = await anonymousClient.rpc("can_read_resource", {
      p_resource_id: sharedA.id,
    });
    expect(check.error).not.toBeNull();
  });

  it("ACL-T13: a multi-family account receives only the rights of its membership in each family", async () => {
    const ownFamilyPrivate = await readResource(clientAdminA, privateA.id);
    expect(ownFamilyPrivate.error).toBeNull();
    expect(ownFamilyPrivate.data).toEqual([]);

    const familyBShared = await readResource(clientAdminA, sharedB.id);
    expect(familyBShared.error).toBeNull();
    expect(familyBShared.data).toHaveLength(1);

    const familyBPrivate = await readResource(clientAdminA, privateB.id);
    expect(familyBPrivate.error).toBeNull();
    expect(familyBPrivate.data).toEqual([]);
  });

  it("ACL-T14: changing own visibility to private removes subsequent family reads", async () => {
    const { data: nextVersion, error } = await clientOwnerA.rpc(
      "set_resource_visibility",
      {
        p_resource_id: sharedA.id,
        p_visibility: "private",
        p_expected_version: sharedA.version,
      },
    );
    expect(error).toBeNull();
    expect(nextVersion).toBe(sharedA.version + 1);
    const staleUpdate = await clientOwnerA.rpc("set_resource_visibility", {
      p_resource_id: sharedA.id,
      p_visibility: "family",
      p_expected_version: sharedA.version,
    });
    expect(staleUpdate.error?.code).toBe("40001");

    const administratorRead = await readResource(clientAdminA, sharedA.id);
    expect(administratorRead.error).toBeNull();
    expect(administratorRead.data).toEqual([]);

    const ownerRead = await readResource(clientOwnerA, sharedA.id);
    expect(ownerRead.error).toBeNull();
    expect(ownerRead.data).toHaveLength(1);
  });

  it("ACL-T15: a managed member ID does not create login access", async () => {
    const { data: grantId, error } = await clientOwnerA.rpc("grant_resource_read", {
      p_resource_id: managedGrantA.id,
      p_grantee_member_id: managedChildMemberId,
    });
    expect(error).toBeNull();
    expect(grantId).toBeTruthy();

    const managedMemberAccess = await readResource(clientAdminA, managedGrantA.id);
    expect(managedMemberAccess.error).toBeNull();
    expect(managedMemberAccess.data).toEqual([]);

    const forgedOwner = await clientOwnerA.from("resources").insert({
      family_id: familyAId,
      owner_member_id: managedChildMemberId,
      resource_type: "school_item",
      visibility: "private",
    });
    expect(forgedOwner.error).not.toBeNull();
  });

  it("ACL-T16: concurrent grants are idempotent and leave one grant row", async () => {
    const results = await Promise.all([
      clientOwnerA.rpc("grant_resource_read", {
        p_resource_id: privateA.id,
        p_grantee_member_id: childAMemberId,
      }),
      clientOwnerA.rpc("grant_resource_read", {
        p_resource_id: privateA.id,
        p_grantee_member_id: childAMemberId,
      }),
    ]);
    expect(results.map((result) => result.error)).toEqual([null, null]);
    expect(results[0]?.data).toBe(results[1]?.data);

    const { data: grants, error } = await clientOwnerA
      .from("resource_grants")
      .select("id, status")
      .eq("resource_id", privateA.id)
      .eq("grantee_member_id", childAMemberId);
    expect(error).toBeNull();
    expect(grants).toHaveLength(1);
    expect(grants?.[0]?.status).toBe("active");

    const { error: revokeError } = await clientOwnerA.rpc("revoke_resource_read", {
      p_resource_id: privateA.id,
      p_grantee_member_id: childAMemberId,
    });
    expect(revokeError).toBeNull();
    const { data: reactivatedGrantId, error: reactivateError } =
      await clientOwnerA.rpc("grant_resource_read", {
        p_resource_id: privateA.id,
        p_grantee_member_id: childAMemberId,
      });
    expect(reactivateError).toBeNull();
    expect(reactivatedGrantId).toBe(grants?.[0]?.id);
  });
});
