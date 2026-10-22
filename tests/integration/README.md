# Integrationstests

Für FH-CX-003 gibt es Auth-/Profil-Integrationstests gegen eine echte lokale
Supabase-/PostgreSQL-Instanz. Ein Testlauf ohne laufende Instanz ist kein
Erfolgsnachweis.

Vorgesehene Voraussetzungen für spätere Supabase-/PostgreSQL-RLS-Tests:

- Supabase CLI und eine lokale, isolierte Supabase/PostgreSQL-Testinstanz.
- Docker entsprechend der Supabase-CLI-Anforderungen.
- Versionierte Migrationen und Seeds ausschließlich mit synthetischen Daten.
- Eigene synthetische Auth-Identitäten für die Testfamilien; Tests müssen mit
  normalen Benutzerrollen laufen und dürfen Service-Role-Zugriffe nicht als
  Berechtigungsnachweis verwenden. Service Role wird im Testsuite nur zur
  Erzeugung/Löschung synthetischer Auth-Nutzer und zur unabhängigen
  Ergebnisprüfung verwendet.
- Explizite Profil-Eigentümer-, Fremdzugriffs-, Spalten-, Eindeutigkeits- und
  Auth-Flow-Prüfungen direkt gegen PostgREST/RLS.

Vorhandene Unit-Tests für die reine TypeScript-Policy ersetzen diese Prüfungen
nicht. Der Befehl lautet `npm run test:integration`. Ohne die drei erforderlichen
lokalen `SUPABASE_TEST_*`-Variablen bricht er mit einem klaren Hinweis ab, statt einen
übersprungenen Test als Erfolg auszugeben. Produktive Tabellen oder Policies
werden hier nicht angelegt.
