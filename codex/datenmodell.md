# Datenmodell

## State
```js
{
  schemaVersion: 2,
  accounts: [],
  bookings: [],
  inventoryItems: [],
  inventoryMovements: [],
  auditLog: [],
  progress: { completedSteps: [], lastUpdated: null },
  settings: { exportedAt: null, createdAt: null, lastSavedAt: null, setupMode: 'sample' }
}
```

## Konto
- `id`: stabile technische ID
- `accountNo`: SKR03-nahe Kontonummer
- `name`: einsteigerfreundlicher Anzeigename, z. B. `Offene Patientenrechnungen`
- `type`: `asset`, `liability`, `revenue`, `expense` oder `tax`
- `debitTotal`, `creditTotal`, `balance`: berechnete Werte, nicht führende Eingabedaten

## Setup-Modus
- `settings.setupMode: 'sample'`: Standardmodus mit Zahnarztpraxis-Beispieldaten und vorbereiteten Bereichen.
- `settings.setupMode: 'template'`: eine fachliche Vorlage wurde geladen.
- `settings.setupMode: 'blank'`: leerer Übungsmodus; keine Standardkonten werden ergänzt.
- `settings.templateId`: technische Kennung der geladenen Vorlage, z. B. `dentist`, `general-practice` oder `physiotherapy`.
- Im leeren Übungsmodus müssen Nutzer Bereiche/Konten, Vorgänge, Artikel und Bewegungen selbst anlegen.
- Vorgänge und Zahlungen sind erst sinnvoll möglich, wenn mindestens zwei Bereiche vorhanden sind.

## Vorlagen
- `dentist`: Zahnarztpraxis mit KZV-Abschlägen, Behandlungshonoraren, Privatleistungen, Prophylaxeartikeln und Praxislager.
- `general-practice`: Hausarztpraxis mit KV-Abschlägen, Privatattesten, Impfstoff-/Praxisbedarf, Labor und Software.
- `physiotherapy`: Physiotherapiepraxis mit Therapieerlösen, Selbstzahlern, Kursen, Materialverkauf und Therapiebedarf.
- `data/app-data.json` ist die leere Grundvorlage für den Selbstaufbau.
- `data/templates/*.json` enthält die fachlichen Quellvorlagen im Repository.
- `public/data/app-data.json` ist die leere Laufzeit-Grundvorlage.
- Vorlagen werden als JSON aus `public/data/templates` geladen, damit sie im Vite/GitHub-Pages-Build in `dist/data/templates` verfügbar sind.

## Buchung
- `id`, `date`, `documentNo`, `description`
- `debitAccountId`, `creditAccountId`: intern Soll/Haben; in der UI als Zielkonto und Gegenkonto benannt
- `amount`: Eingabebetrag
- `taxType`: `none`, `vat19`, `vat7`, `input19`, `input7`
- `taxMode`: `net` oder `gross`
- `netAmount`, `taxAmount`, `grossAmount`: berechnete Werte
- `inventoryItemId`: optionaler Artikelbezug
- `inventoryLinkType`: `none`, `in` oder `out`
- `quantity`: Menge bei Lagerbezug

## Buchungszeilen
- Buchungszeilen werden aus Buchungen abgeleitet.
- Die UI verwendet Anfängerbegriffe, die abgeleiteten Zeilen bleiben fachlich Soll/Haben.
- Umsatzsteuer-Buchung: Bank/Forderung brutto im Soll, Erlös netto und Umsatzsteuer im Haben.
- Vorsteuer-Buchung: Aufwand/Ware netto und Vorsteuer im Soll, Verbindlichkeit/Bank brutto im Haben.
- Buchungen ohne Steuer: Soll und Haben jeweils mit Bruttobetrag.

## Lagerbewegung
- `type`: `in`, `out` oder `adjustment`
- `linkedBookingId`: gesetzt, wenn die Bewegung aus einer Buchung stammt
- Verknüpfte Bewegungen werden nicht separat gelöscht, sondern über die Buchung synchronisiert.

## Import und Export
- JSON-Import wird normalisiert und referenziell geprüft.
- `auditLog` wird beim JSON-Export mitgesichert und beim Import übernommen.
- Nach einem Import wird zusätzlich ein Systemeintrag im Protokoll angelegt.
- CSV-Export quotet alle Zellen und entschärft Werte, die in Tabellenkalkulationen als Formel interpretiert werden könnten.

## Änderungsprotokoll
- `auditLog` ist ein lesbares Lern- und Nachvollziehbarkeitsprotokoll, keine manipulationssichere Revision.
- Jeder Eintrag enthält `id`, `timestamp`, `action`, `entityType`, `entityId`, `title`, `accountIds`, `summary`, `before` und `after`.
- Protokolliert werden kontowirksame Vorgänge: Vorgang anlegen/bearbeiten/löschen/duplizieren, Zahlung erfassen, Bereich anlegen/löschen, Import, Reset und Beispieldaten laden.
- Kontoansichten zeigen nur Einträge, deren `accountIds` den jeweiligen Bereich enthalten.
- Reset und Beispieldatenladen erhalten vorhandene Protokolleinträge und protokollieren die Systemaktion selbst.
- Reine Materialbewegungen ohne Buchungs- oder Kontowirkung werden vorerst nicht protokolliert.

## Seed-Beispiel
- Das Standardbeispiel bildet rund zwei Monate Zahnarztpraxisbetrieb ab.
- Behandlungshonorare, KZV-Abschläge und Privatabrechnungen laufen ohne Umsatzsteuer.
- Verkäufe von Prophylaxeartikeln laufen mit Umsatzsteuer und Materialabgang.
- Einkäufe von Praxis- und Verbrauchsmaterial laufen mit Vorsteuer und optionalem Lagerzugang.
- Interne Materialverbräuche werden als Lagerbewegungen geführt; Zahlungen an Lieferanten werden separat gebucht.

## Dashboard-Saldo
- Der Dashboard-Gesamt-Saldo ist eine einsteigerfreundliche Übersichtszahl.
- Berechnung: Kasse + Bank + offene Patientenrechnungen + Materialwert minus offene Lieferantenrechnungen.
- Er ist kein handelsrechtlicher Abschlusswert, sondern eine Orientierung für den Übungsbetrieb.
