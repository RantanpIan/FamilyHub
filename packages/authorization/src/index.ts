import {
  ResourceAccessRequestSchema,
  type ResourceAccessRequest,
} from "@familyhub/contracts";

function parseRequest(input: unknown): ResourceAccessRequest | null {
  const result = ResourceAccessRequestSchema.safeParse(input);
  return result.success ? result.data : null;
}

function activeActorMembers(request: ResourceAccessRequest) {
  if (!request.actorUserId) {
    return [];
  }

  return request.actorMemberships.filter(
    (membership) =>
      membership.userId === request.actorUserId &&
      membership.familyId === request.resourceFamilyId &&
      membership.status === "active" &&
      membership.memberStatus === "active",
  );
}

function ownsResource(request: ResourceAccessRequest): boolean {
  return activeActorMembers(request).some(
    (membership) => membership.memberId === request.ownerMemberId,
  );
}

export function isResourceOwner(input: unknown): boolean {
  const request = parseRequest(input);
  return request ? ownsResource(request) : false;
}

export function canReadResource(input: unknown): boolean {
  const request = parseRequest(input);
  if (!request || !request.actorUserId) {
    return false;
  }

  const memberships = activeActorMembers(request);
  if (memberships.length === 0) {
    return false;
  }
  if (memberships.some((membership) => membership.memberId === request.ownerMemberId)) {
    return true;
  }
  if (request.visibility === "family") {
    return true;
  }

  return request.grants.some(
    (grant) =>
      grant.resourceId === request.resourceId &&
      grant.familyId === request.resourceFamilyId &&
      grant.permission === "read" &&
      grant.status === "active" &&
      memberships.some((membership) => membership.memberId === grant.granteeMemberId),
  );
}

export function canUpdateResource(input: unknown): boolean {
  const request = parseRequest(input);
  return request ? ownsResource(request) : false;
}

export function canDeleteResource(input: unknown): boolean {
  const request = parseRequest(input);
  return request ? ownsResource(request) : false;
}

export function canAccessResource(input: unknown): boolean {
  const request = parseRequest(input);
  if (!request) {
    return false;
  }

  if (request.action === "read") {
    return canReadResource(request);
  }
  if (request.action === "update") {
    return canUpdateResource(request);
  }
  return canDeleteResource(request);
}
