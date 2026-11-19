# FH-AUTO-001 – kontrollierte Entwicklungssteuerung

**Status:** In Umsetzung auf einem separaten Feature-Branch. Der Workflow und die Regeln sind implementiert; ein End-to-End-Lauf mit OpenAI-Key und GitHub-Action-Ausführung ist noch nicht nachgewiesen.

## Ziel und bewusst begrenzter Stufe-2-Umfang

FH-AUTO-001 standardisiert kleine, bereits geprüfte Entwicklungsaufträge und bietet einen kontrollierten Übergang von einem GitHub-Issue zu einem Draft Pull Request. `agent-ready` ist dabei ein bewusster menschlicher Startschalter und kein allgemeines „Issue offen“-Signal.

Der Ablauf ist:

1. Ein Auftrag wird mit `.github/ISSUE_TEMPLATE/agent-ready.yml` erstellt.
2. Eine berechtigte Person prüft Ziel, Umfang, Akzeptanzkriterien, Tests und Ausschlüsse.
3. Erst danach wird das Label `agent-ready` gesetzt.
4. Der Workflow prüft den Auslöser, die Issue-Struktur, die Autorenzugehörigkeit und offene Draft-/PR-Duplikate.
5. Codex arbeitet höchstens drei Mal sequenziell im deterministischen Branch `codex/agent-<issue-number>`.
6. Bestehen die nicht-datenbankbezogenen Qualitätsprüfungen, wird ein Draft-PR gegen `main` erzeugt.
7. Nach drei fehlgeschlagenen Versuchen wird `agent-ready` entfernt, der Branch bleibt zur manuellen Diagnose bestehen und das Issue erhält einen klaren Blocker-Kommentar.

## Issue- und Label-Regeln

- `agent-ready` ist ein reserviertes Label für geprüfte, kleine und reversible Entwicklungsaufträge. Es darf nicht automatisch durch die Issue-Form gesetzt werden.
- Der initiale Trigger ist absichtlich auf den Repository-Eigentümer `RantanpIan` begrenzt. Eine Erweiterung auf Maintainer braucht eine dokumentierte Freigabe und eine explizite Allowlist.
- Pflichtfelder sind Auftrags-ID, Ziel, Umfang/Ausschlüsse, prüffähige Akzeptanzkriterien und Testfälle.
- Der Dropdown-Wert „Schema-, Migrations-, Cloud- oder Produktionsänderung“ ist nicht agent-ready.
- `agent-blocked` ist ein Statuslabel für den kontrollierten Abbruch nach fehlendem Secret oder drei Fehlversuchen. Falls es noch nicht existiert, legt der Workflow es bei Bedarf an.
- Ein vorhandener offener PR für den deterministischen Branch verhindert einen zweiten Lauf.
- Zum erneuten Start wird ein behobenes Issue erneut geprüft und `agent-ready` nach dem Entfernen erneut gesetzt.

## Sicherheits- und Berechtigungsregeln

- `main` wird nie ausgecheckt, bearbeitet oder gepusht. Der Agent pusht ausschließlich den deterministischen Feature-Branch; ein Draft-PR ist der einzige Übergabepunkt.
- Der Agent erhält nur den für den Branch-Push erforderlichen `contents: write`-Token. Der Token wird nicht als Umgebungsvariable an Codex übergeben; der Checkout entfernt seine Zugangsdaten vor dem Agentenschritt.
- Der OpenAI-Key wird ausschließlich als geschütztes Repository-Secret `OPENAI_API_KEY` an `openai/codex-action` übergeben. Er ist nicht im Repository, in der Issue-Datei, in Artefakten oder in Reports abzulegen.
- Die Action ist auf einen geprüften Commit gepinnt: `openai/codex-action@13e9c17417b29e9a276f73ec6ed7fb574137d3c3`. Eine Aktualisierung benötigt eine erneute Prüfung der offiziellen Action-Dokumentation und des Upstream-Commits.
- Codex läuft auf einem Linux-Runner mit `permission-profile: ":workspace"`, `safety-strategy: drop-sudo`, niedrigem Reasoning-Aufwand und ephemerem Lauf. Netzwerkzugriff für Codex ist nicht vorgesehen; npm-Abhängigkeiten werden vorher durch den bestehenden Lockfile-Workflow installiert.
- Issue-Titel und -Text werden nur als markierter, untrusted Kontext in einen temporären Prompt geschrieben. Sie dürfen keine Workflow-Regel überschreiben.
- Der Agent darf keine Cloud-/Produktionskonfiguration, Secrets, `.env`-Dateien, Workflows, Issue-Templates oder Baseline-Dokumente ändern. Migrationen und andere Schema-/Datenbankdateien sind nur erlaubt, wenn `ALLOW_LOCAL_MIGRATIONS=true` gesetzt ist und der geprüfte Issue eine lokale/testbare Freigabe ausdrücklich enthält; die Prüfung bleibt fail-closed.
- Es gibt keinen automatischen Merge, keine automatische Freigabe und keine Cloud-/Produktionsmigration. Branch-Protection und bestehende CI entscheiden weiterhin über die Freigabe.

