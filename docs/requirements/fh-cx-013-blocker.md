# FH-CX-013 – Kontrollierter Blocker zu Issue #19

Stand: 14.11.2026. Status: **blockiert; keine Funktionsänderung implementiert**.
Geprüfter Branch: `codex/agent-19`.

## Erneute Prüfung im aktuellen Agentenlauf

Der Bericht war bereits versioniert vorhanden. Die erneute Repository-Suche
nach Rollen-/Grant-Matrix und FH-CX-013 hat keine ergänzende freigegebene
Regelquelle ergeben. Der aktuelle Issue-Text bestätigt die fachliche Freigabe,
liefert aber weiterhin keine konkrete Matrix oder Quellenreferenz. Der Blocker
bleibt deshalb bestehen; es wurde keine neue Berechtigungsregel angenommen.
Die unten aufgeführten Qualitätsbefehle wurden in diesem Lauf erneut mit den
angegebenen Ergebnissen ausgeführt. Die erfolgreichen Bestandsprüfungen sind
keine fachliche Abnahme von FH-CX-013.

## Auftrag und vorhandene Grundlage

Das Kalender-Epic verlangt Sichtbarkeit gemäß einer geprüften Rollen-/Grant-Matrix,
reine Lesefreigaben, eine Terminperson ohne Eigentumsübertragung sowie erneute
Autorisierung nach Rollen-, Mitgliedschafts- und Grant-Änderungen.

Die Projektquellen wurden im Repository-Wurzelverzeichnis gefunden und geprüft:
`01-fachkonzept.md`, `02-architektur.md`, `03-backlog.md` und
`04-entscheidungen.md`. Die in AGENTS.md genannten `docs/`-Pfade treffen auf
diese vier Dateien nicht zu.

Die Abhängigkeiten liefern bereits technische Grundlagen:

- ADR 0004 und das Ressourcenregister aus FH-CX-005 unterscheiden Eigentum,
  familienweite Lesbarkeit und widerrufbare explizite Lese-Grants. Schreiben
  und Löschen bleiben Eigentümerrechten vorbehalten; Adminstatus gewährt
  keine Ausnahme. Die serverseitigen Funktionen prüfen aktuelle aktive
  Mitgliedschaft, Mitglied und Familie.
- FH-CX-006 stellt Mitgliedschafts-/Einladungsoperationen bereit, führt aber
  keine vollständige Rollen-/Kindervertretungsmatrix ein.
- Die Kalender-RLS und Einzeltermin-RPCs aus FH-CX-008/009 verwenden das
  Ressourcenregister. `calendar-service.ts` liest Termine und lesbare
  Ressourcenmetadaten unter RLS; Update und Delete verwenden Eigentümerprüfung
  und `expectedVersion` auf dem Server.
- Die vorhandene FH-CAL-001-Erweiterung speichert genau eine Terminperson
  (`subject_member_id`) derselben Familie. Der Ersteller bleibt Eigentümer;
  bei privater Erstellung für eine andere Person vergibt der Server an diese
  ein Leserecht. Die Oberfläche bietet bei Erstellung `private` und `family`
  an; beim Bearbeiten zeigt sie die Sichtbarkeit nur an.
- `resource-access-service.ts` enthält bereits Aufrufe für Sichtbarkeit,
  Grant-Erteilung und Widerruf. Das Fehlen einer neuen Migration ist daher
  für sich genommen kein Blocker für eine spätere Kalenderoberfläche.

Diese Befunde sind Code-/Dokumentationsbefunde, kein neuer RLS-Lauf und keine
Abnahme von FH-CX-013.

## Fehlende verbindliche Information

Das Issue erklärt die fachliche Matrix für geprüft, enthält aber weder ihre
konkreten Regeln noch einen Verweis auf eine ergänzende freigegebene Quelle.
Fachkonzept A.1, Architektur B.1.1, Backlog-Zeile FH-CX-013 sowie
`FH-OPEN-001/002` im Entscheidungsregister lassen diese Details offen.
ADR 0004 grenzt den technischen Sicherheitskern ausdrücklich von einer
vollständigen fachlichen Matrix und Freigabeoberfläche ab.

Vor einer Umsetzung muss die referenzierbare Matrix insbesondere klären:

1. Welche bestehenden Rollen dürfen für eigene Kalenderressourcen welche
   Sichtbarkeit wählen und welchen aktiven Mitgliedern Lese-Grants erteilen
   beziehungsweise entziehen? Bestätigt die Freigabe unverändert den
   technischen Kern aus ADR 0004?
2. Gilt das bestehende automatische Leserecht der fremden Terminperson auch
   nach einem Sichtbarkeitswechsel zu privat? Darf es anschließend unabhängig
   von der unveränderten Terminperson entzogen werden?
