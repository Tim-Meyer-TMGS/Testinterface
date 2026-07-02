# Testplan

## Automatisierte Tests
- `npm test`: Unit-Tests für Steuerberechnung, Saldenlogik, Lagerlogik, Importvalidierung und CSV-Escaping.
- `npm run test:e2e`: Browser-Smoke-Test für Dashboard und Journal.
- `npm run check`: aktuell Alias auf Unit-Tests.

## Manuelle Akzeptanztests

### Buchung mit Umsatzsteuer
1. Buchung erstellen: Bank an Erlöse, 119 EUR brutto, 19 % Umsatzsteuer.
2. Bank-Saldo steigt um 119 EUR.
3. Erlöse-Saldo steigt um 100 EUR.
4. Umsatzsteuer-Saldo steigt um 19 EUR.

### Buchung mit Vorsteuer
1. Buchung erstellen: Wareneingang an Verbindlichkeiten, 100 EUR netto, 19 % Vorsteuer.
2. Wareneingang steigt um 100 EUR.
3. Vorsteuer steigt um 19 EUR.
4. Verbindlichkeiten steigen um 119 EUR.

### Lagerzugang über Buchung
1. Artikel auswählen.
2. Lagerwirkung `Wareneingang` und Menge 5 buchen.
3. Eine verknüpfte Lagerbewegung entsteht.
4. Bestand steigt um 5.

### Lagerabgang über Buchung
1. Artikel auswählen.
2. Lagerwirkung `Lagerabgang` und verfügbare Menge buchen.
3. Bestand sinkt entsprechend.
4. Eine Menge über Bestand wird abgelehnt.

### Bearbeiten, Duplizieren, Löschen
1. Buchung mit Lagerwirkung bearbeiten.
2. Verknüpfte Lagerbewegung wird aktualisiert.
3. Buchung duplizieren.
4. Neue verknüpfte Lagerbewegung entsteht.
5. Buchung löschen.
6. Zugehörige Lagerbewegung wird entfernt.

### Import / Export
1. JSON exportieren.
2. Daten zurücksetzen.
3. Exportierte Datei importieren.
4. Konten, Buchungen, Artikel und Lagerbewegungen sind wieder vorhanden.
5. Ungültige Referenzen im Import werden abgelehnt.
