# Integrationstests

Für FH-CX-003 und FH-CX-004 gibt es Auth-/Profil- und Familien-RLS-
Integrationstests gegen eine echte lokale Supabase-/PostgreSQL-Instanz. Ein
Testlauf ohne laufende Instanz ist kein Erfolgsnachweis.

Voraussetzungen für die vorhandenen Supabase-/PostgreSQL-RLS-Tests:

- Supabase CLI und eine lokale, isolierte Supabase/PostgreSQL-Testinstanz.
- Docker entsprechend der Supabase-CLI-Anforderungen.
- Versionierte Migrationen und Seeds ausschließlich mit synthetischen Daten.
- Eigene synthetische Auth-Identitäten für die Testfamilien; Tests müssen mit
  normalen Benutzerrollen laufen und dürfen Service-Role-Zugriffe nicht als
  Berechtigungsnachweis verwenden. Die Service Role dient dem Erzeugen und
  Löschen synthetischer Auth-Nutzer sowie dem Seeding notwendiger Testprofile
  und Mitgliedschaften; Berechtigungsassertions laufen über normale
  Benutzerclients.
- Explizite Profil-Eigentümer-, Fremdzugriffs-, Spalten-, Eindeutigkeits- und
  Auth-Flow-Prüfungen gegen PostgREST/RLS.
- Familien-Isolation, aktive Mitgliedschaften, rollenabhängige
  Mitgliederverwaltung, ID-Manipulationen, Multi-Family-Zuordnung und atomare
  Familienanlage mit unterschiedlichen Auth-Identitäten.

Vorhandene Unit-Tests für die reine TypeScript-Policy ersetzen diese Prüfungen
nicht. Der Befehl lautet `npm run test:integration`. Ohne die drei erforderlichen
lokalen `SUPABASE_TEST_*`-Variablen bricht er mit einem klaren Hinweis ab, statt einen
übersprungenen Test als Erfolg auszugeben. Die reale Familien-Onboarding- und
Mitglieder-UI wird separat in Playwright gegen eine lokale Supabase-Instanz
ausgeführt; ohne `SUPABASE_E2E_*`- und `VITE_SUPABASE_*`-Werte werden diese
Browserfälle explizit übersprungen und gelten nicht als nachgewiesen.
Produktive Tabellen oder Policies werden hier nicht angelegt.
