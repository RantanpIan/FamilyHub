# AGENTS.md — FamilyHub

> Verbindliche Arbeitsanweisung für Coding-Agenten im FamilyHub-Repository.
> Geltungsbereich: gesamtes Repository, sofern keine enger gefasste `AGENTS.md` für einen Unterordner gilt.
> Fachkonzept (Phase A) und Architektur (Phase B) sind die Projekt-Baseline. Diese Datei ersetzt die vollständigen Konzepte nicht.

## 1. Produktziel und Arbeitsprinzip

FamilyHub ist eine modulare Familienmanagement-App für Kalender, Stundenpläne, Aufgaben, Dokumente und Benachrichtigungen. Sie startet für eine vierköpfige Familie, muss aber mehrere **vollständig voneinander getrennte Familien** unterstützen können.

Prioritäten: einfache und kindgerechte Bedienung, Sicherheit und Datenschutz, Zuverlässigkeit, Wartbarkeit, Erweiterbarkeit sowie geringe laufende Kosten. Wir bauen ein langfristig nutzbares Produkt und liefern kleine, früh verwendbare Inkremente — keinen Wegwerfprototyp.

**Kommunikation und Dokumentation erfolgen auf Deutsch.** Verwende präzise, nachvollziehbare Aussagen; unterscheide stets *beschlossen*, *vorgeschlagen*, *offen*, *in Umsetzung*, *implementiert* und *getestet*.

## 2. Projektstand — besonders wichtig

- **FH-CX-001 wurde im vorherigen Auftrag abgeschlossen.** Bestehende Implementierung bewahren und nicht ohne Anlass neu aufsetzen.
- Vor Änderungen vorhandene Implementierung, offene Änderungen, Tests, Dokumentation und den konkreten aktuellen Auftrag prüfen.
- Nie eine scheinbar „saubere“ Neuimplementierung über laufende Arbeiten legen. Keine fremden oder uncommitteten Änderungen überschreiben oder verwerfen.
- **Kalender und Stundenplan** sind die zuerst priorisierten Fachfunktionen. Erforderliche Familienverwaltung/Berechtigungen, Push und Importfunktionen unterstützen diese erste Stufe.
- Aufgaben, Dokumente, Automatisierungen/KI und Dashboard sind spätere Ausbaustufen; nicht vorziehen, wenn der Auftrag das nicht verlangt.
- Es gibt **keine eigenständige Fahrdienstplanung**.

## 3. Verbindliche Quellen und Konflikte

**Dokumentationspfade dieses Pakets:** `docs/01-fachkonzept.md` (Phase A), `docs/02-architektur.md` (Phase B), `docs/03-backlog.md` (Aufträge/Abhängigkeiten) und `docs/04-entscheidungen.md` (Beschlüsse/offene Punkte). **Wichtig:** Diese Dateien sind teilweise rekonstruierte Arbeitsfassungen aus den bekannten Projektentscheidungen, keine wortgetreuen Originalunterlagen. Bei Abweichungen haben die ausdrücklich freigegebenen Originalkonzepte und der aktuelle Entwicklungsauftrag Vorrang. Nicht verifizierte Details niemals als beschlossen ansehen.

Vor jeder Umsetzung:

1. Den aktuellen Entwicklungsauftrag mit ID, Umfang, Akzeptanzkriterien, Abhängigkeiten und Ausschlüssen lesen.
2. Vorhandene Dateien zur **Phase A / Fachkonzept**, **Phase B / Architektur**, zum **Backlog** und zu dokumentierten Entscheidungen suchen und lesen. Dateinamen/Pfade im Repository ermitteln; keine Existenz bestimmter Dateien voraussetzen.
3. Bestehende Implementierung, Tests, Package-Skripte, Migrationen und API-Konventionen prüfen.
4. Auswirkungen auf Kalender, Stundenplan, Berechtigungen, Push und andere betroffene Module bewerten.
5. Bei einer ungeklärten Kollision zwischen Auftrag, beschlossener Baseline und Ist-Implementierung: nicht stillschweigend entscheiden. Den Konflikt mit Auswirkungen und einer bevorzugten Lösung benennen; eine Änderung der Baseline braucht ausdrückliche Freigabe.

