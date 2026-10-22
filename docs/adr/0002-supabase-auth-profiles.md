# ADR 0002: Supabase Auth und private Benutzerprofile

- Status: angenommen
- Datum: 2026-10-22
- Auftrag: FH-CX-003

## Kontext

Die App braucht E-Mail-/Passwort-Anmeldung und ein eigenes persönliches Profil
pro Auth-Konto. Registrierungen können E-Mail-Bestätigung voraussetzen. Ein
Fehler beim Profil darf die Auth-Registrierung nicht unbemerkt blockieren.

## Entscheidung

- Supabase Auth ist die führende Identitäts- und Sitzungsquelle. Der Webclient
  verwendet den offiziellen Supabase-JavaScript-Client mit PKCE, Sitzungsspeicher,
  Callback-Erkennung und automatischer Aktualisierung.
- Redirects werden aus dem aktuellen sicheren Origin und festen Callback-Pfaden
  gebaut. Benutzersteuerbare Rücksprungziele gibt es nicht.
- `user_profiles` hat `auth.users.id` als Primär-/Fremdschlüssel und aktiviert
  RLS. Nutzer dürfen nur das eigene Profil lesen/anlegen und `display_name`
  ändern; `user_id` erhält kein Update-Privileg.
- Profilerstellung erfolgt nach einer bestätigten Sitzung durch einen
  idempotenten Clientpfad. Es wird kein `auth.users`-Trigger verwendet, der einen
  fehlgeschlagenen Profil-Write in einen Signup-Fehler umwandeln könnte.
- Auth-Metadaten dürfen einen Anzeigenamen initialisieren, aber keine Rollen
  oder Berechtigungen festlegen.
- Kein Familien- oder Fachschema wird in diesem Auftrag angelegt.

## Folgen

- Auth-Sitzung und Profile sind nach E-Mail-Bestätigung wiederherstellbar; ein
  fehlendes Profil kann sicher nachträglich angelegt werden.
- Anwendungszugriffe brauchen weiterhin PostgreSQL-RLS und serverseitige
  Prüfung. Ein Client-Session-Objekt begründet kein Vertrauen für andere Daten.
- JWTs bleiben bis zum Ablauf signierte Snapshots. Widerrufe und aktuelle
  Mitgliedschaft müssen für kritische Serveroperationen erneut geprüft werden.
- Redirect-Origins müssen pro Supabase-Projekt explizit in der Auth-Allowlist
  konfiguriert sein.
- Profil-RLS wird gegen eine lokale PostgreSQL/Supabase-Instanz mit zwei
  synthetischen Auth-Identitäten getestet; ein In-Memory-Mock ist kein Ersatz.
- Die spätere Capacitor-Integration braucht eine separate, geprüfte
  Plattform-Speicher-/Callback-Konfiguration und wird hier nicht vorweggenommen.
