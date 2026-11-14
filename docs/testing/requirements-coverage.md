# Test- und Anforderungszuordnung

## Testebenen und Befehle

| Ebene | Ort/Konfiguration | Befehl | Stand |
| --- | --- | --- | --- |
| Unit | `tests/unit`, `vitest.config.ts` | `npm run test:unit` | Implementiert; reine Verträge, Beispiel-Policy und UI-Zustände |
| Integration / PostgreSQL-RLS | `tests/integration`, `vitest.integration.config.ts` | `npm run test:integration` | FH-CX-003 Auth-/Profil-, FH-CX-004 Familien- und FH-CX-005 Ressourcen-RLS-Tests; echte lokale Supabase-Instanz und synthetische Test-Keys erforderlich |
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
| AC-FAM-01 | Teilweise geprüft | `tests/unit/authorization.test.ts` und `tests/integration/resource-access.rls.test.ts`: Eigentümer, explizite Lesefreigabe, Widerruf, private Inhalte, aktive/nicht aktive Mitgliedschaft und Schreibverweigerung. Integrationstest ist implementiert, lokal mangels Supabase-Toolchain blockiert; keine vollständige Rollenmatrix. |
| AC-FAM-02 | Teilweise geprüft | Ressourcen-RLS-Test prüft bekannte IDs aus fremder Familie; Listen, Suche, Push, Export, Projektionen und Aggregationen sind nicht implementiert/getestet. |
| AC-FAM-03 | Teilweise geprüft | Unit- und RLS-Tests für private Ressourcen, Administrator ohne Sonderzugriff und Wechsel zu `private`; indirekte Fachansichten sind nicht implementiert/getestet. |
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

Die fehlgeschlagene CI-Ausführung #5 wurde analysiert. FAM-T10/T11/T18 hatte
versehentlich `clientA` (Familie-A-Administrator) für den Negativtest
verwendet, obwohl das Fixture denselben Account im FAM-T16-Szenario zusätzlich
als aktives Mitglied von Familie B anlegt. Die RLS-Abfrage gab deshalb korrekt
die zwei Mitglieder von Familie B zurück. Der Negativtest verwendet nun das
separate, authentifizierte `adultA`-Konto, prüft dessen `auth.uid()` und
Mitgliedschaftsliste, bestätigt positiven Zugriff auf Familie A und prüft
anschließend Lesen, Einfügen, Ändern und Löschen fremder Mitglieder sowie
fremde/unbekannte IDs über denselben Nichtmitgliedskontext. Die privilegierte
Testrolle dient ausschließlich dem Fixture-Setup und der unabhängigen Prüfung,
dass die verweigerten Schreibversuche nichts verändert haben.

Playwright schlug unabhängig davon an zwei Testassertions fehl. Der
Familienname im ersten Test wurde mit `getByText` aus einem nicht aktiven
`<option>` eines Dropdowns ausgewählt und war deshalb verborgen; der Test
wechselt jetzt in „Mehr“ und prüft die sichtbare Familienüberschrift. Im
Mitglieder-Test blieb die Locator-Filterung auf dem alten Anzeigenamen, der
nach erfolgreichem Speichern ersetzt wird; der Locator verwendet nun den
stabilen Status „Verwaltetes Profil · kein Login“ und prüft danach den
aktualisierten Namen in der Profilzeile. Es wurde keine Policy gelockert und
keine Migration geändert.

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
Push-Funktionen sowie fachliche Ressourceninhalte sind nicht Teil von FH-CX-004
und bleiben ausdrücklich ungetestet.

## FH-CX-005 – Ressourcenberechtigungen und private Inhalte

`tests/integration/resource-access.rls.test.ts` enthält PostgreSQL-/PostgREST-
Grenztests mit echten synthetischen Auth-Identitäten. Service Role wird nur
für Testnutzer-/Profildaten, synthetische Mitgliedschaften und unabhängige
Integritätsprüfungen verwendet. Ressourcenoperationen und
Berechtigungsassertions laufen über normale Benutzerclients. Die Tests sind
implementiert, aber in der aktuellen Umgebung nicht ausgeführt: Docker-Daemon
ist nicht erreichbar, Supabase CLI fehlt und keine lokale Supabase-Instanz ist
verfügbar. Die neue Migration wurde nicht im Cloud-Projekt ausgeführt.

