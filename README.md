# FamilyHub

FamilyHub ist eine geschützte Familienorganisations-App. Die Foundation
enthält Supabase Auth, private Benutzerprofile, Familienverwaltung, sichere
Familieneinladungen und einen
gemeinsamen RLS-geschützten Berechtigungskern. Kalender, Aufgaben, Schule und
Benachrichtigungen bleiben sichtbar als noch nicht verfügbar markiert.

## Voraussetzungen

- Node.js `>=24.13 <25`
- npm `>=11`

Die getestete Ausgangsumgebung für diese Foundation ist Node `24.13.0` und
npm `11.6.2`. `package-lock.json` fixiert die aufgelösten Abhängigkeiten.

## Installation und Start

```powershell
npm ci
Copy-Item .env.example .env
# .env mit der Supabase-Projekt-URL und dem öffentlichen Anon-/Publishable-Key ergänzen
npm run dev
```

Vite startet die Web-App unter `http://127.0.0.1:5173`. Authentifizierung ist
erst verfügbar, wenn `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` mit den
öffentlichen Projektwerten gesetzt sind. Der Browser verwendet ausschließlich
den öffentlichen Anon-/Publishable-Key; niemals einen Service-Role-Key in
`VITE_*`-Variablen eintragen. Supabase Auth muss im Dashboard die App-URL und
den festen Callback `/auth` in der Redirect-Allowlist führen. Für lokale Tests
ist `http://127.0.0.1:5173/auth` in `supabase/config.toml` vorbereitet.

## Prüfungen

```powershell
npm run typecheck
npm run lint
npm run test:unit
npx playwright install chromium
npm run test:e2e
npm test
npm run test:integration
npm run build
npm run build:client
```

Der Playwright-Smoke-Test startet Vite selbst. In CI wird Chromium mit
`npx playwright install --with-deps chromium` installiert. `npm test` führt
alle vorhandenen Unit- und Browser-E2E-Tests aus. PostgreSQL-/RLS-Integrationstests
werden separat gegen eine lokale, wegwerfbare Supabase-Instanz ausgeführt;
Voraussetzungen stehen in [`tests/integration/README.md`](./tests/integration/README.md).
Die Familien-E2E-Fälle benötigen lokale `SUPABASE_E2E_*`-Werte und
`VITE_SUPABASE_*`; ohne diese Konfiguration werden sie explizit als blockiert
übersprungen, nicht als bestanden gezählt. GitHub Actions richtet eine
wegwerfbare Supabase-Instanz für RLS- und Browserprüfungen ein.
`npm run build` führt Typecheck, Lint, Unit-Tests und Produktionsbuild zusammen
aus. Die Anforderungszuordnung und nicht getesteten Fachfunktionen dokumentiert
[`docs/testing/requirements-coverage.md`](./docs/testing/requirements-coverage.md).
Die PostgreSQL/RLS-Tests benötigen eine lokale, wegwerfbare Supabase-Instanz
und `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY` sowie
`SUPABASE_TEST_SERVICE_ROLE_KEY`. Der Service-Role-Key wird ausschließlich vom
Testprozess zum Erzeugen/Löschen synthetischer Auth-Nutzer verwendet und nie
für die geprüften Profilzugriffe. GitHub Actions startet dafür eine separate
lokale Supabase-Instanz.

## Workspace

```text
apps/client                 React-/Vite-Anwendung mit Supabase Auth
packages/ui                 Designsystem und wiederverwendbare UI-Zustände
packages/contracts          gemeinsame Zod-Schemas und TypeScript-Verträge
packages/authorization      typisierte fail-closed Beispiel-Policy
packages/calendar-domain   Kalender-Fachmodul (noch nicht verfügbar)
packages/school-domain     Schul-Fachmodul (noch nicht verfügbar)
packages/notifications-domain Benachrichtigungs-Fachmodul (noch nicht verfügbar)
supabase/migrations         versionierte Profil-, Familien-, Einladungs- und Ressourcen-RLS-Migrationen
supabase/functions          vorbereitet; keine Produktivfunktionen
tests                       Unit-, PostgreSQL/RLS-Integration und Playwright-E2E-Tests
docs                        Architektur, Anforderungen und ADRs
```

## Technologieüberblick

Die verwendeten stabilen Versionen stehen in `package.json`; das Lockfile hält
den vollständigen reproduzierbaren Dependency-Baum fest. Wesentliche
Foundation-Versionen: React/React DOM 19.3.1, Vite 8.3.5,
TypeScript 6.0.3, Vitest 5.0.5, Playwright 1.64.1, Zod 4.6.7,
ESLint 10.13.0, Capacitor 8.5.3 und `@supabase/supabase-js` 2.118.0.
Die Node-Engine-Einschränkungen der verwendeten Testwerkzeuge sind im
Root-Paket dokumentiert.

## Datenschutz und Architektur

Supabase Auth ist die führende Quelle für Identität und Sitzung. Der Client
stellt die Sitzung über den PKCE-Flow wieder her und erneuert sie automatisch;
geschützte App-Inhalte werden ohne aktive Sitzung nicht gerendert. Die Migration
`supabase/migrations/20261022220000_create_user_profiles.sql` erstellt ein
eigenes Profil je Auth-Konto und erlaubt über RLS nur Lesen/Anlegen des eigenen
Profils sowie das Ändern des Anzeigenamens. Die `user_id`-Spalte ist nicht
update-berechtigt.

