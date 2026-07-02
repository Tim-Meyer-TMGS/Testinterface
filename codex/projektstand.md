# Projektstand

## App-Übersicht
- Name: Praxisbuchhaltung.
- Zweck: Browserbasierte Lern- und Übungs-App für Buchhaltung, Zahlungen und Lager einer Zahnarztpraxis.
- Zielgruppe: Einsteiger ohne Buchführungsvorwissen, die typische Praxisvorgänge schrittweise nachvollziehen und üben wollen.
- Plattform: Statische Web-App für GitHub Pages; keine Backend-Pflicht.
- Speicher: Standardmäßig `localStorage` im Browser, zusätzlich JSON-Export und JSON-Import.
- Beispieldaten: Rund zwei Monate Zahnarztpraxisbetrieb mit Behandlungshonoraren, KZV-Abschlägen, Privatforderungen, Prophylaxeverkäufen, Materialeinkäufen, Labor, Miete und Praxissoftware.
- Fachlicher Rahmen: Praxisnaher Übungskontenplan mit sichtbaren Buchführungsbegriffen, aber einsteigerfreundlichen Bezeichnungen wie Zielkonto, Gegenkonto, Einnahme, Ausgabe und offene Rechnung.
- Lager: Praxislager für Hygiene-, Behandlungs- und Prophylaxeartikel mit Material rein/raus, Bestandsprüfung und Nachbestellhinweisen.
- Import/Export: JSON für vollständige Datensicherung, CSV für Journal und Lagerbestand.
- Tests: Node-basierte Unit- und Browser-Tests laufen über GitHub Actions.

## Hauptbereiche
- Dashboard: Überblick über Kasse, Bank, Forderungen, Verbindlichkeiten, Lagerwert, Buchungshistorie und Bestände.
- Konten: Bereiche und Salden mit Kontonummern, aber vereinfachten Typen wie Geld/Bestand, Einnahme, Ausgabe und offene Rechnung.
- Buchungen: Erfassung, Bearbeitung, Duplizierung und Löschung von Praxisvorgängen inklusive Steuer- und Lagerwirkung.
- Zahlungen: Schnellerfassung von Einzahlungen, Abbuchungen und Umbuchungen.
- Lager: Artikelverwaltung, Lagerbewegungen, Bestandskorrekturen, Verbrauch und Nachbestellung.
- Export / Import: JSON- und CSV-Ausgabe sowie JSON-Wiederherstellung.
- Einstellungen: Daten zurücksetzen und Beispieldaten neu laden.

## Architektur
- `index.html`: Statische Oberfläche und Formular-/Tabellenstruktur.
- `style.css`: Zahnarztpraxis-Design mit freundlicher Mint-/Teal-Farbwelt.
- `app.js`: UI- und Event-Schicht; rendert DOM sicher ohne ungeprüftes `innerHTML`.
- `src/accounting.js`: Steuerberechnung, Buchungszeilen und Kontensalden.
- `src/inventory.js`: Lagerbestände, Bestandsprüfung und Synchronisierung verknüpfter Lagerbewegungen.
- `src/state.js`: State-Erzeugung, Normalisierung, IDs und Importvalidierung.
- `src/storage.js`: LocalStorage-Adapter und vorbereiteter Server-Adapter.
- `data/app-data.json`: Seed-Daten für das Praxisbeispiel.
- `.github/workflows/test.yml`: CI-Tests in GitHub Actions.
- `vitest.config.js`: grenzt Unit-Tests auf `tests/**/*.test.js` ein, damit Playwright-Specs nicht von Vitest eingesammelt werden.

## Status
- Die Anwendung ist zu einer modularen Vanilla-JS-App umgebaut.
- Fachlogik liegt in `src/` und ist ohne DOM testbar.
- `app.js` ist die UI-/Event-Schicht und speichert nur noch nach Datenänderungen.
- Die App bleibt statisch lauffähig und nutzt `localStorage` als Standard-Speicher.

## Umgesetzte Sanierung
- SKR03-nahe Seed-Konten mit eindeutigen Kontonummern angelegt und auf Zahnarztpraxisbetrieb erweitert.
- Beispieldaten bilden rund zwei Monate Praxisbetrieb ab: Behandlungshonorare, KZV-Abschläge, Privatforderungen, Prophylaxeverkäufe, Materialeinkäufe, Labor, Miete und Praxissoftware.
- Das Design ist freundlicher und thematisch auf Zahnarztpraxis, Hygiene und Praxislager ausgerichtet.
- Die Oberfläche wurde für Anfänger vereinfacht: Vorgänge statt abstrakter Buchungen, Zielkonto/Gegenkonto statt isoliertem Soll/Haben, Material rein/raus statt Wareneingang/Lagerabgang.
- Steuerberechnung für netto/brutto sowie Umsatzsteuer/Vorsteuer in Kernlogik ausgelagert.
- Buchungssalden werden aus Buchungszeilen abgeleitet, nicht mehr nur aus einem Betrag.
- Lagerwirkung bei Vorgängen ist explizit: kein Lager, Material kommt rein oder Material geht raus.
- Lagerabgänge werden gegen verfügbaren Bestand validiert.
- Verknüpfte Lagerbewegungen werden beim Speichern, Duplizieren und Löschen von Buchungen synchronisiert.
- Dynamische Tabellen werden über DOM-Knoten aufgebaut, nicht über ungeprüfte HTML-Strings.
- Import, Normalisierung und CSV-Export wurden robuster gemacht.
- `server.js` ist auf ES-Module umgestellt; Schreibzugriff auf `/api/data` ist standardmäßig deaktiviert.
- npm-Tooling mit Vite, Vitest und Playwright ist vorbereitet.
- GitHub Actions führt die Node-basierten Tests mit Node 24 aus, weil lokal kein Node.js installiert werden kann.

## Bekannte Einschränkungen
- Die App ist eine Lern-App, keine GoBD- oder revisionssichere Buchhaltung.
- Der Servermodus ist vorbereitet, aber die UI nutzt standardmäßig weiter `localStorage`.
- Die Konten sind didaktisch SKR03-nah, aber bewusst als vereinfachter Übungskontenplan benannt und kein vollständiger Kontenrahmen.
- Automatisierte Tests laufen nicht lokal, sondern über GitHub Actions nach Push/PR.

## Nächster sinnvoller Schritt
- Änderungen pushen und den Workflow `Test` in GitHub Actions prüfen.
- Falls CI fehlschlägt, die Logs auswerten und gezielt nachbessern.
- Danach GitHub Pages öffnen und den manuellen Akzeptanztest aus `TESTPLAN.md` durchführen.
