import { describe, expect, it } from "vitest";
import {
  CreateFamilyInputSchema,
  CreateManagedMemberInputSchema,
  FamilyMemberSchema,
  FamilySummarySchema,
  FamilyIdSchema,
  FamilyMemberIdSchema,
  NotificationRecipientSelectionSchema,
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
