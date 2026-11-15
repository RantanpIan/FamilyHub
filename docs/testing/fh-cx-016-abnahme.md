# FH-CX-016 – Kalender-Regression und Abnahme, Issue #22

Stand: 14.11.2026, Branch `codex/agent-22`. **Status: Teilnachweise getestet;
Gesamtabnahme blockiert.** Keine automatische fachliche Freigabe.

## Quellen und Nachweisgrenzen

Geprüft: `AGENTS.md`, die im Repository-Root liegenden `01-fachkonzept.md`,
`02-architektur.md`, `03-backlog.md`, `04-entscheidungen.md`,
`docs/architecture/`, `docs/requirements/foundation.md`, ADR 0004,
`docs/testing/requirements-coverage.md` sowie die Blockerberichte zu
FH-CX-011/012/013 unter `docs/requirements/`. Die vier Baseline-Dateien liegen
abweichend von AGENTS.md nicht unter `docs/`.

Der aktuelle Auftrag autorisiert diese Regression und Dokumentation. Er liefert
keine fehlenden Sollregeln der Vorgänger nach. Das Backlog enthält ausdrücklich
nicht die vollständigen Original-Akzeptanzkriterien von FH-CX-008 bis 015.
Die folgende Liste ordnet sämtliche dort konkret auffindbaren Kalenderkriterien
zu; Vollständigkeit gegenüber den fehlenden Originalaufträgen bleibt **offen**.
Ältere Ergebnisangaben in anderen Dokumenten sind keine Nachweise dieses Laufs.

Epic Kalender → Stories FH-CX-008–015 → Kriterien unten → benannte Tests →
vorhandene Einzelterminimplementierung in `apps/client/src/calendar/`,
Ressourcenautorisierung und bestehende Kalender-RPCs. Produktcode unverändert.

## Abnahmeliste der abhängigen Stories

In den folgenden Tabellen bedeutet „nicht ausgeführt“ ausdrücklich nicht bestanden.
Testpfade sind relativ zu `tests/` angegeben.

| Story / auffindbares Kriterium | Prüfung | Ergebnis dieses Laufs / Rest |
| --- | --- | --- |
| 008: private eigene Inhalte, fremde Familie unsichtbar | `integration/calendar-events.rls.test.ts`, CAL-DB-T01 | Nicht ausgeführt: schreibende DB-Fixtures verboten |
| 008: Familienfreigabe ohne private Titel anderer Mitglieder | CAL-DB-T02 | Nicht ausgeführt: DB-Gate offen |
| 008: direkte Writes und anonyme Reads verweigert | CAL-DB-T03 | Nicht ausgeführt: DB-Gate offen |
| 008: Intervalle und gemischte Zeit-/Datumsfelder ablehnen | CAL-DB-T04 | Nicht ausgeführt: DB-Gate offen |
| 008: Ganztag mit exklusivem Ende | CAL-DB-T05; `unit/calendar-utils.test.ts` | Unit bestanden; Persistenz nicht ausgeführt |
| 008: Familien-/Ressourcentyp-Referenzintegrität | CAL-DB-T06 | Nicht ausgeführt: DB-Gate offen |
| 008: Entzug beendet Zugriff | CAL-DB-T07 | Nicht ausgeführt: DB-Gate offen |
| 009: atomare Erstellung mit authentifiziertem Eigentümer | CAL-CMD-T01 | Nicht ausgeführt: DB-Gate offen |
| 009: identische Request-ID ohne Duplikat | CAL-CMD-T02 | Nicht ausgeführt: DB-Gate offen |
| 009: fremde Familie / anonymes Erstellen ablehnen | CAL-CMD-T03 | Nicht ausgeführt: DB-Gate offen |
| 009: ungültige Intervalle, Zeitzonen und Daten ablehnen | CAL-CMD-T04 | Nicht ausgeführt: DB-Gate offen |
| 009: Änderung mit Version, veraltete Version ablehnen | CAL-CMD-T05 | Nicht ausgeführt; sequentieller Versionskonflikt ersetzt keinen parallelen Mutationstest |
| 009: fremde Änderung/Löschung verweigern | CAL-CMD-T06 | Nicht ausgeführt: DB-Gate offen |
| 009: Eigentümerlöschung, Kaskade und veraltete Löschung | CAL-CMD-T07 | Nicht ausgeführt: DB-Gate offen |
| 009: mobile Erstellung/Bearbeitung/Löschung | `e2e/family-management.spec.ts`, FH-CX-009 | Nicht ausgeführt: schreibende DB-Fixtures verboten |
| 010: 42 Tage, leere Tage, Monatswechsel, Tagesauswahl | `unit/calendar-page.test.tsx`, `unit/calendar-utils.test.ts` | Bestanden für dokumentierten Monatsansicht-Teilumfang |
| 010: Tagesgrenzen, DST, Jahreswechsel, Schaltjahr | `unit/calendar-utils.test.ts` | Bestanden für vorhandene Einzelterminzuordnung |
| 010: Laden, leer, Fehler, verweigerter Zugriff, Wiederholung | `unit/calendar-page.test.tsx` | Bestanden mit simulierten Services |
| 010: erneute Detailprüfung, Rücknavigation und Fokus | `unit/calendar-page.test.tsx` | Bestanden mit simulierten Services |
| 010: Widerruf entfernt Inhalt/Zähler, Familien-/Mitgliedswechsel | `unit/calendar-page.test.tsx` | Bestanden; neu: verspätete Antwort nach beiden Kontextwechseln bleibt unsichtbar |
| 010: 320/390/768/1440 px, Tastatur, keine Aktionsüberdeckung | `e2e/calendar-navigation.spec.ts` | Start blockiert; keine Browserfälle ausgeführt |
| 011: deterministische Serienvorkommen, Änderung/Beendigung, DST, Validierung, Idempotenz/Konkurrenz | `docs/requirements/fh-cx-011-blocker.md` | Blockiert: Serienvertrag und verbindliche Regeln fehlen; keine Serienfunktion/-tests vorhanden |
| 012: einzelne Ausnahme, übrige Vorkommen unverändert, Wiederlesen/Löschen, Idempotenz, RLS | `docs/requirements/fh-cx-012-blocker.md` | Blockiert: Serien-/Ausnahmepersistenz fehlt; keine bestandenen Ausnahmeprüfungen |
| 013: Sichtbarkeit, Lesefreigaben, Privatsemantik, Terminperson, aktueller Rechteentzug | `docs/requirements/fh-cx-013-blocker.md`; Autorisierungs-Unit-Tests; CAL-SUB-T01–04 | Bestands-Policy als Unit bestanden; widersprüchliche Sollmatrix ungeklärt, DB nicht ausgeführt; keine Storyabnahme |
| 014: Zeitzonen/Ganztag/DST | `unit/calendar-utils.test.ts`; CAL-DB-T04/05, CAL-CMD-T04 | Unit-Teilnachweis; vollständige Storykriterien und verbindlicher Zeitvertrag fehlen; DB nicht ausgeführt |
| 015: Erinnerungen bei Änderung/Löschung konsistent | Benachrichtigungsmodul meldet `unavailable`; keine Reminder-Verarbeitung auffindbar | Blockiert: konkrete Storykriterien, Vorlauf-/Invalidierungs-/Zustellverträge fehlen; kein Nachweis |

