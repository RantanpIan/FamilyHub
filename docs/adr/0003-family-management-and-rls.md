# ADR 0003: Familienverwaltung und RLS-Grenzen

- Status: angenommen für FH-CX-004
- Datum: 2026-10-23
- Auftrag: FH-CX-004

## Kontext

FamilyHub braucht getrennte Familienräume, deren Personen unabhängig von einem
Auth-Konto existieren können. Die erste Familie muss samt Administrator
atomar entstehen. Mitgliedschaften und Rollen sind familiengebunden; die
beschlossene Detail-Rollenmatrix aus Phase B liegt weiterhin nicht vollständig
vor.

## Entscheidung

- `families` ist Tenant-Grenze. `family_members` beschreibt eine Person genau
  innerhalb einer Familie; ein Login ist keine Voraussetzung.
- `family_memberships` ist die einzige Konto-/Mitgliedsverknüpfung. Ein
  zusammengesetzter Foreign Key erzwingt, dass Mitglied und Familie
  zusammengehören. Partielle Unique Indexes begrenzen aktive Verknüpfungen je
  Familie/Konto und je Mitglied.
- Nur `create_family` darf den initialen Administrator anlegen. Die Funktion
  liest die Identität aus `auth.uid()`, erstellt Familie, erwachsenes
  Familienmitglied und `family_admin`-Mitgliedschaft in einer Transaktion und
  nimmt einen pro Konto geführten Request-Schlüssel für idempotente Retries an.
- Tabellenrechte und RLS sperren direkte Familien- und
  Mitgliedschaftsschreibvorgänge. Aktive Familienmitglieder dürfen den eigenen
  Familienbereich lesen; nur aktive `family_admin`-Mitglieder dürfen verwaltete
  Familienprofile anlegen oder deren Anzeigenamen ändern.
- `family_id` und Rolle können nicht vom Client geändert werden. Profiltyp
  (`adult`/`child`) bleibt von der Autorisierungsrolle getrennt.
- Eine datensparsame Mitgliederfunktion gibt nur Stammdaten und einen
  Login-Status zurück, keine Auth-User-IDs anderer Mitglieder.
- `list_my_families` bleibt `SECURITY INVOKER`. Die begrenzten
  `SECURITY DEFINER`-Funktionen pinnen `search_path`, qualifizieren Tabellen,
  verifizieren `auth.uid()`/Mitgliedschaft und sind nur für `authenticated`
  ausführbar.
- Der ausgewählte Familienkontext wird ausschließlich als UI-Auswahl geführt.
  Jede serverseitige Operation prüft aktive Mitgliedschaft erneut.
- Einladungen, Familienbeitritt, Kontoverknüpfung, Austritt, Rollenwechsel und
  Zugriff auf private Fachressourcen bleiben ausgeschlossen.

## Folgen

- Direkte REST-/SQL-Zugriffe unterliegen denselben Tabellenrechten und
  Policies wie die App-Operationen.
- Ein verwaltetes Kinderprofil benötigt weder E-Mail-Adresse noch künstliche
  Auth-ID.
- Die Tabellen erlauben mehrere Familienzugehörigkeiten je Auth-Konto; der
  Erstellungs-Bootstrap leitet keine Rollen aus Auth-Metadaten ab.
- Die Produktrollenmatrix und weitere Admin-/Erwachsenen-/Kinderrechte bleiben
  offen und dürfen für spätere Fachmodule nicht aus diesen Verwaltungsrechten
  abgeleitet werden.
- CI startet eine isolierte lokale Supabase-Instanz für RLS-Integration und
  browserbasierte Familienflüsse. Ohne Supabase CLI/Docker sind diese
  Prüfungen in einer lokalen Entwicklerumgebung blockiert.
