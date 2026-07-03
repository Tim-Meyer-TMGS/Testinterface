# Projektstand

## App-Übersicht
- Name: Übungsbuchhaltung.
- Zweck: Browserbasierte Lern- und Übungs-App für Buchhaltung, Zahlungen und Lager in verschiedenen Praxisvorlagen.
- Zielgruppe: Einsteiger ohne Buchführungsvorwissen, die typische Praxisvorgänge schrittweise nachvollziehen und üben wollen.
- Plattform: Statische Web-App für GitHub Pages; keine Backend-Pflicht.
- Speicher: Standardmäßig `localStorage` im Browser, zusätzlich JSON-Export und JSON-Import.
- Startmodus: Standardmäßig werden Beispieldaten geladen; alternativ gibt es einen leeren Übungsmodus zum vollständigen Selbstaufbau.
- Beispieldaten: Rund zwei Monate Zahnarztpraxisbetrieb im Mai/Juni 2026 mit Behandlungshonoraren, KZV-Abschlägen, Privatforderungen, Prophylaxeverkäufen, Materialeinkäufen, Labor, Miete und Praxissoftware.
- Vorlagen: Zahnarztpraxis, Hausarztpraxis und Physiotherapie können in den Einstellungen geladen werden.
- Fachlicher Rahmen: Praxisnaher Übungskontenplan mit sichtbaren Buchführungsbegriffen, aber einsteigerfreundlichen Bezeichnungen wie Zielkonto, Gegenkonto, Einnahme, Ausgabe und offene Rechnung.
- Lager: Praxislager für Hygiene-, Behandlungs- und Prophylaxeartikel mit Material rein/raus, Bestandsprüfung und Nachbestellhinweisen.
- Änderungsprotokoll: Kontobezogene Änderungen an Vorgängen, Zahlungen, Bereichen und Systemaktionen werden nachvollziehbar angezeigt.
- Import/Export: JSON für vollständige Datensicherung, CSV für Journal und Lagerbestand.
- Tests: Node-basierte Unit- und Browser-Tests laufen über GitHub Actions.

## Hauptbereiche
- Dashboard: Aufgeräumter Einstieg mit Gesamt-Saldo, vier Kernzahlen, aktuell geladener Vorlage, letzten Vorgängen und Materialhinweisen.
- Konten: Bereiche und Salden mit Kontonummern, vereinfachten Typen und einer kontobezogenen Änderungsliste.
- Buchungen: Erfassung, Bearbeitung, Duplizierung und Löschung von Praxisvorgängen inklusive Steuer- und Lagerwirkung.
- Zahlungen: Schnellerfassung von Einzahlungen, Abbuchungen und Umbuchungen.
- Lager: Artikelverwaltung, Lagerbewegungen, Bestandskorrekturen, Verbrauch und Nachbestellung.
- Globale Details: Buchungen, Bereiche, Zahlungen, Artikel und Materialbewegungen öffnen eine zentrale Detailansicht als Modal, ohne die Hauptansicht zu verlassen.
- Export / Import: JSON- und CSV-Ausgabe sowie JSON-Wiederherstellung.
- Einstellungen: Wechsel in den leeren Übungsmodus, Auswahl aus drei Vorlagen, Daten zurücksetzen und globales Änderungsprotokoll einsehen.