| Test-ID | Abdeckung | Testnachweis / Grenze |
| --- | --- | --- |
| ACL-T01 | Implementiert; RLS lokal blockiert | Verknüpfter Eigentümer liest sein privates Registerobjekt; `owns`, `can_update` und `can_delete` sind für ihn wahr. |
| ACL-T02 | Implementiert; RLS lokal blockiert | Anderes aktives Mitglied derselben Familie kann private Ressource nicht lesen. |
| ACL-T03 | Implementiert; RLS lokal blockiert | Familienadministrator erhält keinen Sonderzugriff auf private Ressource eines anderen Eigentümers. |
| ACL-T04 | Implementiert; RLS lokal blockiert | Aktives Mitglied kann familienweit sichtbare Ressource lesen. |
| ACL-T05 | Implementiert; RLS lokal blockiert | Konto ohne Zugehörigkeit zur Ressourcenfamilie erhält für bekannte ID keine Zeile und `can_read=false`. |
| ACL-T06 | Implementiert; RLS lokal blockiert | Eigentümer erteilt einer aktiven Person derselben Familie ein explizites Leserecht; Empfänger sieht keine Grant-Metadaten. |
| ACL-T07 | Implementiert; RLS lokal blockiert | Nach Widerruf ist der nächste Ressourcenabruf des Empfängers leer. |
| ACL-T08 | Implementiert; RLS lokal blockiert | Grant an Familienmitglied einer anderen Familie wird abgewiesen. |
| ACL-T09 | Implementiert; RLS lokal blockiert | Nicht-Eigentümer kann nicht ändern/löschen; privilegierte Verifikation bestätigt unveränderte Inhalte. |
| ACL-T10 | Implementiert; RLS lokal blockiert | Client kann Familie/Eigentümer/Grant-Empfänger nicht manipulieren; service-role Fixture-Checks prüfen zusammengesetzte FK-Grenzen. |
| ACL-T11 | Implementiert; RLS lokal blockiert | Widerrufene Kontomitgliedschaft und inaktives Mitglied entziehen den nächsten Zugriff. |
| ACL-T12 | Implementiert; RLS lokal blockiert | Anonyme Anfragen erhalten weder Ressourcenzeilen noch Funktionszugriff. |
| ACL-T13 | Implementiert; RLS lokal blockiert | Mehrfamilienkonto kann familienweite Ressource seiner zweiten Familie sehen, nicht aber private Ressourcen fremder Eigentümer. |
| ACL-T14 | Implementiert; RLS lokal blockiert | Eigentümer setzt gemeinsame Ressource mit erwarteter Version privat; andere verlieren Zugriff, stale version wird abgewiesen. |
| ACL-T15 | Implementiert; RLS lokal blockiert | Grant auf verwaltete Member-ID gewährt ohne Auth-Verknüpfung keinen Zugriff; solches Profil kann nicht Ressourceneigentümer handeln. |
| ACL-T16 | Implementiert; RLS lokal blockiert | Gleichzeitige Grant-Aufrufe bleiben eindeutig; Widerruf/Regrant reaktiviert denselben Grant-Datensatz. |

Die Integrationstests belegen erst nach tatsächlicher Ausführung die
PostgreSQL-RLS-Grenze. Unit-Tests für `packages/authorization` prüfen nur die
reine Beispiel-Policy und ersetzen den RLS-Nachweis nicht. Der technische
Default `private` ist vorsorglich und ausdrücklich keine abschließende
Produktentscheidung. Die vollständige Rollenmatrix, Vertretungsrechte für
verwaltete Kinder und gemeinsam verantwortete Inhalte bleiben offen.

## FH-CX-006 – Einladungen und Mitgliedschaftslebenszyklus

Die Integrationstests stehen in
`tests/integration/family-invitations.rls.test.ts` und laufen mit normalen,
synthetischen Benutzer-Sitzungen gegen lokale PostgreSQL-RLS. Der zusätzliche
Playwright-Fluss steht in `tests/e2e/family-management.spec.ts`. Der zuletzt
ausgeführte lokale Lauf bestand aus 47 Integrationstests, 4 Playwright-Tests
einschließlich E-Mail-Bestätigung über Mailpit, 39 Unit-Tests sowie Typecheck,
Lint und Produktionsbuild.

