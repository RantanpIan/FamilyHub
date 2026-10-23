import {
  FamilyIdSchema,
  FamilyMemberIdSchema,
  ResourceIdSchema,
  UserIdSchema,
} from "@familyhub/contracts";
import type {
  FamilyId,
  FamilyMemberId,
  ResourceAccessMembership,
  ResourceAccessRequest,
  ResourceId,
  UserId,
} from "@familyhub/contracts";

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
  linkedAdminA: FamilyMemberIdSchema.parse("00000000-0000-4000-8000-000000000009"),
  userAdminA: UserIdSchema.parse("10000000-0000-4000-8000-000000000001"),
  userAdultA: UserIdSchema.parse("10000000-0000-4000-8000-000000000002"),
  userChildA: UserIdSchema.parse("10000000-0000-4000-8000-000000000003"),
  userAdminB: UserIdSchema.parse("10000000-0000-4000-8000-000000000005"),
  userAdultB: UserIdSchema.parse("10000000-0000-4000-8000-000000000006"),
  userPending: UserIdSchema.parse("10000000-0000-4000-8000-000000000007"),
  userRevoked: UserIdSchema.parse("10000000-0000-4000-8000-000000000008"),
  privateResourceA: ResourceIdSchema.parse("20000000-0000-4000-8000-000000000001"),
  sharedResourceA: ResourceIdSchema.parse("20000000-0000-4000-8000-000000000002"),
  grantedResourceA: ResourceIdSchema.parse("20000000-0000-4000-8000-000000000003"),
  revokedResourceA: ResourceIdSchema.parse("20000000-0000-4000-8000-000000000004"),
  privateResourceB: ResourceIdSchema.parse("20000000-0000-4000-8000-000000000005"),
  adminPrivateResourceA: ResourceIdSchema.parse("20000000-0000-4000-8000-000000000006"),
} as const;

export type SyntheticMember = {
  id: FamilyMemberId;
  label: string;
  role: "administrator" | "adult" | "child";
  userId: UserId | null;
};

export type SyntheticResource = {
  id: ResourceId;
  familyId: FamilyId;
  ownerMemberId: FamilyMemberId;
  visibility: "private" | "family";
  grants: ResourceAccessRequest["grants"];
};

type SyntheticMembershipInput = Omit<ResourceAccessMembership, "familyId">;

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
    {
      memberId: ids.adminA,
      userId: ids.userAdminA,
      status: "active",
      memberStatus: "active",
    },
    {
      memberId: ids.adultA,
      userId: ids.userAdultA,
      status: "active",
      memberStatus: "active",
    },
    {
      memberId: ids.childLoginA,
      userId: ids.userChildA,
      status: "active",
      memberStatus: "active",
    },
    {
      memberId: ids.pendingMember,
      userId: ids.userPending,
      status: "pending",
      memberStatus: "active",
    },
    {
      memberId: ids.revokedMember,
      userId: ids.userRevoked,
      status: "revoked",
      memberStatus: "active",
    },
  ] as const satisfies readonly SyntheticMembershipInput[],
  membershipActors: [
    { id: ids.pendingMember, userId: ids.userPending },
    { id: ids.revokedMember, userId: ids.userRevoked },
  ] as const,
  resources: {
    ownerPrivate: {
      id: ids.privateResourceA,
      familyId: ids.familyA,
      ownerMemberId: ids.adultA,
      visibility: "private",
      grants: [],
    },
    administratorPrivate: {
      id: ids.adminPrivateResourceA,
      familyId: ids.familyA,
      ownerMemberId: ids.adminA,
      visibility: "private",
      grants: [],
    },
    shared: {
      id: ids.sharedResourceA,
      familyId: ids.familyA,
      ownerMemberId: ids.adultA,
      visibility: "family",
      grants: [],
    },
    explicitlyGranted: {
      id: ids.grantedResourceA,
      familyId: ids.familyA,
      ownerMemberId: ids.adultA,
      visibility: "private",
      grants: [
        {
          resourceId: ids.grantedResourceA,
          familyId: ids.familyA,
          granteeMemberId: ids.childLoginA,
          permission: "read",
          status: "active",
        },
      ],
    },
    revokedGrant: {
      id: ids.revokedResourceA,
      familyId: ids.familyA,
      ownerMemberId: ids.adultA,
      visibility: "private",
      grants: [
        {
          resourceId: ids.revokedResourceA,
          familyId: ids.familyA,
          granteeMemberId: ids.childLoginA,
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
    linkedFamilyAAdministrator: {
      id: ids.linkedAdminA,
      label: "Synthetic A administrator linked in B",
      role: "adult",
      userId: ids.userAdminA,
    },
  } satisfies Record<string, SyntheticMember>,
  memberships: [
    {
      memberId: ids.adminB,
      userId: ids.userAdminB,
      status: "active",
      memberStatus: "active",
    },
    {
      memberId: ids.adultB,
      userId: ids.userAdultB,
      status: "active",
      memberStatus: "active",
    },
    {
      memberId: ids.linkedAdminA,
      userId: ids.userAdminA,
      status: "active",
      memberStatus: "active",
    },
  ] as const satisfies readonly SyntheticMembershipInput[],
  resources: {
    private: {
      id: ids.privateResourceB,
      familyId: ids.familyB,
      ownerMemberId: ids.adultB,
      visibility: "private",
      grants: [],
    },
  } satisfies Record<string, SyntheticResource>,
};

export const allSyntheticMemberships: ResourceAccessMembership[] = [
  ...familyA.memberships.map((membership) => ({
    ...membership,
    familyId: familyA.id,
  })),
  ...familyB.memberships.map((membership) => ({
    ...membership,
    familyId: familyB.id,
  })),
];

export function makeAccessRequest(
  actor: { id: SyntheticMember["id"]; userId: SyntheticMember["userId"] },
  resource: SyntheticResource,
  action: ResourceAccessRequest["action"] = "read",
): ResourceAccessRequest {
  return {
    actorUserId: actor.userId,
    actorMemberships: actor.userId
      ? allSyntheticMemberships.filter(
          (membership) => membership.userId === actor.userId,
        )
      : [],
    resourceId: resource.id,
    resourceFamilyId: resource.familyId,
    ownerMemberId: resource.ownerMemberId,
    visibility: resource.visibility,
    action,
    grants: resource.grants,
  };
}

export const syntheticIds = ids;
