# FamilyHub – Fachkonzept (Phase A)

> **Dokumentstatus:** Konsolidierte Arbeitsfassung, erstellt am 22.10.2026 zur Nutzung mit Codex.  
> **Baseline-Status:** Die mit **BESCHLOSSEN** bezeichneten Kernaussagen stammen aus den bekannten Projektentscheidungen der Phase A/B. Ausformulierte Detailregeln mit **ABGELEITET** sind fachliche Präzisierungen, keine rückwirkend behaupteten Originalbeschlüsse. **OFFEN** bedeutet: gegen das vollständige Originalkonzept prüfen bzw. entscheiden.  
> **Quellenlage:** Die ursprünglichen vollständigen Abschnitte A.0–A.6 lagen beim Export nicht als Dateien vor. Deshalb ist dies eine **sorgfältige Rekonstruktion**, keine wortgetreue Übernahme. Vor Umsetzung bei Abweichungen das Originalkonzept und den aktuellen Entwicklungsauftrag bevorzugen.

## A.0 – Produktvision und Abgrenzung

**BESCHLOSSEN:** FamilyHub ist eine dauerhaft nutzbare, modulare Familienmanagement-App, anfänglich für eine vierköpfige Familie und architektonisch für mehrere **streng getrennte** Familien. Sie unterstützt Android, iOS und Windows/Desktop (als PWA). Der erste fachliche Schwerpunkt liegt auf **Kalender und Stundenplan**. Eine früh nutzbare, robuste Version ist wichtiger als eine umfangreiche Demo.

Die App soll Erwachsene und Kinder ohne technische Vorkenntnisse zuverlässig bedienen können. Wesentliche Qualitätsziele: intuitive und mobile Bedienung, verständliche Meldungen, Datenschutz, Betriebssicherheit, niedrige Betriebskosten, gute Wartbarkeit und schrittweise Erweiterbarkeit.

**BESCHLOSSEN:** FamilyHub ist die **führende Quelle für Kalenderdaten**. Externe Quellen werden importiert oder gemäß gesondertem Konzept synchronisiert; sie ersetzen FamilyHub nicht als führendes System. **Eine eigenständige Fahrdienstplanung ist ausdrücklich ausgeschlossen.**

### Funktionsabgrenzung

| Priorität | Modul/Fähigkeit | Einordnung |
| --- | --- | --- |
| Erste Ausbaustufe | Familienverwaltung, Identitäten und Berechtigungen | Voraussetzung für alle Fachmodule |
| Erste Ausbaustufe | Kalender, Termine, Serien, Erinnerungen | Kernnutzen |
| Erste Ausbaustufe | Schule, Stundenplan und Unterrichtsprojektionen | Kernnutzen |
| Erste Ausbaustufe | Push-Benachrichtigungen | Erforderliche Begleitfunktion |
| Erste Ausbaustufe | Erforderliche Importe, insbesondere Foto/PDF | Nur im Umfang der freigegebenen Stories |
| Später | Aufgaben | Architektur vorbereiten, nicht vorziehen |
| Später | Dokumentenmanagement | Architektur vorbereiten, nicht vorziehen; Importdateien können schon nötig sein |
| Später | Automationen und KI/OCR-Erweiterungen | Austauschbar und datenschutzgerecht konzipieren |
| Später | Dashboard / übergreifende Übersichten | Nicht vorzeitig implementieren |
| Ausgeschlossen | Separate Fahrdienstplanung | Kein eigenständiges Modul |

## A.1 – Familien- und Berechtigungsmodell

### Fachobjekte

- **Familie:** abgeschlossener Daten- und Berechtigungsraum.
- **Konto/Identität:** authentifizierte Person, soweit für die Anmeldung benötigt.
- **Familienmitglied:** fachliche Person innerhalb einer Familie; kann je nach Berechtigung mit einem Konto verbunden sein. Die konkrete Zuordnung ist mit Phase B abzugleichen.
- **Mitgliedschaft:** Zuordnung eines Kontos zu einer Familie einschließlich Rolle und Lebenszyklus.
- **Ressource:** fachlich geschützter Inhalt, z. B. Termin, Unterrichtsinformation, Import oder später Aufgabe/Dokument.
- **Eigentümerschaft, Sichtbarkeit, Freigabe:** getrennte Dimensionen des Zugriffs.

