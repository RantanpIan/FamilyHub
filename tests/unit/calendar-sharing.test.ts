import { describe, expect, it } from "vitest";
import type { FamilyMember, ResourceGrant } from "@familyhub/contracts";
import {
  activeCalendarGrantMemberIds,
  eligibleCalendarGrantMembers,
} from "../../apps/client/src/calendar/calendar-sharing";

const ownerId = "00000000-0000-4000-8000-000000000001";
const loggedInMemberId = "00000000-0000-4000-8000-000000000002";
const managedMemberId = "00000000-0000-4000-8000-000000000003";
const familyId = "10000000-0000-4000-8000-000000000001" as FamilyMember["family_id"];

function member(
  memberId: string,
  displayName: string,
  hasLogin: boolean,
  status: FamilyMember["status"] = "active",
): FamilyMember {
  return {
    family_id: familyId,
    member_id: memberId as FamilyMember["member_id"],
    display_name: displayName,
    member_type: "adult",
    status,
    has_login: hasLogin,
  };
}

function grant(memberId: string, status: ResourceGrant["status"]): ResourceGrant {
  return {
    id: "20000000-0000-4000-8000-000000000001" as ResourceGrant["id"],
    resource_id: "30000000-0000-4000-8000-000000000001" as ResourceGrant["resource_id"],
    family_id: familyId,
    grantee_member_id: memberId as ResourceGrant["grantee_member_id"],
    permission: "read",
    status,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    revoked_at: status === "revoked" ? "2026-01-02T00:00:00.000Z" : null,
  };
}

describe("calendar sharing helpers", () => {
  it("offers only active family accounts other than the owner", () => {
    expect(
      eligibleCalendarGrantMembers(
        [
          member(ownerId, "Eigentümer", true),
          member(loggedInMemberId, "Berta", true),
          member(managedMemberId, "Kind", false),
          member("00000000-0000-4000-8000-000000000004", "Inaktiv", true, "inactive"),
        ],
        ownerId,
      ).map((item) => item.member_id),
    ).toEqual([loggedInMemberId]);
  });

  it("counts active read grants only", () => {
    expect(
      [...activeCalendarGrantMemberIds([
        grant(loggedInMemberId, "active"),
        grant(managedMemberId, "revoked"),
      ])],
    ).toEqual([loggedInMemberId]);
  });
});

