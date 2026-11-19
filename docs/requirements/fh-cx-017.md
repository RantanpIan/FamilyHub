# FH-CX-017 – Push-Subscription-Grundlage

Issue #23 gibt die lokale und in CI testbare Subscription-Verwaltung frei. Für
den Push-Epic kann ein angemeldetes Familienmitglied je gewählter aktiver
Familie und Kanal eigene Subscriptions anlegen, aktualisieren und widerrufen.

## RPC-Vertrag v1

| RPC | Eingabe | Antwort |
| --- | --- | --- |
| `register_push_subscription_v1` | `p_family_id`, `p_provider`, `p_subscription_key`, `p_credentials` | Leere Erfolgsantwort |
| `revoke_push_subscription_v1` | `p_family_id`, `p_provider`, `p_subscription_key` | Leere Erfolgsantwort |
| `list_push_subscriptions_v1` | `p_family_id` | Liste mit `provider` und `subscription_key` |

Die Familie muss bei jedem Aufruf explizit gewählt werden. Der Server ermittelt
das Konto aus der Auth-Sitzung und prüft den Konto-, Familien-, Mitglieder- und
Mitgliedschaftsstatus. Die Schlüssel-UUID wird einmal pro fachlicher
Subscription erzeugt und bei Wiederholung sowie Rotation wiederverwendet.
Die Eindeutigkeit gilt pro Konto, Familie, Provider und Schlüssel. Der atomare
Upsert aktualisiert geänderte Zugangsdaten und lässt identische Wiederholungen
wirkungsgleich. Beim Widerruf wird die eigene Zeile gelöscht. Jeder Widerruf
ohne passende eigene Zeile liefert dieselbe leere Erfolgsantwort.

Die Providerwerte lauten `fcm`, `apns` und `web_push`. FCM und APNs erwarten
ein Objekt mit `token`, Web Push ein Objekt mit `endpoint`, `p256dh` und
`auth`. Der Server prüft Form und Größenlimits lokal. Die Prüfung bestätigt
keine Gültigkeit beim Provider. RPC-Antworten und fachliche Fehler enthalten
keine Zugangsdaten. RPC-Aufrufe mit Zugangsdaten erfolgen per POST. Request-
Bodies und SQL-Bindewerte gehören nicht in Telemetrie oder Diagnoselogs.

Die Tabelle hat RLS und keine direkten Anwendungsrollen-Grants. Die
versionierten RPCs führen die Konto- und Kontextprüfung auch selbst aus.
Nach Entzug der Mitgliedschaft ist der Zugriff gesperrt, solange keine aktive
Mitgliedschaft besteht. Löschung von Familie oder Konto entfernt die
zugeordneten Zeilen über Fremdschlüssel.

## Abnahme

| Akzeptanzkriterien | Nachweis |
| --- | --- |
| 1–2 | Unit-Validierung von Provider und UUID, Integrationstest für parallelen Upsert, Wiederholung und Rotation |
| 3–7 | Integrationstests für eigenen Widerruf, fremde Konten und Familien, anonyme Aufrufe, getrennte Familienkontexte, Mitgliedschaftsentzug und verweigerte Tabellenzugriffe |
| 8 | Fehlertest mit synthetischen Zugangsdaten, Metadatenprüfung und kein Versandpfad in der Implementierung |
| 9 | Bestehender CI-Job `auth-rls` mit `supabase db reset --local` und `npm run test:integration`. Ein wiederholter Reset prüft die Anwendungskette in einer frischen Wegwerfdatenbank. |

Die Migration `20261119120000_create_push_subscriptions.sql` ist additiv.
Schnittstellen zu Kalender und Stundenplan, Empfängerauflösung, Einstellungen
und Zustellung liegen außerhalb des Auftrags. Die RPC-Schnittstelle ist die
Registrierungsoberfläche dieses Inkrements.
