# LOOP_PROMPT — Iteration B: Kamera, OCR, Kalibrierung

Du arbeitest im Repo `archivar`. Iteration A hat die reine Logik geliefert (`@pesel512/archivar-core`, `@pesel512/archivar-scryfall`). Iteration B bringt sie an die Kamera: Kamerazugriff, OCR im Worker, die Scan-Schleife, die aufgeteilten Kalibrier-Bausteine und eine minimale App, mit der Pascal alles **am echten Gerät** testet (Webcam am Desktop und Handy).

Leitlinie aus den Tappd-Erfahrungen: **Die OCR-Genauigkeit hängt an der Pixeldichte in der Kartenecke — Auflösung und Zoom sind die Hebel, nicht Bildvorverarbeitung.** Der Kamerazoom zieht zur Bildmitte, nicht zur Kartenecke; die Lösung ist, die Halterung so auszurichten, dass die Ecke im Zentrum liegt.

## Arbeitsweise (verbindlich)

0. **Erster Lauf:** Existiert `.loop/STATE_B.md` noch nicht, beginne mit B0 und lege die Datei dort an (Blöcke B0–B9, Abschnitte „Offene Fragen“ und „Log“).
0b. **Wiederaufnahme:** Prüfe vor allem anderen `git status`. Gibt es uncommittete Änderungen, wurde ein Block unterbrochen. Ordne sie dem ersten offenen Block zu, prüfe sie auf Vollständigkeit und setze diesen Block fort — nicht verwerfen, nicht neu beginnen. Vermerke die Unterbrechung im Log.
1. Lies `CLAUDE.md`, `.loop/STATE_B.md` und — falls vorhanden — die Referenzdateien unter `docs/reference/tappd/`.
2. Bearbeite **genau einen** offenen Block — den ersten, der nicht abgehakt ist.
3. Nach dem Block: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` müssen grün sein.
4. Block abhaken, Kurzstatus und offene Fragen notieren.
5. **Commit und Push nach jedem Block.**
6. Dann **stoppen**.
7. Bei Unklarheiten nicht raten: Frage unter „Offene Fragen“ eintragen, konfigurierbare Annahme treffen, im Code mit `// VERIFY:` markieren.

## Referenz aus Tappd (optional, von Pascal bereitgestellt)

Liegen unter `docs/reference/tappd/` Dateien aus dem Tappd-Scanner (als `.txt`, damit sie nicht kompiliert werden), nutze sie als Quelle für **bewährte Details**: Kamera-Constraints, Zoom-Handhabung, Tesseract-Parameter, Stabilitätslogik. Übernimm **nicht** deren Struktur — `ScanCalibration.tsx` ist ein bekannter Monolith, genau den lösen wir hier auf. Weicht die Referenz von diesem Prompt ab, gilt dieser Prompt; notiere die Abweichung im Log.

## Scope

**Drin:** `packages/camera`, `packages/ocr-worker`, `packages/react`, `apps/standalone` (nur Kalibrierung und Debug-Scan), Geräte-Testprotokoll.
**Nicht drin:** Scan-Sessions und Persistenz der Sammlung, Foil-/Sprach-/Zustands-Dialoge, Tastenkürzel, CSV-Export aus der App (alles Iteration C), Set-Autocomplete, Set-Vorschlag, Set-Badge (Iteration D), Fallback über den Kartennamen (Iteration E), jede Tappd-Anbindung, Styling über das Nötigste hinaus.

## Paketgrenzen

| Paket | Name | darf nutzen | Tests |
|---|---|---|---|
| `packages/camera` | `@pesel512/archivar-camera` | DOM, `core` | reine Module (`roi`, `capabilities`, `calibration-schema`) |
| `packages/ocr-worker` | `@pesel512/archivar-ocr` | DOM, tesseract.js, `core` | reine Module (`whitelist`, `normalize`) |
| `packages/react` | `@pesel512/archivar-react` | React (peer), alle Pakete oben, `scryfall` | `scan-loop` mit Fakes |
| `apps/standalone` | — | alles | keine Unit-Tests, Gerätetest |

Browser-APIs dürfen nur in Modulen stehen, die ausdrücklich dafür vorgesehen sind (`stream.ts`, `frame-grab.ts`, `engine.ts`, Hooks, Komponenten). Reine Module importieren keine Browser-Module. Unit-Tests laufen in der Node-Umgebung von Vitest, **ohne jsdom**.

