# FamilyHub – Entscheidungsregister und offene Punkte

> **Stand:** 22.10.2026. Redaktionelle Register-IDs `FH-DEC-...` wurden **für diesen Export neu eingeführt** und sind keine behaupteten historischen ADR-/Entscheidungsnummern.  
> **Prinzip:** **Beschlossen ≠ implementiert ≠ getestet.** Alle Änderungen an Phase-A/B-Beschlüssen benötigen eine dokumentierte Entscheidung und Folgenabschätzung.

## 1. Beschlossene Baseline

| Redaktionelle ID | Entscheidung | Status | Konsequenz |
| --- | --- | --- | --- |
| FH-DEC-001 | FamilyHub als modularer Familienmanager für zunächst vier Personen | Beschlossen | Kernnutzen zuerst, erweiterbare Architektur |
| FH-DEC-002 | Architektur muss viele vollständig voneinander getrennte Familien unterstützen | Beschlossen | Mandantentrennung in jedem Modul und jeder Datenoperation |
| FH-DEC-003 | FamilyHub ist führendes Kalendersystem | Beschlossen | Import/Sync dürfen keine gleichberechtigte konkurrierende Quelle schaffen |
| FH-DEC-004 | Kalender und Stundenplan zuerst | Beschlossen | Erster fachlicher Entwicklungsfokus |
| FH-DEC-005 | Keine eigenständige Fahrdienstplanung | Beschlossen | Kein Fahrdienstmodul planen oder implementieren |
| FH-DEC-006 | Geeignete eigene Inhalte kann jedes Mitglied privat markieren | Beschlossen | Berechtigungen/Filterung systemweit |
| FH-DEC-007 | Push-Empfängerwahl anfänglich Patricia, Hannah, Helena, Sebastian, Alle | Beschlossen | Familienbezogene Auflösung, keine globalen IDs |
| FH-DEC-008 | React, TypeScript, Vite | Beschlossen | Gemeinsames Web-Frontend |
| FH-DEC-009 | Capacitor für Android/iOS, PWA für Desktop | Beschlossen | Plattformspezifische Integration kapseln |
| FH-DEC-010 | Supabase/PostgreSQL einschließlich Auth, privater Storage | Beschlossen | Datenhaltung/Auth/Dateien entsprechend absichern |
| FH-DEC-011 | Modularer Monolith im Monorepo | Beschlossen | Klare Modulgrenzen, kein Microservice-Zwang |
| FH-DEC-012 | RLS und serverseitige Autorisierung, einheitliches Berechtigungsmodell | Beschlossen | Fail-closed, Security-Tests |
| FH-DEC-013 | Hintergrundprozesse: Outbox, Queue, Scheduler | Beschlossen | Zuverlässige und idempotente Verarbeitung |
| FH-DEC-014 | Push über FCM, APNs, Web Push | Beschlossen | Datenschutzsichere Kanaladaption |
| FH-DEC-015 | KI/OCR als austauschbare Provider | Beschlossen | Keine feste Kopplung an einen Anbieter |
| FH-DEC-016 | Tests Vitest, Playwright; CI/CD GitHub Actions | Beschlossen | Nachweisbare Regressionstests/Builds |
| FH-DEC-017 | Datenstandort EU, bevorzugt Frankfurt | Beschlossen | Infrastrukturwahl entsprechend prüfen |
| FH-DEC-018 | Aufgaben, Dokumente, Automationen/KI, Dashboard später | Beschlossen | Nicht ohne Freigabe vorziehen |
| FH-DEC-019 | Versionierte APIs, fachliche Ereignisse, Idempotenz | Beschlossen | Konkurrierende Änderungen/Duplikate absichern |
| FH-DEC-020 | Kalenderereignisse von Stundenplan-/Unterrichtsprojektionen trennen | Beschlossen | Eine fachliche Wahrheit pro Modul |
| FH-DEC-021 | Die R1-Planung umfasst 34 Codex-Aufträge, FH-CX-001 bis 034 | Vorherige Planung bekannt | Original-Backlog zur vollständigen Zuordnung nachtragen |
| FH-DEC-022 | FH-CX-001 wurde abgeschlossen und die Foundation ist Basis für FH-CX-002 | Durch vorherigen Auftragsabschluss bestätigt | Bestehende Foundation bewahren und Folgeaufträge darauf aufbauen |
| FH-DEC-023 | FH-CX-002 ist abgeschlossen; FH-CX-003 baut auf dem grünen CI-Stand `58a6fa1` auf | Nutzer-Screenshot des GitHub-Actions-Laufs | Testfundament bleibt erhalten; neue RLS-Integration wird separat geprüft |

## 2. Konkretisierte Regeln – keine neuen Baseline-Entscheidungen

Folgende Regeln sind sichere Ableitungen aus den beschlossenen Prinzipien und müssen bei Abweichung vom Originalkonzept entsprechend überprüft werden:

