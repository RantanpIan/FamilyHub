export type AuthCallbackFlow = "email-confirmation" | "password-recovery";

export function createAuthCallbackUrl(
  origin: string,
  flow: AuthCallbackFlow,
): string | null {
  try {
    const parsedOrigin = new URL(origin);
    const isLoopback =
      parsedOrigin.hostname === "localhost" ||
      parsedOrigin.hostname === "127.0.0.1" ||
      parsedOrigin.hostname === "[::1]";
    const isSecureOrigin = parsedOrigin.protocol === "https:";
    const isLocalDevelopmentOrigin =
      parsedOrigin.protocol === "http:" && isLoopback;

    if (
      parsedOrigin.origin !== origin ||
      (!isSecureOrigin && !isLocalDevelopmentOrigin)
    ) {
      return null;
    }

    const callback = new URL("/auth", parsedOrigin.origin);
    callback.searchParams.set("flow", flow);
    return callback.toString();
  } catch {
    return null;
  }
}

export function getSafeAuthErrorMessage(error: unknown): string {
  const rawMessage =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "";
  const message = rawMessage.toLowerCase();

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return "E-Mail-Adresse oder Passwort ist nicht korrekt.";
  }
  if (message.includes("password should be at least")) {
    return "Das Passwort erfüllt die Sicherheitsanforderungen nicht.";
  }
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Zu viele Versuche. Bitte warte kurz und versuche es erneut.";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "Der Authentifizierungsdienst ist gerade nicht erreichbar.";
  }

  return "Die Anfrage konnte nicht abgeschlossen werden. Bitte prüfe deine Eingaben und versuche es erneut.";
}

export function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    const message = error.message.toLowerCase();
    if (message.includes("network") || message.includes("fetch")) {
      return "Der Authentifizierungsdienst ist gerade nicht erreichbar.";
    }
    if (
      "name" in error &&
      typeof error.name === "string" &&
      (error.name.startsWith("Auth") || error.name === "PostgrestError")
    ) {
      return getSafeAuthErrorMessage(error);
    }
  }

  return "Die Anfrage konnte nicht abgeschlossen werden. Bitte versuche es erneut.";
}

export function getCallbackFlow(search: string): AuthCallbackFlow | null {
  const flow = new URLSearchParams(search).get("flow");
  if (flow === "email-confirmation" || flow === "password-recovery") {
    return flow;
  }
  return null;
}
