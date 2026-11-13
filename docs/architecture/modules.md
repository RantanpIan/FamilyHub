# Modulgrenzen

| Bereich | Paket/Ort | Foundation-Status | Verantwortungsgrenze |
| --- | --- | --- | --- |
| Identity / Family / Access | `apps/client/src/family`, `apps/client/src/access`, `packages/authorization`, `supabase/migrations` | Identität, gehashte Einladungen, emailgebundene Login-Einladungsabfrage, Mitgliedschaft, Ressourcenregister und Lesefreigaben mit RLS | Client-Service, sicherer Login-Dialog, Berechtigungsmetadaten und Autorisierung, keine Fachinhalte |
| Client | `apps/client` | responsives Grundgerüst und Auth-geschützte Familienansicht | Navigation und Zusammensetzen der Module |
| UI | `packages/ui` | gemeinsame Zustands- und Statuskomponenten | Präsentation, keine Fachregeln |
| Verträge | `packages/contracts` | gemeinsame Zod-Verträge | IDs, Ressourcen, Freigaben und Datenformate |
| Autorisierung | `packages/authorization` | reine fail-closed Policy-Beispiele | Unit-prüfbare Berechtigungsregeln; PostgreSQL-RLS bleibt maßgeblich |
| Kalender | `packages/calendar-domain` | nicht verfügbar | Kalenderdomäne |
| Schule | `packages/school-domain` | nicht verfügbar | Stundenpläne und Schulorganisation |
| Benachrichtigungen | `packages/notifications-domain` | nicht verfügbar | Empfängerauswahl und spätere Zustellung |

Domain-Pakete importieren keine anderen Domain-Pakete. Gemeinsame Typen und
Validierung liegen in `contracts`; UI-Komponenten bleiben fachlich neutral.

## Test-Fixtures und Policy-Grenze

Deterministische, ausschließlich synthetische Fixtures für zwei getrennte
Familien-Fixtures für Policy-Tests liegen unter `tests/fixtures`. Echte
Familien- und Ressourcen-RLS-Tests liegen unter `tests/integration` und werden
gegen lokale Supabase/PostgreSQL-Instanzen ausgeführt. Die TypeScript-Policy
prüft die Zuordnung der Auth-Identität zu aktiven Familienmitgliedschaften,
Mitgliedsbasierte Eigentümerschaft, private/familienweite Sichtbarkeit und
gezielte Lesefreigaben. Schreibrechte bleiben dem Eigentümer vorbehalten.
Diese Beispiel-Policy ist kein Ersatz für PostgreSQL-RLS oder die noch offene
Produktrollenmatrix.