---

## B0 — Voraussetzungen prüfen

- In `.loop/STATE_A.md` sind A1–A11 abgehakt. Wenn nicht: **stoppen** und im Log von `STATE_B.md` vermerken, welcher Block fehlt.
- `ResolvedCard` enthält `finishes: Finish[]`; `getPhysicalSets` liefert ein Result. Wenn nicht: stoppen wie oben.
- `STATE_B.md` anlegen, `CLAUDE.md` um die Paketgrenzen-Tabelle oben ergänzen.

**Akzeptanz:** Voraussetzungen dokumentiert, keine Codeänderung außer `CLAUDE.md` und `STATE_B.md`.

## B1 — App-Gerüst `apps/standalone`

- `pnpm-workspace.yaml` um `apps/*` erweitern.
- Vite + React + TypeScript (`strict`), Tailwind CSS v4 mit Theme über `@theme` in CSS (kein `tailwind.config.ts`), eine schlichte `tokens.css` (Farben, Abstände, Fokusring). Der Scanner ist ein Arbeitsbereich: **nur Tokens, keine Ornamente.**
- Drei Ansichten über einen minimalen Hash-Router ohne zusätzliche Bibliothek: `#/` (Start mit Links), `#/calibrate`, `#/debug`.
- Vite-Dev-Server für Codespaces vorbereiten: `host: true`, fester Port, `strictPort: true`. HMR-Einstellungen für den weitergeleiteten HTTPS-Port als `// VERIFY:` markieren.
- Root-Skripte: `dev` startet die App; `build` baut auch die App; CI baut die App mit.
- README-Abschnitt „App auf dem Handy öffnen“: Port im Codespace weiterleiten, Sichtbarkeit für die Testdauer auf „Public“ stellen, danach zurück auf „Private“. Hinweis: `getUserMedia` benötigt HTTPS — die weitergeleitete Codespaces-Adresse erfüllt das.

**Akzeptanz:** `pnpm dev` zeigt die Startseite, die drei Routen sind erreichbar, `pnpm build` und CI grün.

## B2 — `camera`: reine Module

**`roi.ts`** — Region of Interest in **normierten Koordinaten** (0–1 relativ zum Videobild), damit Auflösungswechsel die Kalibrierung nicht zerstören.

```ts
interface NormalizedRoi { x: number; y: number; width: number; height: number }
function clampRoi(roi: NormalizedRoi, minSize?: number): NormalizedRoi;
function toPixelRect(roi: NormalizedRoi, videoWidth: number, videoHeight: number): { sx: number; sy: number; sw: number; sh: number }; // ganzzahlig, innerhalb des Bildes
function moveRoi(roi: NormalizedRoi, dx: number, dy: number): NormalizedRoi;
function resizeRoi(roi: NormalizedRoi, dw: number, dh: number, anchor: 'center' | 'top-left'): NormalizedRoi;
function effectivePixels(roi: NormalizedRoi, videoWidth: number, videoHeight: number): { width: number; height: number };
```

`effectivePixels` ist die zentrale Diagnosegröße: So viele echte Kamerapixel landen in der OCR.

**`capabilities.ts`** — übersetzt das Ergebnis von `track.getCapabilities()` / `getSettings()` in ein UI-Modell, ohne selbst Browser-APIs aufzurufen:

```ts
interface CameraFeatures {
  zoom: { min: number; max: number; step: number; current: number } | null;
  focusModes: string[];
  torch: boolean;
  actualResolution: { width: number; height: number };
  requestedResolution: { width: number; height: number };
  resolutionShortfall: boolean; // tatsächliche Breite < 90 % der angeforderten
}
function toCameraFeatures(caps: unknown, settings: unknown, requested: { width: number; height: number }): CameraFeatures;
```

Die Eingaben sind bewusst `unknown` und werden defensiv ausgewertet: Browser liefern unterschiedliche oder fehlende Felder.

**`calibration-schema.ts`** — Kalibrierung pro Gerät:

```ts
interface DeviceCalibration {
  schemaVersion: 1;
  deviceId: string;
  label: string;
  requestedResolution: { width: number; height: number };
  zoom: number | null;
  roi: NormalizedRoi;
  calibratedAt: string; // ISO
}
interface KeyValueStore { get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void }
function saveCalibration(store: KeyValueStore, cal: DeviceCalibration): void;
function loadCalibration(store: KeyValueStore, deviceId: string, label: string): DeviceCalibration | null;
```

