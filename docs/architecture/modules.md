# Modulgrenzen

| Bereich | Paket/Ort | Foundation-Status | Verantwortungsgrenze |
| --- | --- | --- | --- |
| Client | `apps/client` | responsives Grundgerüst | Navigation und Zusammensetzen der Module |
| UI | `packages/ui` | gemeinsame Zustands- und Statuskomponenten | Präsentation, keine Fachregeln |
| Verträge | `packages/contracts` | Zod-Beispiele | IDs, Empfängerauswahl, Datenformate |
| Autorisierung | `packages/authorization` | reine Beispiel-Policy | Zugriff auf persönliche Inhalte |
| Kalender | `packages/calendar-domain` | nicht verfügbar | Kalenderdomäne |
| Schule | `packages/school-domain` | nicht verfügbar | Stundenpläne und Schulorganisation |
| Benachrichtigungen | `packages/notifications-domain` | nicht verfügbar | Empfängerauswahl und spätere Zustellung |

Domain-Pakete importieren keine anderen Domain-Pakete. Gemeinsame Typen und
Validierung liegen in `contracts`; UI-Komponenten bleiben fachlich neutral.
