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
- **Nachfolgende neue Anforderung – Lernplan (fachlich gewünscht, nicht Bestandteil FH-CX-007):** Siehe Abschnitt 9. Umsetzungsplanung zusammen mit Kalender und Stundenplan; nicht als bloße UI-Funktion vorziehen.


## 9. Lernplan auf Basis des Stundenplans – fachliche Ergänzung (12.11.2026)

**Status:** Fachliche Anforderungen vom Anwender benannt; Integration in Kalender/Stundenplan gewünscht. Implementierung offen; Umsetzung ausdrücklich **nicht** in FH-CX-007. Diese Ergänzung ist noch kein freigegebener neuer `FH-CX-...`-Auftrag.

**Beschriebene Anforderungen:**
1. **Je Kind und zugeordnetem Stundenplan ein eigener Lernplan.** Bei mehreren Stundenplänen dürfen Inhalte nicht vermischt werden.
2. **Vorbereitung auf den nächsten Schultag:** Der Lernplan zeigt für die Fächer des nächsten Unterrichtstags an, was vorbereitet bzw. gelernt werden soll. Die genaue Quelle der Vorbereitungsschritte ist noch zu spezifizieren; ein Stundenplan allein enthält normalerweise keine Hausaufgaben.
3. **Schulaufgaben:** Für eine anstehende Schulaufgabe ist bereits **14 Tage vorher** ein zusätzlicher Lern-Zeitslot im Kalender/Lernplan vorgesehen. Terminänderungen, Absagen und Ausnahmen dürfen nicht zu doppelten Zeitslots führen.
4. **Tägliches Abhaken:** Die vorbereiteten Fächer/Aktivitäten eines Lernplans sind einzeln abschließbar. Ein vollständiger Lerntag zählt nur, wenn alle für den relevanten Tag verpflichtenden Einträge erledigt sind.
5. **Lernserie (Streak-Counter):** Je Lernplan wird angezeigt, an wie vielen aufeinanderfolgenden Tagen die vollständige Vorbereitung erledigt wurde. Der Counter muss bei Änderungen an Stundenplan und Erledigungszustand konsistent und deterministisch berechnet werden.
6. **Sticker-Belohnungssystem:** Beim Erreichen festzulegender Lernziele können Kinder digitale Sticker verdienen und in einer Sammlung sehen. Belohnungen dürfen nicht fälschbar oder durch parallele Wiederholungen doppelt gutgeschrieben werden.

**Abhängigkeiten und konsistente Architektur:**
- Kalender ist führendes Terminsystem. Schulaufgaben sind reale Kalendertermine; Lern-Zeitslots müssen sich auf diese und auf das betroffene Kind beziehen, ohne konkurrierende Termin-Wahrheitsquellen aufzubauen.
- Schule/Stundenplan liefert Unterrichtsstruktur (Gültigkeit, Wochentage, Ausfälle/Ausnahmen). Lernpläne dürfen keine zweiten Stundenpläne als Schattenkopie speichern.
- Änderungen/Löschungen an Stundenplan und Schulaufgaben müssen geplante Lerneinheiten und Counter sicher aktualisieren.
- Pro Kind/Plan klare Eigentümerschaft, Rollen, private Sichtbarkeit und RLS; keine Daten anderer Kinder oder Familien in Statistiken, Stickern, Push oder Exports offenlegen.
- Sticker und Lernserie sind motivierendes Feedback, keine Pflicht zur Nutzung und kein Ranking zwischen Kindern.

**Noch offen – im fachlichen Auftrag klären:**
- Was genau als Vorbereitung gilt: manuell gepflegte Aufgaben/Materialien oder vorgeschlagene Schritte aus dem Stundenplan?
- Bezieht sich „Tage in Folge“ auf **Kalendertage** oder **relevante Schultage**? Vorschlag: nur geplante Schultage werten, Ferien/Wochenenden neutral behandeln.
- Bedeutet „14 Tage vorher ein Extra-Zeitslot“ genau **einen** Slot am Tag -14 oder **mehrere** Lerneinheiten im 14-Tage-Vorbereitungsfenster? Ohne Entscheidung keine automatische Serie erzeugen.
- Dauer, Uhrzeit, Konfliktlösung und Editierbarkeit des Lern-Zeitslots; Umgang mit mehreren Schulaufgaben.
- Sticker-Regeln (Schwellen, Motive, Wiederholbarkeit, Zurücksetzen/Korrekturen) und Umgang mit verpassten Tagen.
- Wer darf Vorbereitungen, Erledigungen und Schulaufgaben für welches Kind anlegen/ändern/einsehen? Offene Rollen-/Kindervertretungsmatrix beachten.

