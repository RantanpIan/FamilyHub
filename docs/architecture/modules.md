# Modulgrenzen

| Bereich | Paket/Ort | Foundation-Status | Verantwortungsgrenze |
| --- | --- | --- | --- |
| Identity / Family | `apps/client/src/family`, `supabase/migrations` | Familie, Mitgliedschaft und verwaltete Profile mit RLS | Mandanten- und Familienverwaltung, keine Fachinhalte |
| Client | `apps/client` | responsives Grundgerüst und Auth-geschützte Familienansicht | Navigation und Zusammensetzen der Module |
| UI | `packages/ui` | gemeinsame Zustands- und Statuskomponenten | Präsentation, keine Fachregeln |
| Verträge | `packages/contracts` | Zod-Beispiele | IDs, Empfängerauswahl, Datenformate |
| Autorisierung | `packages/authorization` | reine Beispiel-Policy | Zugriff auf persönliche Inhalte |
| Kalender | `packages/calendar-domain` | nicht verfügbar | Kalenderdomäne |
| Schule | `packages/school-domain` | nicht verfügbar | Stundenpläne und Schulorganisation |
| Benachrichtigungen | `packages/notifications-domain` | nicht verfügbar | Empfängerauswahl und spätere Zustellung |

Domain-Pakete importieren keine anderen Domain-Pakete. Gemeinsame Typen und
Validierung liegen in `contracts`; UI-Komponenten bleiben fachlich neutral.

## Test-Fixtures und Policy-Grenze

Deterministische, ausschließlich synthetische Fixtures für zwei getrennte
Familien-Fixtures für Policy-Tests liegen unter `tests/fixtures`. Echte
Familien-/Mitgliedschafts-RLS-Tests liegen unter `tests/integration` und werden
gegen lokale Supabase/PostgreSQL-Instanzen ausgeführt. Die TypeScript-Beispiel-Policy prüft
Eigentümerschaft, aktive explizite Lesefreigaben, Mitgliedschaft und
Familienzugehörigkeit. Schreibzugriffe sind in diesem Beispiel auf den
Eigentümer begrenzt. Das ist kein Ersatz für PostgreSQL-RLS, serverseitige
Autorisierung oder eine noch freizugebende Produktrollenmatrix.
