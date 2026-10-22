import type { PrivateContentAccess } from "@familyhub/contracts";

export function canReadPersonalContent(input: PrivateContentAccess): boolean {
  if (!input.actorFamilyIds.includes(input.familyId)) {
    return false;
  }

  return input.actorUserId === input.ownerUserId || input.visibility === "family";
}
