# FH-CX-017 – Kontrollierter Blocker zu Issue #23

Historischer Stand vom 15.11.2026. Der danach freigegebene Teilumfang ist in
[FH-CX-017 – Push-Subscription-Grundlage](fh-cx-017.md) dokumentiert.

Stand: 15.11.2026. **Status: blockiert; keine Push-Subscription-Funktion implementiert.**
Geprüfter Feature-Branch: `codex/agent-23`.

## Auftrag, Quellen und Ist-Stand

Geprüft wurden `AGENTS.md`, die im Repository-Root liegenden Projektquellen
`01-fachkonzept.md`, `02-architektur.md`, `03-backlog.md` und
`04-entscheidungen.md`, die Architektur-/Foundation-Dokumentation, vorhandene
Paket- und Testkonfigurationen sowie die betroffenen Implementierungsstellen.
Die vier Projektquellen liegen nicht unter dem in AGENTS.md genannten `docs/`.

Der kontrollierte Auftrag begrenzt den Lauf ausdrücklich auf Änderungen ohne
Schema-/Datenbankdateien, Migrationen oder Datenbankoperationen. Der übergebene
Issue-Text bezeichnet Scope und Akzeptanzkriterien weiterhin als Vorschlag;
der historische Originalauftrag oder eine konkretisierte fachliche Freigabe
ist in den geprüften Projektquellen nicht belegt. Der tatsächliche GitHub-
Labelstatus wurde nicht geprüft. Auch eine Freigabe der vorgeschlagenen
Kriterien würde die nachfolgende technische Umfangsgrenze nicht aufheben.

| Geprüfte Stelle | Befund |
| --- | --- |
| Fachkonzept A.4, Architektur B.1.4, FH-DEC-014 | FCM, APNs und Web Push sind beschlossen; dies definiert noch keinen implementierten Registrierungsvertrag. |
| Backlog FH-CX-017 | Vorschlag; Originalauftrag/Infrastruktur offen. |
| FH-OPEN-007 / FH-OPEN-010 | Subscription-Verhalten bzw. Infrastruktur-/Secret-Betrieb bleiben offen. |
| `packages/notifications-domain/src/index.ts` | Nur Modulstatus `unavailable`; keine Kanaladapter oder Subscription-Operationen. |
| `packages/contracts/src/index.ts` | Empfängerauswahl `all` / `selected_members`; kein Geräte-, Kanal- oder Subscription-Vertrag. |
| `apps/client/src/auth/database.types.ts`, `supabase/migrations/` | Keine Push-Subscription-Tabelle, zugehörigen Constraints, RLS-Policies oder Registrierungs-/Widerrufs-RPCs auffindbar. Einladungstokens sind keine Push-Tokens. |
| `supabase/functions/README.md` und Funktionsverzeichnis | Keine implementierte serverseitige Push-Registrierung oder Provideradaption. |
| Architekturüberblick / Capacitor-Grundlage | Keine implementierten nativen Push-Flüsse oder Web-Push-Service-Worker-Grundlage belegt. |

FH-CX-005/006 liefern Ressourcenberechtigungen und Mitgliedschaftsoperationen,
aber kein Subscription-Register. Diese Aussagen beziehen sich auf den
Repository-Stand; ein laufendes Datenbankschema wurde nicht abgefragt.

## Technischer Blocker und offene Entscheidungen

Kontogebundene und familienisolierte Registrierung, Rotation, Widerruf und
Deduplizierung benötigen eine dauerhafte, serverseitig autorisierte Grundlage
mit referenzieller Integrität und RLS. Die vorhandenen Ressourcenverträge
enthalten keine Push-Subscription; deren Erweiterung um Tokens als beliebige
Fachinhalte wäre kein zulässiger Ersatz.

Die fehlende Persistenz und ihre sicheren Operationen einzuführen erfordert
ausgeschlossene Schema-/Datenbankdateiänderungen. Ein Browser- oder
In-Memory-Register könnte direkte API-Zugriffe, mehrere Geräte und konkurrierende
Rotationen nicht entsprechend absichern. Deshalb wird keine Ersatzpersistenz
und keine scheinbar funktionsfähige Registrierung eingeführt.