Die neuen drei parametrisierten Datumstests prüfen 23- und 25-Stunden-Tage
in Europe/Berlin und eine UTC-abweichende lokale Jahresgrenze in
Pacific/Honolulu. Jeweils erscheint der Termin genau an seinem lokalen Tag;
das exklusive Mitternachtsende erzeugt keinen zusätzlichen belegten Tag.
Das legt keine neue Regel für mehrdeutige lokale Eingaben oder Serien fest.

## Rechte- und Offenlegungsmatrix

| Akteur / Zugriff | Vorhandener Nachweis | Ergebnis / fehlendes Gate |
| --- | --- | --- |
| Verknüpfter aktiver Eigentümer: privat lesen/ändern/löschen | `unit/authorization.test.ts`; CAL-DB-T01, CAL-CMD-T01/05/07 | Policy-Unit bestanden; echte API/RLS offen |
| Aktives Mitglied: Familienfreigabe lesen, fremde Writes verweigern | Policy-Unit; CAL-DB-T02, CAL-CMD-T06 | Policy-Unit bestanden; echte API/RLS offen |
| Aktiver Grant-Empfänger: nur lesen, kein Schreiben/Löschen | Policy-Unit; `integration/resource-access.rls.test.ts` ACL-T06–09; CAL-SUB-T01 | Policy-Unit bestanden; echte API/RLS offen |
| Unberechtigtes Mitglied/Admin: privat ohne Grant unsichtbar | Policy-Unit; CAL-DB-T02 | Policy-Unit bestanden; echte API/RLS offen; 013-Konflikt bleibt offen |
| Fremde Familie: Liste/bekannte ID/Mutation verweigern | Policy-Unit; CAL-DB-T01, CAL-CMD-T03, CAL-SUB-T02 | Policy-Unit bestanden; echte API/RLS offen |
| Anonym, fehlende/inaktive Mitgliedschaft, widerrufener Grant | Policy-Unit; CAL-DB-T03/07; Ressourcen-RLS-Suite | Policy-Unit bestanden; echte API/RLS offen |
| Veralteter Clientkontext: keine privaten Inhalte/Zählwerte | `unit/calendar-page.test.tsx` | Bestanden mit simulierten Antworten; kein RLS-Ersatz |
| Direkte API, Suche, Export, Storage, Push | Direkte API-Fälle siehe oben; kein Kalender-Such-/Export-/Datei-/Push-Fluss auffindbar | API/RLS offen; übrige Negativtests mangels Implementierung nicht ausführbar, keine pauschale Sicherheitsfreigabe |

## Tatsächlich ausgeführte Befehle

Laufzeit: Node 24.22.2, npm 11.19.1. Keine Installation neuer Abhängigkeiten.

