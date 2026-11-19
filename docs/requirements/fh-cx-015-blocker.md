# FH-CX-015 – Kontrollierter Blocker zu Issue #21

Stand: 15.11.2026 (erneut geprüft). **Status: blockiert; keine Reminder-Funktion implementiert.**
Geprüfter Feature-Branch: `codex/agent-21`.

## Auftrag und geprüfter Ist-Stand

Das freigegebene Ziel sind familienbezogene, autorisierte Erinnerungen zu
Kalenderereignissen: eindeutig anlegen, bei Verschiebung aktualisieren, bei
Absage/Löschung annullieren und auch bei Retry oder Konkurrenz nicht doppelt
intern zustellen. Externe Zustellung und neue Push-Defaults sind ausgeschlossen.

AGENTS.md sowie die vier Projektquellen wurden geprüft. Die Baseline liegt
im Repository-Root als `01-fachkonzept.md`, `02-architektur.md`,
`03-backlog.md` und `04-entscheidungen.md`, nicht unter `docs/`.
Die aktuelle Issue-Freigabe konkretisiert den bislang im Backlog als Vorschlag
geführten Auftrag; sie liefert jedoch keine fehlende technische Grundlage.

| Geprüfte Stelle | Befund |
| --- | --- |
| `packages/notifications-domain/src/index.ts` | Nur Modulstatus `unavailable`; keine Verarbeitung oder Zustellungsgrenze. |
| `packages/contracts/src/index.ts` | Empfängerauswahl `all` / `selected_members` vorhanden; keine Reminder-, Job-, Zustellstatus- oder Ereignisverträge. Auswahl ist keine autorisierte Empfängerauflösung. |
| `apps/client/src/calendar/calendar-service.ts` | Einzeltermine über RLS lesen sowie Create-/Update-/Delete-RPCs aufrufen; keine Reminder- oder Absageoperation. |
| `apps/client/src/auth/database.types.ts` und `supabase/migrations/` | Keine Reminder-Persistenz, Outbox, Queue, Scheduler oder persistente Zustellungsdeduplizierung auffindbar. |
| `20261112193000_add_calendar_event_commands.sql` im Migrationsordner | Idempotenzregister für Einzelterminanlage; Update mit Versionsprüfung; Delete entfernt die Ressource. Keine transaktionale Reminder-Aktualisierung oder Lösch-/Absagenachricht. |
| `supabase/functions/README.md` und Implementierungsdateien | Keine implementierte serverseitige Benachrichtigungszustellung. |

FH-CX-009 ist als Einzelterminfunktion erkennbar. Eine abgeschlossene
FH-CX-014-Zeitgrundlage sowie implementierte FH-CX-017-/018-Kanal-,
Einstellungs- und Empfängeroperationen sind im geprüften Stand nicht belegt.
Dies sind Repository-Befunde, keine Prüfung eines laufenden Datenbankschemas.

## Technischer Blocker und Umfangsgrenze

Architektur B.1.3 verlangt robuste Verarbeitung über Neustarts und Duplikate
sowie erneute Autorisierung zur tatsächlichen Aktion. Outbox, Queue und
Scheduler sind dort beschlossen, ihre konkreten Ereignisschemas und
Betriebsverträge aber offen; im Code existiert keine nutzbare Abstraktion.

Für die geforderte dauerhafte Eindeutigkeit und zuverlässige Kopplung von
Terminänderung, Reminder-Zustand und Zustellung fehlen persistente,
transaktionale Operationen. Ein nachgelagerter Browseraufruf könnte zwischen
Terminänderung und Reminder-Aktualisierung ausfallen. Ein In-Memory- oder
Browserregister würde weder Neustarts und mehrere Worker noch direkte
API-Zugriffe absichern. Das vorhandene Termin-Idempotenzregister ist kein
Reminder- oder Zustellungsregister.

Die fehlenden Datenstrukturen, autorisierten Operationen und RLS-Regeln neu
einzuführen würde die ausdrücklich verbotenen Schema-/Datenbankdateiänderungen
erfordern. Deshalb werden keine Ersatzpersistenz, scheinbar aktive
Reminder-Einstellungen oder neue Sicherheitsregeln eingeführt.
FH-OPEN-007 bleibt offen; ausgeschlossene Vorlaufzeiten, Ruhezeiten und
Payload-Defaults sind kein zusätzlich erfundener Freigabebedarf für diesen Lauf.

