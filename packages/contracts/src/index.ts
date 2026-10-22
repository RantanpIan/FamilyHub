import { z } from "zod";

export const FamilyIdSchema = z.uuid().brand<"FamilyId">();
export const FamilyMemberIdSchema = z.uuid().brand<"FamilyMemberId">();
export const UserIdSchema = z.uuid().brand<"UserId">();

export type FamilyId = z.infer<typeof FamilyIdSchema>;
export type FamilyMemberId = z.infer<typeof FamilyMemberIdSchema>;
export type UserId = z.infer<typeof UserIdSchema>;

export const NotificationRecipientSelectionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all") }),
  z.object({
    kind: z.literal("selected"),
    memberIds: z.array(FamilyMemberIdSchema).min(1).refine(
      (ids) => new Set(ids).size === ids.length,
      "Mitglieds-IDs dürfen nicht doppelt vorkommen.",
    ),
  }),
]);

export type NotificationRecipientSelection = z.infer<
  typeof NotificationRecipientSelectionSchema
>;

export const PrivateContentAccessSchema = z.object({
  actorUserId: UserIdSchema,
  ownerUserId: UserIdSchema,
  familyId: FamilyIdSchema,
  actorFamilyIds: z.array(FamilyIdSchema),
  visibility: z.enum(["private", "family"]),
});

export type PrivateContentAccess = z.infer<typeof PrivateContentAccessSchema>;
