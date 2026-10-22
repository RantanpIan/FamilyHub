# Integrationstests

Für FH-CX-002 sind noch keine Integrationstests implementiert. Es gibt daher
bewusst weder einen leeren Testlauf noch eine Erfolgsmeldung für diese Ebene.

Vorgesehene Voraussetzungen für spätere Supabase-/PostgreSQL-RLS-Tests:

- Supabase CLI und eine lokale, isolierte Supabase/PostgreSQL-Testinstanz.
- Docker entsprechend der Supabase-CLI-Anforderungen.
- Versionierte Migrationen und Seeds ausschließlich mit synthetischen Daten.
- Eigene synthetische Auth-Identitäten für die Testfamilien; Tests müssen mit
  normalen Benutzerrollen laufen und dürfen Service-Role-Zugriffe nicht als
  Berechtigungsnachweis verwenden.
- Explizite Positiv-, Negativ-, Cross-Family-, Privat-, Mitgliedschafts- und
  Widerrufsprüfungen direkt gegen PostgreSQL/RLS.

Vorhandene Unit-Tests für die reine TypeScript-Policy ersetzen diese Prüfungen
nicht. Produktive Tabellen oder Policies werden hier nicht angelegt.
