# Integrationstests

Für FH-CX-003 bis FH-CX-005 gibt es Auth-/Profil-, Familien- und
Ressourcen-RLS-
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
- Ressourcenberechtigungen anhand von Familienmitglied-Ownership, privater und
  familienweiter Sichtbarkeit, expliziten Lesefreigaben, Widerruf,
  Mitgliedschaftsstatus, Cross-Family-Constraints sowie getrennten Lese- und
  Schreibrechten.

Vorhandene Unit-Tests für die reine TypeScript-Policy ersetzen diese Prüfungen
nicht. Der Befehl lautet `npm run test:integration`. Ohne die drei erforderlichen
lokalen `SUPABASE_TEST_*`-Variablen bricht er mit einem klaren Hinweis ab, statt einen
übersprungenen Test als Erfolg auszugeben. Die reale Familien-Onboarding- und
Mitglieder-UI wird separat in Playwright gegen eine lokale Supabase-Instanz
ausgeführt; ohne `SUPABASE_E2E_*`- und `VITE_SUPABASE_*`-Werte werden diese
Browserfälle explizit übersprungen und gelten nicht als nachgewiesen.
Produktive Tabellen oder Policies werden hier nicht angelegt.

`resource-access.rls.test.ts` testet die Migration
`20261023094000_create_resource_access_model.sql` mit normalen,
authentifizierten Benutzerclients. Service Role wird ausschließlich zum
Erzeugen/Löschen synthetischer Nutzer, zum Seeding der Profile/Mitgliedschaften
und zur unabhängigen Prüfung von Datenintegrität eingesetzt. Sie simuliert
keine Endbenutzerrechte. Die Suite umfasst ACL-T01 bis ACL-T16; sie wurde lokal
noch nicht ausgeführt, solange Docker-Daemon und Supabase CLI fehlen.

Der GitHub-Actions-Job `auth-rls` startet eine lokale, wegwerfbare Supabase-
Instanz und führt `supabase db reset --local` aus, damit sämtliche versionierten
Migrationen einschließlich des Ressourcenmodells frisch angewendet werden.
Die ACL-Suite läuft anschließend separat und der Job verlangt ausdrücklich
`16 passed (16)` (ACL-T01 bis ACL-T16 plus Eigentümer-Löschen; T02 und T03
liegen in einem gemeinsamen Test), bevor die
vollständige Integrationstest-Suite startet. Damit führen fehlende
`SUPABASE_TEST_*`-Werte, fehlende Tests oder übersprungene ACL-Fälle zu einem
fehlgeschlagenen Job und nicht zu einem grünen Lauf. Sämtliche
privilegierten Testschlüssel werden pro Lauf von der lokalen Supabase-Instanz
ausgegeben; Cloud-Projekt-Zugangsdaten werden nicht verwendet.

## FH-CX-005-FIX-01 – CI-Lauf #7

Der Actions-Log zeigt, dass der Hook `beforeAll` vor Ausführung der ACL-Fälle
mit einer RLS-Verletzung auf `resources` abbricht. Der erste Ressourcen-INSERT
im Hook ist `privateA`: ein unmittelbarer `.from("resources").insert(...)`
über `clientOwnerA`, nicht ein RPC und nicht der Service-Role-Client. Das
Fixture erwartet dafür den angemeldeten synthetischen Benutzer `ownerA`, die
Familie A und deren Mitglied `ownerAMemberId`. Betroffen ist die
INSERT-Policy `Members can create resources for their linked profile`; deren
`WITH CHECK` verlangt eine gültige Sichtbarkeit und
`resource_actor_is_active_member(family_id, owner_member_id) = true`.

Der damalige Actions-Log enthält keinen PostgREST-Fehlercode, keine
`auth.uid()`-Diagnostik und keine Ausgabe der Policy-Prüfung. Daher belegt er
die Policy-Verletzung, aber nicht, ob im konkreten Lauf Sitzung oder
Mitgliedschafts-Fixture abwichen. Der Integrationstest prüft jetzt vor jedem
Fixture-INSERT über den normalen Benutzerclient die erwartete Auth-Identität
und genau dieselbe auth.uid()-basierte Mitgliedschaftsfunktion, ohne Tokens
auszugeben. Fehler beim INSERT nennen nur den Fixture-Namen, synthetische
Familien-/Mitglieds-IDs und den PostgREST-Fehlercode. ACL-T10 prüft zusätzlich,
dass ein nicht verknüpftes Mitglied auch innerhalb derselben Familie keine
Ressource anlegen kann. Die Migration und ihre Policies bleiben unverändert.

Im fehlgeschlagenen FH-CX-004-CI-Lauf #5 nutzte der Negativtest für fremde Familien versehentlich
ein Konto, das laut Mehrfamilien-Fixture auch Familie B angehörte; die Policy
gab die Daten daher zulässigerweise zurück. Der korrigierte Test verwendet
einen ausschließlich in Familie A aktiven, angemeldeten Erwachsenen und
verifiziert dessen `auth.uid()` sowie den positiven Zugriff auf die eigene
Familie vor den Fremd-ID-Prüfungen. Es war keine Datenbank-Policy-Korrektur
erforderlich.