**BESCHLOSSEN:** Ein gemeinsames Rollen- und Berechtigungsmodell gilt über Modulgrenzen hinweg. Geeignete eigene Inhalte dürfen **von jedem Familienmitglied privat markiert** werden. Auch Kinder sind als eigenständige Personen mit altersgerechter Bedienung und korrekt durchgesetzten Zugriffsregeln zu behandeln.

**BESCHLOSSEN:** Keine Person aus Familie A darf auf Daten von Familie B zugreifen; das gilt auch über IDs, Suchtreffer, gespeicherte Dateien, API-Endpunkte, Exporte, Push, Logs und Hintergrundprozesse.

**ABGELEITET – Sicherheitsregel:** Die Oberfläche darf Sichtbarkeit unterstützen, aber nicht selbst durchsetzen. Autorisierung erfolgt serverseitig und in PostgreSQL per RLS; Standardverhalten bei fehlender Freigabe: Zugriff verweigern.

**OFFEN:** Die ursprüngliche vollständige Rollenmatrix, z. B. Familienadministrator, erwachsene Mitglieder und Kinderrolle, die Berechtigungen zur Verwaltung anderer Personen sowie die genaue Semantik von Privat-Markierungen bei gemeinsamem Inhalt. Diese Matrix **nicht** aus diesem Dokument als neu beschlossen ableiten.

### Zugriffsszenarien (fachliche Akzeptanzregeln)

- **AC-FAM-01:** Mitglied einer Familie kann nur die nach Rolle, Eigentümerschaft und Freigaben sichtbaren Inhalte abrufen.
- **AC-FAM-02:** Andere Familien werden auch beim direkten Aufruf einer bekannten Ressourcen-ID nicht preisgegeben.
- **AC-FAM-03:** Ein eigener geeigneter Inhalt kann auf privat gestellt werden; anschließend verschwindet er für nicht berechtigte Familienmitglieder aus Detail-, Listen-, Such-, Kalender-, Export- und Benachrichtigungsansichten.
- **AC-FAM-04:** Ein Rollen- oder Mitgliedschaftswechsel wirkt bei nachfolgenden Zugriffen und Benachrichtigungszustellungen; alte Clientdaten dürfen keine erneute Berechtigung suggerieren.

## A.2 – Kalender und Termine

### Fachliche Grundsätze

**BESCHLOSSEN:** FamilyHub führt die relevanten Kalenderinformationen als maßgebliche Quelle. Kalenderfunktionen gehören zur ersten Ausbaustufe. Der Kalender darf nicht unabhängig vom Stundenplan doppelte oder widersprüchliche Daten erzeugen.

**Aus dem bekannten Architekturkonzept rekonstruierte Begriffe:** `calendars`, `events`, `series`, `occurrence_overrides`, `participants`, `reminder_rules`, `reminder_targets`.

### Fachlicher Ablauf (ABGELEITET)

1. Berechtigtes Mitglied legt einen Termin in einem für es nutzbaren Kalender an.
2. Termin besitzt eine eindeutige Identität, Titel, zeitliche Lage und durch das aktuelle Berechtigungsmodell bestimmte Sichtbarkeit.
3. Einzeltermin oder Serientermin wird gespeichert; die Serienregel bleibt von Ausnahmen einzelner Vorkommen unterscheidbar.
4. Teilnehmer und Erinnerungen werden nach fachlicher Berechtigung festgelegt.
5. Beim Ändern, Verschieben, Absagen oder Löschen werden betroffene Ansichten und geplante Benachrichtigungen konsistent aktualisiert.
6. Eine Änderung wird als fachlicher Vorgang verarbeitet, sodass doppelt eintreffende Requests nicht doppelte Termine oder Pushs erzeugen.

### Wiederholung, Ausnahmen und Zeit

