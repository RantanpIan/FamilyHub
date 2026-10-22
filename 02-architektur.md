# FamilyHub – Technische Architektur (Phase B)

> **Dokumentstatus:** Konsolidierte Arbeitsfassung vom 22.10.2026 für Coding-Agenten.  
> **Verbindlichkeit:** Mit **BESCHLOSSEN** gekennzeichnete Punkte sind bekannte Baseline. Mit **KONZEPTREKONSTRUKTION** gekennzeichnete Bezeichnungen stammen aus der früheren technischen Planung, konnten aber nicht gegen die Originaldokumente geprüft werden. **VORSCHLAG** und **OFFEN** sind keine beschlossenen Entscheidungen.  
> **Nicht tun:** Dieses Dokument als Aufforderung zu vollständiger Implementierung auslegen oder bereits laufende Arbeiten von `FH-CX-001` ersetzen.

## B.0 – Architekturziele, Rahmen und Architekturentscheidungen

### Qualitätsziele

1. Datenschutz und sichere Isolation verschiedener Familien, einschließlich personenbezogener Daten von Kindern.
2. Hohe fachliche Korrektheit, insbesondere bei Kalender, Stundenplan, Erinnerungen und Privatberechtigungen.
3. Wartbare, testbare Module und nachvollziehbare Evolution der Schemata/Schnittstellen.
4. Geringe Betriebs- und Abhängigkeitskosten; schrittweise statt überdimensionierte Realisierung.
5. Nutzbarkeit auf Android, iOS und Desktop bei weitgehend gemeinsamem Frontend.

### Festgelegter Technologiestack (BESCHLOSSEN)

| Schicht | Technologie/Entscheidung |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Android/iOS | Capacitor |
| Desktop/Windows | Progressive Web App |
| Backend | Supabase, PostgreSQL; Supabase Auth |
| Architektur | Modularer Monolith im Monorepo |
| Sicherheit | PostgreSQL Row Level Security (RLS), Ressourcenberechtigungen und serverseitige Autorisierung |
| Dateien | Privater Supabase Storage |
| Hintergrundarbeit | Outbox, Queue, Scheduler |
| Push | Firebase Cloud Messaging (FCM), Apple Push Notification service (APNs), Web Push |
| KI/OCR | Anbieterneutrale Adapter, später austauschbare Provider |
| Testsystem | Vitest, Playwright, ergänzende DB/RLS-Tests |
| CI/CD | GitHub Actions |
| Datenstandort | EU, Frankfurt bevorzugt |

**BESCHLOSSEN:** Neue Bibliotheken, ORM-Schichten, Drittanbieter und kostenpflichtige Services nicht ohne begründete Freigabe hinzufügen. Der Repository-Istzustand ist für die technische Ausgestaltung zu berücksichtigen.

### Architekturprinzipien

- Jeder Fachbereich besitzt seine eigenen Zuständigkeiten, Regeln und Schreibpfade.
- Module kommunizieren durch dokumentierte Schnittstellen oder fachliche Ereignisse.
- Keine direkten Datenbankänderungen in fachfremden Modulen.
- Einheitliches Identity-, Familien-, Ressourcen- und Berechtigungskonzept.
- Versionierte APIs und nachvollziehbare Migrationen.
- Kritische Änderungen, Imports und Jobverarbeitung möglichst idempotent.
- Sicherheitskontrollen auf Datenbank- **und** Serverseite; Frontend ist niemals alleinige Sicherheitsgrenze.
- Keine doppelte Wahrheit: Kalender führt Ereignisse, Schule führt Stundenplandaten, Kalenderansichten kombinieren ggf. Projektionen.
- Architektur für mehrere getrennte Familien, obwohl R1 nur eine nutzt.

## B.1 – Fachmodule und Verantwortlichkeiten