| Befehl | Ergebnis |
| --- | --- |
| `npm run build` | Exit 0: Typecheck, ESLint, 54 Unit-Tests in 6 Dateien sowie Client-Build bestanden |
| `npm run typecheck && npm run lint && npm run test:unit` | Nach Präzisierung der datumsunabhängigen Regression erneut Exit 0: Typecheck, Lint und alle 54 Tests in 6 Dateien bestanden |
| `npm run test:e2e -- tests/e2e/smoke.spec.ts tests/e2e/calendar-navigation.spec.ts` | Exit 1: `Error: Process from config.webServer was not able to start. Exit code: 1`; keine Browserfälle ausgeführt |
| `npm run dev --workspace @familyhub/client -- --host 127.0.0.1` | Exit 1: `Error: listen EPERM: operation not permitted 127.0.0.1:5173` |

Build-Hinweis: bestehender JS-Chunk über 500 kB. Vitest meldet zusätzlich
`Could not write summary to options.summary.outputPath`, `EROFS` für die
GitHub-Schrittzusammenfassung außerhalb des Workspace; Testlauf selbst Exit 0.

**Bewusst nicht ausgeführt:** `npm run test:integration` und die vollständige
Playwright-Suite. Deren Setup erzeugt/löscht Auth-Nutzer, Familien und Daten;
auch eine wegwerfbare lokale Datenbank wäre eine hier verbotene Datenbankänderung.
Kein Supabase-Start, Reset oder Migrationslauf. `.github/workflows/ci.yml`
wurde nur gelesen: Quality-, E2E- und Auth/RLS-Jobs sind vorhanden, einschließlich
16/16-ACL-Gate und anschließender vollständiger Integrationssuite. Kein neuer
CI-Lauf wurde ausgelöst oder als erfolgreich verifiziert.

## Kriterien des aktuellen Auftrags und Restabnahme

| AK FH-CX-016 | Status |
| --- | --- |
| 1: jede relevante Vorgängerbedingung zugeordnet | Teilweise: auffindbare Kriterien oben zugeordnet; vollständige Originalkriterien fehlen |
| 2: positiv/negativ/Grenzfall/Familie/privat | Unit-Teilnachweise bestanden; direkte API/RLS und Browser nicht nachgewiesen |
| 3: keine Duplikate/Offenlegung/Datenverluste | Nicht vollständig nachgewiesen: Serien, Ausnahmen, Reminder fehlen; echte Konkurrenz-/Retry-/Reihenfolgetests offen |
| 4: reproduzierbare CI-Gates | Bestehende Definition geprüft; lokaler Build bestanden, Browser blockiert, RLS nicht ausgeführt; CI-Erfolg offen |
| 5: mobile/Desktop/Tastatur/Zustände | Komponentenprüfungen bestanden; Browserdarstellung bei 320/390 px und Desktop sowie Tastatur-/Fehlerzustände im Browser offen |
| 6: minimierte Reports/Testdaten | Neue Tests ausschließlich synthetisch und im Speicher; Report enthält keine privaten Termintexte, Tokens oder Produktionsdaten |
| 7: keine DB-/Cloud-/Produktionsänderung | Eingehalten; keine entsprechenden Befehle ausgeführt |

Bestehende Datenbank-Fixtures verwenden synthetische Nutzer mit zufälligen
Kennungen und Bereinigung, Browsernavigation simuliert Services. Diese
Codeprüfung belegt keine tatsächliche Bereinigung eines nicht ausgeführten Laufs.
Es wurden keine echten Konten oder dauerhaften Testdaten angelegt.

Kalender/Stundenplan und Unterrichtsprojektionen, Wiederholungen/Ausnahmen,
Lösch-/Reminder-Invalidierung, Push-Empfänger, Import/Synchronisation sowie
atomare konkurrierende Mutationen erhalten keine neue Logik. Ihre übergreifende
Konsistenz bleibt mangels implementierter Verträge beziehungsweise zulässigem
DB-Nachweis offen. Kein Ersatz durch lokale Schattenobjekte.

**Nächster sinnvoller Schritt:** vollständige freigegebene Vorgängerkriterien
bereitstellen und die dokumentierten FH-OPEN-001–004/007 sowie Blocker 011–013
klären. Fehlende Funktionen separat umsetzen. Anschließend vorhandene
Browserprüfungen in einer Umgebung mit erlaubtem lokalen Server und DB-/RLS-
Prüfungen nur nach separater Freigabe gegen eine isolierte Wegwerfinstanz
ausführen. Fehlende Parallelmutations-, Reminder-Retry-/Reihenfolge- und
Offenlegungsfälle dann gegen die realen Verträge ergänzen und nachweisen.

Änderungen bleiben uncommitted im Feature-Branch. Keine Migration, Baseline-,
Schema-, Konfigurations- oder Workflowänderung, kein Commit/Push/Merge/Deployment.
Vorhandene unversionierte Automationsdateien wurden bewahrt. Dieser Bericht
dient als Grundlage für den von der Pipeline zu erstellenden Draft-PR.
