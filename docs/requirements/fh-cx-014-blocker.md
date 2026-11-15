# FH-CX-014 – Abschlussnachweis für Issue #20

Stand: 15.11.2026. Status: **implementiert im Feature-Branch; Draft-PR und
menschliche Abnahme ausstehend**.

## Umgesetzter Umfang

- Die serverseitigen Einzeltermin- und Serientermin-Validatoren lehnen
  PostgreSQL-Infinitywerte und Werte außerhalb des endlichen, mit dem Client
  vereinbarten Bereichs `0001-01-01` bis `9999-12-31` fail-closed ab.
- Der Editor bearbeitet Termine in der gespeicherten IANA-Zeitzone. Beim
  Speichern wird diese Zeitzone nicht mehr unbeabsichtigt durch die
  Browserzeitzone ersetzt.
- Nicht existente lokale Uhrzeiten in einer DST-Lücke werden im Client
  abgelehnt. Eine doppelte Herbstzeit wird deterministisch als frühere Instanz
  gespeichert.
- Ganztägige Termine verwenden weiterhin lokale Datumswerte und exklusives
  Ende. Beim Bearbeiten bleibt ein mehrtägiger Zeitraum erhalten und kann über
  Beginn und exklusives Ende geändert werden.
- Einzeltermine und Serien werden nach dem absoluten Startzeitpunkt sortiert,
  mit stabiler Ressourcen-ID als Tie-Breaker.
- Familien-, Eigentümer-, Sichtbarkeits-, Versions- und RLS-Verträge wurden
  nicht gelockert.

## Bewusste Entscheidungen für diesen Auftrag

1. Neue API-Werte sind endlich und auf den Client-Vertrag `0001–9999`
   begrenzt. Historische Bestandsdaten werden nicht automatisch verändert.
2. DST-Lücken werden beim interaktiven Erfassen abgelehnt, statt still auf eine
   andere Uhrzeit zu verschieben. Bei einer doppelten Herbstzeit wird die
   frühere Instanz gewählt.
3. Die PostgreSQL-Migration ist nur für die lokale/testweise Instanz bestimmt.
   Es gab keine Cloud- oder Produktionsmigration.
4. Eine globale Standardzeitzone, neue Rollen, Push, Import/Synchronisation,
   Serienausnahmen und historische Datenkorrekturen bleiben außerhalb des
   Scopes.

## Tests

| Befehl | Ergebnis |
| --- | --- |
| `npm run test:unit` | erfolgreich: 7 Dateien, 60 Tests |
| `npm run typecheck` | erfolgreich |
| `npm run lint` | erfolgreich |
| `npm run build:client` | erfolgreich; vorhandene Bundle-Warnung über 500 kB |
| `npm run test:integration` | in diesem Lauf nicht ausführbar: lokale Supabase-/Docker-Engine war nicht gestartet; der Testlauf benötigt eine getrennte, wegwerfbare lokale Instanz |
| `npm run test:e2e` | in diesem Lauf nicht ausgeführt; datenbankgestützte Browserprüfung bleibt Bestandteil der manuellen Abnahme nach Start der lokalen Umgebung |

Die neuen SQL-Negativtests für Infinity- und Bereichswerte sind im
Integrationstest enthalten, aber wegen der nicht gestarteten lokalen
Supabase-Instanz noch nicht ausgeführt. Es wurde keine Remote-Datenbank
verwendet.

## Verbleibende Abnahme

Der Draft-PR muss auf GitHub geprüft werden. Danach sind in einer lokalen,
wegwerfbaren Supabase-Instanz die Migration und `npm run test:integration`
auszuführen; anschließend kann die vorhandene Playwright-Prüfung mit einer
europäischen Zeitzone gestartet werden. Ein Mensch entscheidet über die
Freigabe und den Merge. Es gibt keinen automatischen Merge und keine
automatische Produktionsmigration.