**Umsetzungsempfehlung:** Anforderungen bei den Kalender-Stories FH-CX-008–016 und Schul-/Stundenplan-Stories FH-CX-022–026 als abhängigen fachlichen Erweiterungsbedarf einplanen, bevor ein eigener kleiner, getesteter Lernplan-Auftrag mit Akzeptanzkriterien, Datenmodell, RLS-, Idempotenz- und E2E-Tests freigegeben wird. FH-CX-007 bleibt auf Navigation und AppShell begrenzt.


## 10. FH-CX-008 – Start des Kalender-Datenmodells (12.11.2026)

**Status:** In Umsetzung auf `feature/fh-cx-008-calendar-foundation`; Prüfungen und Abnahme offen.

**Implementierungsinkrement:** Eine additive Migration mit `calendar_events`
für reale Einzeltermine (zeitgebunden oder ganztägig), zusammengesetzt
an `resources` mit `resource_type='calendar_event'` gebunden.
Fachinhalt nur lesbar unter dem bestehenden RLS-Ressourcenrecht.
Keine neuen direkten Schreibrechte; noch keine Benutzeroberfläche.
Typen und RLS-/Constraint-Tests werden ergänzt.

**Abgrenzung:** Vollwertige Kalendererstellung und -änderung einschließlich
atomarer Ressourcenerzeugung, `expectedVersion`, Idempotenz, Zeitzonenprüfung,
Serien, Teilnehmer, Erinnerungen und Lernplan-Anbindung sind nicht Teil dieses
ersten, isolierten Migrationsinkrements. Sie werden mit den jeweiligen folgenden
Kalender-/Schulstories koordiniert. Ein fertiger Fachkalender darf aus dieser
Tabellenanlage nicht abgeleitet werden.

**Definition of Done für dieses Inkrement:** Migration auf wegwerfbarer
Supabase-Instanz ausführbar, Tenant-/Privatsphäre-/Constraint-Tests grün,
bestehende Auth-/RLS-/E2E-Tests ohne Regression, keine Änderungen am
Cloud-Projekt ohne explizite Freigabe. Anschließend Code-Review und PR.


## 11. FH-CX-009 – Nutzbare Einzeltermine (inkrementell, 12.11.2026)

**Status:** In Umsetzung auf `feature/fh-cx-009-calendar-event-crud`; Originalauftragstext nicht vorhanden, daher ist dies ein nachprüfbarer **Teilumfang**, kein Ersatz für die historische vollständige Story.

**Ziel:** Angemeldete Familienmitglieder können eigene einzelne Kalendertermine anlegen, ändern, löschen und die für sie lesbaren Termine ihrer aktiven Familie sehen.

**Umfang:** atomare, idempotente Erstellung einer Zugriffsressource samt Kalenderinhalt; Eigentümerschaft ausschließlich aus `auth.uid()`/aktiver Mitgliedschaft; explizit wählbar private/familienweite Sichtbarkeit beim Erstellen (sicherer Default privat); Optimistic Locking bei Änderung/Löschung; Prüfung von Endzeit, Ganztagesdatum und IANA-Zeitzone; schlichte responsive Kalenderliste und Formular.

**Berechtigungen:** Nur der verknüpfte Kontoinhaber darf einen eigenen Termin schreiben/löschen. Andere aktive Mitglieder derselben Familie sehen familienweit freigegebene Termine, keine privaten Termine; berechtigte Grants gelten wie im Ressourcenmodell. Verwaltungsrechte auf verwaltete Kinderprofile sind **nicht** mit Kalender-Schreibrechten gleichzusetzen. Kein familienübergreifender Zugriff.

**Ausgeschlossen:** Serien, Ausnahmen, Teilnehmer, Lernplan, Schulaufgaben, Unterrichtsprojektionen, Push und Reminder, Import/OCR, Kalenderexport, standardisierte Zeitzonenauswahl, Editieren der Sichtbarkeit im Kalenderformular und Änderungen fremder oder verwalteter Profile.

**Abhängigkeiten:** FH-CX-005/006/007/008 auf `main`; fachliche Cloud-Migration von FH-CX-008 muss vor FH-CX-009 eingespielt werden (nur nach erfolgreichem CI und Review). Das aktuelle Cloud-Development-Projekt erhält durch GitHub-Commits **keine** automatische neue Tabelle.

