# ADR 0005: Familieneinladungen und Mitgliedschaftslebenszyklus

- Status: umgesetzt im begrenzten Scope von FH-CX-006
- Datum: 2026-10-23
- Auftrag: FH-CX-006

## Kontext

FamilyHub trennt Auth-Konten von Familienmitgliedern. Ein Administrator kann
bereits verwaltete Profile ohne Login anlegen. Die Einladung soll ein Konto
sicher mit genau so einem vorhandenen Erwachsenenprofil verbinden, ohne
Familien- oder Personen-Duplikate zu erzeugen. Die vollständige Rollenmatrix
`FH-OPEN-001` sowie Eltern-/Kindervertretung sind weiterhin offen.

## Entscheidung im FH-CX-006-Umfang

- Eine neue additive Migration erstellt `family_invitations`; RLS ist aktiv
  und direkte Tabellenrechte sind entzogen. Erstellen, Anzeigen, Widerrufen,
  Vorschau und Annahme laufen ausschließlich über begrenzte
  `SECURITY DEFINER`-RPCs mit festem `search_path` und `auth.uid()`.
- Eingeladen werden kann nur ein aktives, noch nicht aktiv verknüpftes
  Erwachsenenprofil derselben Familie. Der RPC akzeptiert keine Client-Rolle:
  die Rolle ist serverseitig fest auf `adult` begrenzt.
- Der Server erzeugt einen kryptografisch sicheren 256-Bit-Code. Gespeichert
  wird ausschließlich sein SHA-256-Hash. Einladungscodes gelten sieben Tage,
  werden einmal angenommen und können widerrufen werden.
- Annahme erfordert ein angemeldetes Konto mit bestätigter E-Mail-Adresse, die
  serverseitig mit der eingeladenen Adresse abgeglichen wird. Ein Link allein
  aktiviert keine Mitgliedschaft. Einladung, Mitgliedschaft und bestehendes
  Familienmitglied werden in einer Datenbanktransaktion gesperrt und atomar
  geändert; wiederholte Annahme desselben Codes durch dasselbe Konto ist
  idempotent.
- Eine bereits mit einem anderen Konto verknüpfte Person wird nicht
  übernommen, auch wenn eine frühere Verknüpfung widerrufen wurde. Eine
  Reaktivierung ist nur für dasselbe Konto möglich.
- Mitglieder können Administratoren per RPC deaktivieren. Die fachliche
  Person und historische Ressourcen werden nicht gelöscht. Die letzte aktive
  `family_admin`-Mitgliedschaft kann nicht deaktiviert werden; konkurrierende
  Deaktivierungen werden über eine Sperre auf die Familienzeile serialisiert.
- Administratoren sehen innerhalb ihrer Familie Mitgliedschaftsstatus und
  Einladungsübersicht, aber keine Einladungs-E-Mail-Adressen oder Tokenwerte.
  Der Adminstatus verleiht weiterhin keinen Zugriff auf private Ressourcen.
- Der Einladungslink wird manuell kopiert, enthält den Token im URL-Fragment
  (nicht im HTTP-Request) und wird nach Aufnahme der App in `sessionStorage`
  aus der sichtbaren URL entfernt. Es gibt keinen SMTP-/Push-Versand. Nach
  Registrierung und E-Mail-Bestätigung wird die Einladung erneut serverseitig
  geprüft und muss ausdrücklich angenommen werden.
- Die UI bietet keine Rollenänderung an. Die Implementierung schaltet weder
  `family_admin`- noch `child`-Einladungen oder Kinderaktivierung frei, bis die
  Fachentscheidung zur Rollenmatrix ausdrücklich vorliegt.

## Folgen

- Eine Einladung zu einem verwalteten Kinderprofil oder eine Rollenänderung
  bleibt bis zur fachlichen Klärung gesperrt.
- Abgelaufene Einladungen sind nicht annehmbar und werden beim Erstellen einer
  gleichartigen neuen Einladung bereinigt; die Anzeige leitet den Ablauf
  zusätzlich aus `expires_at` ab.
- Einladungszustellung und Einladungstoken werden nicht über Analytics,
  Drittanbieter oder Protokollmeldungen weitergegeben.
- Die E-Mail-Bestätigung eines neu registrierten Kontos hängt von der
  bestehenden Supabase-Auth-/E-Mail-Konfiguration ab. Ohne nutzbare
  Bestätigungszustellung kann die Person die Einladung nicht annehmen.
- Mehrfamilienkonten bleiben erlaubt; jede Einladung referenziert genau eine
  Familie und deren bestehende Mitglieds-ID. Der Familienwechsel erteilt keine
  Rechte und verändert keine Mitgliedschaften.

## Validierung

Vitest-Vertragsprüfungen, PostgreSQL-RLS-Integrationstests mit synthetischen
Auth-Identitäten und ein Playwright-E2E-Fluss prüfen die Einladungs- und
Mitgliedschaftsgrenzen. Die tatsächliche lokale Supabase-Ausführung wird im
FH-CX-006-Abschlussbericht dokumentiert. Cloud-Migrationen werden nicht aus
diesem Arbeitsauftrag heraus ausgeführt.