## Akzeptanzkriterien und verbleibende Nachweise

| AK | Ergebnis / Restprüfung |
| --- | --- |
| 1–2 | Nicht erfüllt: eindeutige persistente Reminder-Identität und atomare idempotente Anlage fehlen. |
| 3 | Nicht erfüllt: atomare Aktualisierung/Annullierung bei Verschiebung, Absage und Löschung fehlt. |
| 4 | Nicht nachgewiesen: serverseitige Reminder-Autorisierung einschließlich erneuter Familien-, Mitgliedschafts-, Sichtbarkeits- und Einstellungsprüfung bis zur Zustellungsgrenze fehlt. |
| 5 | Nicht nachgewiesen: Retry, Konkurrenz, verspätete/doppelte/vertauschte Ereignisse und Zustellungsdeduplizierung benötigen den fehlenden persistenten Vertrag. |
| 6 | Eingehalten im Agentenlauf: keine externe Push-Zustellung ausgeführt oder integriert. |
| 7 | Eingehalten im Agentenlauf: keine Datenbank-, Cloud- oder Produktionsänderung ausgeführt. |

Neue Funktionstests würden derzeit einen erfundenen Vertrag prüfen und wurden
nicht ergänzt. Nach Bereitstellung der Grundlage bleiben sämtliche geforderten
Anlage-/Änderungs-/Annullierungs-, Retry-/Konkurrenz-/Reihenfolge-,
Private-/Cross-Family-/direkte API-Tests, Payload-/Log-Prüfungen und
Reminder-UI-E2E einschließlich Lade-, Leer- und Fehlerzuständen auszuführen.
Bestehende Tests sind keine Abnahme von FH-CX-015.

## Tatsächlich ausgeführte Prüfungen

| Befehl | Ergebnis |
| --- | --- |
| `npm run build` | Exit 0: Typecheck, Lint, 49 Unit-Tests in 6 Dateien und Client-Build erfolgreich. Reporter konnte die GitHub-Step-Summary wegen `EROFS` nicht schreiben; bestehende Bundle-Warnung über 500 kB. |
| `npm run test:e2e -- tests/e2e/smoke.spec.ts tests/e2e/calendar-navigation.spec.ts` | Exit 1: konfigurierter Webserver startet nicht; keine Browserfälle ausgeführt. Diese Auswahl benötigt keine DB-Schreibzugriffe. |
| `npm run dev --workspace @familyhub/client -- --host 127.0.0.1` | Exit 1: Diagnose bestätigt `listen EPERM` auf `127.0.0.1:5173`. |

`npm run test:integration` und datenbankgestützte E2E wurden nicht ausgeführt:
Ihre Fixtures erzeugen/verändern Daten; Datenbankänderungen sind ausdrücklich
verboten. Es wurde keine Datenbank gestartet, zurückgesetzt oder migriert.

## Änderungen und nächster sinnvoller Schritt

Nur dieser Bericht wurde aktualisiert und uncommitted hinterlassen. Vorhandene
unversionierte Automationsdateien bleiben erhalten. Produktcode, Baseline,
Schema, Migrationen, Konfiguration und Workflows bleiben unverändert.
Keine Commits, Pushes, Merges oder Deployments wurden ausgeführt.

Kalender/Stundenplan, Unterrichtsprojektionen, Serien/Ausnahmen, Rollen und
Sichtbarkeit, Push-Empfänger, Import/Synchronisation sowie bestehender
Versionsschutz bleiben unverändert. Es entsteht keine zusätzliche fachliche
Wahrheitsquelle oder neue Empfängermatrix.

**Bevorzugter nächster Schritt (Vorschlag):** Den implementierten und geprüften
Stand der Abhängigkeiten samt persistentem Reminder-/Outbox-/Zustellungsvertrag
bereitstellen. Falls er noch fehlt, ist zunächst ein separater menschlich
freigegebener Datenbankauftrag für transaktionale Kopplung, Idempotenz,
Versions-/Reihenfolgebehandlung und RLS erforderlich. Danach FH-CX-015 auf den
tatsächlich vorhandenen Schnittstellen umsetzen und die offenen Nachweise
ausführen. Dieser Bericht erteilt keine Schema- oder Datenbankfreigabe.

## Erneute Prüfung am 15.11.2026

