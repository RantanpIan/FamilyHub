# FamilyHub – Backlog und Umsetzungssteuerung

> **Stand:** 23.10.2026, Dokumentationsexport.
> **Wichtig:** FH-CX-001 bis FH-CX-004 sind abgeschlossen; FH-CX-004 wurde mit Commit `8277346` einschließlich erfolgreichem CI-Fix bestätigt. `FH-CX-005` ist implementiert; FH-CX-006 ist implementiert und lokal mit RLS-, E2E-, Unit-, Typecheck-, Lint- und Build-Prüfungen validiert. Ein GitHub-Actions-Lauf für FH-CX-006 ist nicht bestätigt. Andere Auftragsstände sind nicht verifiziert.
> **Quellenlage:** Die frühere Planung umfasste **34 Codex-Aufträge (FH-CX-001 bis FH-CX-034)**. Die Phasenblöcke und einige Abhängigkeiten sind überliefert; **Originaltitel und exakte Akzeptanzkriterien aller einzelnen Aufträge sind nicht vollständig verfügbar**. Dieses Dokument erzeugt ausdrücklich **keine** Ersatzaufträge und erklärt keinen Auftrag für abgeschlossen.

## 1. Arbeitsmodell

Fachkonzept (Phase A) und Architektur (Phase B) sind Baseline. Die Arbeitskette lautet:

**Epic → User Story → prüfbare Akzeptanzkriterien → Positiv-/Negativ-/Grenzfalltests → Entwicklungsauftrag → Implementierung → nachgewiesene Tests → Freigabe**

Jeder Entwicklungsauftrag braucht: Ziel/Hintergrund, betroffene Module, genauen Umfang, Vorgaben/Schnittstellen, Datenänderungen/Migrationen, Datenschutz/Autorisierung, Akzeptanzkriterien, Tests, Abhängigkeiten/Ausschlüsse und Definition of Done.

### Statusvokabular

- **Beschlossen:** fachlich/architektonisch freigegeben; nicht automatisch umgesetzt.
- **Vorgeschlagen:** Empfehlung zur Entscheidung.
- **Offen:** Entscheidung oder Prüfnachweis fehlt.
- **In Umsetzung:** konkrete aktive Implementierung.
- **Implementiert:** Code vorhanden und entsprechend geprüft, ohne automatisch „getestet“ zu bedeuten.
- **Getestet:** dafür erforderliche Tests tatsächlich ausgeführt und erfolgreich.
- **Nicht verifiziert:** aktueller Umsetzungsstand nicht zuverlässig belegt.

Keine Story allein aufgrund eines grünen Builds auf „getestet“ setzen. Keine Testausführung behaupten, die nicht nachgewiesen wurde.

## 2. R1 – Freigegebene Reihenfolge und Epics

| Bereich (Epic-Gruppe) | Codex-Aufträge | Inhalt | Gesamtstatus |
| --- | --- | --- | --- |
| Foundation | `FH-CX-001`–`007` | Repository, Basistechnik, Identitäten, Zugriffe und Grundlagen | `001`–`004` abgeschlossen; `005` in Umsetzung; übrige nicht verifiziert |
| Kalender | `FH-CX-008`–`016` | Kalenderdomäne, Serien/Ausnahmen und nutzbare Terminabläufe | Nicht verifiziert |
| Push | `FH-CX-017`–`021` | Erinnerungen, Empfänger, Zustellung und Sicherheitsmechanismen | Nicht verifiziert |
| Schule | `FH-CX-022`–`026` | Schulprofil, Stundenplan, Gültigkeit und Kalenderprojektionen | Nicht verifiziert |
| Import | `FH-CX-027`–`031` | Upload, Extraktion, Prüfung und Veröffentlichung | Nicht verifiziert |
| Releaseabsicherung | `FH-CX-032`–`034` | Übergreifende Tests, Qualität und Produktionsreife | Nicht verifiziert |

**R1 umfasst:** Kalender, Stundenplan, notwendige Familien-/Berechtigungsfunktionen, private Inhalte, Push und erforderliche Foto/PDF-Importe. Spätere Aufgaben-/Dokumenten-/KI-/Dashboard-Funktionen werden nicht stillschweigend vorgezogen.

## 3. Auftragsregister (ID-Struktur ist überliefert)

Die Sammelbezeichnungen der Gruppen sind **keine** rekonstruierten Originaltitel der Einzelaufträge. Für `002`–`034` muss der verbindliche Auftragstext aus dem früheren Backlog ergänzt werden.