- Schlüssel über `deviceId`. Findet sich keiner, Rückfall über `label` — Browser vergeben `deviceId`s nach dem Löschen von Website-Daten teils neu.
- Ungültige oder fremde Schemaversionen liefern `null`, werfen nie.

**Pflicht-Testfälle:** ROI wird an Bildränder geklemmt; Mindestgröße greift; `toPixelRect` bleibt bei Hoch- und Querformat innerhalb des Bildes; `effectivePixels` für 4K und für 720p; `toCameraFeatures` mit vollständigen Capabilities, ohne Zoom-Feld, mit Müll-Eingabe; `resolutionShortfall` bei 1920 statt 3840; Kalibrierung speichern und laden; Rückfall über `label`; kaputtes JSON → `null`; falsche Schemaversion → `null`.

## B3 — `camera`: Browser-Module

**`stream.ts`**

- `openCamera({ deviceId?, facingMode?, resolution })`: fordert standardmäßig 3840 × 2160 als `ideal` an, bevorzugt ohne `deviceId` die Rückkamera (`facingMode: 'environment'`).
- `listCameras()`: `enumerateDevices` — Labels sind erst nach erteilter Berechtigung gefüllt; das Ergebnis muss das kenntlich machen.
- `readFeatures(track, requested)`: ruft `getCapabilities`/`getSettings` nur auf, wenn vorhanden, und reicht das Ergebnis an `toCameraFeatures`.
- `applyZoom(track, value)` über `applyConstraints({ advanced: [{ zoom }] })`, nur wenn `features.zoom` existiert; liefert ein Result.
- `setContinuousFocus(track)`, falls unterstützt; stillschweigend überspringen sonst.
- `closeCamera(stream)`: stoppt **alle** Tracks.
- Fehler von `getUserMedia` werden auf ein Result abgebildet: `permission_denied`, `no_camera`, `in_use`, `insecure_context`, `unknown`.

**`frame-grab.ts`**

- `grabRoi(video, roi, target)`: zeichnet **nur den ROI-Ausschnitt** in voller Kameraauflösung per `drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)` in ein Canvas (bevorzugt `OffscreenCanvas`, sonst `HTMLCanvasElement`). Keine Skalierung nach unten, keine Filter.
- Gibt `null` zurück, solange `video.readyState` noch keine Bilddaten hat.

**Akzeptanz:** Typecheck grün, keine Browser-Referenz in den reinen Modulen aus B2, Exporte dokumentiert.

## B4 — `ocr-worker`

**`whitelist.ts`** (rein):

```ts
function buildWhitelist(fixedSet: string | null): string;
```

- Ohne Set: Ziffern, Großbuchstaben, Leerzeichen, `/`, sowie die Trennzeichen des Foil-Hinweises (`★ * • · .`).
- Mit Set: Ziffern, **nur die Buchstaben des Set-Codes**, Leerzeichen, `/`, die Seltenheitsbuchstaben aus `Rarity`, die Buchstaben der gedruckten Sprachcodes aus `LANGUAGE_CODE_TABLE` und die Trennzeichen.
- Zeichen dedupliziert, stabile Reihenfolge.
- `// VERIFY:` ob das englische Tesseract-Modell `★`, `•` und `·` überhaupt erkennen kann. Wenn nicht, ist der Foil-Hinweis in der Praxis immer `null` — das ist erlaubt, muss aber im Gerätetest festgehalten werden.

**`normalize.ts`** (rein): bereinigt Tesseract-Rohtext (Mehrfach-Leerzeichen, leere Zeilen, typische Artefakte wie `|` am Zeilenanfang), bevor `parseCorner` ihn bekommt. Keine inhaltlichen Korrekturen — die macht der Parser.

**`engine.ts`** (Browser):

```ts
interface OcrEngine {
  recognize(image: OffscreenCanvas | HTMLCanvasElement): Promise<{ text: string; confidence: number; durationMs: number }>;
  setWhitelist(fixedSet: string | null): Promise<void>;
  terminate(): Promise<void>;
}
function createOcrEngine(opts?: { langPath?: string }): Promise<OcrEngine>;
```