## Architektur
- `index.html`: Minimaler Vue-Mount für die statische GitHub-Pages-App.
- `style.css`: Eigenes dezentes Praxis-Design für Karten, Timelines, Panels und Formulare.
- `src/main.js`: Vue-Einstiegspunkt.
- `src/App.vue`: Hauptlayout, Navigation, Views, Formulare und tabellenarme Oberfläche.
- `src/appStore.js`: Vue-State-Schicht mit Laden, Speichern, Commit, Audit, Import und Export.
- `src/components/DetailModal.vue`: Zentrale Detailansicht für Vorgänge, Bereiche, Zahlungen, Material und Protokoll.
- `src/accounting.js`: Steuerberechnung, Buchungszeilen und Kontensalden.
- `src/inventory.js`: Lagerbestände, Bestandsprüfung und Synchronisierung verknüpfter Lagerbewegungen.
- `src/audit.js`: Hilfslogik für kontobezogene Protokolleinträge und kompakte Vorher/Nachher-Snapshots.
- `src/state.js`: State-Erzeugung, Normalisierung, IDs und Importvalidierung.
- `src/storage.js`: LocalStorage-Adapter und vorbereiteter Server-Adapter.
- `data/app-data.json`: leere Grundvorlage ohne Konten, Vorgänge und Lagerdaten.
- `data/templates/*.json`: fachliche Quellvorlagen für Zahnarztpraxis, Hausarztpraxis und Physiotherapie.
- `public/data/app-data.json`: leere Laufzeit-Grundvorlage für den Vite/GitHub-Pages-Build.
- `public/data/templates/*.json`: Laufzeitdaten für die auswählbaren Vorlagen im Vite/GitHub-Pages-Build.
- `.github/workflows/test.yml`: CI-Tests in GitHub Actions.
- `.github/workflows/pages.yml`: Baut die Vue-App und veröffentlicht `dist` über GitHub Pages mit den aktuellen Pages-Actions für Node 24.
- `vitest.config.js`: grenzt Unit-Tests auf `tests/**/*.test.js` ein, damit Playwright-Specs nicht von Vitest eingesammelt werden.

## Status
- Die Anwendung ist auf Vue 3 mit Vite migriert.
- Fachlogik liegt in `src/` und ist ohne DOM testbar.
- Die alte Vanilla-UI wird nicht mehr aus `index.html` geladen; die UI läuft über Vue-Komponenten.
- Die App bleibt statisch lauffähig und nutzt `localStorage` als Standard-Speicher.
- Leere oder durch frühere Ladefehler entstandene Browserstände werden beim Start automatisch durch die Beispieldaten ersetzt.
- Der leere Übungsmodus ist davon ausgenommen und bleibt beim Neustart leer, bis Nutzer eigene Daten anlegen oder Beispieldaten laden.
- GitHub Pages muss die per Actions gebaute Vite-Ausgabe aus `dist` veröffentlichen, nicht mehr den Repo-Root.