| ID | Gruppe | Titel/Auftragsinhalt | Status |
| --- | --- | --- | --- |
| FH-CX-001 | Foundation | **Monorepo, Projektstruktur, React/Vite, TypeScript, Supabase-Konfiguration** | **Abgeschlossen** |
| FH-CX-002 | Foundation | **Testfundament und synthetische Testdaten** | **Abgeschlossen** |
| FH-CX-003 | Benutzer und Familien | **Supabase Auth und Benutzerprofile** | **Abgeschlossen** |
| FH-CX-004 | Familienverwaltung | **Familienverwaltung und Familienmitglieder** | **Abgeschlossen** |
| FH-CX-005 | Identity / Family / Access | **Ressourcenberechtigungen, Eigentümerschaft und private Inhalte** | **Implementiert; Abnahme gesondert nachweisen** |
| FH-CX-006 | Identity / Family / Access | **Familieneinladungen, Mitgliedschaften und Rollenverwaltung** | **Lokal umgesetzt und validiert; Rollenänderungen nach FH-OPEN-001 gesperrt; GitHub Actions nicht bestätigt** |
| FH-CX-007 | Foundation | **Responsive AppShell und Navigation (vorläufiger Entwicklungsumfang)** | **In Umsetzung auf feature/fh-cx-007-responsive-appshell; Tests noch nicht bestätigt** |
| FH-CX-008 | Kalender | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-009 | Kalender | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-010 | Kalender | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-011 | Kalender | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-012 | Kalender | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-013 | Kalender | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-014 | Kalender | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-015 | Kalender | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-016 | Kalender | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-017 | Push | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-018 | Push | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-019 | Push | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-020 | Push | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-021 | Push | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-022 | Schule | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-023 | Schule | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-024 | Schule | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-025 | Schule | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-026 | Schule | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-027 | Import | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-028 | Import | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-029 | Import | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-030 | Import | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-031 | Import | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-032 | Releaseabsicherung | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-033 | Releaseabsicherung | Originalauftrag ergänzen | Nicht verifiziert |
| FH-CX-034 | Releaseabsicherung | Originalauftrag ergänzen | Nicht verifiziert |

## 4. FH-CX-001 – vorheriger Auftrag

**Status:** **Abgeschlossen** – im vorherigen Auftrag implementiert und die dort dokumentierten Prüfungen erfolgreich ausgeführt.

**Bekannter bisheriger Titel:** „Monorepo, Projektstruktur, React/Vite, TypeScript, Supabase-Konfiguration“.

**Bekanntes Abnahmeziel:** „Projekt baut; lokale Entwicklungsumgebung startbar“.

**Bekannte Voraussetzung:** Freigabe der Architektur-Baseline (G0). Keine explizit überlieferte numerische Vorgängerabhängigkeit.

**Hinweis:** Der vollständige historische Auftragstext ist in diesem rekonstruierten Backlog nicht enthalten. Der Folgeauftrag FH-CX-002 setzt auf dem bestätigten Foundation-Stand auf.

**Verhaltensregel für Codex:** Die vorhandene Foundation bewahren und nur im Umfang des jeweiligen Folgeauftrags ändern.

## 5. Überlieferte Abhängigkeiten

Die folgenden Kanten sind aus der vorherigen Planung bekannt. Die Semantik ist jeweils **„Vorgänger muss hinreichend fertig/freigegeben sein, bevor der abhängige Schritt begonnen bzw. abgeschlossen wird“** und ist gegen das Original zu verifizieren.

| Vorgänger | Nachfolger |
| --- | --- |
| FH-CX-005 | FH-CX-008 |
| FH-CX-009 | FH-CX-012 |
| FH-CX-011 | FH-CX-012 |
| FH-CX-012 | FH-CX-013 |
| FH-CX-018 | FH-CX-020 |
| FH-CX-019 | FH-CX-020 |
| FH-CX-022 | FH-CX-025 |
| FH-CX-023 | FH-CX-025 |
| FH-CX-025 | FH-CX-031 |
| FH-CX-027 | FH-CX-029 |
| FH-CX-028 | FH-CX-029 |
| FH-CX-029 | FH-CX-031 |
| FH-CX-030 | FH-CX-031 |
| FH-CX-032, FH-CX-033 | Freigabe zum Produktivrollout |

**Achtung:** Diese Teilmenge ist **keine vollständige Abhängigkeitsmatrix**. Fehlende Kanten dürfen nicht als Freigabe zu beliebiger Reihenfolge missverstanden werden.