3. Welche konkreten Rollenwechsel ändern welche Zugriffsrechte? Die vorhandene
   Eigentümer-/Lesepolicy enthält keine rollenspezifische Ausnahme. Für
   Matrix-Tests muss das erwartete Verhalten ausdrücklich feststehen.

Die Aussage „fachlich freigegeben“ wird nicht widerrufen. Es fehlt die
zugängliche Definition, gegen die Implementierung und Tests prüfbar wären.
Eine stillschweigende Gleichsetzung technischer Defaults mit dieser Matrix
würde eine ausgeschlossene Sicherheits-/Produktentscheidung vorwegnehmen.

## Auswirkung auf Akzeptanz und Tests

| Kriterium | Befund / verbleibender Nachweis |
| --- | --- |
| 1 – Sichtbarkeitswahl gemäß Matrix | Erstellung bietet bereits privat/familienweit; fachliche Zulässigkeit und Änderungen anhand der konkreten Matrix offen. |
| 2 – Lesen ohne Schreib-/Löschrecht | Technischer Kern vorhanden; kalenderbezogene Matrix- und Direktzugriffstests nach Fachabgleich erforderlich. |
| 3 – private Inhalte unsichtbar | RLS-Grundlage vorhanden; Direkt-ID-, Listen-, Such-/Aggregations-, Kalender- und Export-Negativnachweise für den finalen Umfang fehlen in diesem Lauf. |
| 4 – Terminperson ohne Eigentum | Bereits implementierte Trennung und CAL-SUB-Integrationstests vorhanden; hier nicht gegen eine Datenbank ausgeführt. |
| 5 – Rechteänderungen | Aktuelle DB-Prüfungen vorhanden; Rollenwechsel-Erwartungen sowie Browserzustand/Cache nach Grant-Entzug noch gezielt zu prüfen. |

Keines der Kriterien wird hier als neu erfüllt oder abschließend getestet
ausgewiesen. Neue Tests gegen eine angenommene Matrix wurden nicht ergänzt.

## Tatsächlich ausgeführte Prüfungen

| Befehl | Ergebnis |
| --- | --- |
| `npm run build` | Exit 0: Typecheck, Lint, 49 Unit-Tests in 6 Dateien und Client-Build erfolgreich. Reporter konnte die GitHub-Step-Summary wegen schreibgeschütztem Runner-Pfad nicht schreiben; bestehende Bundle-Warnung über 500 kB. |
| `npm run test:e2e -- tests/e2e/smoke.spec.ts tests/e2e/calendar-navigation.spec.ts` | Exit 1: konfigurierter Webserver konnte nicht starten; keine Browserfälle ausgeführt. Ausgewählt waren nur der Auth-Smoke-Test und Kalendernavigation mit simulierten Services. |
| `npm run dev --workspace @familyhub/client -- --host 127.0.0.1` | Exit 1: Diagnose bestätigt `listen EPERM` auf `127.0.0.1:5173`. |

DB-/RLS-Integration und datenbankgestützte E2E wurden wegen ihrer schreibenden
Fixtures und des ausdrücklichen Verbots von Datenbankänderungen nicht ausgeführt.
Die erfolgreichen Bestandsprüfungen sind kein Nachweis der neuen Fachmatrix.

## Unverändert und nächster Schritt

Nur dieser bereits vorhandene Bericht wurde aktualisiert, uncommitted. Vorhandene unversionierte
Automationsdateien wurden bewahrt. Produktcode, Baseline, Migrationen,
Schema-/Datenbankdateien, Konfiguration und Workflows bleiben unverändert.
Keine Datenbankoperation, kein Commit, Push, Merge oder Deployment wurde
ausgeführt. Stundenplan/Projektionen, Serien/Ausnahmen, Wiederholungen und
Löschlogik, Push-Empfänger sowie Import/Synchronisation wurden nicht erweitert.
Bestehende Versionsprüfungen für konkurrierende Änderungen bleiben erhalten.

**Nächster sinnvoller Schritt (Vorschlag):** Die konkret freigegebene Matrix
einschließlich Terminpersonen-/Grant-Lebenszyklus referenzierbar bereitstellen.
Danach die kleinste Kalendererweiterung gegen vorhandene RPCs umsetzen und
Matrix-, Widerrufs-, Mitgliedschaftswechsel-, Cache- und Playwright-Tests
ergänzen. Sollte die Matrix andere serverseitige Rechte erfordern, ist dafür
vorab ein separater menschlich freigegebener Datenbankauftrag erforderlich;
eine solche Änderung ist hier nicht autorisiert.
