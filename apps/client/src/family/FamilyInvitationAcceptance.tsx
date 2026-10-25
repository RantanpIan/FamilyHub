import { useEffect, useState } from "react";
import type { FamilyInvitationPreview } from "@familyhub/contracts";
import { ErrorState, LoadingState } from "@familyhub/ui";
import { getErrorMessage } from "../auth/auth-utils";
import { useAuth } from "../auth/useAuth";
import { previewFamilyInvitation } from "./family-service";
import { useFamily } from "./useFamily";

export function FamilyInvitationAcceptance({
  token,
  onAccepted,
  onCancel,
  onSwitchAccount,
}: {
  token: string | null;
  onAccepted: () => void;
  onCancel: () => void;
  onSwitchAccount: () => Promise<void>;
}) {
  const { acceptInvitation } = useFamily();
  const { user } = useAuth();
  const [result, setResult] = useState<{
    token: string;
    preview: FamilyInvitationPreview | null;
    error: string | null;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!token) {
      return;
    }
    void previewFamilyInvitation(token).then((result) => {
      if (active) {
        setResult({ token, preview: result, error: null });
      }
    }).catch((previewError: unknown) => {
      if (active) {
        setResult({
          token,
          preview: null,
          error: getErrorMessage(previewError),
        });
      }
    });
    return () => {
      active = false;
    };
  }, [token]);

  const loading = Boolean(token) && result?.token !== token;
  const preview = result?.token === token ? result.preview : null;
  const previewError = !token
    ? "Der Einladungslink enthält keinen gültigen Einladungscode."
    : result?.token === token
      ? result.error
      : null;

  async function accept() {
    if (!token) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await acceptInvitation(token);
      onAccepted();
    } catch (acceptError) {
      setError(getErrorMessage(acceptError));
    } finally {
      setPending(false);
    }
  }

  async function switchAccount() {
    setError(null);
    try {
      await onSwitchAccount();
    } catch (switchError) {
      setError(getErrorMessage(switchError));
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="invitation-title">
        <span className="eyebrow">FAMILYHUB-EINLADUNG</span>
        <h1 id="invitation-title">Familieneinladung</h1>
        {loading ? (
          <LoadingState label="Einladung wird sicher geprüft" />
        ) : preview ? (
          <>
            <p className="auth-intro">
              Du wurdest eingeladen, das vorhandene Profil „{preview.target_member_name}“
              in der Familie „{preview.family_name}“ mit deinem bestätigten Konto zu verknüpfen.
              Der Beitritt erfolgt erst, wenn du ihn hier bestätigst.
            </p>
            <div className="auth-form">
              <button
                className="primary-button"
                type="button"
                disabled={pending}
                onClick={() => void accept()}
              >
                {pending ? "Einladung wird angenommen …" : "Familieneinladung annehmen"}
              </button>
              <button className="text-button" type="button" onClick={onCancel}>
                Abbrechen
              </button>
            </div>
          </>
        ) : (
          <p className="auth-intro">
            Die Einladung ist ungültig, abgelaufen oder für ein anderes bestätigtes Konto bestimmt.
          </p>
        )}
        {(error || previewError) && (
          <ErrorState description={error ?? previewError ?? "Einladung ungültig."} />
        )}
        {!loading && (!preview || previewError || error) && (
          <div className="auth-form">
            {user && token && (
              <button
                className="text-button"
                type="button"
                disabled={pending}
                onClick={() => void switchAccount()}
              >
                Mit einem anderen Konto anmelden
              </button>
            )}
            <button className="text-button" type="button" onClick={onCancel}>
              Zurück zu FamilyHub
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
