# FH-CX-018 – Familienbezogene Empfängerauflösung

Issue #24 gibt den Minimalumfang zur Auflösung berechtigter Kalenderleser frei.
Damit ist der frühere Planungsblocker für diesen Umfang überholt.

Der RPC `resolve_calendar_recipients_v1` akzeptiert die Ressourcen-ID eines
gespeicherten Einzeltermins oder einer Serie. Der vorhandene Auswahlvertrag
wird auf `p_kind` und `p_member_ids` abgebildet. Bei `all` bleibt das ID-Array
leer oder wird weggelassen. Bei `selected_members` enthält es die ausgewählten
Mitglieds-IDs. Fremde, unbekannte und aktuell nicht berechtigte IDs werden
ausgefiltert. Die Antwort enthält ausschließlich `member_id` und `user_id`,
sortiert nach Mitglieds-ID. Serien werden auf Ressourcenebene aufgelöst.

Die Abfrage verwendet die Sitzung des Aufrufers und dieselbe Leseregel wie
die Kalender-RLS für jedes Empfängerkonto. Die Prüfung und die Auflösung
verwenden denselben Datenbank-Snapshot. Fehlende und nicht lesbare Ressourcen
ergeben eine leere Liste. Eine spätere Zustellung benötigt eine erneute Prüfung
zum Versandzeitpunkt. FH-CX-019 und FH-CX-020 behandeln Einstellungen und Versand.

Die additive lokale Migration `20261119130000_resolve_calendar_recipients.sql`
ergänzt den RPC und verlagert die bestehende Leseregel in eine private Funktion.
Der Nachweis für Auswahl, Isolation, Freigabewiderruf, Sitzungsberechtigung und
Antwortschema liegt in `tests/integration/calendar-events.rls.test.ts`.
`tests/integration/calendar-series.rls.test.ts` deckt den Serienzugriff ab.