- **ABGELEITET:** Für Serientermine wird die wiederkehrende Regel separat von Einzelvorkommens-Änderungen abgebildet. Eine einzelne Terminabsage oder -verschiebung darf die zugrunde liegende Serie nicht unbeabsichtigt verändern.
- **ABGELEITET:** Zeitzone, ganztägige Termine und Sommerzeitwechsel müssen ausdrücklich beachtet werden. Nicht blind nur UTC-Zeitpunkte für fachlich lokale Ganztages-/Stundenplansituationen verwenden.
- **OFFEN:** Verbindliche Regeln für „nur dieses Vorkommen“, „dieses und folgende“ sowie komplette Serienänderung, die konkrete Wiederholungsnotation, Kalenderfreigaben und mögliche externe Synchronisationsmechanismen. Keine Produktentscheidung dazu stillschweigend treffen.

### Akzeptanzkriterien und Szenarien

| ID | Prüffall |
| --- | --- |
| AC-KAL-01 | Berechtigte Person kann einen Termin anlegen, ändern und wieder anzeigen. |
| AC-KAL-02 | Nicht berechtigte Person kann den Termin auch durch direkten API-Aufruf nicht lesen oder ändern. |
| AC-KAL-03 | Private Termine erscheinen nicht in Familienlisten, Suche, Push-Payloads oder aggregierten Ansichten unberechtigter Personen. |
| AC-KAL-04 | Eine Ausnahme innerhalb einer Serie ändert nicht ungewollt andere Vorkommen. |
| AC-KAL-05 | Löschung/Verschiebung setzt betroffene Erinnerungen konsistent außer Kraft bzw. neu. |
| AC-KAL-06 | Derselbe Änderungsrequest erzeugt bei Wiederholung kein zweites Fachobjekt. |
| AC-KAL-07 | Zeit- und Datumsdarstellung bleibt über Zeitumstellung, Tagesgrenzen und Zeitzonen konsistent. |

**Given/When/Then – Privater Termin:** Gegeben sei ein eigenes, privat markiertes Ereignis; wenn ein anderes Mitglied derselben Familie eine Monatsansicht oder direkte Detail-URL abruft, dann darf es weder Termininhalt noch einen sensiblen abgeleiteten Hinweis erhalten.

## A.3 – Schule, Stundenplan und Unterrichtsprojektionen

**BESCHLOSSEN:** Der Stundenplan gehört zusammen mit dem Kalender zu den ersten zu implementierenden Fachmodulen. Kalendertermine und **aus Unterrichtsinformationen abgeleitete Projektionen** müssen fachlich unterschieden werden.

**Aus Phase B rekonstruierte Modellbereiche:** Schulprofile, Schuljahre, Stundenplanversionen, Rotation, Ferien und schulische Ausnahmen.

### Modelllogik (ABGELEITET)

- Ein **Schulprofil** verknüpft relevante Schuldaten mit dem berechtigten Familienmitglied.
- Ein **Schuljahr** begrenzt fachlich die Gültigkeit schulischer Planung.
- **Stundenplanversionen** bilden Änderungen ab einer definierten Gültigkeit ab; historische Zustände dürfen nicht unkontrolliert überschrieben werden.
- Eine **Rotationsregel** berücksichtigt wiederkehrende Muster, soweit vom Originalfachkonzept vorgesehen.
- **Ferien, unterrichtsfreie Tage und Ausnahmen** beeinflussen die Ableitung des tatsächlichen Unterrichts.
- **Unterrichtsprojektionen** werden für Kalenderansichten aus den Schulplandaten berechnet bzw. über definierte Mechanismen bereitgestellt. Sie sind **nicht automatisch identisch** mit dauerhaft gespeicherten, eigenständig bearbeitbaren Kalenderterminen.

### Konfliktregeln

- Änderung eines Stundenplanblocks muss sich in nachfolgenden Unterrichtsprojektionen niederschlagen.
- Eine manuell angelegte Familienveranstaltung ersetzt nicht automatisch Unterrichtsdaten.
- Absagen oder Änderungen einzelner Schultage werden im verantwortlichen Schulmodul erfasst.
- Falls aus einer Projektion ein „realer“ Kalendereintrag entstehen darf, braucht das eine ausdrücklich definierte Operation, Identitätszuordnung und Duplikatvermeidung. **OFFEN**, ob und unter welchen Regeln diese Umwandlung freigegeben ist.

