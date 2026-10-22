import type { PrivateContentAccess } from "@familyhub/contracts";
import {
  FamilyIdSchema,
  UserIdSchema,
} from "@familyhub/contracts";
import { z } from "zod";

export function canReadPersonalContent(input: PrivateContentAccess): boolean {
  if (!input.actorFamilyIds.includes(input.familyId)) {
    return false;
  }

  return input.actorUserId === input.ownerUserId || input.visibility === "family";
}

const ResourceAccessRequestSchema = z.object({
  actorUserId: UserIdSchema.nullable(),
  actorFamilyIds: z.array(FamilyIdSchema),
  resourceId: z.uuid(),
  resourceFamilyId: FamilyIdSchema,
  ownerUserId: UserIdSchema,
  visibility: z.enum(["private", "family"]),
  action: z.enum(["read", "write"]),
  grants: z.array(
    z.object({
      resourceId: z.uuid(),
      userId: UserIdSchema,
      permission: z.literal("read"),
      status: z.enum(["active", "revoked"]),
    }),
  ),
});

export type ResourceAccessRequest = z.infer<typeof ResourceAccessRequestSchema>;

export function canAccessResource(input: unknown): boolean {
  const parsed = ResourceAccessRequestSchema.safeParse(input);
  if (!parsed.success) {
    return false;
  }

  const request = parsed.data;
  const { actorUserId, resourceFamilyId, resourceId, action } = request;

  if (!actorUserId || !request.actorFamilyIds.includes(resourceFamilyId)) {
    return false;
  }

  if (request.ownerUserId === actorUserId) {
    return true;
  }

  if (action === "write") {
    return false;
  }

  const hasActiveGrant = request.grants.some(
    (grant) =>
      grant.resourceId === resourceId &&
      grant.userId === actorUserId &&
      grant.status === "active",
  );

  return hasActiveGrant || request.visibility === "family";
}
