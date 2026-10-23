import { z } from "zod";
import {
  CreateFamilyInputSchema,
  CreateManagedMemberInputSchema,
  FamilyMemberSchema,
  FamilySummarySchema,
  UpdateManagedMemberInputSchema,
  type CreateFamilyInput,
  type CreateManagedMemberInput,
  type FamilyMember,
  type FamilySummary,
  type UpdateManagedMemberInput,
} from "@familyhub/contracts";
import { browserAuthConfig } from "../auth/auth-client";

function requireClient() {
  if (!browserAuthConfig.configured) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }
  return browserAuthConfig.client;
}

export async function listMyFamilies(): Promise<FamilySummary[]> {
  const { data, error } = await requireClient().rpc("list_my_families");
  if (error) {
    throw error;
  }
  return z.array(FamilySummarySchema).parse(data);
}

export async function createFamily(
  input: CreateFamilyInput,
): Promise<FamilySummary> {
  const parsed = CreateFamilyInputSchema.parse(input);
  const { data, error } = await requireClient().rpc("create_family", {
    p_name: parsed.name,
    p_request_id: parsed.requestId,
  });
  if (error) {
    throw error;
  }
  const created = z.array(FamilySummarySchema).parse(data)[0];
  if (!created) {
    throw new Error("Die Familie konnte nicht bestätigt werden.");
  }
  return created;
}

export async function listFamilyMembers(
  familyId: string,
): Promise<FamilyMember[]> {
  const { data, error } = await requireClient().rpc("list_family_members", {
    p_family_id: familyId,
  });
  if (error) {
    throw error;
  }
  return z.array(FamilyMemberSchema).parse(data);
}

export async function createManagedMember(
  familyId: string,
  input: CreateManagedMemberInput,
): Promise<void> {
  const parsed = CreateManagedMemberInputSchema.parse(input);
  const { error } = await requireClient()
    .from("family_members")
    .insert({
      family_id: familyId,
      display_name: parsed.displayName,
      member_type: parsed.memberType,
    });
  if (error) {
    throw error;
  }
}

export async function updateManagedMember(
  familyId: string,
  memberId: string,
  input: UpdateManagedMemberInput,
): Promise<void> {
  const parsed = UpdateManagedMemberInputSchema.parse(input);
  const { data, error } = await requireClient()
    .from("family_members")
    .update({ display_name: parsed.displayName })
    .eq("family_id", familyId)
    .eq("id", memberId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("Mitglied nicht gefunden oder keine Berechtigung zum Ändern.");
  }
}