### Akzeptanzkriterien

| ID | Prüffall |
| --- | --- |
| AC-SCH-01 | Berechtigte Familienmitglieder sehen den für sie freigegebenen Stundenplan. |
| AC-SCH-02 | Eine neue gültige Stundenplanversion ändert die angezeigte Planung ab dem vorgesehenen Stichtag. |
| AC-SCH-03 | Ferien und Unterrichtsausnahmen werden in der Kalenderprojektion berücksichtigt. |
| AC-SCH-04 | Unterrichtsprojektionen werden nicht als doppelte eigenständige Termine angezeigt. |
| AC-SCH-05 | Schulinformationen anderer Familien sind nicht abrufbar. |
| AC-SCH-06 | Zeitlich überlappende Versionen oder widersprüchliche Regeln führen nicht zu stillem Datenverlust. |

## A.4 – Push-Benachrichtigungen und Erinnerungen

**BESCHLOSSEN:** FamilyHub kann Push-Nachrichten etwa zu Terminen versenden. In der anfänglichen Familie sind als **fachliche Empfängerwahl** vorgesehen: **Mitglied A, Mitglied B, Mitglied C, Mitglied D, Alle**.

Diese Namen sind UI-Optionen der ersten Familie, **keine globale, hartkodierte Datenstruktur**. Jede Benachrichtigung braucht eine familienbezogene, autorisierte Empfängerauflösung. „Alle“ bezieht sich auf die jeweils fachlich zulässige Empfängermenge der betroffenen Familie, nicht auf sämtliche App-Nutzer.

### Verarbeitungsregeln (ABGELEITET)

1. Fachereignis, Empfängerwahl, Zeitpunkt und Erinnerungsregel bilden die Grundlage einer Benachrichtigung.
2. Vor Zustellung sind Empfängerstatus, Familienzugehörigkeit, Datenschutz/Sichtbarkeit und relevante Einstellungen erneut zu prüfen.
3. Empfänger ohne Berechtigung auf den Inhalt erhalten weder sensible Push-Texte noch indirekte Informationen.
4. Wiederholungen und Retries dürfen keine unbeabsichtigten Mehrfachsendungen erzeugen.
5. Stornierungen, Löschungen und geänderte Termine müssen geplante Erinnerungen konsistent behandeln.
6. Mobil und Web können unterschiedliche Push-Endpunkte und Berechtigungen haben; fehlende Berechtigung zum Empfangen muss verständlich behandelt werden.

**OFFEN:** Exakte Erinnerungsvorlaufzeiten, Benachrichtigungskategorien, Ruhezeiten, Gerätepräferenzen und zulässige Minimal-Payload. Keine Defaults als beschlossene Fachvorgabe deklarieren.

### Akzeptanzkriterien

- **AC-PUSH-01:** Die UI unterstützt die festgelegte Empfängerwahl innerhalb des jeweils zulässigen Kontexts.
- **AC-PUSH-02:** „Alle“ kann keine Familiengrenze überschreiten.
- **AC-PUSH-03:** Ein nicht berechtigtes Mitglied erhält keine privaten Inhalte über Push, auch nicht bei zwischenzeitlicher Berechtigungsänderung.
- **AC-PUSH-04:** Wiederholte technische Verarbeitung derselben Sendung führt nicht unkontrolliert zu doppelten Benachrichtigungen.
- **AC-PUSH-05:** Gelöschte bzw. verschobene Termine führen nicht zu fachlich veralteten Benachrichtigungen, soweit der Versand noch verhindert werden kann.

## A.5 – Importe, KI/OCR und weitere Module

### Erforderliche Importfunktionen

**BESCHLOSSEN:** Die erste Stufe enthält für Kalender/Stundenplan notwendige Importmöglichkeiten; im bekannten Plan sind insbesondere **Foto/PDF-Import** vorgesehen. Die Architektur erlaubt später austauschbare KI-/OCR-Provider.

