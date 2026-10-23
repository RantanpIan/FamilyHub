import { describe, expect, it } from "vitest";
import {
  CreateFamilyInputSchema,
  CreateManagedMemberInputSchema,
  CreateResourceInputSchema,
  FamilyMemberSchema,
  FamilySummarySchema,
  FamilyIdSchema,
  FamilyMemberIdSchema,
  GrantResourceReadInputSchema,
  NotificationRecipientSelectionSchema,
  ResourceGrantSchema,
  ResourceSchema,
  SetResourceVisibilityInputSchema,
  UserIdSchema,
} from "@familyhub/contracts";
import { familyA, syntheticIds } from "../fixtures/families";

describe("shared Zod contracts", () => {
  it("validates family creation and managed member input", () => {
    expect(
      CreateFamilyInputSchema.safeParse({
        name: "  Synthetic family  ",
        requestId: "2f14d4d7-3cd8-4c52-9b38-1a3e08a851c2",
      }).success,
    ).toBe(true);
    expect(
      CreateFamilyInputSchema.safeParse({
        name: " ",
        requestId: "not-a-uuid",
      }).success,
    ).toBe(false);
    expect(
      CreateManagedMemberInputSchema.safeParse({
        displayName: "Synthetic managed child",
        memberType: "child",
      }).success,
    ).toBe(true);
    expect(
      CreateManagedMemberInputSchema.safeParse({
        displayName: " ",
        memberType: "admin",
      }).success,
    ).toBe(false);
  });

  it("validates family summaries and managed profile link status", () => {
    const familyId = "d1169748-1b21-4b9f-a35a-ec07a7d58b0e";
    const memberId = "00000000-0000-4000-8000-000000000004";
    expect(
      FamilySummarySchema.safeParse({
        family_id: familyId,
        family_name: "Synthetic family",
        member_id: memberId,
        role: "family_admin",
      }).success,
    ).toBe(true);
    expect(
      FamilySummarySchema.safeParse({
        family_id: familyId,
        family_name: "Synthetic family",
        member_id: memberId,
        role: "owner",
      }).success,
    ).toBe(false);
    expect(
      FamilyMemberSchema.safeParse({
        family_id: familyId,
        member_id: memberId,
        display_name: "Synthetic managed child",
        member_type: "child",
        status: "active",
        has_login: false,
      }).success,
    ).toBe(true);
  });

  it("accepts deterministic family, member, and user UUIDs", () => {
    expect(FamilyIdSchema.safeParse(familyA.id).success).toBe(true);
    expect(
      FamilyMemberIdSchema.safeParse(familyA.members.administrator.id).success,
    ).toBe(true);
    expect(UserIdSchema.safeParse(syntheticIds.userAdultA).success).toBe(true);
  });

  it("defaults new resources to private and validates the shared registry contract", () => {
    const input = CreateResourceInputSchema.parse({
      familyId: familyA.id,
      ownerMemberId: familyA.members.adult.id,
      resourceType: "calendar_event",
    });
    expect(input.visibility).toBe("private");
    expect(
      CreateResourceInputSchema.safeParse({
        ...input,
        ownerMemberId: "not-a-member",
      }).success,
    ).toBe(false);
    expect(
      CreateResourceInputSchema.safeParse({
        ...input,
        resourceType: "unknown",
      }).success,
    ).toBe(false);
    expect(
      SetResourceVisibilityInputSchema.safeParse({
        resourceId: familyA.resources.shared.id,
        visibility: "private",
        expectedVersion: 0,
      }).success,
    ).toBe(false);
    expect(
      SetResourceVisibilityInputSchema.safeParse({
        resourceId: familyA.resources.shared.id,
        visibility: "private",
        expectedVersion: 2,
      }).success,
    ).toBe(true);
  });

  it("validates read-grant inputs and resource/grant read models", () => {
    const now = "2026-10-23T08:00:00.000Z";
    expect(
      GrantResourceReadInputSchema.safeParse({
        resourceId: familyA.resources.ownerPrivate.id,
        granteeMemberId: familyA.members.childWithLogin.id,
      }).success,
    ).toBe(true);
    expect(
      GrantResourceReadInputSchema.safeParse({
        resourceId: "not-a-resource",
        granteeMemberId: familyA.members.childWithLogin.id,
      }).success,
    ).toBe(false);
    expect(
      ResourceSchema.safeParse({
        id: familyA.resources.ownerPrivate.id,
        family_id: familyA.id,
        owner_member_id: familyA.members.adult.id,
        resource_type: "calendar_event",
        visibility: "private",
        version: 1,
        created_at: now,
        updated_at: now,
      }).success,
    ).toBe(true);
    expect(
      ResourceGrantSchema.safeParse({
        id: "30000000-0000-4000-8000-000000000001",
        resource_id: familyA.resources.ownerPrivate.id,
        family_id: familyA.id,
        grantee_member_id: familyA.members.childWithLogin.id,
        permission: "read",
        status: "revoked",
        created_at: now,
        updated_at: now,
        revoked_at: now,
      }).success,
    ).toBe(true);
    expect(
      ResourceGrantSchema.safeParse({
        id: "30000000-0000-4000-8000-000000000001",
        resource_id: familyA.resources.ownerPrivate.id,
        family_id: familyA.id,
        grantee_member_id: familyA.members.childWithLogin.id,
        permission: "write",
        status: "active",
        created_at: now,
        updated_at: now,
        revoked_at: null,
      }).success,
    ).toBe(false);
  });

  it.each(["family-a", "", "00000000-0000-0000-0000-00000000000z"])(
    "rejects an invalid UUID %j",
    (value) => {
      expect(FamilyIdSchema.safeParse(value).success).toBe(false);
      expect(FamilyMemberIdSchema.safeParse(value).success).toBe(false);
      expect(UserIdSchema.safeParse(value).success).toBe(false);
    },
  );

  it("accepts the all-recipient variant", () => {
    expect(NotificationRecipientSelectionSchema.parse({ kind: "all" })).toEqual({
      kind: "all",
    });
  });

  it("accepts a non-empty selected_members list", () => {
    expect(
      NotificationRecipientSelectionSchema.parse({
        kind: "selected_members",
        memberIds: [syntheticIds.childLoginA, syntheticIds.adultA],
      }),
    ).toEqual({
      kind: "selected_members",
      memberIds: [syntheticIds.childLoginA, syntheticIds.adultA],
    });
  });

  it.each([
    undefined,
    null,
    {},
    { kind: "selected_members" },
    { kind: "selected_members", memberIds: [] },
    { kind: "selected", memberIds: [syntheticIds.adultA] },
    { kind: "all", memberIds: [syntheticIds.adultA] },
    { kind: "selected_members", memberIds: ["not-a-uuid"] },
    {
      kind: "selected_members",
      memberIds: [syntheticIds.adultA, syntheticIds.adultA],
    },
  ])("rejects malformed recipient selection %#", (value) => {
    expect(NotificationRecipientSelectionSchema.safeParse(value).success).toBe(false);
  });
});