| Test-ID | Abdeckung | Testnachweis / Grenze |
| --- | --- | --- |
| INV-T01 | Implementiert; lokale RLS-Ausführung erforderlich | Admin erzeugt einen 256-Bit-Token; Datenbank speichert nur Hash, Laufzeit ist auf sieben Tage begrenzt. |
| INV-T02 | Implementiert; lokale RLS-Ausführung erforderlich | Normales Mitglied darf keine Einladung erstellen. |
| INV-T03 | Implementiert; lokale RLS-Ausführung erforderlich | Admin einer Familie kann keine Einladung für eine fremde Familie erstellen oder verwalten. |
| INV-T04 | Implementiert; lokale RLS-Ausführung erforderlich | Widerruf verhindert Annahme. |
| INV-T05 | Implementiert; lokale RLS-Ausführung erforderlich | Abgelaufene Einladung wird abgelehnt. |
| INV-T06 | Geprüft | Lokaler Playwright- und RLS-Lauf bestätigt Annahme und Verknüpfung des vorbestehenden Erwachsenenprofils. |
| INV-T07 | Geprüft | Playwright registriert ein neues synthetisches Konto, öffnet den Bestätigungslink aus der lokalen Mailpit-API und nimmt anschließend die Einladung an. |
| INV-T08 | Implementiert; lokale RLS-Ausführung erforderlich | Abweichende bestätigte E-Mail wird bei Vorschau und Annahme abgelehnt. |
| INV-T09 | Implementiert; lokale RLS-Ausführung erforderlich | Wiederholte Annahme desselben Tokens durch dasselbe Konto ist idempotent und erzeugt eine Mitgliedschaft. |
| INV-T10 | Implementiert; lokale RLS-Ausführung erforderlich | Zwei gleichzeitige Annahmeversuche ergeben eine aktive Verknüpfung und erfolgreiche idempotente Ergebnisse. |
| INV-T11 | Implementiert; lokale RLS-Ausführung erforderlich | Bereits mit einem anderen Konto verbundenes Familienmitglied wird nicht übernommen. |
| INV-T12 | Implementiert; lokale RLS-Ausführung erforderlich | Adminliste enthält Mitgliedschaften nur für die eigene Familie; Nicht-Admin-Aufruf wird verweigert. |
| INV-T13 | Implementiert; lokale RLS-Ausführung erforderlich | Direkte Rollenänderungen sind über Client-Tabellenrechte gesperrt; sichere Rollenänderungsregeln sind noch nicht freigegeben. |
| INV-T14 | Teilweise geprüft | Selbstbeförderung ist durch fehlende direkte Schreibrechte verhindert; separate positive/negative Rollenänderungs-RPCs sind mangels beschlossener Rollenmatrix nicht implementiert. |
| INV-T15 | Implementiert; lokale RLS-Ausführung erforderlich | Deaktivierte Mitgliedschaft verliert Ressourcenzugriff; Person und Ressource bleiben bestehen. |
| INV-T16 | Implementiert; lokale RLS-Ausführung erforderlich | Letzter aktiver Administrator kann nicht deaktiviert werden. |
| INV-T17 | Implementiert; lokale RLS-Ausführung erforderlich | Admin erhält durch Verwaltung keine Einsicht in die private Ressource des eingeladenen Mitglieds. |
| INV-T18 | Teilweise geprüft | Bestehende Family-RLS-Fixtures prüfen Mehrfamilienmitgliedschaften; Einladung eines bereits anderswo aktiven Kontos ist noch kein separater Nachweis. |
| INV-T19 | UI implementiert; E2E nicht ergänzt | Vorhandener Familienkontext kann ausgewählt werden; expliziter Invite-bezogener Wechseltest fehlt. |
| INV-T20 | Implementiert; lokale RLS-Ausführung erforderlich | Fremde Familien-IDs und fremde Membership-Verwaltungsaufrufe werden serverseitig verweigert. |
| INV-T21 | Teilweise geprüft | Deaktivierung ist familiengebunden; ein eigener Test, dass andere Memberships desselben Kontos unverändert bleiben, ist noch offen. |

Nicht enthalten sind SMTP-Zustellung, Rollenwechsel, Kinderkonto-Aktivierung
und Eltern-/Kindervertretung. Diese Grenzen sind beabsichtigt und in
`FH-OPEN-001` dokumentiert; ein UI-Button wäre kein Berechtigungsnachweis.


## FH-CX-008 – Kalender-Datenmodell (inkrementeller Schritt)