**Aus Phase B rekonstruierter Prozess:** Importjobs, Dateien, Verarbeitungsläufe, Entwürfe, Herkunftsnachweise/Evidenz, Entscheidungen und Veröffentlichung.

**ABGELEITETER sicherer Ablauf:** Datei privat ablegen → autorisierte Verarbeitung starten → maschinell erkannte Daten als **Entwurf** speichern → Nutzer prüft/korrigiert → kontrollierte Übernahme in das zuständige Fachmodul → Quelle/Entscheidung nachvollziehbar halten. Ein ungeprüfter OCR-Entwurf darf nicht automatisch zur maßgeblichen Kalender-/Schulwahrheit werden, sofern kein freigegebener Sonderfall existiert.

**OFFEN:** Welche Importformate, Extraktionsregeln, Validierungsregeln und Freigabeanforderungen das Originalkonzept konkret festgelegt hat. Jede automatische Veröffentlichung oder externe KI-Übertragung benötigt die erforderliche Berechtigungs- und Datenschutzprüfung.

### Spätere Module

- **Aufgaben:** eigenständiges Fachmodul mit möglicher Terminabhängigkeit; keine direkten Schreiboperationen in Kalenderdaten.
- **Dokumente:** private/gemeinsame Dokumentressourcen; von technischen Importdateien fachlich trennen.
- **Automatisierung/KI:** austauschbare Provider, transparente Freigaben, keine ungeprüften privaten Eingaben in Fremdsysteme.
- **Dashboard:** zeigt nur Daten, die das betrachtende Mitglied lesen darf; kein Informationsleck über Zahlen, Kategorien oder Vorschau.

**BESCHLOSSEN:** Diese Module sind modular vorzubereiten, aber **nicht** ohne Story-Freigabe in R1 vorzuziehen.

## A.6 – Übergreifende Konsistenz, UX und Qualität

### Fachliche Konsistenzmatrix

| Quelle | Betroffener Bereich | Verbindliche Prüffrage |
| --- | --- | --- |
| Kalenderänderung | Erinnerungen/Push | Sind Versandzeit, Empfänger und Datenschutz noch korrekt? |
| Stundenplanänderung | Kalenderprojektion | Wird die richtige gültige Version projiziert und nichts dupliziert? |
| Schulausnahme/Ferien | Unterrichtsprojektion | Entfällt/ändert sich Unterricht nur im zutreffenden Zeitraum? |
| Terminserie | einzelne Ausnahmen | Bleiben nicht betroffene Vorkommen unverändert? |
| Privat-Markierung | Suche/Export/Push/Dashboard | Können Fremdmitglieder Details oder indirekte Informationen sehen? |
| Mitgliedschaft/Rolle | alle Module | Wirkt Widerruf auf Lesen, Schreiben und Zustellung? |
| Import/Freigabe | Kalender/Schule | Werden nur geprüfte Daten nachweislich übernommen? |
| Gleichzeitige Änderungen | Fachobjektversionen | Werden konkurrierende Änderungen erkannt statt überschrieben? |
| Aufgaben (später) | Kalender | Gibt es eine eindeutige Quelle der Terminwahrheit? |

### UX-Grundsätze (BESCHLOSSENE Ziele; Umsetzung im Detail OFFEN)

- Bedienung auf kleinen Smartphone-Displays priorisieren; Desktop-PWA unterstützen.
- Gemeinsame und private Inhalte erkennbar unterscheiden, ohne Privates preiszugeben.
- Vorgänge mit klaren Aktionen und verständlichen Fehlermeldungen gestalten.
- Warte-, Lade-, Offline- und Konfliktsituationen transparent behandeln.
- Für Kinder nutzbare Oberfläche mit angemessener Lesbarkeit, Touch-Zielen und möglichst geringer Komplexität.
- Technische Datenschutzentscheidungen nicht allein in visuelle Hinweise auslagern.

### Übergreifende Testfälle

