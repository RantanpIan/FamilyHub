# FH-CX-014 – Kontrollierter Blocker zu Issue #20

Stand: 15.11.2026. Status: **blockiert; keine Funktionsänderung implementiert**.
Geprüfter Feature-Branch: `codex/agent-20`.

## Erneute Prüfung zu Issue #20

Der aktuell vorgelegte Auftrag trennt ausdrücklich Teil A (Anzeige, lokale
Berechnung, Ganztage, Sortierung und Client-Regressionen) und Teil B
(serverseitige Validierung). Er gibt die Analyse frei, sperrt aber den Start
von FH-CX-014 bis zur Entscheidung zu Teil B. Teil A kann erst nach vollständiger
fachlicher Prüfung als eigener agent-ready Auftrag bearbeitet werden; eine
solche separate Freigabe liegt in diesem Auftrag nicht vor. Daher wurde auch
keine Client-Teilimplementierung begonnen.

Teil B benötigt eine separate menschliche Freigabe für Servercode/Migration.
Die maßgebliche Validierung liegt weiterhin in der PostgreSQL-Funktion
`private.validate_calendar_event_input`; ihre Datei ist im Agentenlauf gesperrt.
Eine Browserprüfung würde direkte RPC-Aufrufe nicht absichern. FH-OPEN-004 wird
nicht neu entschieden; eine globale Standardzeitzone ist keine Voraussetzung
für die Aufhebung dieses konkreten Blockers.

Vor Teil B bleiben ausdrücklich festzulegen:

1. Der unterstützte endliche Zeit-/Datumsbereich.
2. Ablehnung oder Korrektur nicht existierender lokaler Frühlingszeiten.
3. Eindeutige Behandlung doppelter lokaler Herbstzeiten.
4. Unveränderte historische Daten oder eine separat beauftragte Prüfung.
5. Die erlaubte Test-/Zielumgebung einschließlich separater Anwendungsfreigabe.

Die folgenden Prüfungen betreffen unveränderten Produktcode und sind kein
Abnahmenachweis für FH-CX-014.

## Auftrag und geprüfter Vertrag

Ziel des Kalender-Epics ist die konsistente Speicherung, Validierung und
Anzeige von Einzelterminen über Zeitzonen und Sommerzeitwechsel hinweg.
Die aktuelle Freigabe wird berücksichtigt: keine globale Standardzeitzone,
keine neue Serienfunktion und keine Datenbankdatei- oder Datenbankänderung.

Geprüft wurden AGENTS.md, die Baseline-Dateien `01-fachkonzept.md`,
`02-architektur.md`, `03-backlog.md`, `04-entscheidungen.md` im Repository-Root
(nicht unter den dort angegebenen `docs/`-Pfaden), ergänzende Architektur-,
ADR-/Testdokumentation und die Blockerberichte zu FH-CX-011 bis FH-CX-013.
Die Abhängigkeit FH-CX-011 ist im vorliegenden Stand nicht implementiert;
das allein verhindert jedoch keine Verbesserung der vorhandenen Einzeltermine.

Der bestehende Einzelterminvertrag ist bereits geeignet, Zeitpunkte und lokale
Ganztage zu unterscheiden:

- `calendar_events` speichert zeitgebundene Termine als `timestamptz` plus
  `time_zone`, Ganztage als `date`-Intervall mit exklusivem Enddatum.
- `private.validate_calendar_event_input` in
  `supabase/migrations/20261112193000_add_calendar_event_commands.sql`
  prüft Pflichtwerte, die Zeitzone gegen `pg_timezone_names`, die Reihenfolge
  und den Ausschluss gemischter Datum-/Zeitwerte. Create und Update nutzen
  diese Funktion; die Terminpersonen-Erstellung delegiert an Create.
- `eventOnDay` und die Termindarstellung verwenden bei zeitgebundenen
  Terminen die Ereigniszeitzone; Ganztagesdaten werden als Datumswerte behandelt.
- RLS-Lesen erfolgt über `can_read_resource`, Schreiben/Löschen über
  Eigentümerprüfung und Version. Die Browserzeitzone vermittelt keine Rechte.

Dies sind Codebefunde, kein neuer Nachweis an einer laufenden Datenbank.

## Konkreter Blocker und verbleibende Fehler

Der Auftrag verlangt die **serverseitige** Ablehnung nicht darstellbarer
Zeitwerte. Weder die genannte SQL-Validierung noch der Tabellen-Constraint
prüfen Endlichkeit oder den darstellbaren Wertebereich des Clients.
PostgreSQL unterstützt unter anderem `infinity` für Datum/Zeit: Ein endlicher
Beginn und ein Ende `infinity` erfüllen die vorhandene Reihenfolgeprüfung.
Auch endliche PostgreSQL-Zeitwerte sind nicht zwangsläufig im JavaScript-
Datumsbereich darstellbar. Dieser Befund wurde nicht durch einen schreibenden
API-Aufruf reproduziert.

Die maßgebliche Serverimplementierung liegt in den ausdrücklich gesperrten
Datenbankdateien. Eine zusätzliche TypeScript-Prüfung im Browser würde direkte
RPC-Aufrufe nicht absichern und das Kriterium nicht erfüllen. Es wird deshalb
keine zusätzliche Serverarchitektur als Umgehung eingeführt.