## Umgesetzte Sanierung
- SKR03-nahe Seed-Konten mit eindeutigen Kontonummern angelegt und auf Zahnarztpraxisbetrieb erweitert.
- Beispieldaten bilden rund zwei Monate Praxisbetrieb im Mai/Juni 2026 ab: Behandlungshonorare, KZV-Abschläge, Privatforderungen, Prophylaxeverkäufe, Materialeinkäufe, Labor, Miete und Praxissoftware.
- Die Seed-Daten enthalten keine Beispielbuchungen aus der Zukunft; spätester Beispielvorgang ist der 30.06.2026.
- Das Design ist freundlicher und thematisch auf Zahnarztpraxis, Hygiene und Praxislager ausgerichtet.
- Die Oberfläche wurde für Anfänger vereinfacht: Vorgänge statt abstrakter Buchungen, Zielkonto/Gegenkonto statt isoliertem Soll/Haben, Material rein/raus statt Wareneingang/Lagerabgang.
- Die App-Titel sind vorlagenneutral; die aktuell geladene Vorlage wird im Header als Kontext angezeigt.
- `Vorgänge` sind vollständige Geschäftsfälle mit optionaler Steuer- und Lagerwirkung; `Zahlungen` sind eine vereinfachte Schnellerfassung für reine Geldbewegungen und offene Posten.
- Das Dashboard wurde als Startansicht aufgeräumt und zeigt einen vereinfachten Gesamt-Saldo: Kasse + Bank + offene Ausgangsrechnungen + Materialwert minus offene Lieferantenrechnungen.
- Die Oberfläche wurde als Vue-App neu aufgebaut und ersetzt endlose Tabellen im Hauptfluss durch Karten, Timelines, Aktivitätslisten und Detailpanels.
- Leerer Übungsmodus ergänzt: Nutzer können alle Bereiche/Konten, Vorgänge, Artikel und Bewegungen selbst anlegen; Standardkonten werden dann nicht automatisch ergänzt.
- Vorlagensystem ergänzt: Zahnarztpraxis, Hausarztpraxis und Physiotherapie laden jeweils eigene Konten, Vorgänge, Artikel und Lagerbewegungen.
- Datenablage bereinigt: Die leere Grundvorlage liegt in `app-data.json`; alle fachlichen Beispieldaten liegen vollständig unter `templates/`.
- Vorgänge werden über ein vereinfachtes Formular mit Vorgangstypen wie Einnahme, Ausgabe, Materialeinkauf, Prophylaxeverkauf und Umbuchung erfasst.
- Globale Detailansichten wurden als ein zentrales Modal umgesetzt; verknüpfte Datensätze können innerhalb des Modals weiter geöffnet werden.
- Vorgänge öffnen nach dem Speichern kein automatisches Detail-Modal mehr; die UI zeigt nur eine Statusmeldung und lässt Nutzer im Arbeitsfluss.
- Mobile Layout-Regeln wurden nachgeschärft: Karten, Formulare, Statuschips, Modals und Aktionsbuttons umbrechen auf kleinen Viewports sauberer.
- Kontobezogenes Änderungsprotokoll umgesetzt: Vorgänge, Zahlungen, Bereichsänderungen, Import, Reset und Beispieldatenladen erzeugen lesbare Protokolleinträge.
- Konto-Modal, Bereichsdetails und Einstellungen zeigen Protokolleinträge; Einträge öffnen ein Detail-Modal mit betroffenen Bereichen sowie Vorher/Nachher-Daten.
- Steuerberechnung für netto/brutto sowie Umsatzsteuer/Vorsteuer in Kernlogik ausgelagert.
- Buchungssalden werden aus Buchungszeilen abgeleitet, nicht mehr nur aus einem Betrag.
- Lagerwirkung bei Vorgängen ist explizit: kein Lager, Material kommt rein oder Material geht raus.
- Lagerabgänge werden gegen verfügbaren Bestand validiert.
- Verknüpfte Lagerbewegungen werden beim Speichern, Duplizieren und Löschen von Buchungen synchronisiert.
- Dynamische Tabellen werden über DOM-Knoten aufgebaut, nicht über ungeprüfte HTML-Strings.
- Import, Normalisierung und CSV-Export wurden robuster gemacht.
- `server.js` ist auf ES-Module umgestellt; Schreibzugriff auf `/api/data` ist standardmäßig deaktiviert.
- npm-Tooling mit Vite, Vue, Vitest und Playwright ist vorbereitet.
- GitHub Actions führt die Node-basierten Tests mit Node 24 aus, weil lokal kein Node.js installiert werden kann.
- Der Pages-Deploy-Workflow nutzt `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5` und `actions/deploy-pages@v5`; laufende Deployments werden nicht mehr durch neue Pushes automatisch abgebrochen.

## Bekannte Einschränkungen
- Die App ist eine Lern-App, keine GoBD- oder revisionssichere Buchhaltung.
- Der Servermodus ist vorbereitet, aber die UI nutzt standardmäßig weiter `localStorage`.
- Die Konten sind didaktisch SKR03-nah, aber bewusst als vereinfachter Übungskontenplan benannt und kein vollständiger Kontenrahmen.
- Automatisierte Tests laufen nicht lokal, sondern über GitHub Actions nach Push/PR.

## Nächster sinnvoller Schritt
- Änderungen pushen und den Workflow `Test` in GitHub Actions prüfen.
- Falls CI fehlschlägt, die Logs auswerten und gezielt nachbessern.
- Danach GitHub Pages öffnen und den manuellen Akzeptanztest aus `TESTPLAN.md` durchführen.