Das Profil wird nach bestätigter Anmeldung idempotent angelegt, nicht durch
einen `auth.users`-Trigger. Fehlschläge blockieren damit nicht stillschweigend
Registrierung/E-Mail-Bestätigung und werden in der UI sichtbar. Ein angemeldetes
Konto ohne Familienzuordnung erhält einen definierten Leerzustand. Familien
sind vollständig voneinander isoliert; RLS und serverseitige Autorisierung
bleiben für alle fachlichen Daten maßgeblich. Ein Familienadministrator erhält
keine Sonderrechte auf private Inhalte.

E-Mail- und Recovery-Redirects verwenden ausschließlich feste Ziele auf dem
aktuellen HTTPS-Origin (lokales HTTP ist nur auf Loopback zugelassen). Es gibt
keinen frei wählbaren `next`-Redirect. JWTs sind signierte Momentaufnahmen und
bleiben bis zum Ablauf grundsätzlich gültig; kritische serverseitige Vorgänge
müssen Identität, aktuellen Mitgliedschaftsstatus und Berechtigungen erneut
prüfen. Profil- und App-RLS erzwingen aktuelle Datenzugriffe.

Familienmitglieder ohne Login werden als getrennte, verwaltete Profile geführt.
Die Migration
`supabase/migrations/20261023094000_create_resource_access_model.sql`
ergänzt ein Inhalts-freies Ressourcenregister und familiengebundene
Lesefreigaben. Ressourcen gehören einem fachlichen Familienmitglied; ein
Konto kann nur als Eigentümer handeln, wenn seine aktuelle aktive
Mitgliedschaft genau diesem Profil zugeordnet ist. Neue Ressourcen sind
technisch standardmäßig privat. Familienweite Lesbarkeit und explizite
Lesefreigaben verleihen keine Schreibrechte; Freigaben können nur Eigentümer
erteilen oder widerrufen. Sichtbarkeitsänderungen prüfen `expectedVersion`.
Verwaltete Profile erhalten durch bekannte IDs keine Login-Rechte. Die
vollständige Rollenmatrix, Eltern-/Kindervertretung und die Produktvorgabe für
Standard-Sichtbarkeit bleiben offen. Der wiederverwendbare Client-Zugang zu
diesem Modell liegt in `apps/client/src/access`; die Datenbank-RLS bleibt die
maßgebliche Sicherheitsgrenze.

Familienadministratoren können ein vorhandenes Erwachsenenprofil per
Einladungslink mit einem eigenen Konto verknüpfen. PostgreSQL erzeugt dafür
einen einmaligen 256-Bit-Code und speichert nur dessen SHA-256-Hash; der Link
läuft nach sieben Tagen ab. Zur Annahme sind eine Anmeldung, eine bestätigte
und übereinstimmende Konto-E-Mail-Adresse sowie eine ausdrückliche Bestätigung
nötig. Der Link wird manuell kopiert; automatischer E-Mail-Versand ist nicht
enthalten. Mitgliedschaftsänderungen laufen über autorisierte RPCs.
Deaktivierung löscht weder Familienmitglied noch Ressourcen und kann die letzte
aktive Administrator-Mitgliedschaft nicht entfernen. Rollenänderungen,
Kinderkonto-Aktivierung und Eltern-/Kindervertretung bleiben wegen der offenen
Rollenmatrix gesperrt. Einladungs-Tokens werden nicht protokolliert.

Push-Empfänger werden später über Mitglieds-IDs adressiert, mit einer
expliziten Option „Alle“.
Diese Grenzen und die Modul-Abhängigkeitsrichtung sind in
[`docs/architecture/overview.md`](./docs/architecture/overview.md),
[`docs/architecture/modules.md`](./docs/architecture/modules.md) und
[`docs/adr/0001-monorepo-boundaries.md`](./docs/adr/0001-monorepo-boundaries.md)
dokumentiert.

Tests verwenden ausschließlich synthetische Identitäten und UUIDs. `.env` wird
ignoriert und `.env.example` enthält nur leere Platzhalter. Auth-/Profil-,
Familien-, Einladungs- und Ressourcen-RLS-Integrationstests laufen gegen eine lokale, wegwerfbare
Supabase-Instanz; für ein reales Projekt muss die Auth-Redirect-Allowlist
zusätzlich konfiguriert werden. Rollenwechsel, Kinderkonto-Aktivierung und
Fachressourcen, Push-Zustellung sowie Hosting-Konfiguration sind nicht
implementiert.

## FH-CX-006: Einladungen und Mitgliedschaften

Einladungen für bestehende aktive Erwachsenenprofile verwenden zufällige,
gehashte, sieben Tage gültige Tokens und erfordern die ausdrückliche Annahme
durch ein authentifiziertes Konto mit bestätigter, passender E-Mail-Adresse.
Mitgliedschaften können sicher widerrufen/deaktiviert werden; direkte
Tabellenänderungen bleiben gesperrt. Die lokale Abnahme umfasst PostgreSQL-RLS-,
Playwright-, Unit-, Typecheck-, Lint- und Produktionsbuild-Prüfungen. Ein
GitHub-Actions-Lauf ist nicht bestätigt. Rollenwechsel,
Kinderkonto-Aktivierung, fachliche Inhalte und automatische
E-Mail-Zustellung bleiben Folgeaufträgen vorbehalten.
