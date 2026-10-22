import { describe, expect, it } from "vitest";
import { canAccessResource, canReadPersonalContent } from "@familyhub/authorization";
import { PrivateContentAccessSchema } from "@familyhub/contracts";
import {
  familyA,
  familyB,
  makeAccessRequest,
  syntheticIds,
} from "../fixtures/families";

describe("resource authorization policy", () => {
  it("allows an owner to read and write their own resource", () => {
    const actor = familyA.members.adult;
    const request = makeAccessRequest(actor, familyA.resources.ownerPrivate);

    expect(canAccessResource(request)).toBe(true);
    expect(
      canAccessResource({ ...request, action: "write" }),
    ).toBe(true);
    expect(
      canAccessResource(
        makeAccessRequest(familyB.members.adult, familyB.resources.private),
      ),
    ).toBe(true);
  });

  it("does not give administrators or regular adults access to another member's private resource", () => {
    expect(
      canAccessResource(
        makeAccessRequest(familyA.members.administrator, familyA.resources.ownerPrivate),
      ),
    ).toBe(false);
    expect(
      canAccessResource(
        makeAccessRequest(familyA.members.adult, familyA.resources.administratorPrivate),
      ),
    ).toBe(false);
  });

  it("allows an explicitly granted reader and denies that reader after revocation", () => {
    expect(
      canAccessResource(
        makeAccessRequest(familyA.members.childWithLogin, familyA.resources.explicitlyGranted),
      ),
    ).toBe(true);
    expect(
      canAccessResource(
        makeAccessRequest(familyA.members.childWithLogin, familyA.resources.revokedGrant),
      ),
    ).toBe(false);
  });

  it("does not apply a grant to a different resource ID", () => {
    const request = makeAccessRequest(
      familyA.members.childWithLogin,
      familyA.resources.explicitlyGranted,
    );

    expect(
      canAccessResource({
        ...request,
        resourceId: familyA.resources.ownerPrivate.id,
      }),
    ).toBe(false);
  });

  it("allows family-visible reads only within the resource's family", () => {
    expect(
      canAccessResource(
        makeAccessRequest(familyA.members.administrator, familyA.resources.shared),
      ),
    ).toBe(true);
    expect(
      canAccessResource(
        makeAccessRequest(familyA.members.administrator, familyB.resources.private),
      ),
    ).toBe(false);
  });

  it("denies writes to non-owners, including administrators and read-granted members", () => {
    const sharedRequest = makeAccessRequest(
      familyA.members.administrator,
      familyA.resources.shared,
      "write",
    );
    const grantedRequest = makeAccessRequest(
      familyA.members.childWithLogin,
      familyA.resources.explicitlyGranted,
      "write",
    );

    expect(canAccessResource(sharedRequest)).toBe(false);
    expect(canAccessResource(grantedRequest)).toBe(false);
  });

  it("denies a managed child profile without a login identity", () => {
    expect(
      canAccessResource(
        makeAccessRequest(familyA.members.managedChild, familyA.resources.shared),
      ),
    ).toBe(false);
  });

  it("denies pending and revoked memberships", () => {
    const pendingActor = {
      id: familyA.membershipActors[0].id,
      userId: familyA.membershipActors[0].userId,
    };
    const revokedActor = {
      id: familyA.membershipActors[1].id,
      userId: familyA.membershipActors[1].userId,
    };

    expect(
      canAccessResource(
        makeAccessRequest(pendingActor, familyA.resources.shared),
      ),
    ).toBe(false);
    expect(
      canAccessResource(
        makeAccessRequest(revokedActor, familyA.resources.shared),
      ),
    ).toBe(false);
  });

  it("fails closed for malformed resource IDs and invalid access requests", () => {
    const request = makeAccessRequest(
      familyA.members.administrator,
      familyA.resources.shared,
    );

    expect(canAccessResource({ ...request, resourceId: "not-a-uuid" })).toBe(false);
    expect(canAccessResource({ ...request, resourceFamilyId: "not-a-family" })).toBe(false);
    expect(canAccessResource(null)).toBe(false);
  });

  it("keeps the original read policy fail-closed for non-members", () => {
    const input = PrivateContentAccessSchema.parse({
      actorUserId: syntheticIds.userAdminA,
      ownerUserId: syntheticIds.userAdultB,
      familyId: familyB.id,
      actorFamilyIds: [familyA.id],
      visibility: "family",
    });

    expect(canReadPersonalContent(input)).toBe(false);
  });

  it("preserves owner and family-visible reads in the original read policy", () => {
    const ownerAccess = PrivateContentAccessSchema.parse({
      actorUserId: syntheticIds.userAdultA,
      ownerUserId: syntheticIds.userAdultA,
      familyId: familyA.id,
      actorFamilyIds: [familyA.id],
      visibility: "private",
    });
    const familyVisibleAccess = PrivateContentAccessSchema.parse({
      actorUserId: syntheticIds.userAdminA,
      ownerUserId: syntheticIds.userAdultA,
      familyId: familyA.id,
      actorFamilyIds: [familyA.id],
      visibility: "family",
    });

    expect(canReadPersonalContent(ownerAccess)).toBe(true);
    expect(canReadPersonalContent(familyVisibleAccess)).toBe(true);
  });
});
