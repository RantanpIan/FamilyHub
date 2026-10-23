# Test- und Anforderungszuordnung

## Testebenen und Befehle

| Ebene | Ort/Konfiguration | Befehl | Stand |
| --- | --- | --- | --- |
| Unit | `tests/unit`, `vitest.config.ts` | `npm run test:unit` | Implementiert; reine Verträge, Beispiel-Policy und UI-Zustände |
| Integration / PostgreSQL-RLS | `tests/integration`, `vitest.integration.config.ts` | `npm run test:integration` | FH-CX-003 Auth-/Profil- und FH-CX-004 Familien-RLS-Tests; echte lokale Supabase-Instanz und synthetische Test-Keys erforderlich |
| Browser-E2E | `tests/e2e`, `playwright.config.ts` | `npm run test:e2e` | Chromium-Smoke-Test sowie authentifizierte Familien-Onboarding- und Mitgliederflüsse; Familienfälle benötigen lokale Supabase-Werte |
| Gesamter vorhandener Testlauf | Root-Skripte | `npm test` | Unit-Tests plus Browser-E2E; enthält keine Integrationstests |

Vitest sammelt nur `tests/unit/**/*.test.{ts,tsx}`. Playwright sammelt nur
`tests/e2e`. Damit werden Integrations- und Browserprüfungen nicht versehentlich
als Unit-Tests ausgeführt. Die GitHub-Actions-Workflow-Datei führt Typecheck, Lint, Unit-Tests,
Produktionsbuild, Chromium-E2E und PostgreSQL-/RLS-Integration gegen
wegwerfbare lokale Supabase-Instanzen aus.

## Synthetische Test-Fixtures

`tests/fixtures/families.ts` enthält deterministische UUIDs und ausschließlich
fiktive Bezeichnungen:

- Familie A: Administrator, erwachsenes Mitglied, Kind mit Login und
  verwaltetes Kinderprofil ohne Login.
- Familie B: Administrator und erwachsenes Mitglied.
- Aktive, ausstehende und widerrufene Mitgliedschaften.
- Eigene/private und familienweit sichtbare Ressourcen sowie aktive und
  widerrufene ressourcenbezogene Lesefreigaben.

Es werden keine echten Namen, realen Konten, Tokens oder produktiven Daten
verwendet. `makeAccessRequest` leitet Mitgliedschaften deterministisch ab.

## Nachweisbare Anforderungsabdeckung

Die Konzepte in diesem Repository enthalten `AC-FAM-*`, `AC-KAL-*` und
`AC-PUSH-*`, aber keine `SEC-*`- oder `PUSH-T*`-Kennungen. Deshalb werden keine
solchen IDs erfunden. Policy-Tests sind ausdrücklich reine In-Memory-Tests und
kein Beleg für Datenbank-, API-, Storage- oder RLS-Durchsetzung.

| Anforderungs-ID | Abdeckung | Testnachweis / Grenze |
| --- | --- | --- |
| AC-FAM-01 | Teilweise geprüft | `tests/unit/authorization.test.ts`: Eigentümer, explizite Lesefreigabe, Widerruf, private Inhalte, aktive/nicht aktive Mitgliedschaft, verwaltetes Profil und Schreibverweigerung. Reine Beispiel-Policy; keine Rollenmatrix oder serverseitige Durchsetzung. |
| AC-FAM-02 | Teilweise geprüft | `tests/unit/authorization.test.ts`: Familie-A-Mitglied gegen Familie-B-Ressource und ungültige Ressourcen-/Familien-IDs. Kein direkter DB-/API-Aufruf, keine Metadaten- oder Existenzseitenkanäle. |
| AC-FAM-03 | Teilweise geprüft | `tests/unit/authorization.test.ts`: private Ressource ist nicht für Administrator oder unberechtigte Familienmitglieder lesbar. Listen, Suche, Push, Export, Projektionen und Aggregationen sind nicht implementiert/getestet. |
| AC-FAM-04 | Nicht geprüft | Rollen-/Mitgliedschaftswechsel und veraltete Clientdaten erfordern spätere serverseitige Integrationstests. |
| AC-PUSH-01 | Nicht geprüft | Empfängervertrag wird validiert; es gibt keine Empfänger-UI. |
| AC-PUSH-02 | Nicht geprüft | Der Vertrag stellt Varianten `all` und `selected_members` bereit, aber familienbezogene Empfängerauflösung oder Versand sind nicht implementiert. |
| AC-KAL-01–07 | Nicht geprüft | Kalenderfunktionen und Persistenz sind nicht implementiert. |
| AC-SCH-01–06 | Nicht geprüft | Stundenplan und Unterrichtsprojektionen sind nicht implementiert. |
| AC-PUSH-03–05 | Nicht geprüft | Zustellung, Berechtigungsprüfung im Versand und Deduplizierung sind nicht implementiert. |

## Einzelne Vertragsprüfungen

