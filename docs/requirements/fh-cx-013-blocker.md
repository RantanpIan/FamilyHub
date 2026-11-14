# FH-CX-013 – Kontrollierter Blocker zu Issue #19

Stand: 14.11.2026. Status: **blockiert; keine Funktionsänderung implementiert**.
Geprüfter Branch: `codex/agent-19`.

## Ergebnis der erneuten Prüfung

Der aktuelle Auftrag enthält jetzt eine konkrete Rollen-/Freigabematrix.
Die bisherige Aussage dieses Berichts, es fehle eine Matrix, ist damit überholt.
Die vorliegende Matrix widerspricht jedoch den Akzeptanzkriterien und dem
vorhandenen serverseitigen Berechtigungsmodell. Es wurde keine der
widersprüchlichen Regeln eigenständig bevorzugt oder implementiert.

| Stelle im Auftrag | Konflikt und Auswirkung |
| --- | --- |
| Matrix: „Familienmitglied mit Lesefreigabe“ darf bei familienweiten und explizit freigegebenen Terminen „Lesen/ändern/löschen“ | Umfang und AK 2 verlangen Lesen ohne automatisches Schreib-/Löschrecht. Ein Lese-Grant würde durch die Matrix zum Schreib-/Löschrecht. |
| Matrix: „Terminperson“ darf familienweite sowie explizit freigegebene Termine ändern/löschen | AK 4 schließt automatische Bearbeiterrechte durch die Zuordnung aus. Eine gesonderte Voraussetzung für Schreib-/Löschrechte ist nicht definiert. |
| Matrix: „Privat“ erlaubt anderen Mitgliedern auch mit Lesefreigabe keinen Zugriff | Im Bestand ermöglicht ein aktiver Lese-Grant auch bei `private` das Lesen; „explizit freigegeben“ ist kein eigener Sichtbarkeitswert. Bei privater Erstellung für eine andere Terminperson wird automatisch ein Lese-Grant erteilt. Offen bleibt, ob die Matrix hier die effektive Freigabe oder ein absolutes Privat-Verbot meint. |

Die Kennzeichnung der Matrix als verbindlich löst diese Widersprüche innerhalb
desselben Auftrags nicht auf. AGENTS.md, Abschnitte 3 und 10, verlangt bei
ungeklärten Sicherheits-/Baseline-Konflikten eine ausdrückliche Klärung.

## Geprüfte Quellen und bestehende Umsetzung

Die Baseline-Dateien liegen im Repository-Wurzelverzeichnis:
`01-fachkonzept.md`, `02-architektur.md`, `03-backlog.md` und
`04-entscheidungen.md`; die in AGENTS.md genannten `docs/`-Pfade treffen auf
diese vier Dateien nicht zu. Zusätzlich geprüft wurden die Architektur- und
Anforderungsdokumentation unter `docs/`, ADR 0004, Kalender-/Access-Services,
die TypeScript-Policy, Kalenderoberfläche/-Tests und bestehende Migrationen.

- ADR 0004 und `packages/authorization/src/index.ts` unterscheiden Eigentum,
  familienweite Lesbarkeit und widerrufbare Lese-Grants. Schreiben/Löschen
  bleiben Eigentümerrechten vorbehalten; Adminstatus gewährt keine Ausnahme.
- `supabase/migrations/20261112193000_add_calendar_event_commands.sql` prüft
  in Update und Delete `public.owns_resource` und `expectedVersion`.
  Eine Änderung der UI oder TypeScript-Policy könnte die Schreibrechte der
  gelieferten Matrix daher nicht serverseitig umsetzen.
- `supabase/migrations/20261023145000_fix_resource_returning_select_policy.sql`
  erlaubt Lesen für Eigentümer, aktive Familienmitglieder bei `family` oder
  Empfänger aktiver Lese-Grants; Familie, Mitglied und Mitgliedschaft müssen
  aktiv sein. Grants sind nicht auf einen dritten Sichtbarkeitswert begrenzt.
- `supabase/migrations/20261112210000_add_calendar_event_subject.sql` hält
  Terminperson und Eigentümer getrennt und erteilt bei privater Erstellung
  für eine andere Terminperson automatisch einen Lese-Grant, kein Schreibrecht.
- `calendar-service.ts` lädt Termine und Ressourcenmetadaten unter RLS.
  `resource-access-service.ts` bietet bereits RPC-Aufrufe für Sichtbarkeit,
  Grant-Erteilung und Widerruf. Für eine reine Freigabeoberfläche ist das
  Fehlen einer neuen Migration allein deshalb kein Blocker.

