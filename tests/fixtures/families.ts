import {
  FamilyIdSchema,
  FamilyMemberIdSchema,
  UserIdSchema,
} from "@familyhub/contracts";
import type { FamilyId, FamilyMemberId, UserId } from "@familyhub/contracts";
import type { ResourceAccessRequest } from "@familyhub/authorization";

const ids = {
  familyA: FamilyIdSchema.parse("d1169748-1b21-4b9f-a35a-ec07a7d58b0e"),
  familyB: FamilyIdSchema.parse("4cf12ceb-992f-45fa-aea1-e22515f4d026"),
  adminA: FamilyMemberIdSchema.parse("00000000-0000-4000-8000-000000000001"),
  adultA: FamilyMemberIdSchema.parse("00000000-0000-4000-8000-000000000002"),
  childLoginA: FamilyMemberIdSchema.parse("00000000-0000-4000-8000-000000000003"),
  childManagedA: FamilyMemberIdSchema.parse("00000000-0000-4000-8000-000000000004"),
  adminB: FamilyMemberIdSchema.parse("00000000-0000-4000-8000-000000000005"),
  adultB: FamilyMemberIdSchema.parse("00000000-0000-4000-8000-000000000006"),
  pendingMember: FamilyMemberIdSchema.parse("00000000-0000-4000-8000-000000000007"),
  revokedMember: FamilyMemberIdSchema.parse("00000000-0000-4000-8000-000000000008"),
  userAdminA: UserIdSchema.parse("10000000-0000-4000-8000-000000000001"),
  userAdultA: UserIdSchema.parse("10000000-0000-4000-8000-000000000002"),
  userChildA: UserIdSchema.parse("10000000-0000-4000-8000-000000000003"),
  userAdminB: UserIdSchema.parse("10000000-0000-4000-8000-000000000005"),
  userAdultB: UserIdSchema.parse("10000000-0000-4000-8000-000000000006"),
  userPending: UserIdSchema.parse("10000000-0000-4000-8000-000000000007"),
  userRevoked: UserIdSchema.parse("10000000-0000-4000-8000-000000000008"),
  privateResourceA: "20000000-0000-4000-8000-000000000001",
  sharedResourceA: "20000000-0000-4000-8000-000000000002",
  grantedResourceA: "20000000-0000-4000-8000-000000000003",
  revokedResourceA: "20000000-0000-4000-8000-000000000004",
  privateResourceB: "20000000-0000-4000-8000-000000000005",
  adminPrivateResourceA: "20000000-0000-4000-8000-000000000006",
} as const;

export type SyntheticMember = {
  id: FamilyMemberId;
  label: string;
  role: "administrator" | "adult" | "child";
  userId: UserId | null;
};

export type SyntheticResource = {
  id: string;
  familyId: FamilyId;
  ownerUserId: UserId;
  visibility: "private" | "family";
  grants: ResourceAccessRequest["grants"];
};

export const familyA = {
  id: ids.familyA,
  members: {
    administrator: {
      id: ids.adminA,
      label: "Synthetic A administrator",
      role: "administrator",
      userId: ids.userAdminA,
    },
    adult: {
      id: ids.adultA,
      label: "Synthetic A adult",
      role: "adult",
      userId: ids.userAdultA,
    },
    childWithLogin: {
      id: ids.childLoginA,
      label: "Synthetic A child with login",
      role: "child",
      userId: ids.userChildA,
    },
    managedChild: {
      id: ids.childManagedA,
      label: "Synthetic A managed child",
      role: "child",
      userId: null,
    },
  } satisfies Record<string, SyntheticMember>,
  memberships: [
    { memberId: ids.adminA, status: "active" },
    { memberId: ids.adultA, status: "active" },
    { memberId: ids.childLoginA, status: "active" },
    { memberId: ids.childManagedA, status: "active" },
    { memberId: ids.pendingMember, status: "pending" },
    { memberId: ids.revokedMember, status: "revoked" },
  ] as const,
  membershipActors: [
    { id: ids.pendingMember, userId: ids.userPending },
    { id: ids.revokedMember, userId: ids.userRevoked },
  ] as const,
  resources: {
    ownerPrivate: {
      id: ids.privateResourceA,
      familyId: ids.familyA,
      ownerUserId: ids.userAdultA,
      visibility: "private",
      grants: [],
    },
    administratorPrivate: {
      id: ids.adminPrivateResourceA,
      familyId: ids.familyA,
      ownerUserId: ids.userAdminA,
      visibility: "private",
      grants: [],
    },
    shared: {
      id: ids.sharedResourceA,
      familyId: ids.familyA,
      ownerUserId: ids.userAdultA,
      visibility: "family",
      grants: [],
    },
    explicitlyGranted: {
      id: ids.grantedResourceA,
      familyId: ids.familyA,
      ownerUserId: ids.userAdultA,
      visibility: "private",
      grants: [
        {
          resourceId: ids.grantedResourceA,
          userId: ids.userChildA,
          permission: "read",
          status: "active",
        },
      ],
    },
    revokedGrant: {
      id: ids.revokedResourceA,
      familyId: ids.familyA,
      ownerUserId: ids.userAdultA,
      visibility: "private",
      grants: [
        {
          resourceId: ids.revokedResourceA,
          userId: ids.userChildA,
          permission: "read",
          status: "revoked",
        },
      ],
    },
  } satisfies Record<string, SyntheticResource>,
};

export const familyB = {
  id: ids.familyB,
  members: {
    administrator: {
      id: ids.adminB,
      label: "Synthetic B administrator",
      role: "administrator",
      userId: ids.userAdminB,
    },
    adult: {
      id: ids.adultB,
      label: "Synthetic B adult",
      role: "adult",
      userId: ids.userAdultB,
    },
  } satisfies Record<string, SyntheticMember>,
  memberships: [
    { memberId: ids.adminB, status: "active" },
    { memberId: ids.adultB, status: "active" },
  ] as const,
  resources: {
    private: {
      id: ids.privateResourceB,
      familyId: ids.familyB,
      ownerUserId: ids.userAdultB,
      visibility: "private",
      grants: [],
    },
  } satisfies Record<string, SyntheticResource>,
};

export const allSyntheticMemberships = [
  ...familyA.memberships.map((membership) => ({
    ...membership,
    familyId: familyA.id,
  })),
  ...familyB.memberships.map((membership) => ({
    ...membership,
    familyId: familyB.id,
  })),
] as const;

export function makeAccessRequest(
  actor: { id: SyntheticMember["id"]; userId: SyntheticMember["userId"] },
  resource: SyntheticResource,
  action: ResourceAccessRequest["action"] = "read",
): ResourceAccessRequest {
  const actorFamilyIds = allSyntheticMemberships
    .filter(
      (membership) =>
        membership.memberId === actor.id && membership.status === "active",
    )
    .map((membership) => membership.familyId);

  return {
    actorUserId: actor.userId,
    actorFamilyIds,
    resourceId: resource.id,
    resourceFamilyId: resource.familyId,
    ownerUserId: resource.ownerUserId,
    visibility: resource.visibility,
    action,
    grants: resource.grants,
  };
}

export const syntheticIds = ids;
