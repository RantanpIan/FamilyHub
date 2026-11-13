import { useState, type FormEvent } from "react";
import {
  CreateFamilyInvitationInputSchema,
  CreateManagedMemberInputSchema,
  type FamilyMember,
} from "@familyhub/contracts";
import { EmptyState, ErrorState, LoadingState } from "@familyhub/ui";
import { getErrorMessage } from "../auth/auth-utils";
import { useFamily } from "./useFamily";

export function FamilyManagement() {
  const {
    selectedFamily,
    families,
    members,
    memberships,
    invitations,
    membersStatus,
    membersError,
    selectFamily,
    createManagedMember,
    createInvitation,
    revokeInvitation,
    deactivateMembership,
    updateManagedMember,
    refreshMembers,
  } = useFamily();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isAdmin = selectedFamily?.role === "family_admin";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const parsed = CreateManagedMemberInputSchema.safeParse({
      displayName: form.get("displayName"),
      memberType: form.get("memberType"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Bitte prüfe die Mitgliedsdaten.");
      return;
    }

    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await createManagedMember(parsed.data);
      formElement.reset();
      setNotice("Das Familienmitglied wurde hinzugefügt.");
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setPending(false);
    }
  }

  async function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const parsed = CreateFamilyInvitationInputSchema.safeParse({
      targetMemberId: form.get("targetMemberId"),
      email: form.get("email"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Bitte prüfe die Einladungsdaten.");
      return;
    }

    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await createInvitation(parsed.data);
      setNotice(
        "Die Einladung wurde erstellt. Nach der E-Mail-Bestätigung erscheint sie beim nächsten Login des eingeladenen Kontos sicher als Dialog.",
      );
      formElement.reset();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setPending(false);
    }
  }

  async function runManagementAction(action: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setPending(false);
    }
  }

  if (!selectedFamily) {
    return <LoadingState label="Familienbereich wird geladen" />;
  }

  return (
    <section className="family-management page-section" aria-labelledby="family-members-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">FAMILIENBEREICH</span>
          <h2 id="family-members-title">{selectedFamily.family_name}</h2>
        </div>
        {families.length > 1 && (
          <label className="family-context-label">
            Aktive Familie
            <select
              aria-label="Aktive Familie"
              value={selectedFamily.family_id}
              onChange={(event) => selectFamily(event.currentTarget.value)}
            >
              {families.map((family) => (
                <option key={family.family_id} value={family.family_id}>
                  {family.family_name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="page-intro">
        Deine Rolle in dieser Familie: {isAdmin ? "Administrator" : selectedFamily.role}.
        Rollen gelten nur für diesen Familienbereich.
      </p>
      {error && <ErrorState description={error} />}
      {notice && <p className="auth-notice" role="status">{notice}</p>}

      {membersStatus === "loading" ? (
        <LoadingState label="Familienmitglieder werden geladen" />
      ) : membersStatus === "error" ? (
        <div className="family-inline-error">
          <ErrorState
            title="Mitglieder konnten nicht geladen werden"
            description={membersError ?? "Bitte versuche es erneut."}
          />
          <button className="text-button" type="button" onClick={() => void refreshMembers()}>
            Erneut laden
          </button>
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          title="Noch keine Familienmitglieder"
          description="In diesem Familienbereich sind derzeit keine aktiven Profile vorhanden."
        />
      ) : (
        <ul className="family-member-list" aria-label="Familienmitglieder">
          {members.map((member) => {
            const membership = memberships.find(
              (item) => item.member_id === member.member_id,
            );
            const hasPendingInvitation = invitations.some(
              (item) =>
                item.target_member_id === member.member_id &&
                item.status === "pending",
            );
            const activeAdmins = memberships.filter(
              (item) => item.role === "family_admin" && item.status === "active",
            ).length;
            const canDeactivate =
              isAdmin &&
              membership?.status === "active" &&
              !(membership.role === "family_admin" && activeAdmins <= 1);
            return (
            <ManagedMemberRow
              key={member.member_id}
              member={member}
              canEdit={isAdmin}
              membership={membership}
              canInvite={
                isAdmin &&
                member.member_type === "adult" &&
                member.status === "active" &&
                !member.has_login &&
                !hasPendingInvitation
              }
              canDeactivate={canDeactivate}
              onSave={(displayName) =>
                updateManagedMember(member.member_id, { displayName })
              }
              onDeactivate={() =>
                runManagementAction(async () => {
                  if (
                    membership &&
                    window.confirm(`Mitgliedschaft von ${member.display_name} deaktivieren?`)
                  ) {
                    await deactivateMembership(membership.membership_id);
                  }
                })
              }
            />
            );
          })}
        </ul>
      )}

      {isAdmin && (
        <section className="managed-member-form" aria-labelledby="add-member-title">
          <h3 id="add-member-title">Familienmitglied hinzufügen</h3>
          <p>Das Profil erhält kein eigenes Anmeldekonto.</p>
          <form className="auth-form" onSubmit={(event) => void submit(event)}>
            <label>
              Name des Familienmitglieds
              <input
                name="displayName"
                type="text"
                autoComplete="off"
                minLength={1}
                maxLength={80}
                required
              />
            </label>
            <label>
              Profiltyp
              <select name="memberType" defaultValue="" required>
                <option value="" disabled>Profiltyp auswählen</option>
                <option value="adult">Erwachsenes Profil</option>
                <option value="child">Kinderprofil</option>
              </select>
            </label>
            <button className="primary-button" type="submit" disabled={pending}>
              {pending ? "Wird hinzugefügt …" : "Mitglied hinzufügen"}
            </button>
          </form>
        </section>
      )}

      {isAdmin && (
        <section className="managed-member-form" aria-labelledby="invite-member-title">
          <h3 id="invite-member-title">Erwachsenes Familienmitglied einladen</h3>
          <p>
            Einladungen verknüpfen ein vorhandenes Erwachsenenprofil. Rollenänderungen
            bleiben bis zur Klärung der Rollenmatrix gesperrt.
          </p>
          <form className="auth-form" onSubmit={(event) => void submitInvitation(event)}>
              <label>
                Vorhandenes Erwachsenenprofil
                <select name="targetMemberId" defaultValue="" required>
                  <option value="" disabled>Profil auswählen</option>
                  {members
                    .filter((member) =>
                      member.member_type === "adult" &&
                      member.status === "active" &&
                      !member.has_login &&
                      !invitations.some(
                        (invite) =>
                          invite.target_member_id === member.member_id &&
                          invite.status === "pending",
                      ),
                    )
                    .map((member) => (
                      <option key={member.member_id} value={member.member_id}>
                        {member.display_name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                E-Mail-Adresse
                <input name="email" type="email" autoComplete="email" maxLength={254} required />
              </label>
              <button className="primary-button" type="submit" disabled={pending}>
                {pending ? "Einladung wird erstellt …" : "Einladung erstellen"}
              </button>
          </form>
          {invitations.length > 0 && (
            <ul className="family-member-list" aria-label="Einladungen">
              {invitations.map((invitation) => (
                <li className="family-member-card" key={invitation.invitation_id}>
                  <div className="family-member-summary">
                    <div>
                      <strong>{invitation.target_member_name}</strong>
                      <span>
                        {invitation.status === "pending"
                          ? `Offen · gültig bis ${new Date(invitation.expires_at).toLocaleDateString()}`
                          : invitation.status === "accepted"
                            ? "Angenommen"
                            : invitation.status === "revoked"
                              ? "Widerrufen"
                              : invitation.status === "declined"
                                ? "Abgelehnt"
                                : "Abgelaufen"}
                      </span>
                    </div>
                    {invitation.status === "pending" && (
                      <button
                        className="text-button"
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          void runManagementAction(() =>
                            revokeInvitation(invitation.invitation_id),
                          )
                        }
                      >
                        Widerrufen
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </section>
  );
}

function ManagedMemberRow({
  member,
  canEdit,
  membership,
  canInvite,
  canDeactivate,
  onSave,
  onDeactivate,
}: {
  member: FamilyMember;
  canEdit: boolean;
  membership: { membership_id: string; role: string; status: string } | undefined;
  canInvite: boolean;
  canDeactivate: boolean;
  onSave: (displayName: string) => Promise<void>;
  onDeactivate: () => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(member.display_name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await onSave(displayName);
      setNotice("Gespeichert.");
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="family-member-card" data-member-id={member.member_id}>
      <div className="family-member-summary">
        <span className="avatar-placeholder" aria-hidden="true">
          {member.display_name.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <strong>{member.display_name}</strong>
          <span>{member.member_type === "child" ? "Kinderprofil" : "Erwachsenenprofil"}</span>
        </div>
        <span className="member-account-status">
          {membership?.status === "active"
            ? `Konto verbunden · ${membership.role}`
            : membership?.status === "revoked"
              ? "Mitgliedschaft deaktiviert"
              : member.has_login
                ? "Konto verbunden"
                : "Verwaltetes Profil · kein Login"}
        </span>
      </div>
      {canInvite && (
        <p className="member-save-notice">Dieses Erwachsenenprofil kann eingeladen werden.</p>
      )}
      {canDeactivate && (
        <button
          className="text-button"
          type="button"
          disabled={pending}
          onClick={() => void onDeactivate()}
        >
          Mitgliedschaft deaktivieren
        </button>
      )}
      {membership?.role === "family_admin" && membership.status === "active" && (
        <p className="member-save-notice">
          Die letzte aktive Administration kann nicht deaktiviert werden.
        </p>
      )}
      {canEdit && (
        <form className="member-edit-form" onSubmit={(event) => void submit(event)}>
          <label>
            Anzeigename
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.currentTarget.value)}
              minLength={1}
              maxLength={80}
              required
            />
          </label>
          <button className="text-button" type="submit" disabled={pending}>
            {pending ? "Speichert …" : "Speichern"}
          </button>
        </form>
      )}
      {error && <ErrorState description={error} />}
      {notice && <p className="member-save-notice" role="status">{notice}</p>}
    </li>
  );
}