**Status:** Auf `feature/fh-cx-008-calendar-foundation` implementiert;
CI und lokale PostgreSQL-Integration müssen noch verifiziert werden.
Die Tests verwenden ausschließlich die lokale, wegwerfbare Testdatenbank.

| Test-ID | Szenario | Erwartung |
| --- | --- | --- |
| CAL-DB-T01 | Ressourceneigentümer liest privaten Termin; fremde Familie fragt Termine ab | Nur eigener Termin sichtbar, fremde Familie sieht nichts |
| CAL-DB-T02 | Zweites Familienmitglied liest privaten und familienweit freigegebenen Termin | Privater Titel verborgen, freigegebener Termin sichtbar |
| CAL-DB-T03 | Angemeldeter Client schreibt direkt, anonymer Client liest | Verweigert |
| CAL-DB-T04 | Umgekehrte Uhrzeitfolge oder gemischte Datumsdarstellungen | SQL-Constraint verweigert |
| CAL-DB-T05 | Ganztägiger Termin mit exklusivem Enddatum | Konsistent lesbar |
| CAL-DB-T06 | Referenz über fremde Familie oder falschen Ressourcenfachtyp | Fremdschlüssel verweigert |
| CAL-DB-T07 | Eigentümer ändert familienweite Sichtbarkeit auf privat | Vorheriger Mitleser sieht keinen Termininhalt mehr |

**Nicht abgedeckt:** AC-KAL-01 (Benutzeranlage/Änderung eines Termins),
AC-KAL-04 bis AC-KAL-07 (Serien, Erinnerungen, Idempotenz, Zeitzonen-
und Sommerzeit-Grenzfälle). Zu AC-KAL-02/03 ist nur die grundlegende
Payload-RLS und Familienisolation abgedeckt; Liste/Suche/Push/Export
müssen später separat gesichert werden.


## FH-CX-009 – Einzeltermine: verifizierbarer Teilumfang

**Status:** CI und Entwicklungsabnahme offen. Keine Aussage, dass das
Kalender-CRUD bereits auf der Cloud-Instanz verfügbar ist.

| ID | Prüfung |
| --- | --- |
| CAL-CMD-T01 | Nutzer legt Termin atomar mit Ressource und eigener Mitgliedschaft an |
| CAL-CMD-T02 | Wiederholung derselben Request-ID erzeugt keinen zusätzlichen Termin; geänderte Payload unter derselben ID wird abgelehnt |
| CAL-CMD-T03 | Fremde Familien-ID und anonyme RPC-Aufrufe erzeugen keine Termine |
| CAL-CMD-T04 | Fehlerhafte Intervalle, unbekannte Zeitzonen und Mischformate werden verworfen |
| CAL-CMD-T05 | Eigene Änderung erhöht Version; veraltete Änderungsanfrage wird verweigert |
| CAL-CMD-T06 | Familienfreigabe erteilt kein Schreib-/Löschrecht für fremde Termine |
| CAL-CMD-T07 | Löschung ist Eigentümer-/Versionsgebunden und entfernt Inhalt samt Ressourceneintrag |

**Manuell nach Cloud-Migration zu prüfen:** Anmeldung zweier Personen,
Anlage eines privaten und eines gemeinsamen Termins, getrennte Familien,
Wechsel zwischen Familien, Mobilansicht, Bearbeitung, Konflikte und Löschung.


## FH-CAL-001 – Monatsansicht, Terminperson und gemeinsame Familie

**Status:** Implementierungsentwurf, CI und manuelle Mehrkontenabnahme offen.

| Test | Erwartung |
| --- | --- |
| CAL-SUB-T01 | Eigentümer legt privaten Termin fuer anderes Mitglied an; Zielkonto liest, darf weder ändern noch löschen; fremde Familie sieht nichts |
| CAL-SUB-T02 | Zielperson aus anderer Familie und nicht zugehöriges erstellendes Konto werden abgelehnt |
| CAL-SUB-T03 | Wiederholung derselben Request-ID ist idempotent; geänderte Zielperson unter gleicher ID wird abgelehnt |
| CAL-SUB-T04 | Altes Create-RPC bleibt funktionsfähig, NULL bedeutet bisheriger Owner |
| Unit monthCells | Sechs Wochen/42 Tage, Montag als erster Wochentag, einschließlich Nachbarmonaten |
| Unit adjustEndAfterStart | Beginnänderung verschiebt Endzeit standardmäßig auf +60 Minuten; explizite gültige spätere Endzeit bleibt |
| Unit eventOnDay | Ganztag mit exklusivem Enddatum; Nachttermine nicht fälschlich auf Ende-Mitternacht projizieren |
| Browser E2E | Mobile Monatsansicht, 42 Tage, Monatsnavigation, Terminanlage/-bearbeitung/-löschung, Terminperson und automatische Endzeit |

