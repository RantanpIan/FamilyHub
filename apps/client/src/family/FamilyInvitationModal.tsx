import { useEffect, useRef, useState } from "react";
import type {
  FamilyInvitationDecision,
  FamilyPendingInvitation,
} from "@familyhub/contracts";
import { ErrorState } from "@familyhub/ui";
import { getErrorMessage } from "../auth/auth-utils";

export function FamilyInvitationModal({
  invitations,
  onRespond,
  onRemindLater,
}: {
  invitations: FamilyPendingInvitation[];
  onRespond: (
    invitationId: string,
    decision: Exclude<FamilyInvitationDecision, "remind_later">,
  ) => Promise<void>;
  onRemindLater: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invitation = invitations[0] ?? null;

  useEffect(() => {
    dialogRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        onRemindLater();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRemindLater, pending]);

  if (!invitation) {
    return null;
  }
  const currentInvitation = invitation;

  async function respond(decision: Exclude<FamilyInvitationDecision, "remind_later">) {
    setPending(true);
    setError(null);
    try {
      await onRespond(currentInvitation.invitation_id, decision);
    } catch (responseError) {
      setError(getErrorMessage(responseError));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="invitation-modal-backdrop">
      <section
        ref={dialogRef}
        className="invitation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="family-invitation-title"
        tabIndex={-1}
      >
        <span className="eyebrow">FAMILYHUB-EINLADUNG</span>
        <h2 id="family-invitation-title">Du wurdest eingeladen</h2>
        <p className="auth-intro">
          Dein bestätigtes Konto kann mit dem Profil „{invitation.target_member_name}“
          in der Familie „{invitation.family_name}“ verknüpft werden.
        </p>
        <p className="invitation-modal-note">
          Es werden keine Familien zusammengeführt. Nach der Annahme wechselst du in
          diesen Familienbereich; bestehende Familien bleiben getrennt.
        </p>
        {invitations.length > 1 && (
          <p className="invitation-modal-count" role="status">
            {invitations.length} offene Einladungen · diese zuerst
          </p>
        )}
        {error && <ErrorState description={error} />}
        <div className="invitation-modal-actions">
          <button
            className="primary-button"
            type="button"
            disabled={pending}
            onClick={() => void respond("accepted")}
          >
            {pending ? "Wird verarbeitet …" : "Einladung annehmen"}
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={pending}
            onClick={() => void respond("declined")}
          >
            Ablehnen
          </button>
          <button
            className="text-button"
            type="button"
            disabled={pending}
            onClick={onRemindLater}
          >
            Später erinnern
          </button>
        </div>
      </section>
    </div>
  );
}

