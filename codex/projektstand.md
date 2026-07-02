# Projektstand

## Status
- Die Anwendung ist zu einer modularen Vanilla-JS-App umgebaut.
- Fachlogik liegt in `src/` und ist ohne DOM testbar.
- `app.js` ist die UI-/Event-Schicht und speichert nur noch nach Datenänderungen.
- Die App bleibt statisch lauffähig und nutzt `localStorage` als Standard-Speicher.

## Umgesetzte Sanierung
- SKR03-nahe Seed-Konten mit eindeutigen Kontonummern angelegt.
- Steuerberechnung für netto/brutto sowie Umsatzsteuer/Vorsteuer in Kernlogik ausgelagert.
- Buchungssalden werden aus Buchungszeilen abgeleitet, nicht mehr nur aus einem Betrag.
- Lagerwirkung bei Buchungen ist explizit: kein Lager, Wareneingang oder Lagerabgang.
- Lagerabgänge werden gegen verfügbaren Bestand validiert.
- Verknüpfte Lagerbewegungen werden beim Speichern, Duplizieren und Löschen von Buchungen synchronisiert.
- Dynamische Tabellen werden über DOM-Knoten aufgebaut, nicht über ungeprüfte HTML-Strings.
- Import, Normalisierung und CSV-Export wurden robuster gemacht.
- `server.js` ist auf ES-Module umgestellt; Schreibzugriff auf `/api/data` ist standardmäßig deaktiviert.
- npm-Tooling mit Vite, Vitest und Playwright ist vorbereitet.

## Bekannte Einschränkungen
- Die App ist eine Lern-App, keine GoBD- oder revisionssichere Buchhaltung.
- Der Servermodus ist vorbereitet, aber die UI nutzt standardmäßig weiter `localStorage`.
- Die Steuerkonten sind didaktisch SKR03-nah, aber kein vollständiger Kontenrahmen.
- Automatisierte Tests können erst lokal laufen, wenn Node.js und npm installiert sind.

## Nächster sinnvoller Schritt
- Node.js installieren bzw. in den PATH aufnehmen.
- `npm install`, `npm test` und `npm run test:e2e` ausführen.
- Danach fachliche Detailfälle ergänzen, z. B. 7-%-Erlöse und Storno-Workflows.