**Keine Festlegung als beschlossen ausgeben, die nur eine Annahme ist.** Wenn eine benötigte Projektquelle fehlt, dies transparent benennen und die kleinstmögliche, leicht korrigierbare Annahme treffen, soweit dadurch keine grundlegende Produkt-/Architekturentscheidung vorweggenommen wird.

## 4. Technologiestack — beschlossen

| Bereich | Festlegung |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Android/iOS | Capacitor |
| Desktop | Progressive Web App (PWA) |
| Backend/Datenbank | Supabase, PostgreSQL |
| Architektur | Modularer Monolith, Monorepo |
| Zugriffsschutz | Row Level Security (RLS) **und** serverseitige Autorisierung |
| Dateien | Privater Storage |
| Hintergrundverarbeitung | Outbox, Queue, Scheduler |
| Push | FCM, APNs, Web Push |
| KI/OCR | Austauschbare Provider |
| Tests | Vitest, Playwright |
| CI/CD | GitHub Actions |
| Datenstandort | EU, bevorzugt Frankfurt |

Den tatsächlichen Repository-Aufbau und bereits eingeführte Bibliotheken respektieren. **Keine weiteren Frameworks, Services, ORM-Schichten oder kostenpflichtigen Abhängigkeiten ohne begründete und freigegebene Entscheidung einführen.**

## 5. Architekturregeln

1. Jedes Fachmodul hat klar definierte Verantwortung für seine Daten und Regeln.
2. Module kommunizieren über definierte Schnittstellen oder fachliche Ereignisse; keine Umgehung über interne Tabellen anderer Module.
3. **Keine fachfremden direkten Datenbank-Schreibzugriffe.**
4. Benutzer, Familienzugehörigkeit, Rollen, Eigentümerschaft und Sichtbarkeit folgen einem gemeinsamen Berechtigungsmodell.
5. APIs und relevante Verträge sind versioniert; Änderungen und Migrationen werden nachvollziehbar dokumentiert.
6. Kritische Vorgänge, Importe, Ereignisverarbeitung und Push-Auslösung müssen, wo relevant, idempotent bzw. deduplizierbar sein.
7. Asynchrone Abläufe behandeln Retries, Fehler, Duplikate und konkurrierende Verarbeitung kontrolliert; bestehende Outbox-/Queue-/Scheduler-Konzepte nutzen.
8. Keine doppelte fachliche Wahrheitsquelle schaffen. Ableitungen/Projektionen sind erkennbar von dauerhaft gespeicherten Fachobjekten zu trennen.
9. Schnittstellen so entwerfen, dass später weitere Familien und Module ohne grundlegenden Architekturwechsel möglich sind.
10. Keine spekulative Überarchitektur. Nur das implementieren, was für den aktuellen Auftrag und dessen korrekte Absicherung erforderlich ist.

## 6. Sicherheit, Datenschutz und Berechtigungen

FamilyHub verarbeitet personenbezogene Daten, auch von Kindern. **Fail closed**: Im Zweifel keinen Zugriff erlauben.