| Modul | Verantwortet | Nicht verantwortlich für |
| --- | --- | --- |
| Identity/Family/Access | Identitäten, Familien, Mitgliedschaft, Rollen, Eigentümerschaft, Freigaben | Fachinhalte von Kalender/Schule |
| Calendar | Kalender, Ereignisse, Serien, Ausnahmen, Teilnehmer, fachliche Erinnerungsregeln | Pflege von Unterrichtsplänen |
| School | Schulprofile, Schuljahre, Stundenplanversionen, Rotation, Ferien, Schul-Ausnahmen | Eigenständige Kalenderereignisse anderer Herkunft |
| Notification | Gerätezustellungen, Subscription-/Tokenverwaltung, Zustellstatus, erneute Berechtigungsprüfung | Entscheidung, wem ein fachlicher Termin gehört |
| Import | Quell-Dateien, Jobs, Läufe, extrahierte Entwürfe, Evidenz, Review und Übergabe | Fachfremde Direktwrites an Kalender-/Schultabellen |
| Files (technisch) | Privater Objekt-Speicher, Zugriffsregeln, Metadaten | Späteres vollwertiges Dokumentenmodul |
| Tasks (später) | Aufgaben, Status, Termine als Referenzen | Direkte Änderungen an Kalender-Entities |
| Documents (später) | Dokumentfachlogik, Ablage, Freigaben | Ersatz für technische Importpipeline |
| Automation/AI (später) | Provider-Konnektoren, kontrollierte Verarbeitung | Bypass privater Zugriffsrechte |
| Dashboard (später) | Berechtigungssichere Aggregationen/Ansichten | Eigene fachliche Datenwahrheit |

### Modulgrenzen

- Module stellen typisierte, dokumentierte Operationen bereit; die konkrete Codeorganisation richtet sich nach dem bestehenden Monorepo.
- Fremde Tabellen und interne Implementierungsdetails dürfen nicht als öffentliche Modul-API behandelt werden.
- Ein berechtigter Schreibvorgang erfolgt im zuständigen Modul. Domänensignale an andere Module laufen über explizite Events/Outbox oder bewusst definierte Anwendungen.
- Lesemodelle/Projektionen dürfen zuständigkeitsübergreifend zusammengesetzt werden, **aber** sie müssen Berechtigungen respektieren und keine zweite schreibbare Wahrheit bilden.

## B.1.1 – Datenmodell und Mandantentrennung

**KONZEPTREKONSTRUKTION:** Folgende bereits geplante Entitätsgruppen sind aus dem Projektkontext bekannt. **Dies ist eine konzeptionelle Landkarte, kein fertiges SQL-Schema oder migrationsfähiger Feldkatalog.** Vor dem Anlegen oder Ändern von Tabellen den genauen Originalentwurf, Ist-Schema und laufenden Auftrag prüfen.

| Bereich | Bekannte Entitäten/Begriffe | Zweck |
| --- | --- | --- |
| Familien/Personen | `families`, `family_members`, `memberships` | Mandanten, Personen und Mitgliedschaft |
| Zugriff | `resources`, `grants` | Gemeinsames Ressourcen-/Freigabekonzept |
| Kalender | `calendars`, `events`, `series`, `occurrence_overrides`, `participants` | Ereignisse, Serien, Ausnahmen und Beteiligte |
| Erinnerung | `reminder_rules`, `reminder_targets` | Regeln und Zielgruppen |
| Schule | school profiles / years / schedule versions / rotations / holidays / exceptions | Schulstruktur und gültige Unterrichtsplanung |
| Import | import jobs / files / runs / drafts / evidence / decisions / publications | Verarbeitungs- und Freigabepipeline |
| Infrastruktur | Outbox / Queue / Scheduler | Asynchrone, zuverlässige Verarbeitung |

**BESCHLOSSEN:** UUIDs und fachlich eindeutige IDs werden verwendet. Im früheren Konzept wurden außerdem `/v1`-APIs, `expectedVersion`, Idempotenz und Domain Events/Outbox festgehalten.

**VORSCHLAG für Prüfpunkte, nicht verbindliches Feldschema:** Bei fachlichen Ressourcen muss die Familienzuordnung unverwechselbar und geschützt sein. Bei schreibbaren Objekten Ownership, Sichtbarkeit und Versions-/Änderungsinformationen berücksichtigen; bei Serien zeitliche Gültigkeit und Ausnahmen. Spätere Migrationen sollen explizit Constraints und referenzielle Integrität absichern.

### RLS und Zugriffsprüfung (BESCHLOSSENE Regeln)

