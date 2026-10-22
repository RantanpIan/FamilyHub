# Architekturüberblick

FamilyHub ist ein Monorepo mit einer React-Webanwendung und fachlich getrennten
TypeScript-Paketen. Neben Authentifizierung und persönlichem Profil sind
produktive Fach- und Familiendatenflüsse noch nicht implementiert.

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

- Familien erhalten später eine eigene Tenant-ID; Zugriffe müssen in PostgreSQL
  mit Row Level Security (RLS) auf die autorisierte Familie begrenzt werden.
- Ein Familienmitglied braucht keinen eigenen Login. Login-Identitäten und
  Familienmitgliedsdatensätze sind deshalb getrennte Konzepte.
- Private Inhalte gehören einem Nutzer und sind auch für Familienadministratoren
  nicht automatisch lesbar. Die Foundation-Policy demonstriert diese Grenze;
  sie ersetzt keine serverseitige RLS-Policy.
- Die Beispiel-Policy verlangt zusätzlich die Zugehörigkeit des Nutzers zur
  Familie des Inhalts, bevor Eigentümer- oder Familienfreigabe geprüft wird.
- Familienfreigabe ist eine ausdrückliche Sichtbarkeit, keine administrative
  Umgehung privater Inhalte.
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

`.env.example` enthält nur leere Browser- und Testplatzhalter. Browsercode
verwendet ausschließlich den öffentlichen Anon-/Publishable-Key; Service-Role-
Keys bleiben auf lokale Testprozesse beschränkt. Es gibt keine Familien-,
Rollen- oder Fachdatentabellen.