`tests/unit/contracts.test.ts` prüft gültige und ungültige Familien-, Mitglieds-
und User-UUIDs, `all`, `selected_members`, fehlende/leere/ungültige Empfänger,
unbekannte Varianten und doppelte Mitglieds-IDs. Das ist Vertragsvalidierung,
keine Push-Funktion.

Der bestehende Discriminator `selected` wich von der im FH-CX-002-Auftrag
vorgegebenen Variante `selected_members` ab und wurde entsprechend angeglichen.
Die Variantenobjekte lehnen außerdem unbekannte Felder ab, damit fehlerhafte
Empfängerstrukturen nicht stillschweigend als gültige Auswahl durchgehen.

## Spätere RLS-Tests

Vor RLS-Tests müssen Supabase CLI/Docker, isolierte Testdatenbank, Migrationen
und ein reproduzierbarer synthetischer Seed bereitstehen. Tests sollen Policies
unter normalen synthetischen Auth-Identitäten prüfen, einschließlich direkter
Ressourcenabfragen mit IDs anderer Familien. Die Service Role darf keine
Benutzerberechtigung simulieren. Details und noch fehlende Infrastruktur:
[`tests/integration/README.md`](../../tests/integration/README.md).

## FH-CX-003 – Authentifizierung und Profil

| ID | Abdeckung | Testnachweis / Grenze |
| --- | --- | --- |
| AUTH-T01 | Teilweise geprüft | `tests/integration/auth-profile.rls.test.ts` ruft Supabase Auth `signUp` auf und prüft den ausstehenden Bestätigungszustand. Der Test ist lokal ohne Supabase-Umgebung blockiert. |
| AUTH-T02 | Teilweise geprüft | Supabase verlangt in der lokalen Konfiguration Bestätigung; der Integrationstest bestätigt den synthetischen Nutzer über die Test-Admin-API, nicht durch Öffnen des E-Mail-Links im Browser. Versandzustellung/Link-Klick ist nicht lokal nachgewiesen. |
| AUTH-T03 | Geprüft | Gültige Anmeldung wird gegen Supabase Auth in CI ausgeführt. |
| AUTH-T04 | Geprüft | Falsches Passwort wird über Supabase Auth abgelehnt; UI-Fehler wird ohne rohe Auth-Antwort angezeigt. |
| AUTH-T05 | Teilweise geprüft | SDK ist mit persistenter PKCE-Sitzung konfiguriert; kein echter Browser-Neulade-Test mit Supabase-Projektkonfiguration ausgeführt. |
| AUTH-T06 | Geprüft | Lokales `signOut` und leere Sitzung werden im Supabase-Integrationstest geprüft. |
| AUTH-T07 | Geprüft | `tests/e2e/smoke.spec.ts` ruft `/app` ohne Sitzung auf und bestätigt Weiterleitung zur Anmeldung ohne gerenderten geschützten App-Inhalt. |
| AUTH-T08 | Teilweise geprüft | Reset-Anfrage und Recovery-Update sind implementiert; E-Mail-Versand und Recovery-Link-Klick sind mangels Supabase-/SMTP-Umgebung nicht ausgeführt. |
| AUTH-T09 | Geprüft | Profil-Update des eigenen Anzeigenamens besteht in der echten RLS-Testinstanz in CI. |
| AUTH-T10 | Geprüft | Zwei echte synthetische Auth-Identitäten lesen gegen dieselbe PostgreSQL-RLS-Grenze; fremde Zeile bleibt unsichtbar. |
| AUTH-T11 | Geprüft | Fremdes Profil-Update bleibt unsichtbar; zusätzlich wird `user_id`-Update direkt an PostgREST abgewiesen. |
| AUTH-T12 | Geprüft | Zweites Profil mit identischer Auth-UUID wird durch den Primärschlüssel abgewiesen. |
| AUTH-T13 | Teilweise geprüft | Unit-Tests prüfen feste same-origin Callback-URLs und lehnen Nicht-HTTPS-/manipulierte Origin-Strings ab. Projekt-Allowlist ist zusätzlich extern zu konfigurieren. |
| AUTH-T14 | UI implementiert; E2E-Test vorhanden, lokale Ausführung blockiert | Authentifizierter Familien-Onboarding-Test prüft den definierten Zustand ohne Familienzuordnung (`tests/e2e/family-management.spec.ts`); lokal mangels Supabase-Konfiguration übersprungen, FH-CX-004-CI-Nachweis steht aus. |
| AUTH-T15 | Teilweise geprüft | 36 Unit-Tests und ein lokaler Playwright-Smoke-Test bestanden; zwei Familien-E2E-Tests waren lokal mangels Supabase-Konfiguration übersprungen. Die dokumentierten GitHub-Actions-Ergebnisse beziehen sich auf FH-CX-003 und enthalten sieben Supabase-Integrationstests. |

