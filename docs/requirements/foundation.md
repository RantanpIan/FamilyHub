# FH-CX-001 – Foundation-Anforderungen

| Anforderung | Foundation-Abdeckung |
| --- | --- |
| React, TypeScript und Vite | `apps/client` und Root-TypeScript-Konfiguration |
| Responsive Web-App / PWA-Vorbereitung | Desktop-/Mobilnavigation, Web-App-Manifest |
| Capacitor-Vorbereitung | Capacitor Core/CLI und Root-Konfiguration; keine nativen Projekte |
| Supabase, PostgreSQL und Supabase Auth | Browser-Auth, privates Profil, Familien-/Mitgliedsdaten und RLS; Ressourcenregister enthält nur Berechtigungsmetadaten |
| Modularer Monolith / Monorepo | npm-Workspaces und getrennte Domain-Pakete |
| Vitest, Playwright, Typecheck | Unit-, Browser-Smoke- und Typecheck-Skripte |
| GitHub Actions | Qualitäts- und E2E-Jobs in `.github/workflows/ci.yml` |
| Zod | Gemeinsame ID-, Sichtbarkeits- und Empfängerverträge |
| Private Ressourcen | fail-closed Beispiel-Policy sowie Ressourcen-RLS-Migration; PostgreSQL-Nachweis noch blockiert, Fachinhalte sind nicht enthalten |
| Mitglieder ohne Login | Identitäten und Familienmitglieds-IDs sind getrennte Vertragskonzepte |
| Mehrere Familien | Familien-IDs und RLS-Anforderung für spätere Datenbankarbeit |
| Getrennte Fachmodule | eigene Kalender-, Schul- und Benachrichtigungspakete |
| „Alle“ Push-Empfänger | Vertrag mit `all` und `selected_members`; keine Empfängerauflösung oder Zustellung |
| Synthetische Testdaten | Gemeinsame deterministische Familien-Fixtures; ausschließlich fiktive UUIDs |