- **Familientrennung:** Jede Datenabfrage, Mutation, Subscription, Suche, Export- und Dateioperation muss die Familienzugehörigkeit beachten. `family_id` allein im Client oder Request ist kein Berechtigungsnachweis.
- **RLS und serverseitige Prüfungen:** Rechte weder ausschließlich in der UI noch ausschließlich durch ein verstecktes Bedienelement absichern. Beide Ebenen prüfen; Service-/Admin-Zugriffe nicht als Umgehung verwenden.
- **Eigentümerschaft und Privatsphäre:** Jedes Familienmitglied kann geeignete eigene Inhalte privat markieren. Private Inhalte dürfen anderen Mitgliedern nicht versehentlich über Listen, Details, indirekte Zählwerte, Suche, Kalenderprojektionen, Logs, Push, Exporte, Storage-URLs oder KI-Funktionen offengelegt werden.
- **Berechtigungsmodell:** Rollen und Ausnahmen aus der Baseline übernehmen, nicht selbst neue Rechte erfinden. Fehlende Rechte serverseitig mit kontrolliertem Fehler ablehnen.
- **Push-Empfänger:** Fachlich auswählbar sind *Patricia, Hannah, Helena, Sebastian* und *Alle*. Diese Bezeichnungen sind anfängliche fachliche Optionen, **keine hartkodierten globalen User-IDs oder ein Ersatz für familienbezogene Empfängerermittlung**. Vor Versand Zugehörigkeit, Berechtigung, Sichtbarkeit und Einstellungen erneut prüfen; keine sensiblen Daten ungeschützt in Push-Payloads.
- **Dateien:** Privater Supabase Storage; Zugriffe serverseitig/RLS-konform absichern. Keine öffentlichen Buckets/URLs für private Inhalte.
- **Geheimnisse:** Keine Schlüssel, Tokens, Produktionsdaten oder personenbezogenen Testdaten committen; `.env`-Konventionen und Secret-Management des Repositories nutzen.
- **Datenminimierung:** Nur benötigte Daten speichern, loggen und übertragen; keine privaten Inhalte in Telemetrie oder Fehlerberichte schreiben.
- **Migrationen:** Bei Tabellen-/Policy-Änderungen Familiengrenzen, Besitz, Rückwärtskompatibilität und Datenmigration explizit prüfen. Keine produktiven oder destruktiven Datenoperationen ohne Freigabe.
- **Tests:** Positiv-, Negativ- und Cross-Family-Tests für Zugriffe; private/gemeinsame Objekte, fehlende Mitgliedschaft, Rollenwechsel und direkte API-/Storage-Zugriffe berücksichtigen.

## 7. Kalender, Schule und übergreifende Fachlogik

- **FamilyHub ist das führende Kalendersystem.** Externe Kalender/Importe sind keine konkurrierende Quelle der Wahrheit. Die genaue Synchronisationsrichtung/-strategie ergibt sich aus der Baseline bzw. dem konkreten Auftrag.
- Reale Kalendertermine und aus Stundenplänen abgeleitete **Unterrichtsprojektionen** unterscheiden; kein unkontrolliertes Duplizieren oder dauerhafte Abweichungen zwischen beiden.
- Wiederholungen, einzelne Ausnahmen, Verschiebungen, Löschungen und Zeiträume konsistent behandeln; Zeitzonen und Sommerzeit berücksichtigen.
- Änderungen am Stundenplan auf Auswirkungen auf Kalenderansichten, Projektionen und Benachrichtigungen prüfen.
- Aufgaben mit Terminabhängigkeiten erst im dafür freigegebenen Umfang ergänzen.
- KI/OCR darf ohne ausdrückliche Berechtigung weder auf private Inhalte zugreifen noch Ergebnisse familienübergreifend sichtbar machen.
- Gleichzeitige Änderungen, mehrfache Importe und verzögerte Events dürfen keine stillen Datenverluste oder Doppelbuchungen erzeugen.

## 8. Umsetzung eines Entwicklungsauftrags

Für jeden Auftrag **Epic → User Story → Akzeptanzkriterien → Testfälle → Implementierung** nachvollziehbar halten.

Ein Arbeitsauftrag ist nur im freigegebenen Scope umzusetzen und umfasst üblicherweise:

1. Fachliches Ziel und betroffene Module/Komponenten.
2. Konkrete Änderungen einschließlich Schnittstellen und, falls erforderlich, Datenmodell/Migration.
3. Serverseitige Autorisierung, RLS, Sichtbarkeit und Fehlerszenarien.
4. Prüffähige Akzeptanzkriterien sowie positive, negative und Grenzfalltests (bei Bedarf Given/When/Then).
5. Abhängigkeiten, bewusst ausgeschlossene Arbeiten und Definition of Done.

**Arbeitsablauf für Codex:**

