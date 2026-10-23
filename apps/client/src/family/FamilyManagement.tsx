import { useState, type FormEvent } from "react";
import {
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
    membersStatus,
    membersError,
    selectFamily,
    createManagedMember,
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
          {members.map((member) => (
            <ManagedMemberRow
              key={member.member_id}
              member={member}
              canEdit={isAdmin}
              onSave={(displayName) =>
                updateManagedMember(member.member_id, { displayName })
              }
            />
          ))}
        </ul>
      )}

      {isAdmin && (
        <section className="managed-member-form" aria-labelledby="add-member-title">
          <h3 id="add-member-title">Familienmitglied hinzufügen</h3>
          <p>Das Profil erhält kein eigenes Anmeldekonto.</p>
          {error && <ErrorState description={error} />}
          {notice && <p className="auth-notice" role="status">{notice}</p>}
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
    </section>
  );
}

function ManagedMemberRow({
  member,
  canEdit,
  onSave,
}: {
  member: FamilyMember;
  canEdit: boolean;
  onSave: (displayName: string) => Promise<void>;
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
          {member.has_login ? "Konto verbunden" : "Verwaltetes Profil · kein Login"}
        </span>
      </div>
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
