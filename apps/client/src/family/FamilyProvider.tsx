import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  CreateFamilyInvitationInput,
  CreateManagedMemberInput,
  FamilyInvitationDecision,
  FamilySummary,
  UpdateManagedMemberInput,
} from "@familyhub/contracts";
import { getErrorMessage } from "../auth/auth-utils";
import { useAuth } from "../auth/useAuth";
import {
  acceptFamilyInvitation,
  createFamily as createFamilyRequest,
  createFamilyInvitation as createFamilyInvitationRequest,
  createManagedMember as createManagedMemberRequest,
  deactivateFamilyMembership,
  listFamilyInvitationsAdmin,
  listFamilyMembers,
  listFamilyMembershipsAdmin,
  listMyFamilies,
  listMyPendingFamilyInvitations,
  revokeFamilyInvitation,
  respondToFamilyInvitation,
  updateManagedMember as updateManagedMemberRequest,
} from "./family-service";
import {
  FamilyContext,
  type FamilyLoadStatus,
  type FamilyContextValue,
} from "./family-context";

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth();
  const [families, setFamilies] = useState<FamilySummary[]>([]);
  const [familiesUserId, setFamiliesUserId] = useState<string | null>(null);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyContextValue["members"]>([]);
  const [memberships, setMemberships] = useState<FamilyContextValue["memberships"]>([]);
  const [invitations, setInvitations] = useState<FamilyContextValue["invitations"]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<FamilyContextValue["pendingInvitations"]>([]);
  const [pendingInvitationsError, setPendingInvitationsError] = useState<string | null>(null);
  const [membersFamilyId, setMembersFamilyId] = useState<string | null>(null);
  const [status, setStatus] = useState<FamilyLoadStatus>("loading");
  const [membersStatus, setMembersStatus] = useState<FamilyLoadStatus>("ready");
  const [error, setError] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [memberReload, setMemberReload] = useState(0);

  const refreshFamilies = useCallback(async (preferredFamilyId?: string) => {
    if (!user) {
      setFamilies([]);
      setFamiliesUserId(null);
      setSelectedFamilyId(null);
      setStatus("ready");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const nextFamilies = await listMyFamilies();
      setFamilies(nextFamilies);
      setFamiliesUserId(user.id);
      setSelectedFamilyId((currentId) =>
        nextFamilies.some((family) => family.family_id === preferredFamilyId)
          ? preferredFamilyId ?? null
          : nextFamilies.some((family) => family.family_id === currentId)
            ? currentId
            : nextFamilies[0]?.family_id ?? null,
      );
      setStatus("ready");
    } catch (loadError) {
      setStatus("error");
      setError(getErrorMessage(loadError));
    }
  }, [user]);

  const refreshPendingInvitations = useCallback(async () => {
    if (!user) {
      setPendingInvitations([]);
      setPendingInvitationsError(null);
      return;
    }

    try {
      const nextInvitations = await listMyPendingFamilyInvitations();
      setPendingInvitations(nextInvitations);
      setPendingInvitationsError(null);
    } catch (loadError) {
      setPendingInvitationsError(getErrorMessage(loadError));
    }
  }, [user]);

  useEffect(() => {
    if (authStatus !== "ready") {
      return;
    }

    let active = true;
    const userId = user?.id ?? null;
    if (!userId) {
      void Promise.resolve().then(() => {
        if (active) {
          setFamilies([]);
          setFamiliesUserId(null);
          setSelectedFamilyId(null);
          setStatus("ready");
          setPendingInvitations([]);
          setPendingInvitationsError(null);
        }
      });
    } else {
      void listMyFamilies().then((nextFamilies) => {
        if (active) {
          setFamilies(nextFamilies);
          setFamiliesUserId(userId);
          setSelectedFamilyId((currentId) =>
            nextFamilies.some((family) => family.family_id === currentId)
              ? currentId
              : nextFamilies[0]?.family_id ?? null,
          );
          setStatus("ready");
          setError(null);
        }
      }).catch((loadError: unknown) => {
        if (active) {
          setStatus("error");
          setError(getErrorMessage(loadError));
        }
      });
      void listMyPendingFamilyInvitations().then((nextInvitations) => {
        if (active) {
          setPendingInvitations(nextInvitations);
          setPendingInvitationsError(null);
        }
      }).catch((loadError: unknown) => {
        if (active) {
          setPendingInvitationsError(getErrorMessage(loadError));
        }
      });
    }
    return () => {
      active = false;
    };
  }, [authStatus, user?.id]);

  const visibleFamilies = useMemo(
    () => user?.id === familiesUserId ? families : [],
    [families, familiesUserId, user?.id],
  );
  const effectiveStatus =
    authStatus === "ready" && user && user.id !== familiesUserId
      ? "loading"
      : authStatus === "unconfigured"
        ? "ready"
        : status;
  const selectedFamily =
    visibleFamilies.find((family) => family.family_id === selectedFamilyId) ?? null;

  const refreshMembers = useCallback(async () => {
    if (!selectedFamily) {
      setMembers([]);
      setMemberships([]);
      setInvitations([]);
      setMembersStatus("ready");
      setMembersError(null);
      return;
    }

    setMembersStatus("loading");
    setMembersError(null);
    try {
      const nextMembers = await listFamilyMembers(selectedFamily.family_id);
      let nextMemberships: FamilyContextValue["memberships"] = [];
      let nextInvitations: FamilyContextValue["invitations"] = [];
      if (selectedFamily.role === "family_admin") {
        [nextMemberships, nextInvitations] = await Promise.all([
          listFamilyMembershipsAdmin(selectedFamily.family_id),
          listFamilyInvitationsAdmin(selectedFamily.family_id),
        ]);
      }
      setMembers(nextMembers);
      setMemberships(nextMemberships);
      setInvitations(nextInvitations);
      setMembersFamilyId(selectedFamily.family_id);
      setMembersStatus("ready");
    } catch (loadError) {
      setMembersFamilyId(selectedFamily.family_id);
      setMembersStatus("error");
      setMembersError(getErrorMessage(loadError));
    }
  }, [selectedFamily]);

  useEffect(() => {
    let active = true;
    if (!selectedFamily) {
      return;
    }

    void (async () => {
      const nextMembers = await listFamilyMembers(selectedFamily.family_id);
      let nextMemberships: FamilyContextValue["memberships"] = [];
      let nextInvitations: FamilyContextValue["invitations"] = [];
      if (selectedFamily.role === "family_admin") {
        [nextMemberships, nextInvitations] = await Promise.all([
          listFamilyMembershipsAdmin(selectedFamily.family_id),
          listFamilyInvitationsAdmin(selectedFamily.family_id),
        ]);
      }
      return { nextMembers, nextMemberships, nextInvitations };
    })().then(({ nextMembers, nextMemberships, nextInvitations }) => {
      if (active) {
        setMembers(nextMembers);
        setMemberships(nextMemberships);
        setInvitations(nextInvitations);
        setMembersFamilyId(selectedFamily.family_id);
        setMembersStatus("ready");
        setMembersError(null);
      }
    }).catch((loadError: unknown) => {
      if (active) {
        setMembersFamilyId(selectedFamily.family_id);
        setMemberships([]);
        setInvitations([]);
        setMembersStatus("error");
        setMembersError(getErrorMessage(loadError));
      }
    });

    return () => {
      active = false;
    };
  }, [selectedFamily, memberReload]);

  const selectFamily = useCallback((familyId: string) => {
    if (!families.some((family) => family.family_id === familyId)) {
      throw new Error("Die gewählte Familie gehört nicht zu diesem Konto.");
    }
    setSelectedFamilyId(familyId);
  }, [families]);

  const createFamily = useCallback(async (name: string, requestId: string) => {
    if (!user) {
      throw new Error("Für das Anlegen einer Familie ist eine Anmeldung erforderlich.");
    }
    const created = await createFamilyRequest({ name, requestId });
    setFamilies((current) =>
      current.some((family) => family.family_id === created.family_id)
        ? current
        : [...current, created],
    );
    setFamiliesUserId(user.id);
    setSelectedFamilyId(created.family_id);
    setStatus("ready");
  }, [user]);

  const createManagedMember = useCallback(async (input: CreateManagedMemberInput) => {
    if (!selectedFamily) {
      throw new Error("Wähle zuerst eine Familie aus.");
    }
    await createManagedMemberRequest(selectedFamily.family_id, input);
    setMemberReload((current) => current + 1);
  }, [selectedFamily]);

  const updateManagedMember = useCallback(async (
    memberId: string,
    input: UpdateManagedMemberInput,
  ) => {
    if (!selectedFamily) {
      throw new Error("Wähle zuerst eine Familie aus.");
    }
    await updateManagedMemberRequest(selectedFamily.family_id, memberId, input);
    setMemberReload((current) => current + 1);
  }, [selectedFamily]);

  const createInvitation = useCallback(async (
    input: CreateFamilyInvitationInput,
  ) => {
    if (!selectedFamily || selectedFamily.role !== "family_admin") {
      throw new Error("Nur Familienadministratoren können Einladungen erstellen.");
    }
    const token = await createFamilyInvitationRequest(selectedFamily.family_id, input);
    setMemberReload((current) => current + 1);
    return token;
  }, [selectedFamily]);

  const revokeInvitation = useCallback(async (invitationId: string) => {
    if (!selectedFamily || selectedFamily.role !== "family_admin") {
      throw new Error("Nur Familienadministratoren können Einladungen widerrufen.");
    }
    await revokeFamilyInvitation(invitationId);
    setMemberReload((current) => current + 1);
  }, [selectedFamily]);

  const deactivateMembership = useCallback(async (membershipId: string) => {
    if (!selectedFamily || selectedFamily.role !== "family_admin") {
      throw new Error("Nur Familienadministratoren können Mitgliedschaften verwalten.");
    }
    await deactivateFamilyMembership(membershipId);
    setMemberReload((current) => current + 1);
    await refreshFamilies();
  }, [refreshFamilies, selectedFamily]);

  const acceptInvitation = useCallback(async (token: string) => {
    const familyId = await acceptFamilyInvitation(token);
    await refreshFamilies(familyId);
  }, [refreshFamilies]);

  const respondToInvitation = useCallback(async (
    invitationId: string,
    decision: FamilyInvitationDecision,
  ) => {
    const result = await respondToFamilyInvitation(invitationId, decision);
    if (decision === "accepted") {
      await refreshFamilies(result.familyId ?? undefined);
    }
    if (decision !== "remind_later") {
      setPendingInvitations((current) =>
        current.filter((invitation) => invitation.invitation_id !== invitationId),
      );
    }
  }, [refreshFamilies]);

  const value = useMemo<FamilyContextValue>(() => ({
    families: visibleFamilies,
    selectedFamily,
    members: selectedFamily?.family_id === membersFamilyId ? members : [],
    memberships: selectedFamily?.family_id === membersFamilyId ? memberships : [],
    invitations: selectedFamily?.family_id === membersFamilyId ? invitations : [],
    pendingInvitations,
    pendingInvitationsError,
    status: effectiveStatus,
    membersStatus:
      selectedFamily && selectedFamily.family_id !== membersFamilyId
        ? "loading"
        : selectedFamily ? membersStatus : "ready",
    error: effectiveStatus === "error" ? error : null,
    membersError:
      selectedFamily?.family_id === membersFamilyId ? membersError : null,
    selectFamily,
    createFamily,
    createManagedMember,
    updateManagedMember,
    refreshFamilies,
    refreshMembers,
    createInvitation,
    revokeInvitation,
    deactivateMembership,
    acceptInvitation,
    refreshPendingInvitations,
    respondToInvitation,
  }), [
    visibleFamilies,
    selectedFamily,
    members,
    memberships,
    invitations,
    pendingInvitations,
    pendingInvitationsError,
    membersFamilyId,
    effectiveStatus,
    membersStatus,
    error,
    membersError,
    selectFamily,
    createFamily,
    createManagedMember,
    updateManagedMember,
    refreshFamilies,
    refreshMembers,
    createInvitation,
    revokeInvitation,
    deactivateMembership,
    acceptInvitation,
    refreshPendingInvitations,
    respondToInvitation,
  ]);

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

