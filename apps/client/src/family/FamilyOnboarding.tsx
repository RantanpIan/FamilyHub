import { useRef, useState, type FormEvent } from "react";
import { CreateFamilyInputSchema } from "@familyhub/contracts";
import { ErrorState } from "@familyhub/ui";
import { getErrorMessage } from "../auth/auth-utils";
import { useFamily } from "./useFamily";

export function FamilyOnboarding() {
  const { createFamily } = useFamily();
  const requestId = useRef(crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = CreateFamilyInputSchema.safeParse({
      name: form.get("familyName"),
      requestId: requestId.current,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Bitte prüfe den Familiennamen.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await createFamily(parsed.data.name, parsed.data.requestId);
      requestId.current = crypto.randomUUID();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card family-onboarding" aria-labelledby="family-onboarding-title">
        <span className="eyebrow">DEIN FAMILYHUB-BEREICH</span>
        <h1 id="family-onboarding-title">Erstelle eure Familie</h1>
        <p className="auth-intro">
          Du wirst als Administrator hinzugefügt. Weitere Mitglieder kannst du anschließend
          als Erwachsene oder Kinderprofile anlegen.
        </p>
        {error && <ErrorState description={error} />}
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label>
            Familienname
            <input
              name="familyName"
              type="text"
              autoComplete="organization"
              minLength={1}
              maxLength={80}
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? "Familie wird erstellt …" : "Familie erstellen"}
          </button>
        </form>
      </section>
    </main>
  );
}