**Akzeptanztests:** CAL-DB-T01..T07 aus FH-CX-008 und CAL-CMD-T01..T07 für atomare Terminoperation, Idempotenz, Family-RLS, Validierungen, Versionskonflikt, fremde Änderungsrechte und Löschung. UI-Abnahme auf Smartphone/Desktop noch ausstehend.

**Definition of Done:** Typecheck, Lint, Unit, Build, RLS/Integration und relevante Playwright-Tests grün; Migration nur auf temporären Testdatenbanken vor Cloud-Freigabe; nachvollziehbarer Pull Request. Die UI ist nach einem Merge erst dann mit echten Terminen nutzbar, wenn **beide** Kalender-Migrationen in der Cloud angewendet wurden.


## FH-CAL-001 – Kalenderverbesserungen nach realer Familienabnahme (12.11.2026)

**Status:** In Umsetzung auf `feature/fh-calendar-shared-month-subjects`; nicht abgenommen. Getrennte ID, weil Originalscope von FH-CX-010 nicht rekonstruiert und nicht uminterpretiert wird.

**Ausgangslage:** Ein unter `family` freigegebener Termin ist bei Patricia nicht sichtbar. Die anonymisierte Diagnose in `Familyhub_dev` zeigte **zwei aktive Familien mit je genau einem aktiven Benutzerkonto**. Damit ist die Familienfreigabe zwischen Konten derzeit nicht wirksam; bestehende RLS-Policies verbieten korrekterweise familienübergreifende Sichtbarkeit.

**Konkrete Maßnahme (Konfiguration):** Einen Account mit dem vorhandenen Einladungsprozess als aktives Mitglied der richtigen gemeinsamen Familie hinzufügen; bei mehreren Familien in der App den richtigen Familienkontext auswählen. Keine automatische Verknüpfung von Identitäten, kein RLS-Bypass und keine Migration privater Termininhalte.

**Ziel (Funktion):** Vollständige Monatsansicht von Montag bis Sonntag inklusive leerer Tage; Termindetails für den ausgewählten Tag; beim Ändern des Beginns Endzeit automatisch eine Stunde später vorschlagen, sofern die Endzeit nicht bewusst gültig auf einen späteren Zeitpunkt gesetzt wurde; ein aktives Familienmitglied als Terminperson auswählen (z. B. Patricia erstellt Zahnarzt für Sebastian), während die Eigentümerschaft beim Ersteller bleibt.

**Datenmodell:** `calendar_events.subject_member_id` verweist über einen zusammengesetzten Foreign Key ausschließlich auf Mitglieder derselben Familie; alte Termine werden auf bisherige Eigentümer zurückgeführt. Altes Create-RPC bleibt kompatibel (`NULL` in neu angelegten Legacy-Terminen bedeutet Eigentümer). Neuer, atomarer und idempotenter RPC `create_calendar_event_for_member` legt den Termin für ein aktives Mitglied an. Bei `visibility=private` und fremder Zielperson wird nur ein gezieltes Leserecht an die Zielperson vergeben (kein Schreibrecht). Wenn sie noch kein Konto besitzt, kann sie erst nach späterer Anmeldung lesen. Der Ersteller bleibt alleiniger Eigentümer und Bearbeiter.

**Akzeptanz:** Eine Familie mit zwei getrennten aktiven Logins sieht Familien-Termine wechselseitig; fremde Familien und unberechtigte Mitglieder sehen keine privaten Termine. Private Fremdpersonen-Termine sind nur für Ersteller und Terminperson lesbar. Eine fremde Familien-ID als Ziel wird serverseitig abgelehnt. Wiederholte Request-IDs sind idempotent und dürfen Zielpersonen nicht ändern. Alle 42 Rastertage sind inklusive Nachbarmonaten sichtbar, Termin-Tagesbezug gilt auch für mehrere Tage und exklusive Enddaten. Die UI funktioniert bei 320, 390 und Desktop-Breite.

**Ausschlüsse:** Keine automatische Fusion vorhandener Familien, keine KI-/Schul-/Lernplanprojektionen, kein Rollenwechsel, keine Verwaltung fremder privater Ressourcen, keine Teilnehmermehrzahl, keine Änderung der Zielperson nach Erstellung und keine Serien oder Push.

**Definition of Done:** CI Typecheck/Lint/Unit/Build, isolierte PostgreSQL-RLS-/Migrations-/Idempotenztests, Browser-E2E und manuelle Prüfung der beiden bestehenden Konten. Migration auf `Familyhub_dev` nach Review und Merge, niemals unkontrolliert.