- tesseract.js mit Sprache `eng`; tesseract.js arbeitet selbst in einem Web Worker — kein zusätzlicher eigener Worker nötig. Die OCR darf den Hauptthread nicht blockieren.
- Page-Segmentation-Modus für einen kleinen Textblock wählen; gewählten Modus als `// VERIFY:` markieren.
- `setWhitelist` setzt `tessedit_char_whitelist` im laufenden Betrieb. Ein Aufruf während einer laufenden Erkennung wartet, bis diese fertig ist.
- `recognize` ist nicht nebenläufig: ein zweiter Aufruf während einer laufenden Erkennung wird abgewiesen (Rückdruck liegt in der Scan-Schleife, siehe B5).
- Trainingsdaten standardmäßig aus dem Standardpfad von tesseract.js; über `langPath` auf einen lokalen Pfad umstellbar. Offline-Fähigkeit als offene Frage notieren.

**Pflicht-Testfälle:** `buildWhitelist` ohne Set, mit `MOM`, mit `40K` (Ziffern im Code); keine doppelten Zeichen; Foil-Trennzeichen immer enthalten; `normalize` für leere Eingabe, Mehrfach-Leerzeichen, Artefakte.

## B5 — `react`: Scan-Schleife

**`scan-loop.ts`** — framework-unabhängiger Controller, vollständig mit Fakes testbar:

```ts
interface ScanLoopDeps {
  grab: () => OffscreenCanvas | HTMLCanvasElement | null;
  ocr: Pick<OcrEngine, 'recognize' | 'setWhitelist'>;
  lookup: (reading: CornerReading) => Promise<LookupResult>;
  config?: Partial<StabilityConfig>;
  now?: () => number;
  schedule?: (fn: () => void) => void; // Standard: requestAnimationFrame bzw. setTimeout
  onEvent: (e: ScanLoopEvent) => void;
}
type ScanLoopEvent =
  | { type: 'frame'; rawText: string; reading: CornerReading | null; state: ScanState; ocrMs: number }
  | { type: 'validated'; card: ResolvedCard; reading: CornerReading }
  | { type: 'validation_failed'; reason: string }
  | { type: 'rate'; ocrPerSecond: number };
interface ScanLoop {
  start(): void; stop(): void;
  confirm(): void; reject(): void;
  setFixedSet(code: string | null): Promise<void>;
  readonly running: boolean;
}
function createScanLoop(deps: ScanLoopDeps): ScanLoop;
```

Verhalten:

- **Rückdruck statt fester Bildrate:** Der nächste Frame wird erst gegriffen, wenn die vorherige Erkennung fertig ist. Die tatsächliche OCR-Rate wird gleitend gemessen und etwa jede Sekunde als `rate`-Event gemeldet — sie ist die Grundlage, um `requiredMatches`, `removalFrames` und `failedKeyCooldownFrames` am Gerät einzustellen.
- Pipeline je Frame: `grab` → `recognize` → `normalize` → `parseCorner` (mit `fixedSet`) → `FRAME`-Action an den Reducer aus `core`.
- Wechselt der Zustand nach `validating` (`enteredValidation`), wird `lookup` genau einmal aufgerufen; das Ergebnis wird als `VALIDATION_SUCCEEDED`/`VALIDATION_FAILED` zurückgespielt. Kommt ein Ergebnis an, nachdem die Schleife gestoppt oder das Set gewechselt wurde, wird es verworfen.
- `setFixedSet`: erst `ocr.setWhitelist`, dann `SET_CHANGED` an den Reducer — in dieser Reihenfolge, damit kein Frame mit alter Whitelist in den neuen Zustand läuft.
- `stop()` beendet die Schleife sauber; laufende Erkennungen werden abgewartet, ihr Ergebnis verworfen.
- Fehler in `grab`/`recognize` beenden die Schleife nicht; der Frame zählt als „nichts erkannt“.

**`use-camera.ts`**, **`use-scan-loop.ts`** — dünne Hooks um `stream.ts` und `createScanLoop`; beim Unmount werden Schleife gestoppt und alle Kamera-Tracks beendet.

**Pflicht-Testfälle (Fakes, Node-Umgebung):** drei gleiche Frames → genau ein `lookup`; `lookup` erfolgreich → `validated`-Event; `lookup` fehlgeschlagen → `validation_failed` und Cooldown aktiv; kein zweiter `grab`, solange `recognize` läuft; `setFixedSet` ruft `setWhitelist` vor dem Reset; verspätetes `lookup`-Ergebnis nach `stop()` wird verworfen; verspätetes Ergebnis nach Set-Wechsel wird verworfen; Fehler in `recognize` stoppt die Schleife nicht; `rate` wird aus den gemessenen Dauern korrekt berechnet.

