import { useState, type FormEvent } from "react";
import {
  NewPasswordSchema,
  PasswordResetRequestSchema,
  SignInInputSchema,
  SignUpInputSchema,
} from "@familyhub/contracts";
import { ErrorState, LoadingState } from "@familyhub/ui";
import {
  getCallbackFlow,
  getSafeAuthErrorMessage,
} from "./auth-utils";
import { useAuth } from "./useAuth";

type AuthMode = "sign-in" | "sign-up" | "reset" | "confirm" | "recovery";

export function AuthScreen({
  initialMode = "sign-in",
  onNavigate,
}: {
  initialMode?: AuthMode;
  onNavigate: (path: "/auth" | "/app") => void;
}) {
  const auth = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const callbackFlow = getCallbackFlow(window.location.search);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    auth.clearError();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    setPending(true);

    try {
      if (mode === "sign-in") {
        const parsed = SignInInputSchema.safeParse({
          email: form.get("email"),
          password: form.get("password"),
        });
        if (!parsed.success) {
          throw new Error("Bitte gib eine gültige E-Mail-Adresse und dein Passwort ein.");
        }
        await auth.signIn(parsed.data);
        onNavigate("/app");
      } else if (mode === "sign-up") {
        const parsed = SignUpInputSchema.safeParse({
          displayName: form.get("displayName"),
          email: form.get("email"),
          password: form.get("password"),
          passwordConfirmation: form.get("passwordConfirmation"),
        });
        if (!parsed.success) {
          throw new Error(parsed.error.issues[0]?.message ?? "Bitte prüfe deine Eingaben.");
        }
        const result = await auth.signUp(parsed.data);
        if (result === "confirmation-required") {
          setMode("confirm");
          setNotice("Wenn die Adresse verwendet werden kann, erhältst du eine E-Mail mit dem Bestätigungslink.");
        } else {
          onNavigate("/app");
        }
      } else if (mode === "reset") {
        const parsed = PasswordResetRequestSchema.safeParse({
          email: form.get("email"),
        });
        if (!parsed.success) {
          throw new Error("Bitte gib eine gültige E-Mail-Adresse ein.");
        }
        await auth.requestPasswordReset(parsed.data);
        setNotice("Wenn ein Konto zu dieser Adresse besteht, erhältst du eine E-Mail mit den nächsten Schritten.");
      } else if (mode === "recovery") {
        const parsed = NewPasswordSchema.safeParse({
          password: form.get("password"),
          passwordConfirmation: form.get("passwordConfirmation"),
        });
        if (!parsed.success) {
          throw new Error(parsed.error.issues[0]?.message ?? "Bitte prüfe dein neues Passwort.");
        }
        await auth.updatePassword(parsed.data);
        setNotice("Dein Passwort wurde aktualisiert.");
        onNavigate("/app");
      }
    } catch (submissionError) {
      setError(getSafeAuthErrorMessage(submissionError));
    } finally {
      setPending(false);
    }
  }

  const recoveryRequested =
    mode === "recovery" || callbackFlow === "password-recovery" || auth.passwordRecovery;
  const recoveryLinkUnavailable = recoveryRequested && !auth.user && auth.status === "ready";
  const title =
    mode === "sign-up"
      ? "Ein Konto für euren Alltag"
      : mode === "reset"
        ? "Passwort zurücksetzen"
        : mode === "recovery"
          ? "Neues Passwort festlegen"
          : "Willkommen zurück";

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <a className="brand auth-brand" href="/" aria-label="FamilyHub Startseite">
          <span className="brand-mark" aria-hidden="true">f</span>
          <span>family<span className="brand-accent">hub</span></span>
        </a>
        <span className="eyebrow">EURE FAMILIE, GUT ORGANISIERT</span>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-intro">
          {mode === "sign-up"
            ? "Erstelle dein persönliches Konto. Ein Familienbereich wird später ergänzt."
            : mode === "reset"
              ? "Wir senden dir einen sicheren Link, wenn ein Konto zu deiner Adresse gehört."
              : mode === "recovery"
                ? "Wähle ein neues, sicheres Passwort für dein Konto."
                : "Melde dich an, um deinen geschützten FamilyHub-Bereich zu öffnen."}
        </p>

        {auth.status === "loading" && (
          <LoadingState label="Sitzung wird sicher wiederhergestellt" />
        )}
        {auth.configurationMessage && (
          <ErrorState
            title="Backend noch nicht verbunden"
            description={auth.configurationMessage}
          />
        )}
        {auth.error && <ErrorState description={auth.error} />}
        {error && <ErrorState description={error} />}
        {notice && <p className="auth-notice" role="status">{notice}</p>}

        {recoveryLinkUnavailable ? (
          <div className="auth-link-expired" role="status">
            <h2>Der Passwort-Link ist nicht mehr gültig</h2>
            <p>Fordere einen neuen Link an und öffne ihn auf diesem Gerät.</p>
            <button className="text-button" type="button" onClick={() => changeMode("reset")}>
              Neuen Link anfordern
            </button>
          </div>
        ) : mode === "confirm" ? (
          <div className="auth-link-expired" role="status">
            <h2>E-Mail bestätigen</h2>
            <p>{notice ?? "Öffne den Bestätigungslink aus deiner E-Mail, um die Anmeldung abzuschließen."}</p>
            <button className="text-button" type="button" onClick={() => changeMode("sign-in")}>
              Zur Anmeldung
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={(event) => void submit(event)}>
            {mode === "sign-up" && (
              <label>
                Anzeigename
                <input
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  minLength={1}
                  maxLength={80}
                  required
                />
              </label>
            )}
            {mode !== "recovery" && (
              <label>
                E-Mail-Adresse
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </label>
            )}
            {mode !== "reset" && (
              <label>
                {mode === "recovery" ? "Neues Passwort" : "Passwort"}
                <input
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "sign-in"
                      ? "current-password"
                      : mode === "sign-up"
                        ? "new-password"
                        : "new-password"
                  }
                  minLength={mode === "sign-in" ? 1 : 12}
                  maxLength={128}
                  required
                />
              </label>
            )}
            {(mode === "sign-up" || mode === "recovery") && (
              <label>
                Passwort wiederholen
                <input
                  name="passwordConfirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                />
              </label>
            )}
            <button
              className="primary-button"
              type="submit"
              disabled={pending || !auth.configured || auth.status === "loading"}
            >
              {pending
                ? "Einen Moment …"
                : mode === "sign-in"
                  ? "Anmelden"
                  : mode === "sign-up"
                    ? "Konto erstellen"
                    : mode === "reset"
                      ? "Link anfordern"
                      : "Passwort speichern"}
            </button>
          </form>
        )}

        <div className="auth-mode-actions">
          {mode === "sign-in" && (
            <>
              <button className="text-button" type="button" onClick={() => changeMode("reset")}>
                Passwort vergessen?
              </button>
              <p>Noch kein Konto?{" "}
                <button className="text-button" type="button" onClick={() => changeMode("sign-up")}>
                  Registrieren
                </button>
              </p>
            </>
          )}
          {(mode === "sign-up" || mode === "reset" || mode === "confirm") && (
            <p>Schon registriert?{" "}
              <button className="text-button" type="button" onClick={() => changeMode("sign-in")}>
                Zur Anmeldung
              </button>
            </p>
          )}
          {mode === "recovery" && !recoveryLinkUnavailable && (
            <button className="text-button" type="button" onClick={() => changeMode("sign-in")}>
              Abbrechen
            </button>
          )}
        </div>
        <p className="auth-security-note">
          Passwörter werden ausschließlich von Supabase Auth verarbeitet und nicht in FamilyHub-Profilen gespeichert.
        </p>
      </section>
    </main>
  );
}
