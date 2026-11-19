# ADR 0007: Serientermine und Wiederholungsregeln

- Status: beschlossen und lokal implementiert
- Auftrag: FH-CX-011
- Datum: 2026-11-15

## Entscheidung

FamilyHub unterstützt für Serientermine zunächst einen begrenzten RFC-5545-
Ausschnitt:

- `FREQ=DAILY`, `FREQ=WEEKLY` und `FREQ=MONTHLY`
- optional `INTERVAL=1..366`
- bei wöchentlichen Serien optional `BYDAY=MO,TU,...,SU`
- bei monatlichen Serien optional `BYMONTHDAY=1..31` oder `-1..-31`
- genau eine Begrenzung durch `COUNT=1..500` oder `UNTIL=YYYY-MM-DD`

Unbegrenzte Serien, komplexe Frequenzen, externe Kalender, Importe und
Benachrichtigungen gehören nicht zu FH-CX-011.

## Zeit und Identität

Zeitgebundene Termine werden als lokale Wandzeit in einer IANA-Zeitzone
interpretiert. Dadurch bleibt zum Beispiel 09:00 Uhr auch über die
Sommerzeitumstellung hinweg 09:00 Uhr. Für nicht eindeutig auflösbare
Zeitpunkte in einer DST-Lücke wird der nächste gültige lokale Zeitpunkt
verwendet; bei einer DST-Überlappung der früheste gültige Zeitpunkt.

Jedes Vorkommen erhält aus seiner lokalen Startdarstellung einen stabilen
`occurrence_key`. Vorkommen werden als Projektion der Serienressource
materialisiert und verwenden deshalb dasselbe Familien-, Besitz- und
Sichtbarkeitsmodell wie Einzeltermine.

## Änderungssemantik

- Eine Serienänderung ersetzt die Serie vollständig und erhöht die
  Ressourcenversion.
- „Dieses und folgende“ wird über `split_calendar_series` umgesetzt: Die
  bisherige Serie endet vor dem gewählten vorhandenen Vorkommen; eine neue
  Serie beginnt dort.
- Die Änderung eines einzelnen Vorkommens bleibt FH-CX-012 vorbehalten.
- Schreibvorgänge benötigen eine Anfragekennung und eine erwartete Version.
  Wiederholte identische Anfragen liefern dasselbe Ergebnis; abweichende
  Wiederverwendung einer Anfragekennung wird abgewiesen.

## Sicherheit und Datenbank

Serien und Vorkommen sind an `resources` gebunden. Leserechte werden nur über
die bestehende Ressourcen-RLS geprüft; Cross-Family-Zugriffe und direkte
Schreibzugriffe auf die Fachtabellen sind nicht vorgesehen. Die Migration
`20261115090000_add_calendar_series.sql` ist für eine manuell freigegebene
Anwendung vorgesehen. Es wurde keine Cloud-, Entwicklungs- oder
Produktionsdatenbank geändert.

## Nicht lokal verifizierbar

Der Supabase-CLI ist in dieser Umgebung nicht installiert. Deshalb konnten
Migration, PostgreSQL-Funktionen und RLS nicht gegen eine lokale Datenbank
ausgeführt werden. Die SQL-Datei muss vor der Anwendung in einer isolierten
Testdatenbank mit den vorhandenen Supabase-/RLS-Tests geprüft werden.