**Realer Befund (12.11.2026):** In `Familyhub_dev` gab es zwei aktive Familien mit jeweils genau einem aktiven Kontobenutzer. Ein in Familie A freigegebener Termin darf bei einem Konto, das nur Familie B angehört, nicht erscheinen. Die Zuordnung der echten Konten erfolgt über die bestehende Einladung; personenbezogene SQL-Testdaten werden nicht erzeugt.

## FH-CX-010 – Kalenderansichten und Navigation (Issue 16)

**Status:** Implementiert; Browserabnahme und erneuter PostgreSQL-RLS-Nachweis offen.

Die vorhandene Monatsansicht bleibt der Zeitraumvertrag: sechs vollständige
Wochen (42 Tage), Montag bis Sonntag, einschließlich leerer Tage und Randtagen.
Tagesauswahl, Monatswechsel und Heute verwenden die bestehende Datumslogik.
Termindetails laden die Liste über den vorhandenen RLS-geschützten Service erneut;
ein inzwischen unsichtbarer Termin führt zu einer neutralen Meldung und entfernt
auch die bisherigen Listeninhalte und Zählwerte. Ein Familien-/Mitgliedswechsel
setzt den lokalen Kalenderzustand zurück. Fehler zeigen keine Server-Rohtexte.
Es gibt keine neue Detail-API, Datenmodelle, Migrationen oder Berechtigungsregeln.

| Akzeptanzkriterium | Nachweis |
| --- | --- |
| Vollständiger Zeitraum, leere Tage, Tagesauswahl | `tests/unit/calendar-page.test.tsx`, vorhandene und ergänzte Datumstests in `calendar-utils.test.ts` |
| Tagesgrenzen, Nachttermine, Zeitumstellung, Jahreswechsel, Schaltjahr | `tests/unit/calendar-utils.test.ts` |
| Lade-, Leer-, Fehler- und verweigerter Zugriff | `tests/unit/calendar-page.test.tsx` |
| Detailnavigation, erneute Serverabfrage, Fokus beim Zurückgehen | `tests/unit/calendar-page.test.tsx` |
| Keine alten privaten Inhalte nach Familienwechsel / entzogenem Detailzugriff | Komponententests mit simulierten Serviceantworten; kein Ersatz für RLS |
| 320 px, 390 px, Tablet (768 px), Desktop (1440 px), Tastatur und Aktionsüberdeckung | `tests/e2e/calendar-navigation.spec.ts`: simulierte Auth-/Familien-/Kalenderservices, echte App-Oberfläche, keine Datenbankschreibzugriffe; Ausführung durch lokale Netzwerkbeschränkung (`EPERM` auf `127.0.0.1:5173`) blockiert |
| Direkter API-Zugriff mit fremder ID, private Sichtbarkeit | Bestehende `tests/integration/calendar-events.rls.test.ts`; in diesem Auftrag nicht ausgeführt, da die Fixtures Datenbankänderungen durchführen |

Verifikation im Agentenlauf: Typecheck, Lint, Unit-Tests und Client-Build ausgeführt.
Der Build meldet weiterhin einen JavaScript-Chunk über 500 kB. Der Unit-Reporter
kann die außerhalb des Workspace liegende GitHub-Step-Summary nicht schreiben;
das Testergebnis selbst wird dadurch nicht verändert. Keine Aussage über einen
neuen erfolgreichen CI-/RLS-/Browserlauf. Nächster Schritt ist die Ausführung der
Browserfälle in einer Umgebung mit freigegebenem lokalen Webserver und separat
autorisierte RLS-Prüfung auf einer wegwerfbaren Testdatenbank.

Kalenderdaten, Rollen-/Sichtbarkeitsmatrix, Serien, Stundenplanprojektionen,
Push-Empfänger und Import-/Synchronisationslogik bleiben unverändert.
