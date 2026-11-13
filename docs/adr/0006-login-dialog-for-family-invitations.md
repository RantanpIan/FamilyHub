# ADR 0006: Einladungsdialog beim Login

- Status: vorgeschlagen und in Umsetzung auf `feature/family-invitations-login-modal`
- Datum: 2026-11-13
- Bezug: FH-CX-006-FOLLOWUP

## Kontext

Der bisherige Einladungsfluss setzte einen URL-Token, eine sichtbare `/invite`-Route
und damit eine für lokale Umgebungen fehleranfällige Linkbestätigung voraus. Das
führte dazu, dass ein bereits verifiziertes Konto trotz gültiger Einladung keine
sichtbare Einladung erhielt. In `Familyhub_dev` bestehen aktuell zwei getrennte
aktive Familien mit dem Namen „Wiecha“; die offene Einladung für Patricia muss
deshalb genau an das eingeladene Auth-Konto gebunden bleiben.

## Entscheidung für den Follow-up-Umfang

- Nach jeder erfolgreichen Anmeldung eines verifizierten Kontos fragt der Client
  über `list_my_pending_family_invitations()` nur nicht abgelaufene Einladungen
  für die serverseitig gelesene, normalisierte Auth-E-Mail ab.
- Die RPC gibt ausschließlich für die Bestätigung nötige, familienbezogene
  Anzeigedaten zurück: Familienname, Zielprofil, Rolle und Ablaufzeit. Weder
  Einladungsemail noch Token oder fremde Familienmetadaten werden zurückgegeben.
- Ein barrierearmer Dialog bietet „Einladung annehmen“, „Ablehnen“ und „Später
  erinnern“. Die Entscheidung läuft über `respond_to_family_invitation(id,
  decision)`; die Einladung-ID ist eine Referenz, kein Berechtigungsnachweis.
- Annahme ist transaktional und idempotent. Die aktive Familie wird anschließend
  auf die angenommene Familie gewechselt. Eine vorhandene eigene Familie bleibt
  aktiv; es gibt keine automatische Fusion und keinen impliziten Familienwechsel
  für andere Mitgliedschaften.
- „Später erinnern“ verändert den Serverstatus nicht und zeigt die Einladung bei
  einer späteren Anmeldung erneut. „Ablehnen“ wird als eigener Status gespeichert,
  damit dieselbe Einladung nicht bei jedem Login erneut erscheint.
- Die bisherigen tokengebundenen RPCs bleiben für Rückwärtskompatibilität
  serverseitig emailgebunden; sie sind nicht mehr der primäre Clientfluss.

## Sicherheits- und Betriebsfolgen

- Die neue RPC liest `auth.users` ausschließlich in einer begrenzten
  `SECURITY DEFINER`-Funktion mit festem `search_path`; Tabellendirektzugriff und
  Funktionsexekution bleiben auf die vorgesehenen Rollen beschränkt.
- Nicht bestätigte Konten und fremde Einladung-IDs erhalten keine Daten und keine
  unterscheidbaren Erfolgshinweise.
- Mehrere offene Einladungen werden nacheinander angezeigt. Parallel laufende
  Annahmen werden durch Zeilensperre und bestehende Familien-/Mitgliedsconstraints
  serialisiert.
- Das Feature benötigt keine Änderung an `Familyhub_dev`. Die neue Migration wird
  erst nach grünem CI und Review angewendet.

## Validierung

Vertrags-/Unit-Tests, RLS-Integrationstests und ein Playwright-Flow prüfen
Abfrage ohne Token, falsche E-Mail, Mehrfach-/Wiederholungsfälle, Ablehnung,
Familienwechsel und den mobilen Dialog. Lokale Supabase-Ausführung bleibt ein
offener Prüfpunkt, solange Docker auf dem Entwicklungsrechner nicht verfügbar ist.

