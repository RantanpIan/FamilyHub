import { z } from "zod";
import {
  CreateFamilyInvitationInputSchema,
  CreateFamilyInputSchema,
  CreateManagedMemberInputSchema,
  FamilyInvitationPreviewSchema,
  FamilyPendingInvitationSchema,
  FamilyInvitationDecisionSchema,
  FamilyInvitationSchema,
  FamilyMemberSchema,
  FamilyMembershipSummarySchema,
  FamilySummarySchema,
  UpdateManagedMemberInputSchema,
  type CreateFamilyInvitationInput,
  type CreateFamilyInput,
  type CreateManagedMemberInput,
  type FamilyInvitation,
  type FamilyInvitationPreview,
  type FamilyPendingInvitation,
  type FamilyInvitationDecision,
  type FamilyMember,
  type FamilyMembershipSummary,
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

export async function listFamilyMembershipsAdmin(
  familyId: string,
): Promise<FamilyMembershipSummary[]> {
  const { data, error } = await requireClient().rpc(
    "list_family_memberships_admin",
    { p_family_id: familyId },
  );
  if (error) {
    throw error;
  }
  return z.array(FamilyMembershipSummarySchema).parse(data);
}

export async function listFamilyInvitationsAdmin(
  familyId: string,
): Promise<FamilyInvitation[]> {
  const { data, error } = await requireClient().rpc(
    "list_family_invitations_admin",
    { p_family_id: familyId },
  );
  if (error) {
    throw error;
  }
  return z.array(FamilyInvitationSchema).parse(data);
}

export async function createFamilyInvitation(
  familyId: string,
  input: CreateFamilyInvitationInput,
): Promise<string> {
  const parsed = CreateFamilyInvitationInputSchema.parse(input);
  const { data, error } = await requireClient().rpc("create_family_invitation", {
    p_family_id: familyId,
    p_target_member_id: parsed.targetMemberId,
    p_invited_email: parsed.email,
  });
  if (error) {
    throw error;
  }
  const created = z.array(z.object({
    invitation_id: z.uuid(),
    target_member_name: z.string().min(1).max(80),
    role: z.literal("adult"),
    expires_at: z.iso.datetime({ offset: true }),
    invitation_token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  }).strict()).parse(data)[0];
  if (!created) {
    throw new Error("Die Einladung konnte nicht bestätigt werden.");
  }
  return created.invitation_token;
}

export function createFamilyInvitationLink(token: string): string {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new Error("Der Einladungscode hat ein ungültiges Format.");
  }
  const current = new URL(window.location.origin);
  const isLoopback =
    current.hostname === "localhost" ||
    current.hostname === "127.0.0.1" ||
    current.hostname === "[::1]";
  if (
    current.origin !== window.location.origin ||
    (current.protocol !== "https:" &&
      !(current.protocol === "http:" && isLoopback))
  ) {
    throw new Error("Einladungslinks können nur über eine sichere App-Adresse erstellt werden.");
  }
  const link = new URL("/invite", current.origin);
  link.hash = `token=${token}`;
  return link.toString();
}

export async function previewFamilyInvitation(
  token: string,
): Promise<FamilyInvitationPreview> {
  const { data, error } = await requireClient().rpc("preview_family_invitation", {
    p_token: token,
  });
  if (error) {
    throw error;
  }
  const preview = z.array(FamilyInvitationPreviewSchema).parse(data)[0];
  if (!preview) {
    throw new Error("Die Einladung ist ungültig oder nicht mehr verfügbar.");
  }
  return preview;
}

export async function listMyPendingFamilyInvitations(): Promise<FamilyPendingInvitation[]> {
  const { data, error } = await requireClient().rpc(
    "list_my_pending_family_invitations",
  );
  if (error) {
    throw error;
  }
  return z.array(FamilyPendingInvitationSchema).parse(data);
}

export async function respondToFamilyInvitation(
  invitationId: string,
  decision: FamilyInvitationDecision,
): Promise<{ familyId: string | null; decision: FamilyInvitationDecision }> {
  const parsedDecision = FamilyInvitationDecisionSchema.parse(decision);
  const { data, error } = await requireClient().rpc(
    "respond_to_family_invitation",
    {
      p_invitation_id: invitationId,
      p_decision: parsedDecision,
    },
  );
  if (error) {
    throw error;
  }
  const result = z.array(z.object({
    family_id: z.uuid().nullable(),
    decision: FamilyInvitationDecisionSchema,
  }).strict()).parse(data)[0];
  if (!result) {
    throw new Error("Die Einladung konnte nicht verarbeitet werden.");
  }
  return {
    familyId: result.family_id,
    decision: result.decision,
  };
}

export async function acceptFamilyInvitation(token: string): Promise<string> {
  const { data, error } = await requireClient().rpc("accept_family_invitation", {
    p_token: token,
  });
  if (error) {
    throw error;
  }
  const result = z.array(z.object({ family_id: z.uuid() }).strict()).parse(data)[0];
  if (!result) {
    throw new Error("Die Einladung konnte nicht bestätigt werden.");
  }
  return result.family_id;
}

export async function revokeFamilyInvitation(invitationId: string): Promise<void> {
  const { error } = await requireClient().rpc("revoke_family_invitation", {
    p_invitation_id: invitationId,
  });
  if (error) {
    throw error;
  }
}

export async function deactivateFamilyMembership(membershipId: string): Promise<void> {
  const { error } = await requireClient().rpc("deactivate_family_membership", {
    p_membership_id: membershipId,
  });
  if (error) {
    throw error;
  }
}

