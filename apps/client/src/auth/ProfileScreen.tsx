import { useState, type FormEvent } from "react";
import { UpdateProfileInputSchema } from "@familyhub/contracts";
import { ErrorState, LoadingState } from "@familyhub/ui";
import { getErrorMessage } from "./auth-utils";
import { useAuth } from "./useAuth";

export function ProfileScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  const { profile, user, updateDisplayName } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!profile) {
    return <LoadingState label="Profil wird geladen" />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = UpdateProfileInputSchema.safeParse({
      displayName: formData.get("displayName"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Bitte prüfe den Anzeigenamen.");
      return;
    }

    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await updateDisplayName(parsed.data);
      setNotice("Dein Anzeigename wurde gespeichert.");
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <button className="text-button profile-back" type="button" onClick={onBack}>
        ← Zur Übersicht
      </button>
      <span className="eyebrow">PERSÖNLICHE EINSTELLUNGEN</span>
      <h1 id="profile-title">Dein Profil</h1>
      <p className="auth-intro">Deine Profildaten sind nur für dich zugänglich.</p>
      <div className="profile-card">
        <p><span>E-Mail</span><strong>{user?.email ?? "Nicht verfügbar"}</strong></p>
        <p><span>Sprache</span><strong>{profile.locale}</strong></p>
        <p><span>Zeitzone</span><strong>{profile.timezone}</strong></p>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label>
            Anzeigename
            <input
              name="displayName"
              type="text"
              defaultValue={profile.display_name}
              minLength={1}
              maxLength={80}
              required
            />
          </label>
          {error && <ErrorState description={error} />}
          {notice && <p className="auth-notice" role="status">{notice}</p>}
          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? "Wird gespeichert …" : "Änderungen speichern"}
          </button>
        </form>
      </div>
    </section>
  );
}