Weitere Befunde in `apps/client/src/calendar` für die anschließende Umsetzung:

- Der Editor liest Zeitpunkte in Browserzeit ein und speichert stets die
  Browserzeitzone. Beim Bearbeiten kann sich dadurch die Ereigniszeitzone ändern.
  Außerdem enthält er einen festen Fallback `Europe/Berlin`; dieser wird hier
  ausdrücklich nicht als beschlossene globale Zeitzone bestätigt.
- `oneHourAfter` und die Eingabekonvertierung verwenden lokale `Date`-Operationen.
  Für fehlende oder doppelte lokale Uhrzeiten ist kein expliziter Eingabevertrag
  implementiert. Die Auswahl des ersten/zweiten Herbst-Zeitpunkts oder eine
  automatische Verschiebung im Frühjahr wird nicht neu als Fachregel festgelegt.
- Der Service sortiert Zeitstempel lexikografisch statt ausdrücklich nach
  absoluten Zeitpunkten. Unterschiedliche Offset-Darstellungen benötigen
  entsprechende Sortierprüfungen.
- Der Ganztageseditor bietet nur einen Tag an; das Speichern eines bestehenden
  mehrtägigen Termins setzt dessen exklusives Ende auf den Folgetag zurück.

Die vorhandene sichere Trennung von Ganztagesdaten und Zeitpunkten soll erhalten
bleiben. Eine vollständige Abnahme von AK 1–4 ist mit diesen Befunden nicht
möglich. AK 5 erhält keinen neuen Laufzeitnachweis; AK 6 wurde eingehalten.
Es wurde keine Teilimplementierung als vollständige Lösung ausgegeben.

## Tatsächlich ausgeführte Prüfungen

Erneut verifiziert am 15.11.2026, Unit-Teststart 19:43:32 UTC: Die folgenden
Ergebnisse wurden im aktuellen Agentenlauf reproduziert. Der kontrollierte
Blocker besteht unverändert; es wurde keine Servervalidierung implementiert.

| Befehl | Ergebnis |
| --- | --- |
| `npm run build` | Exit 0: Typecheck, ESLint, 49 Unit-Tests in 6 Dateien und Client-Build erfolgreich. Reporter konnte die GitHub-Step-Summary auf dem schreibgeschützten Runner-Pfad nicht schreiben; bestehende Bundle-Warnung über 500 kB. |

DB-/RLS-Tests (`npm run test:integration`) wurden nicht ausgeführt: Ihre
Fixtures erzeugen und löschen Daten. Auch datenbankgestützte Browsertests
wurden wegen des ausdrücklichen Verbots von Datenbankänderungen nicht gestartet.
Playwright wurde in diesem Lauf nicht erneut gestartet: Es gibt ausschließlich
eine Berichtsänderung, keine implementierte Client-Regression. Eine europäische
Browserzeitzone wurde in diesem Lauf nicht verifiziert.
Bestehende grüne Unit-Tests sind kein Abnahmenachweis für FH-CX-014.

## Nächster sinnvoller Schritt – Vorschlag

Zunächst die fünf offenen Entscheidungen und die Serverfreigabe dokumentieren.
Teil A nach vollständiger fachlicher Prüfung als eigenen agent-ready Auftrag
bereitstellen. Einen separaten menschlich freigegebenen Auftrag für die vorhandene serverseitige
Kalendervalidierung bereitstellen: nicht endliche und außerhalb des gemeinsam
unterstützten Wertebereichs liegende Zeit-/Datumswerte kontrolliert ablehnen,
ohne Berechtigungen zu erweitern. Den unterstützten Bereich und die Behandlung
fehlender beziehungsweise mehrdeutiger lokaler Eingaben konkret referenzieren;
eine globale Standardzeitzone ist dafür nicht erforderlich.

Anschließend den bestehenden Editor um ereignisbezogene Bearbeitung ohne
unbeabsichtigten Zonen-/Dauer-/Datumswechsel erweitern und die Sortierung prüfen.
Ausstehend sind Unit-Grenzfälle für IANA-Zonen, lokale Tagesgrenzen, Ganztage,
Frühjahr/Herbst und Dauer/Sortierung; direkte API-Negativtests für Pflichtwerte,
Zone, Zeitreihenfolge und nicht darstellbare Werte; Cross-Family-/Privat-/ID-
Negativtests sowie Playwright in europäischer Zeitzone mit mobilem Layout.
DB-Nachweise benötigen einen separat autorisierten Testlauf.

Nur dieser Bericht wurde aktualisiert und uncommitted hinterlassen. Die vorhandenen
unversionierten Automationsdateien bleiben erhalten. Produktcode, Baseline,
Migrationen, Konfiguration und Rollen/Sichtbarkeit bleiben unverändert.
Keine Datenbankoperation, kein Commit, Push, Merge oder Deployment.
Serien/Ausnahmen, Stundenplanprojektionen, Push-Empfänger, Import/Synchronisation
und der bestehende Versionsschutz werden nicht erweitert oder verändert.
