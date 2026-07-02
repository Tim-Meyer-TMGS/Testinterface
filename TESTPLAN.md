# Testplan

## Automatisierte Tests
- GitHub Actions Workflow `Test`: installiert Node-Abhängigkeiten, führt Unit-Tests aus und startet Playwright-Smoke-Tests.
- Unit-Tests liegen in `tests/**/*.test.js`; Playwright-Tests liegen in `tests/**/*.spec.js`.
- `vitest.config.js` verhindert, dass Playwright-Specs als Unit-Tests ausgeführt werden.
- Lokal wären `npm test`, `npm run test:e2e` und `npm run check` möglich, falls Node.js verfügbar ist.

## GitHub-Pages-Test
1. Änderungen committen und pushen.
2. In GitHub unter `Actions` den Workflow `Test` öffnen.
3. Warten, bis Unit- und Browser-Tests grün sind.
4. GitHub Pages unter `Settings > Pages` auf Branch `main` und Ordner `/ (root)` stellen.
5. Die Pages-URL öffnen.
6. Einmal `Einstellungen > Daten zurücksetzen` ausführen, falls im Browser noch alte LocalStorage-Daten liegen.

## Seed-Daten-Prüfung
- Das Beispiel enthält 27 Vorgänge über Mai und Juni 2026.
- Erwartete Bereiche: Behandlungserlöse, KZV-Zahlungen, Privatforderungen, Prophylaxeverkäufe, Materialeinkäufe, Miete, Labor und Software.
- Lagerbestände dürfen nach Seed-Import nicht negativ sein.

## Manuelle Akzeptanztests

### Detail-Modals
1. Im Dashboard einen Eintrag unter `Letzte Vorgänge` anklicken.
2. Das Detail-Modal öffnet sich, ohne die Dashboard-Ansicht zu verlassen.
3. Im Modal ein verknüpftes Ziel- oder Gegenkonto öffnen.
4. Mit `Escape` schließen.
5. Im Journal einen Vorgang anklicken.
6. Aus dem Vorgang einen verknüpften Artikel oder eine Materialbewegung öffnen.
7. Im Lager eine Materialbewegung anklicken und die verknüpfte Buchung öffnen.
8. Klick auf den Hintergrund schließt das Modal.

### Verkauf mit Umsatzsteuer
1. Vorgang erstellen: Kasse an Verkauf Prophylaxeartikel, 119 EUR brutto, 19 % Umsatzsteuer.
2. Kassen-Saldo steigt um 119 EUR.
3. Erlöse-Saldo steigt um 100 EUR.
4. Umsatzsteuer-Saldo steigt um 19 EUR.

### Einkauf mit Vorsteuer
1. Vorgang erstellen: Praxis- und Verbrauchsmaterial an Offene Lieferantenrechnungen, 100 EUR netto, 19 % Vorsteuer.
2. Materialkosten steigen um 100 EUR.
3. Vorsteuer steigt um 19 EUR.
4. Verbindlichkeiten steigen um 119 EUR.

### Materialzugang über Vorgang
1. Artikel auswählen.
2. Lagerwirkung `Material kommt rein` und Menge 5 buchen.
3. Eine verknüpfte Materialbewegung entsteht.
4. Bestand steigt um 5.

### Materialabgang über Vorgang
1. Artikel `Prophylaxe-Zahnbürsten` auswählen.
2. Lagerwirkung `Material geht raus` und verfügbare Menge buchen.
3. Bestand sinkt entsprechend.
4. Eine Menge über Bestand wird abgelehnt.

### Bearbeiten, Duplizieren, Löschen
1. Vorgang mit Lagerwirkung bearbeiten.
2. Verknüpfte Materialbewegung wird aktualisiert.
3. Vorgang duplizieren.
4. Neue verknüpfte Materialbewegung entsteht.
5. Vorgang löschen.
6. Zugehörige Materialbewegung wird entfernt.

### Import / Export
1. JSON exportieren.
2. Daten zurücksetzen.
3. Exportierte Datei importieren.
4. Bereiche, Vorgänge, Artikel und Materialbewegungen sind wieder vorhanden.
5. Ungültige Referenzen im Import werden abgelehnt.