## 6. Prioritäten und Risikoreihenfolge

1. Laufende Foundation-Implementierung stabilisieren und nach Originalakzeptanzkriterien nachweisen, nicht neu aufsetzen.
2. Identität, Familienzugehörigkeit, RLS und Ressourcenberechtigungen vor dem Freigeben personenbezogener Fachobjekte sichern.
3. Kalender inklusive Serien/Ausnahmen/privater Inhalte und Stundenplan mit getrennten Unterrichtsprojektionen fachlich konsistent entwickeln.
4. Push und Importe jeweils mit Berechtigungsprüfung und Idempotenz integrieren.
5. Release- und Cross-Family-/Negativtests zum verbindlichen Gate machen.

### Prüfpflicht bei Abnahme einzelner Stories

| Dimension | Erforderliche Nachweise |
| --- | --- |
| Funktion | Given/When/Then-Akzeptanzszenarien bestanden |
| Datenschutz | Positive und negative Rechtefälle, Familienisolation, private Sichtbarkeit |
| Konsistenz | Serien, Projektionen, Import-/Push-Abhängigkeiten geprüft |
| Fehlerfälle | Retry, Duplikat, Versionskonflikt, Löschung, Invalidierung |
| Technik | Typecheck, Build, passende Vitest-/Playwright-/DB-Tests ausgeführt |
| Dokumentation | Betroffene APIs, Migrationen, Annahmen und Risiken aktualisiert |
| Scope | Keine unbeauftragten Nebenfeatures, Stackwechsel oder Fremdänderungen |

## 7. Nachzutragende Originalinformationen

- Originaltitel, Story-Zuordnung und Scope von `FH-CX-002`–`FH-CX-034`.
- Vollständige Akzeptanzkriterien, Testfälle, Migrationsanforderungen und Definition of Done aller Aufträge.
- Tatsächlicher Fortschritt der laufenden `FH-CX-001`-Arbeiten und spätere Implementierungen.
- Weitere ursprüngliche Freigabe-/Gating-Abhängigkeiten.

**Dokumentationsregel:** Fehlende Originalinformationen nur als **„offen – Quelle nachtragen“** führen, nicht mit plausibel klingenden erfundenen Entscheidungen füllen. Die vollständigen Original-Aufträge müssen weiterhin aufbewahrt bzw. in dieses Register eingepflegt werden.


## 8. Aktuelle Umsetzungsnotiz – 12.11.2026

Diese nachträgliche Notiz ersetzt nicht das ursprüngliche Auftragspaket. Frühere Statuszeilen in diesem Dokument können einen älteren Entwicklungsstand beschreiben.

- **FH-CX-005:** Laut bisherigem Projektverlauf abgenommen; Freigaben für private und familienbezogene Ressourcen bleiben die Grundlage.
- **FH-CX-006:** Anwender hat den Praxistest als abgenommen bestätigt. Die sechs lokalen und sechs Remote-Migrationen im Supabase-Projekt `Familyhub_dev` wurden mit der CLI abgeglichen. Die aktuelle GitHub-Actions-Freigabe ist hier nicht unabhängig nachgewiesen.
- **FH-CX-007 – in Umsetzung:** Vorhandene React-AppShell verbessern, nicht ersetzen. Responsive Kopfzeile mit Familienauswahl auch auf Smartphones, zugängliche Navigationsflächen, Desktop/Tablet-Skalierung, Familienkontext und Playwright-Regressionstests. Keine neuen Datenbankmigrationen. Umsetzung zunächst auf eigenem Entwicklungsbranch; CI- und Abnahmestatus offen.
- **Nachfolgende neue Anforderung – Lernplan (vorgeschlagen, nicht Bestandteil FH-CX-007):** Ein Lernplan pro Kind und zugeordnetem Stundenplan soll die Vorbereitung für den nächsten Schultag anzeigen. Bei einer Schulaufgabe soll ab 14 Tagen vor dem Termin ein zusätzlicher Lern-Zeitslot sichtbar bzw. planbar sein. Die fachliche Quelle für Schulaufgaben, die Zeitslot-Regeln, Ferientage und Änderungen des Stundenplans müssen vor einem eigenen Entwicklungsauftrag geklärt werden. Kein eigenständiges neues Datenmodell ohne Abstimmung mit Kalender- und Schulmodul; kind- und familienbezogene Sichtbarkeit durch RLS schützen.
