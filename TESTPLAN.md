# Testplan

## Automatisierte Tests
- GitHub Actions Workflow `Test`: installiert Node-Abhängigkeiten, baut die Vue-App, führt Unit-Tests aus und startet Playwright-Smoke-Tests.
- Unit-Tests liegen in `tests/**/*.test.js`; Playwright-Tests liegen in `tests/**/*.spec.js`.
- `vitest.config.js` verhindert, dass Playwright-Specs als Unit-Tests ausgeführt werden.
- Automatisiert geprüft: Audit-Datenmodell, betroffene Konten inklusive Steuerkonto, Vorher/Nachher-Snapshots, Dashboard/Timeline und ein Browser-Workflow für einen neuen Vorgang im Änderungsprotokoll.
- Lokal wären `npm run build`, `npm test`, `npm run test:e2e` und `npm run check` möglich, falls Node.js verfügbar ist.

## GitHub-Pages-Test
1. Änderungen committen und pushen.
2. In GitHub unter `Actions` den Workflow `Test` öffnen.
3. Warten, bis Unit- und Browser-Tests grün sind.
4. GitHub Pages unter `Settings > Pages` auf `GitHub Actions` als Source stellen.
5. Den Workflow `Deploy GitHub Pages` abwarten; er baut die Vue-App in `dist` und veröffentlicht genau dieses Artefakt.
6. Die Pages-URL öffnen.
7. Einmal `Einstellungen > Daten zurücksetzen` ausführen, falls im Browser noch alte LocalStorage-Daten liegen.

## Seed-Daten-Prüfung
- Das Beispiel enthält 27 Vorgänge über Mai und Juni 2026.
- Erwartete Bereiche: Behandlungserlöse, KZV-Zahlungen, Privatforderungen, Prophylaxeverkäufe, Materialeinkäufe, Miete, Labor und Software.
- Lagerbestände dürfen nach Seed-Import nicht negativ sein.
- `Einstellungen > Leeren Übungsmodus starten` erzeugt eine App ohne vorbereitete Bereiche/Konten.
- In `Einstellungen > Vorlage wählen` stehen Zahnarztpraxis, Hausarztpraxis und Physiotherapie zur Auswahl.
- Die fachlichen Beispieldaten liegen als drei Dateien unter `public/data/templates`; `public/data/app-data.json` bleibt als leere Grundvorlage erhalten.

## Manuelle Akzeptanztests

### Detail-Modals
1. Im Dashboard einen Eintrag unter `Letzte Aktivitäten` anklicken.
2. Das Detail-Modal öffnet sich, ohne die Dashboard-Ansicht zu verlassen.
3. Im Modal ein verknüpftes Ziel- oder Gegenkonto öffnen.
4. Mit dem Schließen-Button schließen.
5. In `Vorgänge` einen Eintrag in der Aktivitätsliste anklicken.
6. Aus dem Vorgang einen verknüpften Artikel oder eine Materialbewegung öffnen.
7. Im Lager eine Materialbewegung anklicken und die verknüpfte Buchung öffnen.
8. Klick auf den Hintergrund schließt das Modal.

### Speichern ohne automatisches Modal
1. In `Vorgänge` einen neuen Vorgang erfassen.
2. `Vorgang speichern` klicken.
3. Es erscheint nur die Statusmeldung `Vorgang gespeichert.`.
4. Es öffnet sich kein Detail-Modal automatisch.
5. Der neue Vorgang ist anschließend in der Aktivitätsliste anklickbar.

### Responsive Prüfung
1. GitHub Pages auf ca. 390 px Breite öffnen.
2. Navigation über das Menü öffnen und schließen.
3. Dashboard, Vorgänge, Bereiche, Lager und Einstellungen prüfen.
4. Karten, Statuschips, Formulare und Modal-Inhalte dürfen nicht horizontal aus dem Viewport laufen.
5. Aktionsbuttons bleiben bedienbar und Text bricht lesbar um.

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

### Änderungsprotokoll
1. Einen neuen Vorgang erfassen.
2. In `Einstellungen > Änderungsprotokoll` erscheint der neue Eintrag.
3. Den Eintrag öffnen; Zeitpunkt, Aktion, betroffene Bereiche und Nachher-Daten sind sichtbar.
4. Im Modal einen betroffenen Bereich öffnen.
5. Den Vorgang bearbeiten; der neue Protokolleintrag enthält Vorher- und Nachher-Daten.
6. `Daten zurücksetzen` ausführen; das Protokoll bleibt sichtbar und enthält einen Reset-Eintrag.
7. Ein Bereich ohne Änderungen zeigt einen leeren Zustand statt eines Fehlers.

### Leerer Übungsmodus
1. `Einstellungen > Leeren Übungsmodus starten` ausführen.
2. Dashboard und Bereiche zeigen leere Zustände statt Beispieldaten.
3. Vorgänge und Zahlungen zeigen einen Hinweis, dass zuerst mindestens zwei Bereiche/Konten nötig sind.
4. Zwei eigene Bereiche anlegen.
5. Danach lässt sich ein Vorgang mit diesen eigenen Bereichen speichern.
6. `Zahnarztpraxis > Vorlage laden` stellt die Standardvorlage wieder her.

### Vorlagen
1. `Einstellungen > Vorlage wählen` öffnen.
2. `Hausarztpraxis` laden.
3. Dashboard, Bereiche, Vorgänge und Lager zeigen hausärztliche Beispielwerte.
4. `Physiotherapie` laden.
5. Dashboard, Bereiche, Vorgänge und Lager zeigen physiotherapeutische Beispielwerte.
6. `Zahnarztpraxis` laden.
7. Die ursprünglichen Zahnarzt-Beispieldaten mit 27 Vorgängen sind wieder sichtbar.

### Import / Export
1. JSON exportieren.
2. Daten zurücksetzen.
3. Exportierte Datei importieren.
4. Bereiche, Vorgänge, Artikel und Materialbewegungen sind wieder vorhanden.
5. Ungültige Referenzen im Import werden abgelehnt.