Die lokale Ausführung von `npm run test:integration` ist in der
Entwicklungsumgebung mangels Supabase CLI und `SUPABASE_TEST_*`-Variablen
blockiert. Der GitHub-Actions-Job startet jedoch eine isolierte Supabase-Instanz;
die sieben Integrationstests auf Commit `fadb4fd` waren erfolgreich:
[CI-Lauf #3](https://github.com/RantanpIan/FamilyHub/actions/runs/39844689536).
E-Mail-Zustellung/Link-Klick, Browser-Sitzungswiederherstellung und ein realer
Projekt-Redirect bleiben separat und teilweise ungeprüft.

## FH-CX-004 – Familien und Mitglieder

Die Familien-RLS-Prüfungen verwenden getrennte synthetische Auth-Identitäten
gegen PostgREST und PostgreSQL-RLS. Der Familienkontext im Browser ist kein
Autorisierungsnachweis. Die unten genannten RLS- und Browserfälle sind im Code
implementiert, aber im aktuellen lokalen Lauf nicht als bestanden nachgewiesen:
Die Supabase CLI ist nicht installiert, der Docker-Daemon nicht verfügbar und
die benötigten lokalen Testvariablen fehlen. GitHub Actions ist für die
Ausführung gegen eine frische lokale Supabase-Instanz konfiguriert; für
FH-CX-004 liegt noch kein CI-Laufnachweis vor.

| Test-ID | Abdeckung | Testnachweis / Grenze |
| --- | --- | --- |
| FAM-T01 | Implementiert; lokal blockiert | `tests/integration/family-management.rls.test.ts`: authentifizierte Anlage von Familie und Erstmitgliedschaft. |
| FAM-T02 | Implementiert; lokal blockiert | Derselbe RLS-Test prüft die initiale `family_admin`-Rolle und die atomare Erstanlage. |
| FAM-T03 | Implementiert; lokal blockiert | Familienanlage ohne Auth-Identität wird abgewiesen. |
| FAM-T04 | Implementiert; lokal blockiert | Wiederholter Request-Schlüssel liefert dieselbe Familie zurück. |
| FAM-T05 | Implementiert; lokal blockiert | Fehler nach Beginn der Anlage hinterlässt keine Teilfamilie. |
| FAM-T06 | Implementiert; E2E lokal blockiert | `tests/e2e/family-management.spec.ts`: angemeldeter Nutzer kann sein erstes Familien-Onboarding abschließen. |
| FAM-T07 | Implementiert; lokal blockiert | Verwaltetes Kinderprofil ohne Auth-Konto wird angelegt und in der Familienliste ausgegeben; zusätzlich Browserfall. |
| FAM-T08 | Implementiert; lokal blockiert | Administrator ändert den Anzeigenamen eines verwalteten Profils; zusätzlich Browserfall. |
| FAM-T09 | Implementiert; lokal blockiert | Normales Mitglied kann ein fremdes Familienprofil nicht ändern. |
| FAM-T10 | Implementiert; lokal blockiert | Nichtmitglied kann keine Mitglieder einer fremden Familie auflisten. |
| FAM-T11 | Implementiert; lokal blockiert | Ungültige/fremde Familien-ID ergibt keine offengelegten Mitgliederdaten. |
| FAM-T12 | Implementiert; lokal blockiert | Direkte Clientanlage von Auth-Mitgliedschaften ist untersagt. |
| FAM-T13 | Implementiert; lokal blockiert | Direkte Rolleneskalation ist untersagt. |
| FAM-T14 | Implementiert; lokal blockiert | Doppelte aktive Konto-Mitgliedschaft in derselben Familie wird durch Datenbank-Constraint verhindert. |
| FAM-T15 | Implementiert; lokal blockiert | Verwaltetes Kinderprofil bleibt ohne Login; geprüft im RLS-Test und Browserfluss. |
| FAM-T16 | Implementiert; lokal blockiert | Dasselbe Auth-Konto kann in zwei Familien mit familienbezogenen Rollen aktiv sein. |
| FAM-T17 | Implementiert; lokal blockiert | Gleichnamige Familien behalten voneinander getrennte Mitgliederlisten. |
| FAM-T18 | Implementiert; lokal blockiert | Zugriff mit fremdem Familienkontext wird durch den Mitglieder-RPC abgewiesen. |
| FAM-T19 | Implementiert; lokal blockiert | `family_id` eines Mitglieds ist über REST nicht änderbar. |
| FAM-T20 | Nicht implementiert/geprüft | Kein zusätzlicher Testfall mit dieser ID ist derzeit vorhanden. |

`npm run test:integration` enthält aktuell 13 FH-CX-004-Testfälle und muss
gegen die lokale Supabase-Instanz ausgeführt werden. Der Playwright-Lauf enthält
einen allgemeinen Smoke-Test sowie zwei authentifizierte Familienfälle. In der
lokalen Umgebung wurde der Smoke-Test bestanden und die beiden Familienfälle
wegen fehlender Supabase-Werte übersprungen. Diese übersprungenen Fälle gelten
nicht als bestanden.

Kalender-, Aufgaben-, Einladungs-, Rollenwechsel-, Stundenplan- und
Push-Funktionen sowie produktive fachliche RLS-Policies sind nicht Teil von
FH-CX-004 und bleiben ausdrücklich ungetestet.
