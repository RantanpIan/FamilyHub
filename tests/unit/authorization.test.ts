import { describe, expect, it } from "vitest";
import {
  canAccessResource,
  canDeleteResource,
  canReadResource,
  canUpdateResource,
  isResourceOwner,
} from "@familyhub/authorization";
import { ResourceIdSchema } from "@familyhub/contracts";
import {
  familyA,
  familyB,
  makeAccessRequest,
  syntheticIds,
} from "../fixtures/families";

describe("resource authorization policy", () => {
  it("allows the linked owner to read, update, and delete their private resource", () => {
    const request = makeAccessRequest(
      familyA.members.adult,
      familyA.resources.ownerPrivate,
    );

    expect(isResourceOwner(request)).toBe(true);
    expect(canReadResource(request)).toBe(true);
    expect(canUpdateResource({ ...request, action: "update" })).toBe(true);
    expect(canDeleteResource({ ...request, action: "delete" })).toBe(true);
  });

  it("does not let another family member or administrator read private resources", () => {
    expect(
      canReadResource(
        makeAccessRequest(
          familyA.members.administrator,
          familyA.resources.ownerPrivate,
        ),
      ),
    ).toBe(false);
    expect(
      canReadResource(
        makeAccessRequest(
          familyA.members.adult,
          familyA.resources.administratorPrivate,
        ),
      ),
    ).toBe(false);
  });

  it("allows active family members to read family-visible resources only in their family", () => {
    expect(
      canReadResource(
        makeAccessRequest(familyA.members.administrator, familyA.resources.shared),
      ),
    ).toBe(true);
    expect(
      canReadResource(
        makeAccessRequest(familyB.members.adult, familyA.resources.shared),
      ),
    ).toBe(false);
  });

  it("allows a same-family read grant and denies access after revocation", () => {
    expect(
      canReadResource(
        makeAccessRequest(
          familyA.members.childWithLogin,
          familyA.resources.explicitlyGranted,
        ),
      ),
    ).toBe(true);
    expect(
      canReadResource(
        makeAccessRequest(
          familyA.members.childWithLogin,
          familyA.resources.revokedGrant,
        ),
      ),
    ).toBe(false);
  });

  it("does not let a read grant authorize updates or deletion", () => {
    const request = makeAccessRequest(
      familyA.members.childWithLogin,
      familyA.resources.explicitlyGranted,
    );

    expect(canUpdateResource({ ...request, action: "update" })).toBe(false);
    expect(canDeleteResource({ ...request, action: "delete" })).toBe(false);
    expect(canAccessResource({ ...request, action: "write" })).toBe(false);
  });

  it("does not honor grants for a different resource or family", () => {
    const request = makeAccessRequest(
      familyA.members.childWithLogin,
      familyA.resources.explicitlyGranted,
    );

    expect(
      canReadResource({
        ...request,
        resourceId: familyA.resources.ownerPrivate.id,
      }),
    ).toBe(false);
    expect(
      canReadResource({
        ...request,
        grants: [{
          resourceId: familyA.resources.explicitlyGranted.id,
          familyId: familyB.id,
          granteeMemberId: familyA.members.childWithLogin.id,
          permission: "read",
          status: "active",
        }],
      }),
    ).toBe(false);
  });

  it("denies access to managed profiles without a linked login", () => {
    expect(
      canReadResource(
        makeAccessRequest(familyA.members.managedChild, familyA.resources.shared),
      ),
    ).toBe(false);
    expect(
      canReadResource(
        makeAccessRequest(familyA.members.managedChild, familyA.resources.ownerPrivate),
      ),
    ).toBe(false);
  });

  it("denies pending, revoked, and inactive memberships", () => {
    const pendingActor = {
      id: familyA.membershipActors[0].id,
      userId: familyA.membershipActors[0].userId,
    };
    const revokedActor = {
      id: familyA.membershipActors[1].id,
      userId: familyA.membershipActors[1].userId,
    };
    const activeRequest = makeAccessRequest(
      familyA.members.administrator,
      familyA.resources.shared,
    );

    expect(
      canReadResource(makeAccessRequest(pendingActor, familyA.resources.shared)),
    ).toBe(false);
    expect(
      canReadResource(makeAccessRequest(revokedActor, familyA.resources.shared)),
    ).toBe(false);
    expect(
      canReadResource({
        ...activeRequest,
        actorMemberships: activeRequest.actorMemberships.map((membership) => ({
          ...membership,
          memberStatus: "inactive",
        })),
      }),
    ).toBe(false);
  });

  it("honors only memberships mapped to the authenticated actor", () => {
    const request = makeAccessRequest(
      familyA.members.administrator,
      familyA.resources.shared,
    );

    expect(
      canReadResource({
        ...request,
        actorUserId: syntheticIds.userAdultA,
      }),
    ).toBe(false);
  });

  it("applies a real multi-family account membership per family and visibility", () => {
    const linkedAdminInFamilyB = familyB.members.linkedFamilyAAdministrator;

    expect(
      canReadResource(
        makeAccessRequest(linkedAdminInFamilyB, familyB.resources.private),
      ),
    ).toBe(false);
    expect(
      canReadResource(
        makeAccessRequest(
          linkedAdminInFamilyB,
          {
            ...familyB.resources.private,
            id: ResourceIdSchema.parse("20000000-0000-4000-8000-000000000007"),
            ownerMemberId: familyB.members.administrator.id,
            visibility: "family",
          },
        ),
      ),
    ).toBe(true);
    expect(
      canReadResource(
        makeAccessRequest(familyA.members.administrator, familyB.resources.private),
      ),
    ).toBe(false);
  });

  it("fails closed for malformed IDs, missing identities, and invalid requests", () => {
    const request = makeAccessRequest(
      familyA.members.administrator,
      familyA.resources.shared,
    );

    expect(canReadResource({ ...request, resourceId: "not-a-uuid" })).toBe(false);
    expect(canReadResource({ ...request, resourceFamilyId: "not-a-family" })).toBe(false);
    expect(canReadResource({ ...request, actorUserId: null })).toBe(false);
    expect(canReadResource(null)).toBe(false);
    expect(canUpdateResource(null)).toBe(false);
    expect(canDeleteResource(null)).toBe(false);
  });
});
