# Testplan

## Buchung
1. Konto Bank und Konto Erlöse vorhanden.
2. Buchung erstellen: Bank an Erlöse, 100 €.
3. Bank-Saldo muss 100 € sein.
4. Erlöse-Saldo muss 100 € sein.

## Abbuchung
1. Abbuchung von Bank für Aufwand, 25 €.
2. Bank-Saldo sinkt.
3. Aufwandskonto steigt.

## Umbuchung
1. Umbuchung von Kasse zu Bank, 50 €.
2. Kasse sinkt um 50 €.
3. Bank steigt um 50 €.

## Lagerzugang
1. Artikel mit Anfangsbestand 10 und Einkaufspreis 5 € anlegen.
2. Zugang 5 Stück buchen.
3. Bestand muss 15 sein.
4. Lagerwert muss 75 € sein.

## Lagerabgang
1. Abgang 3 Stück buchen.
2. Bestand muss 12 sein.
3. Lagerwert muss 60 € sein.

## Import / Export
1. Daten exportieren.
2. Daten zurücksetzen.
3. Exportierte Datei importieren.
4. Alle Buchungen, Konten und Artikel müssen wieder vorhanden sein.