1. Nutzer A versucht, private Ressource von Nutzer B derselben Familie per API-ID aufzurufen → Zugriff gemäß Baseline verweigert.
2. Mitglied von Familie X errät ID aus Familie Y → weder Daten noch Metadaten werden offenbart.
3. Wiederholter Import derselben Quelle → keine unkontrollierten Duplikate oder widersprüchlichen Veröffentlichungen.
4. Änderung am Stundenplan bei bestehenden Ferien/Einzelausnahmen → Kalenderprojektion reflektiert korrekte Gültigkeit.
5. Termin verschieben, während eine Push-Nachricht zur alten Zeit eingeplant ist → veralteter Job wird fachlich invalidiert.
6. Zwei Clients aktualisieren dieselbe Version → Konflikt wird erkennbar und nicht still überschrieben.
7. Mitglied verliert Berechtigung nach Auftragserteilung, vor Hintergrundjob → Job respektiert aktuell zulässige Rechte.

## Anforderungskatalog – kompakte Baseline

| Kennung (redaktionell, neu) | Anforderung | Status |
| --- | --- | --- |
| A-FAM-01 | Strikte Daten- und Zugriffstrennung nach Familie | BESCHLOSSEN |
| A-FAM-02 | Einheitliche Benutzer-, Familien- und Berechtigungslogik | BESCHLOSSEN |
| A-FAM-03 | Geeignete eigene Inhalte privat markieren | BESCHLOSSEN |
| A-KAL-01 | FamilyHub als führendes Kalendersystem | BESCHLOSSEN |
| A-KAL-02 | Kalender und Stundenplan zuerst umsetzen | BESCHLOSSEN |
| A-KAL-03 | Reale Termine und Unterrichtsprojektionen unterscheiden | BESCHLOSSEN |
| A-KAL-04 | Serien/Einzelausnahmen konsistent behandeln | BESCHLOSSENES Qualitätsziel; Detail offen |
| A-SCH-01 | Schuljahre, Stundenplanversionen, Rotation, Ferien/Ausnahmen berücksichtigen | ARCHITEKTUR-BASIS; Detail offen |
| A-PUSH-01 | Empfängerauswahl Mitglied A/Mitglied B/Mitglied C/Mitglied D/Alle | BESCHLOSSEN |
| A-PUSH-02 | Berechtigung und Sichtbarkeit auch bei Benachrichtigung wahren | BESCHLOSSEN |
| A-IMP-01 | Notwendige Importe inkl. Foto/PDF in R1 | BESCHLOSSEN |
| A-IMP-02 | Entwurf-/Prüf-/Übernahmepipeline | AUS PHASE B ABGELEITET |
| A-MOD-01 | Aufgaben, Dokumente, KI und Dashboard modular später | BESCHLOSSEN |
| A-EXC-01 | Keine eigenständige Fahrdienstplanung | BESCHLOSSEN |

*Kennungen dienen nur der besseren Nachverfolgbarkeit in diesem Export und ersetzen keine vorhandenen Story-IDs.*

## Punkte, die vor einer Detailimplementierung aus dem Original abgeglichen werden müssen

1. Rollenmatrix und genaue Kind-/Erwachsenenrechte, einschließlich Eigentümerschaft und „Privat“.
2. Kalenderfreigaben, Serienterminoperationen, Synchronisations-/Exportregeln und bevorzugtes Datum-/Zeitzonenverhalten.
3. Konkrete Stundenplanstrukturen, Stunden-/Pausenzeiten, Rotationslogik und Ausnahmeregeln.
4. Regeln zur Umwandlung von Unterrichtsprojektionen in reale Termine – falls vorgesehen.
5. Erinnerungsregeln, Push-Präferenzen und genaue Sichtbarkeit der Empfängerauswahl.
6. Importformate, Prüfung/Freigabe, OCR-Datenübertragung und Datenschutzbedingungen.
7. Ursprüngliche vollständige Story-Liste und festgelegte UI-/Dashboard-Details.

**Wichtige Abgrenzung:** Dieses Dokument ist fachlicher Kontext für Codex, **kein Auftrag**, neue Features unabhängig vom jeweils freigegebenen Entwicklungsauftrag zu implementieren. `FH-CX-001` befindet sich bereits in Umsetzung.