- „Alle“ meint ausschließlich berechtigte Mitglieder/Empfänger **der betroffenen Familie**.
- Private Inhalte dürfen weder in Metadaten noch über Push, Suche, Aggregationen, Exporte, Projektionen oder Speicherlinks indirekt sichtbar werden.
- Verschobene/gelöschte Termine müssen abhängige Erinnerungen fachlich invalidieren.
- Doppelte Imports oder Hintergrund-Retries dürfen keine unbeabsichtigten duplizierten Fachobjekte erzeugen.
- Schulplan-Versionen und Ausnahmen dürfen Unterrichtsprojektionen nicht inkonsistent werden lassen.
- `expectedVersion` muss vor stillen konkurrierenden Überschreibungen schützen.
- Fehlende Freigaben werden serverseitig und per RLS abgelehnt.

**Diese Konkretisierungen sind kein Ersatz für das detaillierte Autorisierungs-, Import- und Benachrichtigungskonzept.**

## 3. Offene Entscheidungen / Prüfung gegen Originalunterlagen

| ID | Thema | Zu verifizierende Frage | Risiko bei stiller Festlegung |
| --- | --- | --- | --- |
| FH-OPEN-001 | Rollenmatrix | Welche Rollen, Eltern-/Kinderrechte und Sonderfälle sind exakt beschlossen? | Datenschutz-/UX-Fehler |
| FH-OPEN-002 | Privatmarkierung | Welche Ressourcen eignen sich, wer darf was sehen, was gilt bei gemeinsamer Ownership? | Datenleck oder ungewollte Restriktion |
| FH-OPEN-003 | Kalender | Welche Regeln gelten für Serienvorkommen, Teilnehmer, externe Synchronisation? | Falsche Terminänderungen |
| FH-OPEN-004 | Zeit | Welche Zeitzonen-/Ganztags-/Sommerzeitkonvention gilt? | Datums- und Erinnerungsfehler |
| FH-OPEN-005 | Schule | Exakte Stundenplan-, Rotations-, Ferien- und Versionslogik? | Falsche Unterrichtsanzeige |
| FH-OPEN-006 | Projektionen | Materialisierung/Caching; Umwandlung in echte Events erlaubt? | Doppelte Wahrheit |
| FH-OPEN-007 | Push | Vorlaufregeln, Ruhezeiten, Minimalpayload, Subscription-Verhalten? | Fehlbenachrichtigungen/Privatleck |
| FH-OPEN-008 | Importe | Exakte Formate, Review-Freigaben, OCR-Provider und Veröffentlichungsschritte? | Falsche oder ungeprüfte Daten |
| FH-OPEN-009 | SQL/RLS | Exakte Tabellen, Policies, Constraints, Rollengrenzen? | Sicherheits-/Migrationsfehler |
| FH-OPEN-010 | Infrastruktur | Queue-/Scheduler-Betrieb, Secrets, Backup, Recovery, Deployment? | Datenverlust/Betriebsausfälle |
| FH-OPEN-011 | Backlog | Vollständige Titel, Kriterien und Abhängigkeiten der 34 Aufträge? | Scope-/Reihenfolgefehler |
| FH-OPEN-012 | Ist-Stand | Welche Teile von FH-CX-001 sind bereits tatsächlich implementiert/getestet? | Überschreiben laufender Arbeit |

## 4. Verfahren für neue Entscheidungen (VORSCHLAG)

Wenn eine Entscheidung notwendig wird:

1. **Anlass und bestehende Baseline** benennen; Originalquelle verlinken.
2. Mindestens eine praxistaugliche Alternative und eine bevorzugte Lösung formulieren.
3. Auswirkungen auf Nutzen, Aufwand, Sicherheit, Kosten, Modulgrenzen, Migrationen und Tests festhalten.
4. Entscheidung durch projektverantwortliche Person explizit freigeben lassen.
5. Erst danach Status auf **beschlossen** setzen und Fachkonzept, Architektur und Backlog synchron aktualisieren.
6. Implementierung und Tests getrennt nachhalten.

### Vorlage

```md
### FH-DEC-XXX – Kurztitel
- Status: Vorgeschlagen / Beschlossen / Abgelehnt / Ersetzt
- Datum:
- Anlass:
- Geltende Baseline:
- Alternativen:
- Entscheidung:
- Begründung:
- Auswirkungen: Fachlogik / Sicherheit / API / Datenmigration / Tests / Kosten
- Betroffene Stories / Aufträge:
- Freigabe:
```

## 5. Dokumentationshinweis

Die Originalabschnitte der Phasen A und B sind bei diesem Export nicht in voller Länge verfügbar. Beschlossene Eckpunkte sind dokumentiert, aber die vollständige Original-Fachlogik, die SQL-Detailentwürfe und der Volltext jedes der 34 Entwicklungsaufträge müssen ergänzt bzw. abgeglichen werden. **Bis dahin gilt: neue Details weder rückwirkend als beschlossen ausgeben noch stillschweigend umsetzen.**
