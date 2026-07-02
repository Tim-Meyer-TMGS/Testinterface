# Architekturentscheidungen

## Buchhaltungsumfang
- Die Anwendung bleibt eine Lern- und Übungsbuchhaltung.
- Keine GoBD-, Audit- oder Revisionssicherheit.
- Buchungen dürfen im Lernmodus bearbeitet und gelöscht werden.

## Kontenrahmen
- Die Seed-Daten sind SKR03-nah.
- Es wird kein vollständiger SKR03-Kontenrahmen abgebildet.
- Wichtige Standardkonten sind eindeutig vorhanden: Kasse, Bank, Forderungen, Verbindlichkeiten, Vorsteuer, Umsatzsteuer, Eigenkapital, Wareneingang, Erlöse.

## Speicherung
- `localStorage` bleibt der Standard.
- Der optionale Servermodus ist vorbereitet, aber nicht automatisch aktiv.
- Schreibzugriff auf `/api/data` muss explizit mit `ALLOW_DATA_WRITE=true` erlaubt werden.

## Tooling
- Das Projekt nutzt ES-Module.
- Vite dient als Devserver.
- Vitest testet die fachliche Kernlogik.
- Playwright testet zentrale Browser-Workflows.

## UI-Sicherheit
- User- und Importdaten dürfen nicht ungeprüft per `innerHTML` gerendert werden.
- Dynamische Inhalte werden mit DOM-Knoten und `textContent` aufgebaut.
