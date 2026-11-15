# FH-CX-012 – Kontrollierter Blocker zu Issue #18

Stand: 15.11.2026. Status: **blockiert, nicht implementiert**.
Geprüfter Branch: `codex/agent-18`.

## Auftrag und Befund

Das Kalender-Epic verlangt das Verschieben, Absagen und Ändern genau eines
Serienvorkommens über eine stabile `occurrence_key`. Die acht Akzeptanzkriterien
umfassen außerdem unveränderte übrige Vorkommen, eindeutige Identifikation über
`series_id` und `occurrence_key`, Idempotenz, Rücknahme einer Ausnahme,
Versionskonflikte, serverseitige und RLS-gesicherte Familienisolation sowie
deterministische Anzeige, erneutes Lesen und Löschen.

Die im Issue vorausgesetzte Seriengrundlage FH-CX-011 ist im vorliegenden
Repository-Stand nicht implementiert auffindbar:

- `packages/calendar-domain/src/index.ts` enthält nur den Modulstatus für
  Einzeltermine, keine Serienauflösung oder Vorkommensidentität.
- `apps/client/src/calendar/calendar-service.ts` liest `calendar_events` und
  verwendet ausschließlich die vorhandenen Einzeltermin-RPCs.
- `supabase/migrations/20261112180000_create_calendar_events.sql` definiert
  Einzeltermine. Auch die nachfolgenden Kalender-Migrationen ergänzen keine
  Serienregeln, Vorkommensschlüssel oder Ausnahme-Persistenz.
- `apps/client/src/auth/database.types.ts` bildet Einzeltermine und deren
  Create-/Update-/Delete-RPCs ab, keine Serien-/Ausnahmeoperationen.
- `03-backlog.md`, Abschnitte 3.1 und 5, führt FH-CX-011 als noch zu
  konkretisierende Seriengrundlage und als Vorgänger von FH-CX-012.

Die Projektquellen liegen als `01-fachkonzept.md`, `02-architektur.md`,
`03-backlog.md` und `04-entscheidungen.md` im Repository-Wurzelverzeichnis,
nicht unter den in AGENTS.md genannten `docs/`-Pfaden. Sie wurden ebenso wie
die ergänzende Architektur-, ADR- und Testdokumentation geprüft. Die fachliche
Freigabe des aktuellen Issues wird dadurch nicht widerrufen; es fehlt die
technische Voraussetzung im geprüften Stand.

## Konflikt mit dem erlaubten Umfang

Dauerhaftes Wiederlesen, Rücknahme und atomare, idempotente Änderungen einer
Ausnahme benötigen eine bestehende persistente Serien-/Vorkommensidentität
sowie passende autorisierte Operationen. Die vorhandenen Einzeltermin-RPCs
können diese Anforderungen nicht erfüllen. Das Anlegen dieser Datenstrukturen,
Constraints, RPCs und Policies würde die ausdrücklich verbotenen Schema- und
Datenbankdateiänderungen erfordern.

Eine Browser-Speicherung oder Umwandlung in zusätzliche Einzeltermine würde
Persistenz-, Identitäts-, Duplikat- und Sicherheitsanforderungen nicht erfüllen.
Deshalb wurden keine Ersatzlogik, neue Seriennotation oder eigenen
Berechtigungsregeln implementiert. Keines der acht Akzeptanzkriterien von
FH-CX-012 wird als erfüllt oder getestet ausgewiesen.

Auch der benötigte Zeitvertrag aus FH-CX-014 ist im Backlog weiterhin offen.
Die Semantik stabiler Vorkommensschlüssel bei Verschiebungen und
Sommerzeitwechseln wird deshalb nicht eigenständig festgelegt. Der separate
Datenbank-/RLS-Vertrag aus FH-CX-011 muss insbesondere Eindeutigkeit,
atomare Versionsprüfung, Retry-Verhalten und vererbte Autorisierung absichern.

## Prüfungen des unveränderten Implementierungsstands

Die folgenden Befehle wurden am 15.11.2026 erneut ausgeführt:

| Befehl | Tatsächliches Ergebnis |
| --- | --- |
| `npm run typecheck` | Erfolgreich, Exit 0 |
| `npm run lint` | Erfolgreich, Exit 0 |
| `npm run test:unit` | 43 Tests in 5 Dateien erfolgreich, Exit 0; zusätzlicher Reporter-Hinweis: GitHub-Schrittzusammenfassung wegen schreibgeschütztem Dateisystem nicht schreibbar |
| `npm run build:client` | Erfolgreich, Exit 0; bestehende Warnung für Bundle über 500 kB |
| `npm run test:e2e -- tests/e2e/smoke.spec.ts` | Nicht ausführbar: Webserverstart fehlgeschlagen, Exit 1 |
| `npm run dev --workspace @familyhub/client -- --host 127.0.0.1` | Diagnose des Webserverfehlers: `listen EPERM` auf `127.0.0.1:5173`, Exit 1 |

Integrations-/RLS-Tests und datenbankgestützte E2E-Flüsse wurden nicht
ausgeführt: Ihre Fixtures schreiben Daten; Datenbankänderungen sind im
Agentenlauf ausgeschlossen. Neue Funktionstests wurden mangels implementierbarer
Serien-/Ausnahmeoperationen nicht ergänzt. Die bestehenden erfolgreichen
Prüfungen sind kein Nachweis für FH-CX-012.

## Unverändert und nächste Voraussetzung

Anwendung, Verträge, Datenbankdateien, Migrationen, Konfiguration, Workflows und
Baseline bleiben unverändert. Kalender-/Stundenplanprojektionen, Teilnehmer,
Push-Empfänger, Import/Synchronisation und Rollen werden nicht erweitert.
Es wurden keine Datenbankoperationen, Commits, Pushes oder Merges ausgeführt.
Bereits vorhandene unversionierte Automationsdateien bleiben erhalten.

**Bevorzugter nächster Schritt (Vorschlag):** Den Stand mit implementierter und
geprüfter FH-CX-011-Grundlage samt freigegebenem Vorkommens-/Zeitvertrag
bereitstellen. Falls diese Grundlage noch fehlt, muss sie zuerst in einem
separaten menschlich freigegebenen Auftrag einschließlich notwendiger
Schema-/RPC-/RLS-Arbeit entstehen. Danach FH-CX-012 gegen die tatsächlich
vorhandenen Schnittstellen erneut prüfen; fehlende Ausnahme-Persistenz benötigt
ebenfalls einen gesondert freigegebenen Datenbankauftrag.

Vor einer Abnahme bleiben alle im Issue geforderten Ausnahme-, Rücknahme-,
Grenzzeit-, Idempotenz-, Konkurrenz-, Cross-Family-/Privat-RLS- und
Kalenderanzeige-/Fehlerzustandstests auszuführen. Dabei dürfen Änderungen
eines Vorkommens weder die Serie noch fremde Vorkommen oder Sichtbarkeiten
verändern.
