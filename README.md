# FamilyHub

FamilyHub wird ein geschützter, gemeinsamer Ort für die Familienorganisation.
**FH-CX-001 liefert ausschließlich die technische Foundation.** Kalender,
Aufgaben, Schule, Anmeldung und Benachrichtigungen sind sichtbar als
nicht verfügbar markiert; es werden keine persönlichen Daten gespeichert.

## Voraussetzungen

- Node.js `>=24.13 <25`
- npm `>=11`

Die getestete Ausgangsumgebung für diese Foundation ist Node `24.13.0` und
npm `11.6.2`. `package-lock.json` fixiert die aufgelösten Abhängigkeiten.

## Installation und Start

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Vite startet die Web-App unter `http://127.0.0.1:5173`. Die Supabase-Variablen
in `.env` sind Platzhalter; für FH-CX-001 wird keine Backend-Verbindung
hergestellt. Es werden keine Zugangsdaten benötigt.

## Prüfungen

```powershell
npm run typecheck
npm run lint
npm run test:unit
npx playwright install chromium
npm run test:e2e
npm run build:client
```

Der Playwright-Smoke-Test startet Vite selbst. In CI wird Chromium mit
`npx playwright install --with-deps chromium` installiert. `npm run build`
führt Typecheck, Lint, Unit-Tests und Produktionsbuild zusammen aus.

## Workspace

```text
apps/client                 React-/Vite-Anwendung
packages/ui                 Designsystem und wiederverwendbare UI-Zustände
packages/contracts          gemeinsame Zod-Schemas und TypeScript-Verträge
packages/authorization      Beispiel-Policy für private Inhalte
packages/calendar-domain   Kalender-Fachmodul (noch nicht verfügbar)
packages/school-domain     Schul-Fachmodul (noch nicht verfügbar)
packages/notifications-domain Benachrichtigungs-Fachmodul (noch nicht verfügbar)
supabase/migrations         keine persönlichen Tabellen in FH-CX-001
supabase/functions          keine Funktionen in FH-CX-001
tests                       Unit- und Playwright-Smoke-Tests
docs                        Architektur, Anforderungen und ADRs
```

## Technologieüberblick

Die verwendeten stabilen Versionen stehen in `package.json`; das Lockfile hält
den vollständigen reproduzierbaren Dependency-Baum fest. Wesentliche
Foundation-Versionen: React/React DOM 19.3.1, Vite 8.3.5,
TypeScript 6.0.3, Vitest 5.0.5, Playwright 1.64.1, Zod 4.6.7,
ESLint 10.13.0 und Capacitor 8.5.3. Supabase wird vorbereitet, aber nicht
verbunden. Die Node-Engine-Einschränkungen der verwendeten Testwerkzeuge sind
im Root-Paket dokumentiert.

## Datenschutz und Architektur

Familien sind später voneinander zu isolieren. PostgreSQL Row Level Security
(RLS) muss jeden Datenzugriff tenant-scopen. Ein privater Inhalt bleibt privat;
die Administratorrolle gewährt keinen automatischen Zugriff. Familienmitglieder
ohne Login bleiben vom Auth-User getrennte Datensätze. Push-Empfänger werden
später über Mitglieds-IDs adressiert, mit einer expliziten Option „Alle“.
Diese Grenzen und die Modul-Abhängigkeitsrichtung sind in
[`docs/architecture/overview.md`](./docs/architecture/overview.md),
[`docs/architecture/modules.md`](./docs/architecture/modules.md) und
[`docs/adr/0001-monorepo-boundaries.md`](./docs/adr/0001-monorepo-boundaries.md)
dokumentiert.

Tests verwenden ausschließlich synthetische UUIDs. `.env` wird ignoriert und
`.env.example` enthält keine Schlüssel. Es gibt keine Anmeldung, produktiven
Tabellen, Migrationen, Push-Zustellung oder Hosting-Konfiguration.

## Vorbereitung für FH-CX-002

Bereit sind Workspace- und UI-Grundlagen, gemeinsame validierte Verträge,
abgegrenzte Domain-Pakete, eine Datenschutz-Policy als Beispiel, Supabase-
Konfigurationsplatzhalter, Capacitor-Konfiguration sowie CI und Testskripte.
Konkrete Funktionen und Datenmodelle werden in Folgeaufträgen festgelegt.