1. Jede mandantenbezogene Tabelle/Abfrage und jede Dateizugriffsoperation muss die Familie berücksichtigen.
2. RLS hat Default-Deny; nur ausdrücklich autorisierte Mitglieder dürfen passende Datensätze lesen oder verändern.
3. `family_id` oder `resource_id` aus dem Client ist eine **Anfrage**, niemals ein Berechtigungsbeweis.
4. Serverseitige Operationen verifizieren Identität, aktive Mitgliedschaft, Rolle, Ressourcenberechtigung, Ownership und zulässigen Zustand.
5. Ein Service Role Key darf weder im Frontend noch als bequemer genereller Bypass von RLS für Benutzeroperationen verwendet werden.
6. Privat-Markierung schützt auch vor indirekten Offenlegungen in Projektionen, Suche, Export, Push, Fehlerantworten und Aggregationen.
7. Autorisierung nach einem Rollenwechsel darf nicht auf veralteten Berechtigungs-Snapshots basieren.
8. Referenzierte Datensätze verschiedener Familien dürfen sich weder über Foreign Keys noch Logikpfade ungewollt vermischen.

**Wichtig:** Die detaillierte Rollen- und Grant-Matrix ist im ursprünglich beschlossenen Fachkonzept abzugleichen. Keine neue Admin-/Eltern-/Kinder-Ausnahme durch Annahmen implementieren.

## B.1.2 – Kalenderdomäne und Unterrichtsprojektionen

### Abgrenzung von Kalender und Schule

**BESCHLOSSEN:** FamilyHub ist führend für **reale Kalenderereignisse**. School ist führend für **Unterrichtsplan-Daten**. Unterrichtsprojektionen in Kalenderansichten sind abgeleitete Resultate der School-Fachlogik und dürfen nicht ungeprüft als zweite persistierte Event-Wahrheit geführt werden.

```text
School-Plan + Gültigkeitszeitraum + Ferien/Ausnahmen
                         |
                         v
              Unterrichtsprojektion
                         |
                         +------> berechtigte Kalenderansicht
                         |
Calendar-Events/Serien ----------------^ 
```

### Konsistenzregeln

- Persistierte Kalendereignisse besitzen eine vom Stundenplan unabhängige Identität und Lebenszyklus.
- Projektionsobjekte sind als abgeleitet erkennbar (Quelle, Regelversion, referenzierter Zeitraum); sie dürfen nicht unabsichtlich beliebig im Calendar-Modul überschrieben werden.
- Ausnahmen wirken nur auf betroffene Vorkommen/Intervalle und nie pauschal auf unbeteiligte Termine.
- Zeitzonen, lokale Unterrichtszeiten, Tageswechsel und Sommerzeit sind in Domain/API-Testfällen abzudecken.
- Bei Stundenplanwechsel müssen betroffene Ableitungen logisch invalidiert/neu bestimmt werden; keine unkontrollierten Duplikate.
- Bei Änderungen und Löschungen müssen abhängige Erinnerungsjobs kontrolliert behandelt werden.

**OFFEN:** Konkretes Projektionsformat, Cache-Lebensdauer, Kalender-Seriensyntax und Regeln für dauerhaft gespeicherte Ausnahmen oder konvertierte Ereignisse. Nur mit zugehöriger Story freigeben.

## B.1.3 – API-, Ereignis- und Konfliktverträge

**BESCHLOSSEN:** Versionierte APIs (frühere Vorgabe: `/v1`), nachvollziehbare Datenänderungen, `expectedVersion` für konkurrierende Änderungen sowie idempotente kritische Verarbeitung.

### API-Regeln

- Ein API-Request wird unter der authentifizierten Identität geprüft; Mitgliedschaft und Ressourcenrechte sind serverseitig durchzusetzen.
- Eingaben validieren, unbekannte oder unerlaubte Felder nicht stillschweigend als Schreibzugriff übernehmen.
- Extern lesbare Daten enthalten nur die für den jeweiligen Empfänger zulässigen Felder.
- `expectedVersion`/vergleichbarer Konkurrierungsmechanismus verhindert verlorene parallele Aktualisierungen; bei Versionskonflikt eine verständliche Konfliktantwort statt blindem Überschreiben.
- Fehlerantworten geben keine privaten Titel, Personen- oder Familieninformationen preis.
- Versionierung und Migration bestehender API-Verträge sind nachvollziehbar zu dokumentieren.

**VORSCHLAG (illustrierende Form, keine feste Endpunktliste):** Alle ändernden Use Cases als definierte Moduloperationen mit Inputvalidierung, Auth-Check, persistenter Mutation und eventuell Domain Event behandeln. Nicht aus Beispielen beliebige öffentliche Endpunkte generieren.

### Domain Events / Outbox