## B6 — `react`: Kalibrier-Bausteine (Aufteilung von ScanCalibration)

Die Komponenten sind **ungestylt** bis auf das funktional Nötige. Sie nehmen `className` entgegen und setzen `data-*`-Attribute für Zustände, damit die Standalone-App und später Tappd (Planar) sie jeweils selbst gestalten. Jede Komponente bleibt klein; Logik gehört in Hooks oder reine Module.

- **`CameraPreview`** — Videoelement plus ROI-Rahmen als Overlay. Die Overlay-Position wird aus dem normierten ROI und der tatsächlich dargestellten Videogröße berechnet (`object-fit` beachten).
- **`ResolutionBadge`** — angefordert gegenüber tatsächlich, Warnzustand bei `resolutionShortfall`, dazu `effectivePixels` des ROI.
- **`ZoomControl`** — Schieberegler nur, wenn `features.zoom` existiert; sonst nichts rendern.
- **`RoiEditor`** — ROI verschieben und skalieren per Zeiger (Maus und Touch über Pointer Events) und per Pfeiltasten (mit Umschalt: größer/kleiner). Bedienbar mit Tastatur, sichtbarer Fokus.
- **`OcrDebugPanel`** — Rohtext, normalisierter Text, geparstes Reading, Reducer-Zustand, Trefferzähler, OCR-Dauer, OCR-Rate, letztes Scryfall-Ergebnis inklusive `finishes` und `languageFallback`.
- **`CalibrationWizard`** — führt durch die Schritte aus B7 und speichert über `saveCalibration`.

**Akzeptanz:** Typecheck grün; keine Komponente über ca. 200 Zeilen; keine Geschäftslogik in Komponenten.

## B7 — App-Ansichten

**`#/calibrate`** — Wizard in Schritten, jeder Schritt mit einem kurzen, konkreten Hinweistext:

1. **Kamera wählen** — Liste der Kameras; vorher Berechtigung anfordern, damit Labels sichtbar sind. Klare Meldungen für jeden Fehlerfall aus B3 (`insecure_context` mit Hinweis auf HTTPS).
2. **Auflösung prüfen** — `ResolutionBadge`; bei Unterschreitung Hinweis, dass die Kamera weniger liefert als angefordert.
3. **Zoom** — `ZoomControl`, falls verfügbar; sonst Hinweis, dass die Pixeldichte nur über den Abstand zur Karte gesteuert werden kann.
4. **Halterung ausrichten** — Hinweis: „Der Zoom zieht zur Bildmitte. Richte Halterung und Karte so aus, dass die Ecke unten links mit Sammlernummer und Set-Code in der Bildmitte liegt.“
5. **Ausschnitt festlegen** — `RoiEditor` mit Live-Anzeige von `effectivePixels`.
6. **Probescan** — Scan-Schleife läuft, `OcrDebugPanel` sichtbar; Erfolg, sobald eine Karte validiert wurde.
7. **Speichern** — Kalibrierung für dieses Gerät in `localStorage` (über `KeyValueStore`).

Beim nächsten Aufruf lädt die App eine vorhandene Kalibrierung und bietet „Neu kalibrieren“ an.

**`#/debug`** — Dauerbetrieb zum Testen:

- Kamera mit gespeicherter Kalibrierung; ohne Kalibrierung Verweis auf `#/calibrate`.
- `OcrDebugPanel` dauerhaft sichtbar.
- Einfaches Textfeld „Set fixieren“ (nur Debug, kein Autocomplete) — ruft `setFixedSet` auf, um Whitelist-Wechsel und Reset zu testen.
- Knöpfe „Bestätigen“ und „Verwerfen“ für den `confirming`-Zustand.
- Liste der in dieser Sitzung validierten Karten, nur im Speicher, mit Uhrzeit. Kein Export, keine Persistenz.
- Beim Verlassen der Ansicht Schleife stoppen und Kamera freigeben.

**Akzeptanz:** beide Ansichten laufen im Desktop-Browser mit Webcam (soweit im Codespace prüfbar: Build und Start fehlerfrei); keine Konsolenfehler beim Start.

