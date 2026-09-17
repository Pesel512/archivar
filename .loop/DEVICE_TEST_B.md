# Gerätetest — Iteration B

Protokoll zum Ausfüllen durch Pascal, getrennt für **Desktop-Webcam** und **Handy**. Bitte
Rohtext-Ausschnitte wörtlich aus dem `OcrDebugPanel` (`#/debug`) übernehmen, nicht umschreiben —
das ist die Grundlage für die Auswertung in B9 (u. a. `LANGUAGE_CODE_TABLE`, Foil-Trennzeichen).

Ablauf je Gerät: `#/calibrate` durchlaufen (Kamera wählen → Auflösung → Zoom → Halterung
ausrichten → ROI festlegen → Probescan → Speichern), danach die Prüfpunkte unten auf `#/debug`
durchgehen.

## Gerät 1 — Desktop-Webcam

**Kenndaten**

| Feld | Wert |
|---|---|
| Gerätename / Modell | |
| Browser (Name + Version) | |
| Betriebssystem | |
| Angeforderte Auflösung | |
| Tatsächliche Auflösung (aus `ResolutionBadge`) | |
| Zoom verfügbar? (ja/nein) | |
| Zoom-Bereich (min–max, falls ja) | |
| Gemessene OCR-Rate (`rate`-Event, ca. Bilder/s) | |
| `effectivePixels` nach Kalibrierung (Breite × Höhe) | |

**Prüfpunkte**

| # | Prüfpunkt | OK / Problem | Beobachtung |
|---|---|---|---|
| 1 | Kamera startet, Fehlermeldungen verständlich (einmal Berechtigung verweigern) | | |
| 2 | Auflösung wird korrekt angezeigt | | |
| 3 | Zoom-Regler erscheint nur bei Unterstützung und wirkt | | |
| 4 | ROI lässt sich mit Maus/Touch und Tastatur einstellen | | |
| 5 | Kalibrierung überlebt ein Neuladen der Seite | | |
| 6 | Probescan: moderne Karte wird erkannt, richtige Druckversion | | |
| 7 | Karte liegen lassen → keine zweite Erkennung | | |
| 8 | Karte weg und wieder hin → zweite Erkennung | | |
| 9 | Zweite Karte direkt auflegen → wird erkannt | | |
| 10 | Set fixieren → Zustand springt zurück, Erkennung funktioniert weiter | | |
| 11 | UI bleibt während der OCR flüssig | | |
| 12 | Ansicht verlassen → Kamera-Kontrollleuchte geht aus | | |
| 13 | Zeit von Auflegen bis Validierung (geschätzt, in Sekunden) | | |

**Offene Annahmen — Beobachtungen**

- Gedruckte Sprachcodes und Trennzeichen an den Karten des Prüfstapels (Rohtext aus dem
  Debug-Panel, mehrere Beispiele falls unterschiedlich):
- Wird `★`/`•`/`·` von der OCR gelesen (Rohtext-Beispiel mit Foil-Karte)?
- Ist der gewählte Page-Segmentation-Modus (`PSM.SINGLE_BLOCK`) brauchbar, oder wirkt der
  Rohtext bei stabilem Bild trotzdem zerstückelt/leer?
- Funktioniert HMR (`pnpm dev`) über den weitergeleiteten Codespaces-Port (Änderung an einer
  `.tsx`-Datei sollte ohne manuelles Neuladen ankommen)?

## Gerät 2 — Handy

**Kenndaten**

| Feld | Wert |
|---|---|
| Gerätename / Modell | |
| Browser (Name + Version) | |
| Betriebssystem | |
| Angeforderte Auflösung | |
| Tatsächliche Auflösung (aus `ResolutionBadge`) | |
| Zoom verfügbar? (ja/nein) | |
| Zoom-Bereich (min–max, falls ja) | |
| Gemessene OCR-Rate (`rate`-Event, ca. Bilder/s) | |
| `effectivePixels` nach Kalibrierung (Breite × Höhe) | |

**Prüfpunkte**

| # | Prüfpunkt | OK / Problem | Beobachtung |
|---|---|---|---|
| 1 | Kamera startet, Fehlermeldungen verständlich (einmal Berechtigung verweigern) | | |
| 2 | Auflösung wird korrekt angezeigt | | |
| 3 | Zoom-Regler erscheint nur bei Unterstützung und wirkt | | |
| 4 | ROI lässt sich mit Maus/Touch und Tastatur einstellen | | |
| 5 | Kalibrierung überlebt ein Neuladen der Seite | | |
| 6 | Probescan: moderne Karte wird erkannt, richtige Druckversion | | |
| 7 | Karte liegen lassen → keine zweite Erkennung | | |
| 8 | Karte weg und wieder hin → zweite Erkennung | | |
| 9 | Zweite Karte direkt auflegen → wird erkannt | | |
| 10 | Set fixieren → Zustand springt zurück, Erkennung funktioniert weiter | | |
| 11 | UI bleibt während der OCR flüssig | | |
| 12 | Ansicht verlassen → Kamera-Kontrollleuchte geht aus | | |
| 13 | Zeit von Auflegen bis Validierung (geschätzt, in Sekunden) | | |

**Offene Annahmen — Beobachtungen**

- Gedruckte Sprachcodes und Trennzeichen an den Karten des Prüfstapels (Rohtext aus dem
  Debug-Panel, mehrere Beispiele falls unterschiedlich):
- Wird `★`/`•`/`·` von der OCR gelesen (Rohtext-Beispiel mit Foil-Karte)?
- Ist der gewählte Page-Segmentation-Modus (`PSM.SINGLE_BLOCK`) brauchbar, oder wirkt der
  Rohtext bei stabilem Bild trotzdem zerstückelt/leer?
- Funktioniert HMR (`pnpm dev`) über den weitergeleiteten Codespaces-Port (Änderung an einer
  `.tsx`-Datei sollte ohne manuelles Neuladen ankommen)?

## Freitext

Alles, was oben nicht passt (Abstürze, unerwartetes Verhalten, Ideen für B9/Iteration C) hier
notieren:

