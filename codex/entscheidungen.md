# Architekturentscheidungen

## Buchhaltungsumfang
- Die Anwendung bleibt eine Lern- und Übungsbuchhaltung.
- Keine GoBD-, Audit- oder Revisionssicherheit.
- Buchungen dürfen im Lernmodus bearbeitet und gelöscht werden.

## Kontenrahmen
- Die Seed-Daten sind SKR03-nah.
- Es wird kein vollständiger SKR03-Kontenrahmen abgebildet.
- Wichtige Standardbereiche sind eindeutig vorhanden: Kasse, Bank, offene Patientenrechnungen, offene Lieferantenrechnungen, Vorsteuer, Umsatzsteuer, Eigenkapital, Praxislager, Ausgaben und Einnahmen.

## Einsteiger-Sprache
- Die Oberfläche nutzt Praxisbegriffe zuerst: Vorgang, Zielkonto, Gegenkonto, Einnahme, Ausgabe, offene Rechnung, Material rein und Material raus.
- Soll/Haben bleiben in Details sichtbar, damit die Lern-App fachlich anschlussfähig bleibt.

## Speicherung
- `localStorage` bleibt der Standard.
- Der optionale Servermodus ist vorbereitet, aber nicht automatisch aktiv.
- Schreibzugriff auf `/api/data` muss explizit mit `ALLOW_DATA_WRITE=true` erlaubt werden.

## Tooling
- Das Projekt nutzt ES-Module.
- Vite dient als Devserver und Build-Tool.
- Die UI wird mit Vue 3 umgesetzt.
- Es wird kein externes UI-Kit verwendet; Karten, Timelines und Panels werden mit eigenem CSS gestaltet.
- Pinia und Vue Router werden vorerst nicht eingeführt; ein einfacher Vue-Store und interner View-State reichen für die statische Lern-App.
- Vitest testet die fachliche Kernlogik.
- Playwright testet zentrale Browser-Workflows.

## UI-Sicherheit
- User- und Importdaten dürfen nicht ungeprüft per `innerHTML` gerendert werden.
- Dynamische Inhalte werden über Vue-Templates und Textbindungen gerendert.
