# Architekturüberblick

FamilyHub ist ein Monorepo mit einer React-Webanwendung und fachlich getrennten
TypeScript-Paketen. Supabase Auth, private Profile, Familienverwaltung und ein
generischer Ressourcen-/Freigabekern mit RLS sind implementiert.
Kalender-, Schul- und Benachrichtigungsdatenflüsse bleiben außerhalb dieses
Auftrags.

## Laufzeit und Abhängigkeitsrichtung

`apps/client` ist der Einstiegspunkt und darf UI-, Vertrags-, Policy- und
Fachmodule verwenden. `packages/ui` enthält nur wiederverwendbare Oberfläche.
`packages/contracts` hält Zod-Schemas und gemeinsam genutzte Datenverträge.
`packages/authorization` hängt von Verträgen ab. Kalender, Schule und
Benachrichtigungen liegen in separaten Domain-Paketen; diese hängen nicht
voneinander ab. Fachpakete werden nicht von UI oder anderen Domains importiert.

Die npm-Workspaces verlinken interne Pakete über deren feste Paketversionen.
Die Exportpfade zeigen auf TypeScript-Quellen, sodass Vite sie direkt bündelt.
TypeScript prüft alle Paketquellen gemeinsam über die Root-Konfiguration.

## Daten- und Datenschutzgrenzen

- Jede Familie erhält eine Tenant-ID. Familien- und Mitgliedsdaten sind in
  PostgreSQL mit Row Level Security (RLS) auf aktive Zugehörigkeiten begrenzt.
- Ein Familienmitglied braucht keinen eigenen Login. Login-Identitäten und
  Familienmitgliedsdatensätze sind getrennte Konzepte; dies gilt auch für
  bereits implementierte verwaltete Profile.
- Ressourcen gehören einem fachlichen Familienmitglied, nicht einer freien
  Benutzer-ID. Ein Konto ist nur dann Eigentümer, wenn seine aktuelle aktive
  Mitgliedschaft genau diesem Mitglied zugeordnet ist.
- Private Ressourcen sind nur für den verknüpften Eigentümer lesbar und
  veränderbar; Administratorrollen verleihen keinen Sonderzugriff.
- Familienweite Ressourcen dürfen aktive Mitglieder derselben Familie lesen.
  Explizite Grants gewähren ausschließlich Lesen. Beide Wege erfordern eine
  aktuelle aktive Mitgliedschaft; fremde Familien-IDs und private Ressourcen
  bleiben durch RLS unsichtbar.
- Verwaltete Mitglieder ohne Login können Ziel eines Lese-Grants sein, erhalten
  aber allein durch ihre Member-ID keine Authentifizierung oder Zugriffsrechte.
  Ein Client kann für sie ohne eigene aktive Auth-Mitgliedschaft nicht als
  Ressourceneigentümer handeln.
- Das Ressourcenregister speichert nur Berechtigungsmetadaten, keine
  Kalender-, Schul-, Import- oder Dokumentinhalte.
- `private` ist ein vorläufiger sicherer Datenbank-Default, keine endgültige
  Produktentscheidung über Standard-Sichtbarkeit. Die Rollenmatrix,
  Delegation/Vertretung verwalteter Kinder und gemeinsam verantwortete private
  Ressourcen bleiben offen.
- Benachrichtigungsempfänger werden später über Mitglieds-IDs adressiert. Der
  gemeinsame Vertrag unterscheidet `all` explizit von `selected_members` mit
  eindeutigen IDs; Empfängerauflösung und Versand sind nicht implementiert.
- Ausschließlich synthetische Daten dürfen in Tests verwendet werden.

## Zielplattformen

Die React-Anwendung wird mit Vite als responsive Web-App gebaut. Ein Web-App-
Manifest und Theme-Metadaten bereiten die PWA-Oberfläche vor; Offline-Cache,
Service Worker und Installationsfluss sind nicht umgesetzt. `capacitor.config.ts`
und Capacitor Core/CLI bereiten Android und iOS vor. Native Projekte und
Plattform-Builds sind nicht Bestandteil dieser Foundation.

## Authentifizierung und Profile

Supabase Auth ist die einzige Quelle für Benutzeridentität und Sitzung.
Der Browserclient nutzt PKCE, Sitzungs-Persistenz, URL-Callback-Erkennung und
automatische Token-Erneuerung. Die UI rendert geschützte App-Bereiche nur mit
einer vom Supabase-Client wiederhergestellten oder bestätigten Sitzung.
Frontend-Zustand ist kein Berechtigungsnachweis für Datenzugriffe.