Vor Umsetzung sind außerdem Geräte-/Provider-Identität und Eindeutigkeit,
Tokenrotation samt Konfliktbehandlung, Ablauf-/Invalidierungsverhalten sowie
Widerruf bei Konto-/Mitgliedschaftswechsel fachlich bzw. technisch festzulegen.
Für Konten in mehreren Familien muss die Zuordnungssemantik ausdrücklich
geklärt sein. Hier werden keine Regeln als beschlossen erfunden.
Vorlaufzeiten, Ruhezeiten, Empfängerauswahl und Payload-Defaults werden durch
diesen Grundlagenschritt nicht vorgezogen.

## Akzeptanzkriterien und verbleibende Nachweise

| AK aus dem Vorschlag | Ergebnis / Restprüfung |
| --- | --- |
| 1 | Nicht erfüllt: autorisierte persistente Registrierung und Widerruf fehlen. |
| 2 | Nicht erfüllt: Konto-/Familien-/Geräte-/Provider-Zuordnung samt Constraints und RLS fehlt. |
| 3 | Nicht erfüllt: verbindliche Regeln und atomare Operationen für ungültige, abgelaufene und doppelte Tokens sowie Rotation fehlen. |
| 4 | Nicht erfüllt: vorhandene nutzbare Kanalabstraktionen sind nicht auffindbar; Web-/Android-/iOS-Adapter fehlen. |

Nach Freigabe und Bereitstellung der Grundlage bleiben positive und negative
Registrierungs-/Widerrufs-/Rotations-/Duplikatfälle, konkurrierende Änderungen,
fehlende oder entzogene Mitgliedschaft, fremde Konten/Subscriptions und
Cross-Family-Zugriffe direkt über API/RLS zu prüfen. Lokale Adaptertests müssen
synthetische Tokens verwenden und echte Providerzustellung ausschließen.
Fehler und Logs dürfen keine Tokens oder Gerätekennungen offenlegen.
Neue Funktionstests wurden mangels freigegebenem Vertrag nicht ergänzt;
bestehende grüne Tests sind keine Abnahme von FH-CX-017.

## Tatsächlich ausgeführte Prüfungen

| Befehl | Ergebnis |
| --- | --- |
| `npm run build` | Exit 0: Typecheck, Lint, 58 Unit-Tests in 7 Dateien und Client-Build erfolgreich. GitHub-Step-Summary wegen `EROFS` nicht schreibbar; Bundle-Warnung über 500 kB. |
| `npm run test:e2e -- tests/e2e/smoke.spec.ts tests/e2e/calendar-navigation.spec.ts` | Exit 1: konfigurierter Webserver startet nicht; keine Browserfälle ausgeführt. Die ausgewählten Tests benötigen keine Datenbankänderung. |
| `npm run dev --workspace @familyhub/client -- --host 127.0.0.1` | Exit 1: Diagnose bestätigt `listen EPERM` auf `127.0.0.1:5173`. |

Integration-/RLS-Tests und datenbankgestützte E2E wurden nicht ausgeführt, da
ihre Fixtures Daten verändern. Keine Datenbank wurde gestartet, migriert oder
zurückgesetzt; keine Cloud und kein realer Push-Provider wurde angesprochen.

## Änderungen und nächster sinnvoller Schritt

Nur dieser Blockerbericht wurde ergänzt und uncommitted hinterlassen.
Vorhandene unversionierte Automationsdateien wurden bewahrt. Produktcode,
Baseline, Migrationen, Schema, Konfiguration und Workflows bleiben unverändert.
Es erfolgten kein Commit, Push, Merge oder Deployment.

Kalender/Stundenplan, Projektionen, Serien/Ausnahmen, Löschungen, Rollen und
Sichtbarkeit, Push-Empfänger sowie Import/Synchronisation bleiben unverändert;
es entsteht keine zusätzliche fachliche Wahrheitsquelle.

**Bevorzugter nächster Schritt (Vorschlag):** Den endgültigen Scope mit den
genannten Lebenszyklus-/Zuordnungsregeln, Testbefehlen und Definition of Done
menschlich freigeben. Die fehlende Persistenz samt autorisierten Operationen,
Constraints und RLS in einem separat freigegebenen Datenbankauftrag bereitstellen
und prüfen. Anschließend FH-CX-017 auf diesen Verträgen umsetzen; echte Zustellung
und Provider-Secrets bleiben außerhalb dieses Agentenlaufs.