1. `git status` und relevante Dateien prüfen; eigenen Arbeitsbereich und vorhandene Änderungen respektieren.
2. Auftrags-ID und Scope kurz festhalten. Bestehende Lösungen bevorzugt erweitern statt parallel nachbauen.
3. Kleine, zusammenhängende Änderungen implementieren; migrations- oder API-relevante Anpassungen separat erkennbar machen.
4. Passende Unit-, Integrations-, RLS-/Autorisierungs- und E2E-Tests ergänzen.
5. Nur im Repository vorhandene bzw. dokumentierte Befehle ausführen; keine Test- oder Build-Skripte erfinden. CI-relevante Prüfungen nach Möglichkeit ausführen.
6. Änderungen gegen Akzeptanzkriterien, Datenschutz, Regressionen und Architekturregeln prüfen.
7. Ergebnis sachlich berichten: geänderte Dateien, Verhalten, Migrationen, tatsächlich ausgeführte Tests samt Ergebnis, nicht ausgeführte Prüfungen und verbleibende Risiken.

Nicht ohne expliziten Auftrag: umfassendes Refactoring, Design-System-Austausch, neue externe Dienste, Umstellung des Stacks, Änderung beschlossener Architektur, Bereinigung fremder Änderungen, Deployment, produktive Migration, Push ins Remote-Repository oder Merge.

## 9. Qualität und Definition of Done

Eine Funktion gilt nur dann als **getestet/abgeschlossen**, wenn:

- alle relevanten Akzeptanzkriterien nachweislich erfüllt sind;
- automatisierte Tests tatsächlich erfolgreich liefen (Vitest, Playwright und ggf. vorhandene DB-/RLS-Tests);
- Berechtigungen und Familienisolation einschließlich Missbrauchs-/Negativfällen geprüft sind;
- Fehler-, Rand- und Wiederholungsfälle behandelt sind;
- mobile Nutzung, Barrierearmut, Lade-/Fehlerzustände und verständliche Meldungen berücksichtigt sind;
- API-, Schema- und Verhaltensänderungen angemessen dokumentiert sind;
- keine bekannten kritischen Sicherheits- oder Datenintegritätsfehler offen sind.

**Niemals Tests, Implementierung, erfolgreiche CI-Läufe oder funktionierende Migrationen behaupten, wenn sie nicht tatsächlich durchgeführt bzw. verifiziert wurden.** Wenn etwas nicht ausführbar ist, Hindernis und Restprüfung nennen. Keine künstlichen „grünen“ Tests durch Abschwächung von Assertions.

## 10. Entscheidungen, Kommunikation und Abschlussbericht

- Beschlossene Entscheidungen sind bindend. Verbesserungsideen als **Vorschlag** mit Nutzen, Aufwand, Kosten, Risiko, Sicherheit und Wartbarkeit kennzeichnen; nicht eigenmächtig umsetzen.
- Neue Entscheidungen und Änderungen an APIs, Datenmodell oder Berechtigungen dort dokumentieren, wo dies im Repository vorgesehen ist.
- Bei fehlenden Details standardmäßig risikoarm und minimal implementieren; **wesentliche Produkt-, Sicherheits- oder Architekturentscheidungen zur Klärung vorlegen**.
- Vor Abschluss Wechselwirkungen mindestens zwischen Kalender/Stundenplan, Projektionen/Terminen, Wiederholungen/Löschungen, Rollen/Sichtbarkeit, Push-Empfängern, Import/Synchronisation und konkurrierenden Änderungen prüfen, soweit betroffen.
- **Abschlussformat:** Auftrags-ID und Status; umgesetzt; außerhalb des Scopes/unverändert; Tests (Befehl + Resultat); Migrationen; bekannte Einschränkungen/Entscheidungsbedarf; nächster sinnvoller Schritt.

---

**Merksatz:** Kleine, prüfbare Änderungen. Sicherheit und Familientrennung auf Datenbank- und Serverseite. Bestehende Baseline und laufende Arbeit respektieren. Keine unbelegten Fertigmeldungen.