**BESCHLOSSEN:** Module dürfen über Domain Events kommunizieren; Hintergrundverarbeitung basiert auf Outbox, Queue und Scheduler.

**ABGELEITETE Verarbeitungsinvarianten:**

1. Fachliche Zustandsänderung und Outbox-Eintrag sollen, wo technisch sinnvoll, in derselben Transaktion committen.
2. Hintergrundhandler sind robust gegen Duplikate und Neustarts; Wiederholungs-/Deduplizierungsschlüssel nach einem fachlich eindeutigen Ereignis.
3. Zustellfehler sind kontrolliert wiederholbar und als Fehler diagnostizierbar, ohne vertrauliche Nutzdaten zu loggen.
4. Relevante Berechtigungen werden zum Zeitpunkt der tatsächlichen Aktion erneut geprüft.
5. Fehlgeschlagene Jobs dürfen den Fachzustand nicht scheinbar erfolgreich oder inkonsistent zurücklassen.

**OFFEN:** Job-Technologie, Retry-Zeiten, Dead-Letter-Verfahren und Ereignisschemas – durch konkrete Infrastruktur-Aufträge und Ist-Repository entscheiden, nicht durch dieses Exportdokument.

## B.1.4 – Push, Storage und Importarchitektur

### Push

- **BESCHLOSSEN:** FCM, APNs, Web Push werden berücksichtigt; fachliche Auswahl Patricia/Hannah/Helena/Sebastian/Alle.
- Ein Familienmitglied kann mehrere Geräte/Subscriptions besitzen; Gerätekennungen sind keine fachlichen Familienidentitäten.
- Versandvorbereitung und Zustellung berücksichtigen aktuelle Berechtigung, Eigentümerschaft, Sichtbarkeit und Mitgliedschaft.
- Ein privater Termin darf nicht durch Titel, Vorschau, Link, Zähler, Metadaten oder Payload bei einer unberechtigten Person sichtbar werden.
- Wird ein Ereignis geändert, verschoben oder gelöscht, sind bereits geplante Reminder fachlich korrekt zu invalidieren bzw. zu aktualisieren.
- Erneuter Sendungsversuch muss Deduplizierung/Zustellstatus berücksichtigen.

### Storage

- **BESCHLOSSEN:** Privater Supabase Storage für Dateien.
- Keine öffentlichen Buckets für private Familiendaten; URLs und Zugriffe nur mit passenden zeitlich und fachlich begrenzten Berechtigungen.
- Externe Datei-/KI-Verarbeitungsanbieter nur über freigegebene Adapter und mit erforderlicher Zugriffskontrolle.
- Upload, Download, Vorschau, Löschung und Export müssen dieselben Mandanten- und Sichtbarkeitsregeln beachten wie die zugehörigen Fachobjekte.

### Import

**KONZEPTREKONSTRUKTION:** Importjobs, Dateien, Läufe, Entwürfe, Evidenz, Entscheidungen, Veröffentlichungen gehören zur vorherigen Planung.

```text
privater Upload
      |
      v
  Importjob / Run ---> OCR/Parser über Adapter
      |                        |
      +--------> geprüfte extrahierte Vorschläge
                               |
                     Entwurf + Evidenz
                               |
                       Fachliche Prüfung
                               |
                  explizite Freigabeentscheidung
                               |
                        Moduloperation
                    Calendar oder School
```

**ABGELEITET:** Der Import ist **nicht** selbst Quelle von Kalender-/School-Schreibrechten. Veröffentlichungen werden über die fachlich verantwortlichen Module autorisiert. Doppelte Uploads, Retries und Wiederholungen sollen nach Möglichkeit nicht zu doppelten Kalender-/Schuldaten führen.

**OFFEN:** Konkrete Automatisierungsstufen des Imports, Provider, Dateigrößen/Dateitypen und Regeln für Prüfpflichten. Keine unverifizierten Automatismen als beschlossene Baseline behandeln.

## B.2 – Repository, Umgebungen, Qualität und Delivery

### Repository (BESCHLOSSEN)

- Monorepo mit gemeinsamem TypeScript-Ökosystem, klaren Modulverantwortlichkeiten und Tests.
- Frontend basiert auf Vite/React/TypeScript.
- Mobile Builds verwenden Capacitor, Desktop nutzt PWA.
- Supabase-Konfiguration und Schemaänderungen sind versioniert.
- GitHub Actions führt projektgerechte Prüfungen aus.

