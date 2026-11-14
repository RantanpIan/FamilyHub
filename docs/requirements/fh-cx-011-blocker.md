# FH-CX-011 – kontrollierter Blocker zu Issue 17

Stand: 14.11.2026. **Status: blockiert; keine Serienfunktion implementiert.**

## Geprüfter Ist-Stand

Die Projektquellen liegen im Repository-Root als `01-fachkonzept.md`,
`02-architektur.md`, `03-backlog.md` und `04-entscheidungen.md`, nicht unter
den in AGENTS.md genannten `docs/`-Pfaden.

- Fachkonzept A.2 bezeichnet Wiederholungsnotation und die Operationen „nur
  dieses Vorkommen“, „dieses und folgende“ sowie „gesamte Serie“ als offen.
- Architektur, Abschnitt zu Unterrichtsprojektionen, führt Seriensyntax und
  dauerhaft gespeicherte Ausnahmen als offen.
- Das Entscheidungsregister führt die Kalender- und Zeitdetails unter
  `FH-OPEN-003` und `FH-OPEN-004` als offen.
- Das Backlog führt FH-CX-011 mit offener Regelnotation und Änderungssemantik.
  Die vorhandene Monatsansicht ist dort separat als FH-CAL-001 beschrieben;
  sie belegt keine Abnahme des Originalumfangs von FH-CX-010.
- `calendar_events`, die Kalender-RPCs und der Client-Service unterstützen
  Einzeltermine. Es gibt keinen implementierten Vertrag zur Speicherung einer
  Serienregel oder atomaren Änderung einer Serie. Das vorhandene
  Idempotenzregister betrifft die Erstellung eines Einzeltermins.

## Fehlende Voraussetzungen

Der aktuelle Auftrag erklärt die fachlichen Regeln für geprüft und freigegeben,
enthält aber weder deren Definition noch eine konkrete ergänzende Quelle.
Seine Freigabe allein legt die folgenden Verhaltensweisen nicht fest:

1. Regelnotation, unterstützte Frequenzen und Intervalle, Endbedingungen und
   deren Inklusivität sowie der vereinbarte Erzeugungszeitraum.
2. Zulässige Änderungs- und Beendigungsoperationen mit ihren Grenzen und dem
   Verhalten bereits veränderter oder vergangener Vorkommen; Abgrenzung zu
   FH-CX-012 für einzelne Ausnahmen.
3. Behandlung nicht existierender beziehungsweise doppelt vorkommender lokaler
   Uhrzeiten bei Sommerzeitwechseln, Zeitzonenänderungen und Termindauer.

Zusätzlich fehlt ein persistenter, serverseitig autorisierter Serienvertrag.
Schema-, Migrations- und Datenbankänderungen sind in diesem Agentenlauf
ausdrücklich verboten. Mehrere vorhandene Einzeltermin-RPCs aus dem Client
aufzurufen würde keine atomare Serie mit sicherer Konfliktbehandlung ergeben.
Ein lokaler Serienspeicher würde eine zusätzliche Wahrheitsquelle schaffen.
Beides erfüllt die Akzeptanzkriterien nicht.

## Auswirkung auf die Akzeptanzkriterien

| Kriterium | Fehlender Nachweis |
| --- | --- |
| 1 – deterministische Vorkommen | Konkrete Regel und Zeitraum fehlen |
| 2 – Änderung/Beendigung | Verbindliche Änderungsgrenzen und atomarer Serienvertrag fehlen |
| 3 – lokale Zeit/DST | Fachliche Behandlung mehrdeutiger und fehlender Uhrzeiten fehlt |
| 4 – Validierung vor Speicherung | Zugelassene Regelsprache und serverseitiger Speichervertrag fehlen |
| 5 – Idempotenz/Konkurrenz | Serienidentität und transaktionale Operationen fehlen |

Neue Serien-, RLS- oder Integrationstests würden ohne diese Voraussetzungen
erfundene Regeln beziehungsweise einen nicht vorhandenen Vertrag testen.
Bestehende Einzelterminprüfungen belegen keine Serienfunktion.

## Nächster sinnvoller Schritt – Vorschlag

Die konkret freigegebenen Regel-, Zeit- und Änderungsdefinitionen als
referenzierbare Quelle bereitstellen und den Stand der Abhängigkeit FH-CX-010
klären. Anschließend einen separaten menschlich freigegebenen Auftrag für den
notwendigen Datenbankvertrag einschließlich RLS, Transaktionen, Versionierung
und Idempotenz durchführen. Danach kann die Serienimplementierung auf diesem
Vertrag aufbauen. Dieser Bericht trifft keine neue Produkt- oder
Architekturentscheidung und erteilt keine Datenbankfreigabe.

Produktcode, Baseline, Migrationen, Rollen, Sichtbarkeit, Push, Import und
Stundenplanprojektionen bleiben unverändert. Datenbanktests werden in diesem
Lauf wegen ihrer schreibenden Fixtures nicht ausgeführt.

## Tatsächlich ausgeführte Prüfungen

`npm run build` endete mit Exitcode 0: Typecheck, ESLint, alle 43 Unit-Tests
in fünf Dateien und der Vite-Client-Build waren erfolgreich. Der Vitest-Reporter
konnte die GitHub-Step-Summary wegen eines schreibgeschützten Runner-Pfads
nicht schreiben; der Build meldete außerdem die bestehende Warnung zu einem
Bundle über 500 kB. Browser-E2E und DB-/RLS-Integration wurden nicht
ausgeführt; es wurde ausschließlich dieser Blockerbericht ergänzt.
