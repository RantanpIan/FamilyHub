import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../apps/client/src/auth/database.types";

function requiredEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Familieneinladungs-RLS-Tests benötigen ${name} einer lokalen, wegwerfbaren Supabase-Instanz.`,
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
const createdFamilyIds: string[] = [];
const password = "Synthetic-Family-Invitation-Password-2026!";
let admin: SyntheticUser;
let adult: SyntheticUser;
let invitee: SyntheticUser;
let otherAdult: SyntheticUser;
let familyAId: string;
let familyBId: string;
let familyAAdminMemberId: string;
let familyAAdminMembershipId: string;
let clientAdminB: TestClient;
let clientAdmin: TestClient;
let clientAdult: TestClient;
let clientInvitee: TestClient;
let clientOtherAdult: TestClient;

async function createSyntheticUser(label: string): Promise<SyntheticUser> {
  const email = `fh-cx-006-${randomUUID()}@example.com`;
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: label },
  });
  if (error || !data.user) {
    throw error ?? new Error("Supabase did not create a synthetic invitation test user.");
  }
  createdUserIds.push(data.user.id);
  const { error: profileError } = await adminClient.from("user_profiles").upsert({
    user_id: data.user.id,
    display_name: label,
  });
  if (profileError) {
    throw profileError;
  }
  return { id: data.user.id, email };
}

async function signIn(user: SyntheticUser): Promise<TestClient> {
  const client = createClient<Database, "public">(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password,
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
    throw new Error("Supabase did not return a created synthetic family.");
  }
  createdFamilyIds.push(created.family_id);
  return created;
}

async function createAdultMember(
  client: TestClient,
  name: string,
  familyId = familyAId,
): Promise<string> {
  const { data, error } = await client.from("family_members").insert({
    family_id: familyId,
    display_name: name,
    member_type: "adult",
  }).select("id").single();
  if (error || !data) {
    throw error ?? new Error("Supabase did not return a synthetic adult member.");
  }
  return data.id;
}

async function createInvitation(
  memberId: string,
  email = invitee.email,
  familyId = familyAId,
) {
  const { data, error } = await clientAdmin.rpc("create_family_invitation", {
    p_family_id: familyId,
    p_target_member_id: memberId,
    p_invited_email: email,
  });
  if (error) {
    throw error;
  }
  const invitation = data[0];
  if (!invitation) {
    throw new Error("Invitation RPC did not return its one-time token.");
  }
  return invitation;
}

async function addFixtureMembership(
  familyId: string,
  memberId: string,
  userId: string,
  role: "family_admin" | "adult" = "adult",
) {
  const { error } = await adminClient.from("family_memberships").insert({
    family_id: familyId,
    member_id: memberId,
    user_id: userId,
    role,
    status: "active",
  });
  if (error) {
    throw error;
  }
}

beforeAll(async () => {
  admin = await createSyntheticUser("Synthetic invitation family administrator");
  adult = await createSyntheticUser("Synthetic invitation family adult");
  invitee = await createSyntheticUser("Synthetic invited adult");
  otherAdult = await createSyntheticUser("Synthetic unrelated adult");

  clientAdmin = await signIn(admin);
  clientAdult = await signIn(adult);
  clientInvitee = await signIn(invitee);
  clientOtherAdult = await signIn(otherAdult);

  const createdA = await createFamily(clientAdmin, "Synthetic invitation family A");
  familyAId = createdA.family_id;
  familyAAdminMemberId = createdA.member_id;
  const { data: adminMembership, error: adminMembershipError } = await adminClient
    .from("family_memberships")
    .select("id")
    .eq("family_id", familyAId)
    .eq("member_id", familyAAdminMemberId)
    .single();
  if (adminMembershipError || !adminMembership) {
    throw adminMembershipError ?? new Error("Synthetic administrator membership was not found.");
  }
  familyAAdminMembershipId = adminMembership.id;
  const familyBAdmin = await createSyntheticUser("Synthetic invitation family B administrator");
  clientAdminB = await signIn(familyBAdmin);
  const createdB = await createFamily(clientAdminB, "Synthetic invitation family B");
  familyBId = createdB.family_id;
  const existingAdultMemberId = await createAdultMember(
    clientAdmin,
    "Synthetic existing adult",
  );
  await addFixtureMembership(familyAId, existingAdultMemberId, adult.id);
});

afterAll(async () => {
  if (createdFamilyIds.length > 0) {
    const { error } = await adminClient
      .from("families")
      .delete()
      .in("id", createdFamilyIds);
    if (error) {
      throw error;
    }
  }
  for (const userId of createdUserIds) {
    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
      throw error;
    }
  }
});

describe("family invitation and membership PostgreSQL RLS", () => {
  it("INV-T01: creates an expiring invitation with a hash-only token", async () => {
    const targetMemberId = await createAdultMember(clientAdmin, "Synthetic invite target");
    const created = await createInvitation(targetMemberId);
    expect(created.invitation_token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(created.role).toBe("adult");
    expect(Date.parse(created.expires_at)).toBeGreaterThan(Date.now());

    const { data: stored, error } = await adminClient
      .from("family_invitations")
      .select("token_hash, invited_email, role")
      .eq("id", created.invitation_id)
      .single();
    expect(error).toBeNull();
    expect(stored?.token_hash).not.toContain(created.invitation_token);
    expect(stored?.invited_email).toBe(invitee.email);
    expect(stored?.role).toBe("adult");
    const directRead = await clientAdmin
      .from("family_invitations")
      .select("id")
      .eq("id", created.invitation_id);
    expect(directRead.error).not.toBeNull();
    const listed = await clientAdmin.rpc("list_family_invitations_admin", {
      p_family_id: familyAId,
    });
    expect(listed.error).toBeNull();
    expect(Object.keys(listed.data?.find(
      (entry) => entry.invitation_id === created.invitation_id,
    ) ?? {})).not.toContain("invited_email");
    const { error: revokeError } = await clientAdmin.rpc("revoke_family_invitation", {
      p_invitation_id: created.invitation_id,
    });
    expect(revokeError).toBeNull();
  });

  it("INV-T02 and T03: denies invitation creation by non-admins and across families", async () => {
    const targetMemberId = await createAdultMember(clientAdmin, "Synthetic protected target");
    const nonAdminAttempt = await clientAdult.rpc("create_family_invitation", {
      p_family_id: familyAId,
      p_target_member_id: targetMemberId,
      p_invited_email: invitee.email,
    });
    expect(nonAdminAttempt.error).not.toBeNull();
    const foreignFamilyAttempt = await clientAdmin.rpc("create_family_invitation", {
      p_family_id: familyBId,
      p_target_member_id: targetMemberId,
      p_invited_email: invitee.email,
    });
    expect(foreignFamilyAttempt.error).not.toBeNull();

    const { data: familyBMembers, error: familyBError } = await clientAdmin.rpc(
      "list_family_members",
      { p_family_id: familyBId },
    );
    expect(familyBError).not.toBeNull();
    expect(familyBMembers).toBeNull();
  });

  it("INV-T08: rejects preview and acceptance for a different verified email", async () => {
    const targetMemberId = await createAdultMember(clientAdmin, "Synthetic email-bound target");
    const created = await createInvitation(targetMemberId);
    const preview = await clientOtherAdult.rpc("preview_family_invitation", {
      p_token: created.invitation_token,
    });
    const accept = await clientOtherAdult.rpc("accept_family_invitation", {
      p_token: created.invitation_token,
    });
    expect(preview.error).not.toBeNull();
    expect(accept.error).not.toBeNull();
    const { data: stored } = await adminClient
      .from("family_invitations")
      .select("id")
      .eq("target_member_id", targetMemberId)
      .single();
    const { error: revokeError } = await clientAdmin.rpc("revoke_family_invitation", {
      p_invitation_id: stored!.id,
    });
    expect(revokeError).toBeNull();
  });

  it("INV-T06, T09, T10: explicitly accepts once and remains idempotent under retries", async () => {
    const acceptingUser = await createSyntheticUser("Synthetic accepting adult");
    const targetMemberId = await createAdultMember(clientAdmin, "Synthetic accepted adult");
    const created = await createInvitation(targetMemberId, acceptingUser.email);
    const acceptingClient = await signIn(acceptingUser);
    const [first, second] = await Promise.all([
      acceptingClient.rpc("accept_family_invitation", {
        p_token: created.invitation_token,
      }),
      (await signIn(acceptingUser)).rpc("accept_family_invitation", {
        p_token: created.invitation_token,
      }),
    ]);
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data).toEqual([{ family_id: familyAId }]);

    const { data: memberships, error } = await adminClient
      .from("family_memberships")
      .select("id, user_id, member_id, status")
      .eq("family_id", familyAId)
      .eq("member_id", targetMemberId)
      .eq("status", "active");
    expect(error).toBeNull();
    expect(memberships).toHaveLength(1);
    expect(memberships?.[0]).toMatchObject({
      user_id: acceptingUser.id,
      member_id: targetMemberId,
      status: "active",
    });
  });

  it("INV-T18: a member can accept an invitation while retaining another family membership", async () => {
    const multiFamilyUser = await createSyntheticUser("Synthetic multi-family invitee");
    const familyBMemberId = await createAdultMember(
      clientAdminB,
      "Synthetic member in family B",
      familyBId,
    );
    await addFixtureMembership(familyBId, familyBMemberId, multiFamilyUser.id);
    const targetMemberId = await createAdultMember(
      clientAdmin,
      "Synthetic member in family A",
    );
    const created = await createInvitation(targetMemberId, multiFamilyUser.email);
    const multiFamilyClient = await signIn(multiFamilyUser);
    const accepted = await multiFamilyClient.rpc("accept_family_invitation", {
      p_token: created.invitation_token,
    });
    expect(accepted.error).toBeNull();

    const families = await multiFamilyClient.rpc("list_my_families");
    expect(families.error).toBeNull();
    expect(families.data?.map((family) => family.family_id)).toEqual(
      expect.arrayContaining([familyAId, familyBId]),
    );
  });

  it("INV-T04: a revoked invitation cannot be previewed or accepted", async () => {
    const targetMemberId = await createAdultMember(clientAdmin, "Synthetic revoked target");
    const created = await createInvitation(targetMemberId);
    const { error: revokeError } = await clientAdmin.rpc("revoke_family_invitation", {
      p_invitation_id: created.invitation_id,
    });
    expect(revokeError).toBeNull();
    const accept = await clientInvitee.rpc("accept_family_invitation", {
      p_token: created.invitation_token,
    });
    expect(accept.error).not.toBeNull();
  });

  it("INV-T05: an expired invitation cannot be accepted", async () => {
    const targetMemberId = await createAdultMember(clientAdmin, "Synthetic expired target");
    const created = await createInvitation(targetMemberId);
    const { error: expireError } = await adminClient
      .from("family_invitations")
      .update({
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        status: "expired",
      })
      .eq("id", created.invitation_id);
    expect(expireError).toBeNull();
    const accept = await clientInvitee.rpc("accept_family_invitation", {
      p_token: created.invitation_token,
    });
    expect(accept.error).not.toBeNull();
  });

  it("INV-T11: refuses to link an existing member to a different account", async () => {
    const targetMemberId = await createAdultMember(clientAdmin, "Synthetic already-linked target");
    const created = await createInvitation(targetMemberId);
    await addFixtureMembership(familyAId, targetMemberId, otherAdult.id);

    const accept = await clientInvitee.rpc("accept_family_invitation", {
      p_token: created.invitation_token,
    });
    expect(accept.error).not.toBeNull();
    const { error: revokeError } = await clientAdmin.rpc("revoke_family_invitation", {
      p_invitation_id: created.invitation_id,
    });
    expect(revokeError).toBeNull();
  });

  it("INV-T12 and T20: limits membership administration to the authorized family admin", async () => {
    const adminList = await clientAdmin.rpc("list_family_memberships_admin", {
      p_family_id: familyAId,
    });
    const nonAdminList = await clientAdult.rpc("list_family_memberships_admin", {
      p_family_id: familyAId,
    });
    const foreignList = await clientAdmin.rpc("list_family_memberships_admin", {
      p_family_id: familyBId,
    });
    expect(adminList.error).toBeNull();
    expect(adminList.data?.some((entry) => entry.member_id === familyAAdminMemberId)).toBe(true);
    expect(nonAdminList.error).not.toBeNull();
    expect(foreignList.error).not.toBeNull();
  });

  it("INV-T13, T14, T16: blocks direct role changes and deactivation of the last administrator", async () => {
    const directRoleChange = await clientAdmin
      .from("family_memberships")
      .update({ role: "family_admin" })
      .eq("member_id", familyAAdminMemberId);
    expect(directRoleChange.error).not.toBeNull();

    const lastAdmin = await clientAdmin.rpc("deactivate_family_membership", {
      p_membership_id: familyAAdminMembershipId,
    });
    expect(lastAdmin.error).not.toBeNull();
  });

  it("INV-T15 and T17: deactivation removes access without giving an admin private access", async () => {
    const resourceOwner = await createSyntheticUser("Synthetic private resource owner");
    const targetMemberId = await createAdultMember(clientAdmin, "Synthetic resource owner");
    const created = await createInvitation(targetMemberId, resourceOwner.email);
    const ownerClient = await signIn(resourceOwner);
    const accepted = await ownerClient.rpc("accept_family_invitation", {
      p_token: created.invitation_token,
    });
    expect(accepted.error).toBeNull();

    const { data: resource, error: resourceError } = await ownerClient
      .from("resources")
      .insert({
        family_id: familyAId,
        owner_member_id: targetMemberId,
        resource_type: "document",
        visibility: "private",
      })
      .select("id")
      .single();
    expect(resourceError).toBeNull();
    expect(resource).not.toBeNull();

    const adminRead = await clientAdmin
      .from("resources")
      .select("id")
      .eq("id", resource!.id)
      .maybeSingle();
    expect(adminRead.error).toBeNull();
    expect(adminRead.data).toBeNull();

    const { data: membership, error: membershipError } = await adminClient
      .from("family_memberships")
      .select("id")
      .eq("family_id", familyAId)
      .eq("member_id", targetMemberId)
      .eq("status", "active")
      .single();
    expect(membershipError).toBeNull();
    const deactivate = await clientAdmin.rpc("deactivate_family_membership", {
      p_membership_id: membership!.id,
    });
    expect(deactivate.error).toBeNull();

    const ownerRead = await ownerClient
      .from("resources")
      .select("id")
      .eq("id", resource!.id)
      .maybeSingle();
    expect(ownerRead.error).toBeNull();
    expect(ownerRead.data).toBeNull();
  });
});
