# Todo-Liste

## Tooling
- [x] `package.json` mit Vite, Vitest und Playwright anlegen
- [x] GitHub-Actions-Workflow für Unit- und Browser-Tests anlegen
- [ ] Tests über GitHub Actions nach Push auswerten
- [ ] Optional lokal testen, falls später Node.js verfügbar ist

## Fachlogik
- [x] Steuerberechnung aus UI-Code herauslösen
- [x] Buchungssalden aus Split-Buchungszeilen berechnen
- [x] SKR03-nahe Beispielkonten bereinigen
- [x] Beispielkonten auf Zahnarztpraxisbetrieb erweitern
- [x] Seed-Daten auf rund zwei Monate Praxisbetrieb erweitern
- [ ] Weitere Steuerfälle mit 7 % fachlich testen

## Sicherheit und Import
- [x] Dynamische Tabellen ohne ungeprüftes `innerHTML` rendern
- [x] Importdaten normalisieren und validieren
- [x] CSV-Zellen escapen und Formel-Injection entschärfen
- [ ] Importfehler im UI differenzierter anzeigen

## Lager
- [x] Explizite Lagerwirkung im Buchungsformular ergänzen
- [x] Lagerabgänge gegen Bestand prüfen
- [x] Buchungen und verknüpfte Lagerbewegungen synchronisieren
- [ ] Lagerwertmethoden bei Bedarf fachlich erweitern

## UI
- [x] Journal-Spalten an Netto, Steuer und Brutto anpassen
- [x] Bearbeiten-Modus mit sauberem Formularzustand erhalten
- [x] Freundliches Zahnarztpraxis-Design anwenden
- [ ] Responsive Tabellen nach Test auf kleinen Viewports nacharbeiten

## Tests
- [x] Unit-Test-Dateien für Steuer, Salden, Lager, Import und CSV anlegen
- [x] E2E-Smoke-Test für Dashboard und Journal anlegen
- [x] CI-Workflow als Ersatz für lokale Node-Installation anlegen
- [ ] Fehler aus GitHub Actions nach dem ersten Lauf beheben

## Servermodus
- [x] Server auf ES-Module umstellen
- [x] Schreibzugriff auf `/api/data` standardmäßig deaktivieren
- [ ] Optionalen Serveradapter in der UI aktivierbar machen