## B8 — Gerätetest vorbereiten

- `.loop/DEVICE_TEST_B.md` anlegen: Protokoll zum Ausfüllen durch Pascal, getrennt für **Desktop-Webcam** und **Handy**. Je Gerät: Gerätename, Browser, angeforderte/tatsächliche Auflösung, Zoom verfügbar (ja/nein, Bereich), gemessene OCR-Rate, `effectivePixels` nach Kalibrierung.
- Prüfpunkte je Gerät (jeweils OK / Problem / Beobachtung):
  1. Kamera startet, Fehlermeldungen verständlich (einmal Berechtigung verweigern).
  2. Auflösung wird korrekt angezeigt.
  3. Zoom-Regler erscheint nur bei Unterstützung und wirkt.
  4. ROI lässt sich mit Maus/Touch und Tastatur einstellen.
  5. Kalibrierung überlebt ein Neuladen der Seite.
  6. Probescan: moderne Karte wird erkannt, richtige Druckversion.
  7. Karte liegen lassen → keine zweite Erkennung.
  8. Karte weg und wieder hin → zweite Erkennung.
  9. Zweite Karte direkt auflegen → wird erkannt.
  10. Set fixieren → Zustand springt zurück, Erkennung funktioniert weiter.
  11. UI bleibt während der OCR flüssig.
  12. Ansicht verlassen → Kamera-Kontrollleuchte geht aus.
  13. Zeit von Auflegen bis Validierung (geschätzt, in Sekunden).
- Beobachtungsfelder für die offenen Annahmen: gedruckte Sprachcodes und Trennzeichen an den Karten des Prüfstapels (Rohtext aus dem Debug-Panel übernehmen), wird `★`/`•` von der OCR gelesen, gewählter Page-Segmentation-Modus brauchbar, HMR über den weitergeleiteten Port funktioniert.
- README-Abschnitt aus B1 prüfen und um „Gerätetest durchführen“ ergänzen.
- **Nach diesem Block stoppen und im Log vermerken: „Warte auf Gerätetest durch Pascal.“**

## B9 — Auswertung und Abschluss

**Nur ausführen, wenn `DEVICE_TEST_B.md` ausgefüllt ist.** Sonst stoppen und darauf hinweisen.

- Ergebnisse auswerten. Für jeden Prüfpunkt mit „Problem“: Ursache im Log festhalten; kleine Korrekturen direkt umsetzen, größere als Nacharbeits-Block B10 ff. in `STATE_B.md` anlegen statt sie in B9 zu erledigen.
- Standardwerte der `StabilityConfig` anhand der gemessenen OCR-Raten beider Geräte festlegen: Ziel ist eine Validierung nach etwa einer Sekunde stabiler Erkennung, ein Entfernen-Fenster von etwa 1,5 Sekunden und ein Cooldown von etwa 10 Sekunden. Umrechnung und gewählte Werte in `ITERATION_B.md` dokumentieren.
- `VERIFY`-Stellen aktualisieren: bestätigte Annahmen in erklärende Kommentare umwandeln, widerlegte korrigieren (z. B. `LANGUAGE_CODE_TABLE`, Foil-Trennzeichen), unklare stehen lassen.
- `ITERATION_B.md`: was gebaut wurde, Geräteergebnisse in Kurzform, gewählte Standardwerte, verbleibende `// VERIFY:`-Stellen mit Datei und Zeile, offene Punkte für Iteration C.
- Eintrag in `IMPROVEMENT_LOG.md`.

**Akzeptanz Iteration B gesamt:**

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` grün, CI grün
- [ ] Reine Module in `camera` und `ocr-worker` sowie `scan-loop` vollständig getestet, ohne jsdom
- [ ] Keine Browser-API in reinen Modulen
- [ ] Alle Pflicht-Testfälle aus B2, B4 und B5 vorhanden
- [ ] `ScanCalibration`-Aufgaben auf die Bausteine aus B6 verteilt, keine Komponente über ca. 200 Zeilen
- [ ] Gerätetest für Desktop-Webcam und Handy durchgeführt und ausgewertet
- [ ] Stabilitäts-Standardwerte aus gemessenen OCR-Raten abgeleitet
- [ ] Verbleibende Annahmen mit `// VERIFY:` markiert und in `ITERATION_B.md` gelistet