import { describe, expect, it } from "vitest";
import {
  FamilyIdSchema,
  FamilyMemberIdSchema,
  NotificationRecipientSelectionSchema,
  UserIdSchema,
} from "@familyhub/contracts";
import { familyA, syntheticIds } from "../fixtures/families";

describe("shared Zod contracts", () => {
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
