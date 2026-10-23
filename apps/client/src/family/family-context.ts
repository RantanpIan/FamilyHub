import { createContext } from "react";
import type {
  CreateManagedMemberInput,
  FamilyMember,
  FamilySummary,
  UpdateManagedMemberInput,
} from "@familyhub/contracts";

export type FamilyLoadStatus = "loading" | "ready" | "error";

export type FamilyContextValue = {
  families: FamilySummary[];
  selectedFamily: FamilySummary | null;
  members: FamilyMember[];
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
  refreshFamilies: () => Promise<void>;
  refreshMembers: () => Promise<void>;
};

export const FamilyContext = createContext<FamilyContextValue | null>(null);
