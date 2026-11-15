# FH-CX-018 – Kontrollierter Blocker zu Issue #24

Stand: 15.11.2026. **Status: blockiert; Empfängerauflösung nicht implementiert.**
Geprüfter Feature-Branch: `codex/agent-24`.

## Auftrag und Quellen

Ziel des Auftrags ist die familienbezogene Empfängerauflösung einschließlich
erneuter Autorisierung vor Versand. Der übergebene Issue-Text kennzeichnet
Scope und Akzeptanzkriterien ausdrücklich als Planungsvorschlag. Die Übergabe
als geprüfter Issue-Auftrag liefert keine konkreten fehlenden Fachverträge.
Ein GitHub-Label wurde in diesem Lauf nicht extern geprüft.

Gelesen wurden `AGENTS.md`, die im Repository-Root liegenden Projektquellen
`01-fachkonzept.md`, `02-architektur.md`, `03-backlog.md` und
`04-entscheidungen.md`, Architekturüberblick und Modulgrenzen unter `docs/`,
ADR 0004/0005 sowie der bestehende FH-CX-015-Blocker. Die vier Root-Dateien
sind rekonstruierte Arbeitsfassungen; eine zusätzliche Originalquelle oder
konkrete Fachfreigabe zu FH-CX-018 wurde darin nicht gefunden.

## Geprüfter Ist-Stand

| Quelle | Befund |
| --- | --- |
| `packages/contracts/src/index.ts` | Strikter Auswahlvertrag `all` / `selected_members` mit eindeutigen Mitglieds-UUIDs; keine autorisierte Auflösung und keine Namenszuordnung. |
| `packages/notifications-domain/src/index.ts` | Ausschließlich Modulstatus `unavailable`; keine Versand- oder Queue-Operation. |
| `packages/authorization/src/index.ts` | Reine Ressourcen-Policy auf übergebenen Daten; kein Abruf aktueller Empfänger-/Subscription-Einstellungen und kein Ersatz für RLS. |
| `supabase/functions/README.md` | Keine implementierte Edge Function oder Benachrichtigungszustellung. |
| `apps/client/src/auth/database.types.ts`, `supabase/migrations/` | Keine Benachrichtigungs-, Subscription-, Einstellungs-, Outbox- oder Queue-Grundlage auffindbar. Nur lesend geprüft, keine laufende Datenbank untersucht. |
| ADR 0004/0005 | Familiengebundene Mitgliedschaften und Leserechte vorhanden; Rollenänderungen, Kinderaktivierung und Vertretung bleiben offen. |
| `03-backlog.md`, Abschnitt 3.1 | FH-CX-017/018 sind Vorschläge mit offenen Originalaufträgen bzw. Abhängigkeiten. |

## Blocker und bevorzugte Auflösung

„Aktiv erreichbar“ ist ohne freigegebenen Kanal-/Subscription- und
Einstellungsvertrag nicht implementierbar. Insbesondere darf aus einem aktiven
Familienmitglied oder einer bekannten UUID keine Zustellbarkeit abgeleitet
werden. Es fehlt die tatsächliche serverseitige Versandgrenze, an der aktuelle
Mitgliedschaft, Ressourcenrechte und Einstellungen erneut geprüft werden.
Ein alleiniger Clientfilter oder ein mit frei übergebenen Snapshots getesteter
Resolver würde diese Sicherheitsanforderung nicht nachweisen.

Die Baseline verwendet neutrale Mitgliedsbezeichnungen. Die abweichenden
personenspezifischen Optionen des Vorschlags begründen keine globale
Namenssuche, feste IDs oder automatische Verknüpfung. Benötigt wird eine
freigegebene Zuordnung der Anzeigeauswahl zu Mitglieds-IDs im Familienkontext.
Für Mitglieder ohne Login werden keine Vertretungsrechte erfunden.

**Bevorzugter nächster Schritt (Vorschlag):** Einen konkret freigegebenen
Scope mit Originalquelle oder Fachentscheidung bereitstellen, einschließlich
Definition von Erreichbarkeit, maßgeblichen Einstellungen, Auswahlzuordnung
und Umgang mit inzwischen unzulässigen Einzelzielen. Den implementierten
FH-CX-017-Vertrag sowie autorisierte Lese-/Versand-/Queue-Schnittstellen
bereitstellen und die Relevanz von FH-OPEN-001/002/007 für diesen Teilumfang
explizit abgrenzen. Falls dafür Schemaänderungen nötig sind, benötigen sie
einen separaten menschlich freigegebenen Auftrag; dieser Lauf erlaubt sie nicht.

## Akzeptanzkriterien und verbleibende Tests

| AK des Vorschlags | Status / fehlender Nachweis |
| --- | --- |
| 1 | Nicht implementiert: freigegebene Auswahlzuordnung und autorisierte Auflösung fehlen. |
| 2 | Nicht nachgewiesen: familienbegrenztes `all` einschließlich definierter aktiver Erreichbarkeit. |
| 3 | Nicht nachgewiesen: erneute Prüfung nach Mitgliedschafts-/Rollenwechsel, Sichtbarkeits- und Einstellungswiderruf bis zur Versandgrenze. |
| 4 | Nicht nachgewiesen: unbekannte/fremde Ziele über tatsächliche API und Queue fail-closed ablehnen. |

Nach Bereitstellung der Verträge sind Matrix-Tests für einzelne Mitglieder,
`all`, fremde Familie und fehlende Mitgliedschaft, Widerrufs-/Wechseltests,
direkte API-/Queue-Negativtests und deterministische wiederholte Auflösung
erforderlich. Wiederholbare Auflösung ersetzt keine Zustellungsdeduplizierung.
Neue Tests wurden mangels ausführbarer Fachfunktion nicht ergänzt.
Bestehende Vertragstests stellen keine Abnahme von FH-CX-018 dar.

## Tatsächlich ausgeführte Prüfungen

| Befehl | Ergebnis |
| --- | --- |
| `npm run build` | Exit 0: Typecheck, Lint, 58 Unit-Tests in 7 Dateien und Client-Build erfolgreich. Reporter meldet `EROFS` beim Schreiben der GitHub-Step-Summary; Bundle-Warnung über 500 kB. |
| `npm run test:e2e -- tests/e2e/smoke.spec.ts tests/e2e/calendar-navigation.spec.ts` | Exit 1: konfigurierter Webserver konnte nicht starten; keine Browserfälle ausgeführt. Die ausgewählten Tests benötigen keine DB-Schreibzugriffe. |

Integration/RLS und datenbankgestützte E2E wurden nicht ausgeführt, weil ihre
Fixtures Daten verändern und Datenbankänderungen ausdrücklich verboten sind.
Keine Datenbank wurde gestartet, migriert oder zurückgesetzt.

## Änderungen und Abgrenzung

Nur dieser Bericht wurde ergänzt und uncommitted hinterlassen. Die bereits
vorhandenen unversionierten Automationsdateien wurden bewahrt. Produktcode,
Tests, Baseline, Schema, Migrationen, Konfiguration und Workflows bleiben
unverändert; kein Commit, Push, Merge oder Deployment wurde ausgeführt.

Kalender/Stundenplan, Projektionen, Serien/Ausnahmen, Löschungen,
Rollen/Sichtbarkeit, Push-Empfänger, Import/Synchronisation und der bestehende
Schutz konkurrierender Änderungen bleiben unverändert. Es entsteht keine
zusätzliche fachliche Wahrheitsquelle. Die Funktion bleibt offen, bis die
fehlenden Grundlagen und sämtliche Sicherheitsnachweise vorliegen.