## Idempotenz, Kosten und Fehlerkorrektur

- Concurrency ist pro Issue serialisiert und `cancel-in-progress: false`, damit kein zweiter Lauf denselben Branch parallel bearbeitet.
- Branch- und PR-Namen sind aus der Issue-Nummer deterministisch. Ein bereits vorhandener offener PR führt zu einem No-op statt zu einem Duplikat.
- Es gibt genau drei sequenzielle Agentenversuche. Jeder Versuch veröffentlicht den nachvollziehbaren Branch-Stand und einen kurzlebigen Validierungsreport als Artefakt.
- Pro Versuch gilt ein Zeitlimit von 20 Minuten. Der Workflow hat keinen Zeitplan und keine automatische Wiederholung außerhalb dieser drei Versuche.
- `effort: low`, `--ephemeral` und die Begrenzung auf die vorhandenen Qualitätsbefehle begrenzen die laufenden Kosten. Die tatsächliche OpenAI-Abrechnung bleibt vom Projekt-/Account-Limit abhängig und wird nicht durch den Workflow selbst festgelegt.

## Kommunikation und Fehlerbehebung

Jeder kontrollierte Agentenversuch schreibt zwei nachvollziehbare Issue-Kommentare:

1. **START** mit Versuch 1/3, Branch, Workflow-Lauf und den angekündigten Prüfungen.
2. **ERFOLGREICH** oder **FEHLGESCHLAGEN** mit Codex-Ergebnis, fehlgeschlagenen Prüfungen, konkretem nächsten Schritt und einer redigierten Kurzmeldung des Agents.

Der vollständige Validierungsreport und die redigierte Abschlussmeldung werden sieben Tage als Workflow-Artefakt aufbewahrt. API-Schlüssel, GitHub-/Supabase-Tokens und Bearer-Tokens werden vor Kommentar und Artefakt redigiert. Der temporäre Prompt und die nicht redigierte Abschlussmeldung werden nicht in den Feature-Branch committed.

Die Kommunikationsregel ändert keine Sicherheitsgrenzen: Der Agent darf weiterhin keine Workflows, Secrets oder Produktions-/Cloud-Konfiguration ändern. Lokale/testbare Migrationen und Schema-/Datenbankänderungen sind nur bei der geprüften `ALLOW_LOCAL_MIGRATIONS`-Freigabe erlaubt; ohne diese Freigabe bleibt der Auftrag blockiert. Ein fachlicher Blocker wird als Blocker gemeldet und nicht durch eine eigene Produktentscheidung ersetzt.


## Prüfungen und Übergabe

Der Agentenlauf verwendet die bereits vorhandenen, nicht-datenbankbezogenen CI-Befehle:

- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run test:unit`
- `npm run build:client`

Supabase-Start, Migrationen, RLS-Integrationstests und Playwright-E2E bleiben der bestehenden CI auf dem Draft-PR vorbehalten. Diese Pipeline führt keinen Datenbank-Reset und keine Cloud-Migration aus.

Die bestehende `.github/workflows/ci.yml` bleibt unverändert. Branch-Protection muss auf `main` mindestens Review und die tatsächlich vorhandenen CI-Checks verlangen; automatische Merges bleiben deaktiviert. Die konkreten Regeln konnten über die verbundene GitHub-Integration nicht gelesen werden und müssen im Repository von einer berechtigten Person bestätigt werden.

## Manuelle Einrichtung

1. In GitHub unter **Settings → Secrets and variables → Actions** ein Repository-Secret `OPENAI_API_KEY` anlegen. Empfohlen ist ein eigener Projekt-Service-Account-Key mit minimalen Rechten und Ablaufdatum; kein Admin-Key und kein persönlicher Dauer-Key.
2. Actions für das Repository aktivieren und die Ausführung externer Actions entsprechend der Organisationsrichtlinie erlauben. Die Action wird im Workflow zusätzlich auf den geprüften Commit gepinnt.
3. Das Label `agent-ready` anlegen (z. B. Farbe `1d76db`) und nur für geprüfte Aufträge verwenden. `agent-blocked` (z. B. `b60205`) wird bei Bedarf vom Workflow angelegt.
4. Für `main` mindestens Pull-Request-Review, erfolgreiche bestehende CI-Checks, Konversationsauflösung und das Verbot direkter Pushes/Force-Pushes konfigurieren. Die genaue Kombination muss zu den tatsächlich vorhandenen Branch-Regeln passen.
5. Nach dem Merge der Pipeline einen unkritischen Testauftrag ohne Datenbank- oder Produktionsbezug anlegen, die Felder prüfen und das Label bewusst setzen. Den Draft-PR und den vollständigen CI-Lauf manuell kontrollieren; nicht automatisch mergen.

Offen bleibt der End-to-End-Nachweis, bis ein Administrator das Secret eingerichtet, die Action-Ausführung erlaubt und die Branch-Protection im GitHub-UI bestätigt hat.

## Testlauf FH-AUTO-TEST-001 (Issue #9)

Am 13.11.2026 wurden auf `codex/agent-9` die nicht-datenbankbezogenen Prüfungen `npm run typecheck`, `npm run lint`, `npm run test:unit` (43 Tests in fünf Dateien) und `npm run build:client` erfolgreich ausgeführt. Die GitHub-Schrittzusammenfassung konnte Vitest wegen eines schreibgeschützten Pfads nicht speichern; der Client-Build meldete eine Warnung zur Chunk-Größe.

Die Dokumentation ist die einzige im Auftrag bearbeitete Datei; Supabase-Migrationen und Datenbankänderungen wurden nicht ausgeführt. Commit und Erstellung des Draft-PR gegen `main` übernimmt anschließend die Pipeline. Der vollständige End-to-End-Nachweis einschließlich Draft-PR, CI-Ergebnissen und manueller Diff-Kontrolle bleibt bis zu deren Prüfung offen.

### Erneute Prüfung am 14.11.2026

Auf `codex/agent-9` wurden `npm run typecheck`, `npm run lint`, `npm run test:unit` (43 Tests in fünf Dateien) und `npm run build:client` erneut erfolgreich ausgeführt (jeweils Exit-Code 0). Vitest konnte die GitHub-Schrittzusammenfassung wegen eines schreibgeschützten Pfads weiterhin nicht speichern; der Build meldete weiterhin die Chunk-Größenwarnung. Es wurden keine Supabase-Migrationen oder Datenbankänderungen ausgeführt. Der erfolgreiche lokale Prüflauf bestätigt noch nicht die anschließende Draft-PR-Erstellung oder deren CI-Ergebnisse; diese bleiben durch Pipeline und manuelle Kontrolle nachzuweisen.

### Erneute Prüfung am 15.11.2026

Auf `codex/agent-9` lief `npm run build` erfolgreich mit Exit-Code 0 durch: Typecheck, Lint, 43 Unit-Tests in fünf Dateien und Client-Build bestanden. Weiterhin gemeldet wurden der schreibgeschützte Pfad für die GitHub-Schrittzusammenfassung und die Chunk-Größenwarnung. Ausschließlich diese Dokumentation wurde bearbeitet; Datenbank-, Cloud- und Produktionszugriffe sowie Supabase-Migrationen wurden nicht ausgeführt. Commit und Draft-PR gegen `main` übernimmt anschließend die Pipeline; deren CI-Ergebnisse und die manuelle Diff-Kontrolle bleiben offen.
