# ADR 0004: Ressourcenberechtigungsregister

- Status: umgesetzt im begrenzten Scope von FH-CX-005
- Datum: 2026-10-23
- Auftrag: FH-CX-005

## Kontext

Kalender-, Schul- und spätere Fachressourcen benötigen dieselbe
Autorisierungsgrundlage. Das vollständige Phasen-B-Modell benennt `resources`
und `grants`, enthält aber keine abschließend bestätigte Rollen-/Delegations-
oder Produkt-Default-Matrix. FH-CX-005 verlangt den sicheren Kern, ohne diese
offenen Fachentscheidungen vorwegzunehmen.

## Entscheidung im Umfang dieses Auftrags

- Ein `resources`-Eintrag speichert nur ID, Familie, fachlichen Eigentümer als
  `family_members.id`, Ressourcentyp, Sichtbarkeit, Version und Zeitstempel.
  Fachinhalte werden nicht in diesem Register gespeichert.
- Ein zusammengesetzter Foreign Key bindet den Eigentümer an dieselbe Familie.
  `resource_grants` bindet sowohl Ressource als auch Empfänger-Mitglied
  zusammengesetzt an dieselbe Familie.
- Eigentum ist nur wirksam, wenn `auth.uid()` aktuell eine aktive
  `family_memberships`-Zuordnung genau zum Eigentümermitglied besitzt und
  Familie sowie Mitglied aktiv sind. Rolle/Adminstatus gewährt keine Ausnahme.
- Privat: nur der verknüpfte Eigentümer kann lesen/ändern/löschen.
- Familie: aktive Mitglieder derselben Familie können lesen; Schreiben und
  Löschen bleiben Eigentümerrechten vorbehalten.
- Grant: ein aktiver Grant an ein aktives Familienmitglied erlaubt nur Lesen.
  Widerruf und nachfolgende Zugriffe verwenden den aktuellen DB-Status.
- Verwaltete Profile erhalten keine Auth-Rechte durch Kenntnis einer ID. Ein
  Grant kann auf ein solches Profil zeigen, bleibt aber ohne aktive
  Auth-Mitgliedschaft nicht verwendbar. Clients können ein verwaltetes Profil
  ohne eigene aktive Auth-Mitgliedschaft nicht als Eigentümer vertreten.
- Neue Ressourcen verwenden technisch `private` als fail-closed Default. Dies
  ist eine vorläufige Sicherheitsvorgabe für das Register, keine beschlossene
  Produktregel zur Standard-Sichtbarkeit.
- Ressourcensichtbarkeit wird über einen RPC mit `expectedVersion` geändert.
  Grants werden durch owner-geprüfte, idempotente RPCs erteilt und widerrufen.
  Direkte Grant-Schreibzugriffe und direkte Resource-Updates sind nicht
  freigegeben.
- RLS SELECT, INSERT, UPDATE und DELETE werden separat definiert. Eng
  begrenzte `SECURITY DEFINER`-Funktionen pinnen `search_path`, prüfen die
  aktuelle Auth-Identität und sind ausschließlich für `authenticated`
  ausführbar.

## Nicht entschieden / nicht implementiert

- Vollständige Rollenmatrix sowie Eltern-/Kindervertretung und Delegation.
- Rechte auf verwaltete Kinderprofile oder Freigaben in ihrem Namen.
- Semantik gemeinsam verantworteter/mehrfach besessener Ressourcen.
- Produkt-Default-Sichtbarkeit und fachliche Zulässigkeit jedes Ressourcentyps.
- Kalender-, Schul-, Import-, Aufgaben- oder Dokumentinhalte und ihre
  Schreiboperationen.
- Vollständige Freigabe-Verwaltungsoberfläche.

Diese offenen Themen benötigen eine ausdrückliche Fachentscheidung oder einen
späteren Auftrag; sie sind nicht aus den technischen Defaults abzuleiten.

## Folgen und Validierung

- Spätere Fachmodule speichern ihre Inhalte in eigenen Tabellen und referenzieren
  den Ressourcen-Datensatz; ihre RLS muss dieselbe Autorisierungsprüfung
  erzwingen und darf keine privaten Inhalte über Projektionen, Suche oder
  Metadaten verraten.
- `can_read_resource`, `can_update_resource`, `can_delete_resource` und
  `owns_resource` liefern boolesche Prüfungen; RLS auf dem Register bleibt
  die Datenbank-Sicherheitsgrenze.
- Die Integrationstests gegen echte PostgreSQL-RLS sind implementiert, aber
  in dieser Entwicklerumgebung mangels laufendem Docker-Daemon und Supabase
  CLI noch nicht ausgeführt. Die Migration wurde nicht auf das Cloud-Projekt
  angewendet.
