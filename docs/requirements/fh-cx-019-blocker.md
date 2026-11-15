# FH-CX-019 – Kontrollierter Blocker zu Issue #25

Stand: 15.11.2026. **Status: blockiert; keine Funktion implementiert.**
Geprüfter Feature-Branch: `codex/agent-25`.

## Quellen und Ist-Stand

Geprüft wurden `AGENTS.md`, die vier Projektquellen im Repository-Root
(`01-fachkonzept.md`, `02-architektur.md`, `03-backlog.md`,
`04-entscheidungen.md`), vorhandene Verträge, Benachrichtigungsmodul,
Datenbanktypen, Migrationen, Testkonfiguration und Package-Skripte.

- Fachkonzept A.4 lässt Vorlaufzeiten, Kategorien, Ruhezeiten und
  Gerätepräferenzen ausdrücklich offen.
- Das Backlog führt FH-CX-019 als Vorschlag mit fehlendem Originalauftrag
  und offener Entscheidung. FH-CX-017/018 sind nicht als abgeschlossen belegt.
- `FH-OPEN-007` im Entscheidungsregister ist offen. Architektur B.1.3/4
  fordert robuste Hintergrundverarbeitung und erneute Autorisierung vor
  Zustellung, legt aber keinen konkreten Einstellungsvertrag fest.
- `packages/notifications-domain/src/index.ts` enthält nur den Modulstatus
  `unavailable`. Der gemeinsame Vertrag enthält eine Empfängerauswahl,
  keine Einstellungs-, Geräteverwaltungs- oder Scheduler-Schnittstelle.
- In den geprüften Datenbanktypen und Migrationen ist keine Persistenz für
  Benachrichtigungseinstellungen erkennbar. Implementierte Einstellungs-RPCs,
  zugehörige RLS-Regeln oder Scheduler wurden nicht gefunden.
  Dies ist ein Repository-Befund, keine Prüfung einer laufenden Datenbank.

## Blocker und notwendige Konkretisierung

Der kontrollierte Auftrag autorisiert die Prüfung, liefert jedoch keine
konkreten fachlichen Regeln zur Auflösung der offenen Baseline-Fragen.
Ein Label oder der Start des Agentenlaufs ersetzt diese Regeln nicht.
Vor Umsetzung werden Originalquelle oder ausdrückliche fachliche Freigabe
mit endgültigem Scope, Akzeptanzbeispielen und Definition of Done benötigt:

1. Geltung pro Konto, Gerät und Familie einschließlich Vorrang bei mehreren
   Einstellungen sowie Änderungsberechtigung; keine neuen Rollenrechte ableiten.
2. Zulässige Vorlaufwerte, Kategorien und Verhalten ohne gespeicherte Einstellung.
3. Ruhezeitgrenzen einschließlich Mitternacht, Wochenenden, maßgeblicher
   Zeitzone und Sommerzeit sowie Unterdrückung oder Verschiebung fälliger Hinweise.
4. Wirkung geänderter Einstellungen auf bereits geplante, noch nicht
   zugestellte Hinweise und erneute Prüfung bei Mitgliedschaftsentzug.

Zusätzlich fehlt die nutzbare Grundlage aus FH-CX-017/018 für Geräte,
familienbezogene autorisierte Empfänger und Einstellungen. Die geforderte
dauerhafte Speicherung mit serverseitiger Autorisierung und RLS kann nicht
durch Browserpersistenz oder einen In-Memory-Ersatz erfüllt werden.
Neue Schema-/Datenbankdateien sind in diesem Lauf ausdrücklich verboten;
falls die Grundlage neu geschaffen werden muss, ist dafür ein separater
menschlich freigegebener Auftrag erforderlich.

## Akzeptanzkriterien und Restprüfungen

| Kriterium | Ergebnis / fehlender Nachweis |
| --- | --- |
| 1: Berechtigte Speicherung und Familienkontext | Nicht implementiert; Einstellungsvertrag, Persistenz und autorisierte Operationen fehlen. |
| 2: Deterministische Zeitregeln | Nicht implementiert; fachliche Zeit- und Konfliktregeln fehlen. |
| 3: Verständliche Ablehnung | Nicht implementiert; zulässige Werte und Widersprüche müssen zuerst feststehen. |
| 4: Wirkung auf zukünftige Zustellung ohne Offenlegung | Nicht nachgewiesen; Scheduler-Vertrag und erneute Autorisierung fehlen. |

Nach Klärung bleiben Unit-Grenzfälle für Vorlauf, Ruhezeiten, Wochenenden,
Zeitzonen und Sommerzeit sowie API-/RLS-Negativ- und Cross-Family-Tests,
Familienwechsel, widerrufene Mitgliedschaft, private Ereignisse und ein
deterministischer Scheduler-Test ohne echte Zustellung erforderlich.
Es wurden keine Tests gegen erfundene Produktregeln ergänzt.

## Tatsächlich ausgeführte Prüfungen

`npm run build` – **Exit 0**: Typecheck, Lint, 58 Unit-Tests in 7 Dateien
und Client-Build erfolgreich. Der Vitest-Reporter konnte die GitHub-Step-Summary
wegen `EROFS` nicht schreiben; Vite meldete einen Chunk über 500 kB.
Diese Prüfung ist keine fachliche Abnahme von FH-CX-019.

Integration/RLS wurden wegen datenverändernder Fixtures und des ausdrücklichen
Datenbankänderungsverbots nicht ausgeführt. E2E wurden für den reinen
Blockerbericht nicht ausgeführt; eine neue Benutzerfunktion existiert nicht.
Es wurde keine Datenbank gestartet, migriert oder geändert.

## Änderungen, Abgrenzung und nächster Schritt

Nur dieser Bericht wurde ergänzt und uncommitted hinterlassen. Vorhandene
unversionierte Automationsdateien bleiben erhalten. Keine Migrationen,
Produktcode-, Baseline-, Workflow- oder Konfigurationsänderungen; kein Commit,
Push, Merge, Deployment oder echte Pushzustellung.

Kalender und Stundenplan, Projektionen und reale Termine, Serien und Löschungen,
Rollen/Sichtbarkeit, Push-Empfänger, Import/Synchronisation und konkurrierende
Änderungen bleiben unverändert. Es entstehen keine zusätzlichen Defaults,
Rechte oder fachlichen Wahrheitsquellen.

**Nächster sinnvoller Schritt (Vorschlag):** Die oben genannten fachlichen
Regeln freigeben und den geprüften Stand der Abhängigkeiten samt autorisiertem
Persistenz-/Scheduler-Vertrag bereitstellen. Anschließend einen ausführbaren
Teilauftrag mit vorhandenen Testbefehlen und eindeutiger Definition of Done
freigeben; erforderliche Datenbankarbeiten separat beauftragen.
