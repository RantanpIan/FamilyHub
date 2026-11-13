import { createContext } from "react";
import type {
  CreateFamilyInvitationInput,
  CreateManagedMemberInput,
  FamilyInvitation,
  FamilyInvitationDecision,
  FamilyMember,
  FamilyMembershipSummary,
  FamilyPendingInvitation,
  FamilySummary,
  UpdateManagedMemberInput,
} from "@familyhub/contracts";

export type FamilyLoadStatus = "loading" | "ready" | "error";

export type FamilyContextValue = {
  families: FamilySummary[];
  selectedFamily: FamilySummary | null;
  members: FamilyMember[];
  memberships: FamilyMembershipSummary[];
  invitations: FamilyInvitation[];
  pendingInvitations: FamilyPendingInvitation[];
  pendingInvitationsError: string | null;
  status: FamilyLoadStatus;
  membersStatus: FamilyLoadStatus;
  error: string | null;
  membersError: string | null;
  selectFamily: (familyId: string) => void;
  createFamily: (name: string, requestId: string) => Promise<void>;
  createManagedMember: (input: CreateManagedMemberInput) => Promise<void>;
  updateManagedMember: (
    memberId: string,
    input: UpdateManagedMemberInput,
  ) => Promise<void>;
  refreshFamilies: (preferredFamilyId?: string) => Promise<void>;
  refreshMembers: () => Promise<void>;
  createInvitation: (input: CreateFamilyInvitationInput) => Promise<string>;
  revokeInvitation: (invitationId: string) => Promise<void>;
  deactivateMembership: (membershipId: string) => Promise<void>;
  acceptInvitation: (token: string) => Promise<void>;
  refreshPendingInvitations: () => Promise<void>;
  respondToInvitation: (
    invitationId: string,
    decision: FamilyInvitationDecision,
  ) => Promise<void>;
};

export const FamilyContext = createContext<FamilyContextValue | null>(null);

