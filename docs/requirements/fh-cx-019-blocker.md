# FH-CX-019 – Kontrollierter Blocker zu Issue #25

Stand 19.11.2026. **Status: blockiert, keine Produktänderung.**

## Geprüfter Stand

Das Fachkonzept (A.4) und FH-OPEN-007 lassen die Vorlaufregeln,
Ruhezeiten und Gerätepräferenzen offen. Die Architektur (B.1.4)
verlangt aktuelle Mitgliedschaft und Sichtbarkeit bei der Versandvorbereitung.
Der konkrete Auftrag begrenzt FH-CX-019 auf explizite Einstellungen und eine
prüfbare Auswertung ohne Zustellung.

Im Repository liegen inzwischen die Migrationen für familien- und kontobezogene
Push-Subscriptions (`20261119120000_create_push_subscriptions.sql`) und die
Kalender-Empfängerauflösung (`20261119130000_resolve_calendar_recipients.sql`).
Die Subscriptions speichern die Identität und Zugangsdaten eines Push-Endpunkts.
Für Vorlaufzeit, Ruhezeit und Zeitzone fehlen ein Einstellungsvertrag,
eine autorisierte Speicher-/Leseoperation und die zugehörige RLS. Der Befund
bezieht sich auf Repository-Dateien.

## Fehlende Freigabe

`ALLOW_LOCAL_MIGRATIONS=false` und der Issue erlauben in diesem Lauf keine
Schemaänderung. Eine autorisierte Persistenz braucht einen ausdrücklich
freigegebenen lokalen und testbaren Folgeauftrag. Vor einer deterministischen
Auswertung braucht es außerdem eine fachliche Entscheidung zum Geltungsbereich
(Konto pro Familie, ggf. Geräteüberschreibungen), zu zulässigen Vorlaufwerten
und zum Verhalten innerhalb der Ruhezeit (unterdrücken oder verschieben).
Für die Zeitregeln sind Beispiele für Mitternacht, Wochenwechsel sowie
übersprungene und doppelte Ortszeiten erforderlich. Der Auftrag verlangt ein
neutrales Ergebnis bei fehlender Einstellung. FH-OPEN-007 bleibt offen.

## Nachweise

- `npm run build` lief mit Exit 0 durch. Typecheck, ESLint, 73 Unit-Tests
  in 10 Dateien und Client-Build waren erfolgreich. Die GitHub-Step-Summary
  konnte wegen `EROFS` nicht geschrieben werden. Vite meldete einen Chunk
  über 500 kB.
- API-/RLS-Integrationstests wurden wegen schreibender Fixtures und fehlender
  Datenbankfreigabe ausgelassen. Die vorhandenen E2E-Tests decken keine
  Einstellungsfunktion ab. Es wurde keine Datenbank geändert oder migriert.
- Für FH-CX-019 fehlen weiterhin Nachweise für ungültige und nicht darstellbare
  Werte, eigenes Konto und eigene Familie, Familienwechsel, widerrufene
  Mitgliedschaft, wiederholtes Speichern, deterministische Zeitgrenzen,
  fehlende Einstellungen und den Schutz privater Termine und Empfängerdaten
  bei einer Scheduler-Auswertung ohne Zustellung.
