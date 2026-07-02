# Datenmodell

## State
```js
{
  schemaVersion: 2,
  accounts: [],
  bookings: [],
  inventoryItems: [],
  inventoryMovements: [],
  progress: { completedSteps: [], lastUpdated: null },
  settings: { exportedAt: null, createdAt: null, lastSavedAt: null }
}
```

## Konto
- `id`: stabile technische ID
- `accountNo`: SKR03-nahe Kontonummer
- `name`: Anzeigename
- `type`: `asset`, `liability`, `revenue`, `expense` oder `tax`
- `debitTotal`, `creditTotal`, `balance`: berechnete Werte, nicht führende Eingabedaten

## Buchung
- `id`, `date`, `documentNo`, `description`
- `debitAccountId`, `creditAccountId`
- `amount`: Eingabebetrag
- `taxType`: `none`, `vat19`, `vat7`, `input19`, `input7`
- `taxMode`: `net` oder `gross`
- `netAmount`, `taxAmount`, `grossAmount`: berechnete Werte
- `inventoryItemId`: optionaler Artikelbezug
- `inventoryLinkType`: `none`, `in` oder `out`
- `quantity`: Menge bei Lagerbezug

## Buchungszeilen
- Buchungszeilen werden aus Buchungen abgeleitet.
- Umsatzsteuer-Buchung: Bank/Forderung brutto im Soll, Erlös netto und Umsatzsteuer im Haben.
- Vorsteuer-Buchung: Aufwand/Ware netto und Vorsteuer im Soll, Verbindlichkeit/Bank brutto im Haben.
- Buchungen ohne Steuer: Soll und Haben jeweils mit Bruttobetrag.

## Lagerbewegung
- `type`: `in`, `out` oder `adjustment`
- `linkedBookingId`: gesetzt, wenn die Bewegung aus einer Buchung stammt
- Verknüpfte Bewegungen werden nicht separat gelöscht, sondern über die Buchung synchronisiert.

## Import und Export
- JSON-Import wird normalisiert und referenziell geprüft.
- CSV-Export quotet alle Zellen und entschärft Werte, die in Tabellenkalkulationen als Formel interpretiert werden könnten.

## Seed-Beispiel
- Das Standardbeispiel bildet rund zwei Monate Zahnarztpraxisbetrieb ab.
- Behandlungshonorare, KZV-Abschläge und Privatabrechnungen laufen ohne Umsatzsteuer.
- Verkäufe von Prophylaxeartikeln laufen mit Umsatzsteuer und Lagerabgang.
- Einkäufe von Praxis- und Verbrauchsmaterial laufen mit Vorsteuer und optionalem Lagerzugang.
- Interne Materialverbräuche werden als Lagerbewegungen geführt; Zahlungen an Lieferanten werden separat gebucht.