Die Migration `supabase/migrations/20261022220000_create_user_profiles.sql`
legt `user_profiles` mit einem `auth.users`-Primär-/Fremdschlüssel und aktivem
RLS an. Nutzer lesen und erstellen nur das eigene Profil; Änderungen sind auf
`display_name` beschränkt. `user_id` ist nicht update-berechtigt. Es existiert
kein Trigger auf `auth.users`: Nach bestätigter Anmeldung erstellt der Client
das Profil idempotent; fehlgeschlagene Anlage wird angezeigt und kann
wiederholt werden, ohne den Signup- oder Bestätigungsvorgang zurückzurollen.

Auth-E-Mail und Recovery verwenden fest gebaute `/auth`-Callbacks desselben
Origin. Die Anwendung akzeptiert keine benutzergesteuerte Rücksprung-URL.
In Supabase müssen die erlaubten Origins im Auth-Redirect-Allowlist konfiguriert
sein. Supabase-JWTs bleiben bis zum Ablauf signierte Momentaufnahmen; RLS und
serverseitige Operationen müssen aktuelle Berechtigungen für kritische Zugriffe
prüfen und dürfen nicht auf veränderbare User-Metadaten vertrauen.

Die Migration `supabase/migrations/20261023070000_create_families.sql` legt
Familien, Familienmitglieder und familiengebundene Auth-Mitgliedschaften an.
Zusammengesetzte Fremdschlüssel verhindern Verknüpfungen von Familien-ID und
Mitglieds-ID aus unterschiedlichen Familien. Partial Unique Indexes begrenzen
aktive Konto-/Mitgliedsverknüpfungen. Verwaltete Profile bestehen ausschließlich
aus minimalen Stammdaten und erhalten keine Auth-Identität.

Der `create_family`-RPC erstellt Familie, Erstellerprofil und aktive
`family_admin`-Mitgliedschaft in einer Transaktion. Der Aufrufer wird aus
`auth.uid()` gelesen; ein pro Benutzer/Request-ID geführtes privates
Idempotenzregister erlaubt sichere Wiederholungen. Direkte Familien- und
Mitgliedschafts-Schreibrechte sind nicht vergeben. Mitgliederzugriffe sind per
RLS an eine aktive Mitgliedschaft gebunden; Verwaltungsaktionen verlangen die
familiengebundene Administratorrolle. Die Rolle ist keine Berechtigung für
private Fachinhalte.

`list_my_families` läuft als `SECURITY INVOKER`. Eng begrenzte
`SECURITY DEFINER`-Funktionen dienen den RLS-Prüfungen, der datensparsamen
Mitgliederansicht und dem atomaren Familien-Bootstrap; sie setzen einen festen
`search_path`, verwenden qualifizierte Tabellen und sind nur für
`authenticated` ausführbar. Der ausgewählte Familienkontext in der UI ist
kein Berechtigungsnachweis; jede Operation wird serverseitig erneut geprüft.

Die Migration
`supabase/migrations/20261023094000_create_resource_access_model.sql` ergänzt
`resources` und `resource_grants`. Zusammengesetzte Fremdschlüssel sichern die
Familienzugehörigkeit von Eigentümer und Grant-Empfänger. Separate RLS-Policies
regeln SELECT, INSERT, UPDATE und DELETE. Direkte Client-Updates sowie
Grant-Schreibzugriffe sind nicht freigegeben; Sichtbarkeitswechsel,
Grant-Erteilung und Widerruf laufen über eng begrenzte `SECURITY DEFINER`-RPCs
mit festem `search_path`, aktueller `auth.uid()`-Prüfung, Eigentümerprüfung und
beschränkten EXECUTE-Rechten. Die Sichtbarkeitsänderung prüft zusätzlich eine
Ressourcenversion.

`.env.example` enthält nur leere Browser- und Testplatzhalter. Browsercode
verwendet ausschließlich den öffentlichen Anon-/Publishable-Key; Service-Role-
Keys bleiben auf lokale Testprozesse beschränkt. Einladungen,
Kontoverknüpfungen, Rollenänderungen und fachliche Ressourcenoperationen sind
nicht implementiert.
