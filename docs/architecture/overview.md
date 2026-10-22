# Architekturüberblick

FamilyHub ist ein Monorepo mit einer React-Webanwendung und fachlich getrennten
TypeScript-Paketen. Die Foundation enthält noch keine produktiven Datenflüsse.

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
  gemeinsame Vertrag unterscheidet explizit „Alle“ von einer Liste eindeutiger
  IDs; ein Versand ist nicht implementiert.
- Ausschließlich synthetische Daten dürfen in Tests verwendet werden.

## Zielplattformen

Die React-Anwendung wird mit Vite als responsive Web-App gebaut. Ein Web-App-
Manifest und Theme-Metadaten bereiten die PWA-Oberfläche vor; Offline-Cache,
Service Worker und Installationsfluss sind nicht umgesetzt. `capacitor.config.ts`
und Capacitor Core/CLI bereiten Android und iOS vor. Native Projekte und
Plattform-Builds sind nicht Bestandteil dieser Foundation.

## Backend

Supabase ist als späteres Backend für PostgreSQL und Supabase Auth vorgesehen.
`.env.example` enthält nur öffentliche Platzhaltervariablen. Die App initialisiert
keinen Supabase-Client; es gibt keine Migrationen mit Nutzerdaten, Auth-Flows,
Secrets oder produktives Hosting.