Der erneute Auftrag zu Issue #21 wurde gegen den vorhandenen Feature-Branch
geprüft. Die oben genannten technischen Blocker bestehen weiterhin; es wurden
keine neuen Produkt-, Rollen-, Zeit- oder Payload-Regeln festgelegt. Die
Auftragsfreigabe ersetzt die ältere Auftragszuordnung in AGENTS.md, hebt das
ausdrückliche Verbot von Schema-/Datenbankdateiänderungen jedoch nicht auf.

`npm run build` wurde erneut ausgeführt: Exit 0, Typecheck, Lint, alle 49
Unit-Tests in 6 Dateien und Client-Build erfolgreich. Die bestehende
Bundle-Warnung und der `EROFS`-Hinweis des GitHub-Summary-Reporters bestehen
weiterhin. Die oben dokumentierte datenbankfreie Playwright-Auswahl wurde
ebenfalls erneut ausgeführt: Exit 1 beim Start von `config.webServer`, keine
Browserfälle ausgeführt. Diese Prüfungen belegen keine Reminder-Funktion.

Integrations-/RLS- und datenbankgestützte E2E-Tests bleiben wegen ihrer
schreibenden Fixtures unausgeführt. Änderungen beschränken sich auf diesen
Bericht; vorhandene unversionierte Automationsdateien bleiben erhalten.

## Erneute Prüfung am 19.11.2026

Der aktuelle Issue-Text erlaubt ausdrücklich lokale/testbare Migrationen und
minimale Persistenzbausteine. Die verbindlichen Regeln außerhalb des Issue-Texts
verbieten Änderungen an Migrationen, Schema- und Datenbankdateien. Für diesen
Lauf gilt dieses Verbot. Die vorhandenen Kalenderoperationen bieten weiterhin
keine transaktionale Kopplung mit Reminder-Persistenz oder Zustellungsdeduplizierung.
FH-CX-015 bleibt blockiert. Für die Umsetzung braucht es eine Freigabe außerhalb
des Issue-Texts, die den erlaubten Umfang für Migrationen, RPCs, RLS und die
isolierte Testdatenbank eindeutig festlegt.

- `npm run build` war erfolgreich. Typecheck, Lint, 49 Unit-Tests und
  Client-Build liefen durch. Der Summary-Reporter meldete `EROFS`, Vite meldete
  ein Bundle über 500 kB.
- `npm run test:e2e -- tests/e2e/smoke.spec.ts tests/e2e/calendar-navigation.spec.ts`
  endete mit Exit 1 beim Start des konfigurierten Webservers. Es wurden keine
  Browserfälle ausgeführt.
- `npm run test:integration` und datenbankgestützte E2E-Prüfungen wurden wegen
  schreibender Fixtures nicht ausgeführt. Reminder-spezifische Nachweise bleiben offen.

Der Bericht ist die einzige Änderung dieses Laufs. Es wurde keine Datenbank
geändert und keine externe Zustellung ausgeführt.

## Aktueller Lauf mit lokaler Migrationsfreigabe

`ALLOW_LOCAL_MIGRATIONS=true` und die ausdrückliche Issue-Freigabe liegen
vor. Der frühere Freigabeblocker für Migrationsdateien ist damit aufgehoben.
FH-CX-014 ist im Branch durch die Migration zum Zeitvertrag vertreten.
Die Freigabe umfasst auch einen minimalen lokalen Outbox-Vertrag.

FH-CX-015 bleibt fachlich blockiert. Für die vorgeschriebene erneute
Autorisierung vor der internen Zustellung fehlt ein verbindlicher Vertrag
für Empfänger und wirksame Einstellungen. Das Benachrichtigungsmodul
meldet sich als nicht verfügbar. Die vorhandene Empfängerauswahl kodiert
einen Wunsch, liefert aber keine aktuell berechtigte und konfigurierte
Empfängermenge. FH-CX-017 und FH-CX-018 sind im Branch nicht implementiert.
Ein lokaler Worker müsste dafür eine neue Berechtigungsregel einführen,
etwa den Anfordernden als impliziten Empfänger behandeln. Dafür liegt
keine fachliche Freigabe vor.

Für Einzeltermine ist außerdem nur die Löschung implementiert. Eine
Absage gibt es im Kalendervertrag für Serienausnahmen. Die Behandlung
einer Absage als Löschung würde den Kalendervertrag fachlich verändern.

Die menschliche Entscheidung betrifft den lokalen Reminder-Vertrag für
Empfänger, wirksame Einstellungen und den Absagezustand von Einzelterminen.
Es wurde keine Produktänderung vorgenommen.