Dies sind Codebefunde, kein neuer Nachweis gegen eine laufende Datenbank.
Die konkret gelieferten erweiterten Schreibrechte oder ein absolutes
Privat-Verbot trotz Grant würden Änderungen an den serverseitigen
Datenbankfunktionen benötigen. Migrationen, Schema-/Datenbankdateien und
Datenbankänderungen sind in diesem Agentenlauf ausdrücklich ausgeschlossen.

## Auswirkung auf Akzeptanz und Testfälle

Die Sichtbarkeitsauswahl (AK 1), reine Leserechte (AK 2), Privat-/Grant-Semantik
(AK 3) und Rechte der Terminperson (AK 4) können ohne widerspruchsfreie
Sollregeln nicht als gemeinsame Matrix implementiert und getestet werden.
Die vorhandenen Mitgliedschafts-/Grant-Prüfungen ersetzen keinen neuen
Nachweis für AK 5 oder für Cache-Invalidierung nach Rechteentzug.

Neue Matrix-Assertions würden eine ungeklärte Sicherheitsentscheidung als
Sollverhalten festschreiben. Deshalb wurden keine solchen Tests ergänzt.
Bestehende Bestandsprüfungen gelten nicht als Abnahme von FH-CX-013.

## Tatsächlich ausgeführte Prüfungen dieses Laufs

| Befehl | Ergebnis |
| --- | --- |
| `npm run build` | Exit 0: Typecheck, Lint, 49 Unit-Tests in 6 Dateien und Client-Build erfolgreich. Vitest konnte die GitHub-Step-Summary wegen schreibgeschütztem Runner-Pfad nicht schreiben; Bundle-Warnung über 500 kB. |
| `npm run test:e2e -- tests/e2e/smoke.spec.ts tests/e2e/calendar-navigation.spec.ts` | Exit 1: konfigurierter Webserver konnte nicht starten; keine Browserfälle ausgeführt. Die ausgewählten Tests benötigen keine Datenbankschreibzugriffe. |
| `npm run dev --workspace @familyhub/client -- --host 127.0.0.1` | Exit 1: Diagnose bestätigt `listen EPERM` auf `127.0.0.1:5173`. |

DB-/RLS-Integration und datenbankgestützte E2E wurden wegen ihrer schreibenden
Fixtures und des ausdrücklichen Verbots von Datenbankänderungen nicht ausgeführt.

## Änderungen, Ausschlüsse und nächster Schritt

Nur dieser vorhandene Bericht wurde aktualisiert und uncommitted hinterlassen.
Die beiden bereits unversionierten Automationsdateien wurden bewahrt.
Produktcode, Baseline, Migrationen, Schema-/Datenbankdateien, Konfiguration
und Workflows bleiben unverändert. Kein Commit, Push, Merge oder Deployment.

Stundenplan/Projektionen, Serien/Ausnahmen, Löschlogik, Push-Empfänger,
Import/Synchronisation und Versionsschutz bei konkurrierenden Änderungen
bleiben unverändert. Es gibt keine neue Rechtevergabe oder Datenbankoperation.

**Nächster sinnvoller Schritt:** Die verantwortliche Person muss festlegen,
ob Lese-Grants und Terminzuordnung ausschließlich Leserechte vermitteln oder
welches separate ausdrückliche Schreib-/Löschrecht gelten soll. Außerdem ist
zu klären, ob „explizit freigegeben“ den bestehenden Zustand `private` plus
Lese-Grant bezeichnet und wie der automatische Grant der Terminperson bei
Privatstellung und Widerruf behandelt wird.

**Bevorzugte Lösung (Vorschlag, nicht beschlossen):** Die Matrix an AK 2/4
angleichen: Nur Eigentümer ändern/löschen; aktive Familienmitglieder lesen
bei Familienfreigabe, aktive Grant-Empfänger lesen bei expliziter Freigabe;
die Terminperson erhält aus ihrer Zuordnung kein Schreibrecht. Den
Privat-/Grant-Lebenszyklus ausdrücklich bestätigen. Dies bewahrt den
vorhandenen Sicherheitskern und vermeidet eine neue Rechteart. Werden
stattdessen die erweiterten Matrixrechte bestätigt, ist vor Umsetzung ein
separater menschlich freigegebener Datenbankauftrag erforderlich.
