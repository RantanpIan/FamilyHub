import type { FamilyMember, ResourceGrant } from "@familyhub/contracts";

/**
 * Kalenderfreigaben sind bewusst auf aktive Familienmitglieder mit Login
 * beschränkt. Verwaltete Profile bleiben sichtbar, erhalten aber keine
 * wirkungslose Freigabe ohne eigenes Konto.
 */
export function eligibleCalendarGrantMembers(
  members: FamilyMember[],
  ownerMemberId: string,
): FamilyMember[] {
  return members
    .filter(
      (member) =>
        member.status === "active" &&
        member.has_login &&
        member.member_id !== ownerMemberId,
    )
    .sort((left, right) => left.display_name.localeCompare(right.display_name, "de"));
}

export function activeCalendarGrantMemberIds(grants: ResourceGrant[]): Set<string> {
  return new Set(
    grants
      .filter((grant) => grant.permission === "read" && grant.status === "active")
      .map((grant) => grant.grantee_member_id),
  );
}

