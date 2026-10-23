import { z } from "zod";

export const FamilyIdSchema = z.uuid().brand<"FamilyId">();
export const FamilyMemberIdSchema = z.uuid().brand<"FamilyMemberId">();
export const UserIdSchema = z.uuid().brand<"UserId">();

export type FamilyId = z.infer<typeof FamilyIdSchema>;
export type FamilyMemberId = z.infer<typeof FamilyMemberIdSchema>;
export type UserId = z.infer<typeof UserIdSchema>;

export const SignInInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1).max(128),
}).strict();

export const SignUpInputSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(12).max(128),
  passwordConfirmation: z.string().min(1).max(128),
}).strict().refine(
  (input) => input.password === input.passwordConfirmation,
  { path: ["passwordConfirmation"], message: "Die Passwörter stimmen nicht überein." },
);

export const PasswordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
}).strict();

export const NewPasswordSchema = z.object({
  password: z.string().min(12).max(128),
  passwordConfirmation: z.string().min(1).max(128),
}).strict().refine(
  (input) => input.password === input.passwordConfirmation,
  { path: ["passwordConfirmation"], message: "Die Passwörter stimmen nicht überein." },
);

export const UpdateProfileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
}).strict();

export const UserProfileSchema = z.object({
  user_id: UserIdSchema,
  display_name: z.string().min(1).max(80),
  locale: z.string().min(2).max(16),
  timezone: z.string().min(1).max(64),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
}).strict();

export type SignInInput = z.infer<typeof SignInInputSchema>;
export type SignUpInput = z.infer<typeof SignUpInputSchema>;
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;
export type NewPassword = z.infer<typeof NewPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const FamilyNameSchema = z.string().trim().min(1).max(80);
export const FamilyRoleSchema = z.enum(["family_admin", "adult", "child"]);
export const FamilyMemberTypeSchema = z.enum(["adult", "child"]);
export const FamilyMemberStatusSchema = z.enum(["active", "inactive"]);

export const CreateFamilyInputSchema = z.object({
  name: FamilyNameSchema,
  requestId: z.uuid(),
}).strict();

export const CreateManagedMemberInputSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  memberType: FamilyMemberTypeSchema,
}).strict();

export const UpdateManagedMemberInputSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
}).strict();

export const FamilySummarySchema = z.object({
  family_id: FamilyIdSchema,
  family_name: FamilyNameSchema,
  member_id: FamilyMemberIdSchema,
  role: FamilyRoleSchema,
}).strict();

export const FamilyMemberSchema = z.object({
  family_id: FamilyIdSchema,
  member_id: FamilyMemberIdSchema,
  display_name: z.string().min(1).max(80),
  member_type: FamilyMemberTypeSchema,
  status: FamilyMemberStatusSchema,
  has_login: z.boolean(),
}).strict();

export type FamilyRole = z.infer<typeof FamilyRoleSchema>;
export type FamilyMemberType = z.infer<typeof FamilyMemberTypeSchema>;
export type CreateFamilyInput = z.infer<typeof CreateFamilyInputSchema>;
export type CreateManagedMemberInput = z.infer<typeof CreateManagedMemberInputSchema>;
export type UpdateManagedMemberInput = z.infer<typeof UpdateManagedMemberInputSchema>;
export type FamilySummary = z.infer<typeof FamilySummarySchema>;
export type FamilyMember = z.infer<typeof FamilyMemberSchema>;

export const NotificationRecipientSelectionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all") }).strict(),
  z.object({
    kind: z.literal("selected_members"),
    memberIds: z.array(FamilyMemberIdSchema).min(1).refine(
      (ids) => new Set(ids).size === ids.length,
      "Mitglieds-IDs dürfen nicht doppelt vorkommen.",
    ),
  }).strict(),
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