**Wichtig:** Die tatsächlichen Ordner- und Paketnamen sind im laufenden `FH-CX-001` zu klären. **Keine neue Repository-Struktur aus diesem Dokument blind über ein bestehendes Monorepo legen.**

### Teststrategie

| Prüfebene | Ziel | Typisches Werkzeug |
| --- | --- | --- |
| Unit | Regeln der Module, Zeitlogik, Serien, Projektionen | Vitest |
| Integrations-/API-Tests | Persistenz, Transaktionen, Idempotenz, Versionskonflikte | Projektabhängig, Vitest möglich |
| DB-/Security-Tests | RLS, Familienisolation, Ressourcenrechte, Storage | SQL-/Supabase-Testumgebung |
| End-to-End | Kernabläufe auf sinnvoller Gerätegröße, Fehlerzustände | Playwright |
| CI | Reproduzierbarkeit, Typprüfung, Lint, Tests, Build | GitHub Actions |

### Besonders sicherheitsrelevante Negativtests

1. Fremde `family_id` wird an Mutations-API übergeben.
2. Fremde `resource_id` wird erraten.
3. Privates Objekt wird über Listen, Suche, aggregierte Ansicht, Terminprojektion oder Storage gesucht.
4. Push-Job versendet nach Entzug der Berechtigung.
5. Import-Review veröffentlicht in die falsche Familie.
6. Service-Role-Pfad umgeht unabsichtlich Berechtigungen.
7. Zwei gleichzeitige Update-Anfragen ohne passende `expectedVersion` kollidieren.
8. Storniertes Einzelvorkommen einer Serie wird dennoch als Reminder versendet.

### Deployment/Betrieb (teilweise OFFEN)

- **BESCHLOSSEN:** Hosting/Datenstandort EU, Frankfurt bevorzugt; geringe laufende Kosten.
- **BESCHLOSSEN:** CI/CD über GitHub Actions, Supabase/PostgreSQL als Backend, mobile Distribution über Capacitor.
- **OFFEN:** Konkrete Domänen, Repository-Umgebungsnamen, Secrets, Backup-/Recovery-Ziele, Monitoring, Releasekanäle, Aufbewahrungs-/Löschfristen, Store-Deployment und Freigabeprozess. Keine nicht dokumentierten Annahmen implementieren.

## Architektur-Checkliste vor jedem Codex-Auftrag

1. Auftrag und Ist-Zustand lesen; `git status` und offene Änderungen respektieren.
2. Zuständiges Modul und betroffene Datenverantwortung bestimmen.
3. Sind Ressourceneigentum, Familien- und Privatberechtigungen korrekt durchgesetzt?
4. Ist die fachliche Wahrheit eindeutig (Kalenderereignis versus Unterrichtsprojektion)?
5. Sind Versionskonflikte, Ausnahmen, Duplikate, Retries und Löschungen berücksichtigt?
6. Sind Drittanbieter/Provider/Dateien datenschutzgerecht behandelt?
7. Gibt es passende positive, negative, Grenzfall- und Cross-Family-Tests?
8. Sind Migrationen/Verträge dokumentiert; wurde kein fachfremdes Modul direkt beschrieben?
9. Wurden ausschließlich die ausdrücklich beauftragten Änderungen umgesetzt?
10. Wurden ausgeführte Tests und offene Restrisiken ehrlich dokumentiert?

## Nachträglich zu verifizierende technische Details

- Exakte SQL-DDL, Indizes, Constraints, RLS-Policies, Rollendefinitionen und Freigabematrix.
- Originale Datenflüsse und alle API-Endpunkte/Contracts (nur `/v1`, UUID und `expectedVersion` sind hier als frühere Designentscheidungen bekannt).
- Plan-/Rotation-/Ferienlogik und fachliche Ereignisschemas.
- Outbox-/Scheduler-Realisierung und Provider-Schnittstellen.
- Geplante Ordnerstruktur und Packages, soweit `FH-CX-001` sie aktuell bereits implementiert.
- Konkrete Commit-/Deploy-/Release-Gates und Auftragsakzeptanzkriterien.

**Quelle der Wahrheit bei Konflikt:** ausdrücklich freigegebene Original-Baseline und aktuelle Story > dieser Rekonstruktions-Export > unverbindliche Vorschläge. Abweichungen sichtbar machen, nicht stillschweigend entscheiden.
