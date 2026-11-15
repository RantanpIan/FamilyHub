# FH-CX-013 – Kontrollierter Blocker zu Issue #19

Stand: 15.11.2026. Status: **blockiert; keine Funktionsänderung implementiert**.
Geprüfter Branch: `codex/agent-19`.

Erneute Bestandsprüfung am 15.11.2026: Der erneut übergebene Auftrag enthält
weiterhin denselben ausdrücklichen Freigabevorbehalt. Der Blocker bleibt
deshalb bestehen. Die unten aufgeführten Befehle wurden in diesem Lauf erneut
ausgeführt und lieferten dieselben Ergebnisse; es wurde keine Funktion ergänzt.

## Ergebnis der erneuten Prüfung

Der aktuelle Auftrag konkretisiert reine Lese-Freigaben bei
Eigentümer-Schreibrechten. Die zuvor hier dokumentierten Widersprüche der
Matrix sind damit überholt: Ein Grant erlaubt ausschließlich Lesen, auch bei
privaten Terminen; Ändern und Löschen bleiben dem Eigentümer vorbehalten.
Die Terminperson erhält durch ihre Zuordnung weder Eigentum noch automatische
Schreibrechte. Fremde Familien bleiben ausgeschlossen.

**Verbleibender Freigabeblocker:** Der Status im aktuellen Auftrag lautet
„Konkretisierter Umsetzungsvorschlag“ und ausdrücklich: „Das Issue bleibt bis
zur bewussten erneuten Freigabe technisch blockiert.“ Eine ausdrückliche
Aufhebung dieses Vorbehalts liegt im übergebenen Auftrag nicht vor. Die
allgemeine Aufforderung zur Bearbeitung wird deshalb nicht als Aufhebung der
konkreten Sperre ausgelegt. AGENTS.md, Abschnitte 3 und 10, verlangt die
Klärung wesentlicher Sicherheits-/Baseline-Entscheidungen. Der Vorschlag wird
hier nicht eigenständig als beschlossen oder zur Umsetzung freigegeben erklärt.

## Geprüfte Quellen und bestehende Umsetzung

Die Baseline-Dateien liegen im Repository-Wurzelverzeichnis:
`01-fachkonzept.md`, `02-architektur.md`, `03-backlog.md` und
`04-entscheidungen.md`; die in AGENTS.md genannten `docs/`-Pfade treffen auf
diese vier Dateien nicht zu. Geprüft wurden außerdem die Anforderungs- und
Architekturdokumentation unter `docs/`, ADR 0004, Package-Skripte,
Kalender-/Access-Services, TypeScript-Policy, Kalenderoberfläche und vorhandene
Unit-, Browser- und RLS-Testfälle sowie die relevanten bestehenden Migrationen.

- `packages/authorization/src/index.ts` unterscheidet Eigentum,
  familienweite Lesbarkeit und widerrufbare Lese-Grants. Schreiben/Löschen
  bleiben Eigentümerrechten vorbehalten; Adminstatus gewährt keine Ausnahme.
- `supabase/migrations/20261112193000_add_calendar_event_commands.sql` prüft
  in Update und Delete `public.owns_resource` und die erwartete Version.
- `supabase/migrations/20261023145000_fix_resource_returning_select_policy.sql`
  erlaubt Lesen für Eigentümer, aktive Familienmitglieder bei `family` oder
  Empfänger aktiver Lese-Grants. Familie, Mitglied und Mitgliedschaft müssen
  aktiv sein. Ein Grant kann auch bei `private` Lesen erlauben;
  „explizit freigegeben“ ist kein dritter gespeicherter Sichtbarkeitswert.
- `supabase/migrations/20261112210000_add_calendar_event_subject.sql` trennt
  Terminperson und Eigentümer. Bei privater Erstellung für eine andere
  Terminperson wird automatisch ein Lese-Grant erteilt, kein Schreibrecht.
  Dieser bestehende Ablauf wurde nicht verändert; seine Einbindung in die
  Freigabeverwaltung ist bei Umsetzung ausdrücklich zu berücksichtigen.
- `calendar-service.ts` lädt Termine und Ressourcenmetadaten unter RLS.
  `resource-access-service.ts` bietet bereits RPC-Aufrufe für Sichtbarkeit,
  Grant-Erteilung und Widerruf. Eine neue Migration ist deshalb nicht allein
  wegen einer Freigabeoberfläche erforderlich und wird hier nicht als
  pauschaler technischer Blocker angeführt.

Dies sind Codebefunde, kein Nachweis gegen eine laufende Datenbank.
Die neue Matrix entspricht hinsichtlich Lese-Grants und Eigentümermutationen
dem vorhandenen Sicherheitskern. Eine vollständige Erfüllung aller
Akzeptanzkriterien, insbesondere sofortige Wirkung bei allen Zugriffswegen
und Cache-Invalidierung, ist damit nicht nachgewiesen. Die im Auftrag genannte
Abhängigkeit FH-CX-014 ist durch diese Prüfung ebenfalls nicht abgenommen.

## Akzeptanz und tatsächlich ausgeführte Prüfungen dieses Laufs

Keine neue Freigabeoberfläche, Rechtevergabe oder Matrix-Testimplementierung.
Die neun Akzeptanzkriterien von FH-CX-013 bleiben unabgenommen. Bestehende
Bestandsprüfungen sind keine Abnahme des blockierten Auftrags.

| Befehl | Ergebnis |
| --- | --- |
| `npm run build` | Exit 0: Typecheck, Lint, 49 Unit-Tests in 6 Dateien und Client-Build erfolgreich. Vitest konnte die GitHub-Step-Summary wegen schreibgeschütztem Runner-Pfad nicht schreiben; Bundle-Warnung über 500 kB. |
| `npm run test:e2e -- tests/e2e/smoke.spec.ts tests/e2e/calendar-navigation.spec.ts` | Exit 1: konfigurierter Webserver konnte nicht starten; keine Browserfälle ausgeführt. Die ausgewählten Tests benötigen keine Datenbankschreibzugriffe. |

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

**Nächster sinnvoller Schritt:** Die verantwortliche Person hebt den im
Issue ausdrücklich beibehaltenen Blockierstatus bewusst auf und gibt die
konkretisierte reine Lese-Variante zur Umsetzung frei. Anschließend können
die vorhandenen Ressourcen-/Owner-RPCs für die kleinste Freigabeoberfläche
verwendet und die neun Akzeptanzkriterien gezielt geprüft werden. Datenbank-
änderungen bleiben auch nach dieser fachlichen Freigabe außerhalb dieses
Agentenauftrags; echte RLS-Nachweise benötigen eine separat zulässige Testumgebung.
