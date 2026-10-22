# ADR 0001: npm-Workspaces und fachliche Paketgrenzen

- Status: angenommen
- Datum: 2026-10-22

## Kontext

FamilyHub braucht getrennte Fachbereiche, wiederverwendbare Verträge und eine
gemeinsame Oberfläche, soll aber zunächst als einfach startbares Projekt
entwickelt werden.

## Entscheidung

Wir verwenden npm-Workspaces mit einem React/Vite-Client und eigenständigen
Paketen für UI, Verträge, Autorisierung, Kalender, Schule und
Benachrichtigungen. Domain-Pakete bleiben unabhängig. Gemeinsame Validierung
erfolgt mit Zod. Ein Lockfile sichert reproduzierbare npm-Installationen.

## Folgen

- Module lassen sich unabhängig erweitern, ohne eine verteilte Systemarchitektur
  oder separate Deployments einzuführen.
- Modulgrenzen sind durch Paketabhängigkeiten sichtbar; TypeScript prüft alle
  Workspace-Quellen gemeinsam.
- PostgreSQL/RLS bleibt die spätere maßgebliche Sicherheitsgrenze. Die
  TypeScript-Policy ist eine dokumentierte Foundation-Demonstration, keine
  Durchsetzung an der Datenbank.
- Supabase Auth und das private `user_profiles`-RLS sind in FH-CX-003 ergänzt;
  ihre begrenzte Sicherheitsgrenze wird in ADR 0002 dokumentiert.
- Die npm-Versionen werden durch `package-lock.json` exakt aufgelöst; Node 24
  ist die dokumentierte Foundation-Laufzeit.
