# STATE — Iteration B

Fortschritt der Loop-Blöcke aus `LOOP_PROMPT_B.md`. Ein Block pro Lauf, danach Commit+Push und Stopp.

## Blöcke

- [x] B0 — Voraussetzungen prüfen
- [x] B1 — App-Gerüst `apps/standalone`
- [x] B2 — `camera`: reine Module
- [x] B3 — `camera`: Browser-Module
- [x] B4 — `ocr-worker`
- [x] B5 — `react`: Scan-Schleife
- [x] B6 — `react`: Kalibrier-Bausteine
- [ ] B7 — App-Ansichten
- [ ] B8 — Gerätetest vorbereiten
- [ ] B9 — Auswertung und Abschluss

## Offene Fragen

- `apps/standalone/vite.config.ts`, `server`: HMR-Verhalten über den von Codespaces
  weitergeleiteten HTTPS-Port ungeprüft. Falls WebSocket-Updates dort nicht ankommen, braucht
  `hmr` vermutlich `clientPort: 443` bzw. `protocol: 'wss'`. Am Gerätetest (B8) mitprüfen.
  `// VERIFY:` im Code.
- `packages/camera/src/roi.ts`, `DEFAULT_MIN_ROI_SIZE = 0.1`: Standard-Mindestgröße für den ROI
  frei gewählt (10 % der Bildbreite/-höhe), keine Vorgabe aus der Spezifikation. Am Gerätetest
  prüfen, ob ein näher an die Kartenecke gezoomter (kleinerer) ROI für die OCR-Genauigkeit
  trotzdem nötig ist. `// VERIFY:` im Code.
- `packages/camera/src/capabilities.ts`, `RESOLUTION_SHORTFALL_RATIO = 0.9`: Schwelle aus dem
  Prompt übernommen, nicht am echten Gerät verifiziert. `// VERIFY:` im Code.
- `packages/camera/src/calibration-schema.ts`, `STORAGE_PREFIX`: Speicherschlüssel-Präfix frei
  gewählt, keine Vorgabe aus der Spezifikation. `// VERIFY:` im Code.
- `packages/camera/src/stream.ts`, `mapGetUserMediaError`: Zuordnung der `getUserMedia`-
  Fehlernamen (`NotAllowedError`, `NotFoundError`, `OverconstrainedError`, `NotReadableError`,
  `TrackStartError`, `AbortError`, `SecurityError`) zu unseren fünf Reason-Codes ist aus der
  MDN-/Spec-Dokumentation abgeleitet, nicht an echten Browsern (v. a. mobil) verifiziert. Am
  Gerätetest (B8) mitprüfen, insbesondere die einmal geforderte Berechtigungsverweigerung.
  `// VERIFY:` im Code.
- `packages/ocr-worker/src/whitelist.ts`, `FOIL_SEPARATORS = '★*•·.'`: ob das englische
  Tesseract-Modell `★`, `•` und `·` überhaupt erkennen kann, ist ungeprüft. Wenn nicht, ist der
  Foil-Hinweis in der Praxis immer `null`. Am Gerätetest (B8) mit Foil-Karten des Prüfstapels
  festhalten. `// VERIFY:` im Code.
- `packages/ocr-worker/src/engine.ts`, `tessedit_pageseg_mode: PSM.SINGLE_BLOCK`: aus der
  Tappd-Referenz übernommen (dort real getestet gegenüber `AUTO`/`SPARSE_TEXT`), aber am
  eigenen Bildausschnitt noch nicht selbst verifiziert. Am Gerätetest (B8) mitprüfen.
  `// VERIFY:` im Code.
- `packages/ocr-worker/package.json`: `tesseract.js`-Postinstall-Skript
  (`opencollective-postinstall`) über `pnpm approve-builds` freigegeben — geprüft, es zeigt
  nur einen Spendenhinweis, führt keine Netzwerk-/Dateisystemänderung mit Bezug zum Projekt
  aus. In `pnpm-workspace.yaml` unter `allowBuilds` vermerkt.
- `packages/react/src/components/RoiEditor.tsx`, `DEFAULT_STEP = 0.02`: Schrittweite der
  Pfeiltasten-Bedienung (2 % der Bildbreite/-höhe je Druck) frei gewählt, keine Vorgabe aus der
  Spezifikation. Am Gerätetest (B8) prüfen, ob sie für eine Feinjustierung der ROI-Ecke
  praktikabel ist. `// VERIFY:` im Code fehlt hier bewusst nicht — die Datei markiert die
  Konstante stattdessen über einen erklärenden Kommentar plus diesen Log-Eintrag, da es sich um
  einen UI-Tuning-Wert und keine fachliche Annahme handelt.
- `packages/react/src/components/CalibrationWizard.tsx`, `DEFAULT_ROI`: Start-ROI nach der
  Kamerawahl liegt zentriert (`x/y: 0.35`, `width/height: 0.3`), nicht am Rand wie ein
  generischer Default — Begründung: Nach der Halterungs-Ausrichtung in Schritt 4 liegt die
  Kartenecke laut Prompt bildmittig, da der Zoom zur Mitte zieht. Am Gerätetest verifizieren,
  ob diese Annahme für beide Testgeräte (Desktop-Webcam, Handy-Halterung) zutrifft.

## Log

- 2026-09-17: B0 abgeschlossen — Voraussetzungen geprüft, keine Codeänderung außer `CLAUDE.md`
  und dieser Datei.
  - `.loop/STATE_A.md`: A1–A11 alle abgehakt.
  - `packages/core/src/types.ts:37` — `ResolvedCard.finishes: Finish[]` vorhanden.
  - `packages/scryfall/src/client.ts` — `getPhysicalSets` liefert `Promise<SetsResult>`
    (`types.ts`, `SetsResult` importiert), kein leeres Array im Fehlerfall.
  - `docs/reference/tappd/` vorhanden mit neun `.txt`-Referenzdateien (u. a.
    `ScanCalibration.tsx.txt`, `TesseractOcrProvider.ts.txt`, `scan-loop-tracking.ts.txt`) —
    als Quelle für bewährte Details in B2–B7 nutzbar, Struktur wird nicht übernommen.
  - `CLAUDE.md` um die Paketgrenzen-Tabelle aus `LOOP_PROMPT_B.md` (Iteration B) ergänzt.
  - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` grün (keine funktionale
    Änderung, nur Dokumentation).
- 2026-09-17: B1 abgeschlossen — `apps/standalone` angelegt.
  - `pnpm-workspace.yaml` um `apps/*` erweitert.
  - Vite 8 + React 19 + TypeScript `strict` (eigenes `tsconfig.json`, `lib` mit `DOM`,
    `jsx: react-jsx`, `types: ["vite/client"]`), Tailwind CSS v4 über `@tailwindcss/vite` und
    `src/tokens.css` (`@import 'tailwindcss'` + `@theme`-Block: `bg`, `bg-elevated`, `fg`,
    `fg-muted`, `accent`, `border`, `danger`, `focus-ring` — nur Tokens, kein zusätzliches
    Styling).
  - Minimaler Hash-Router ohne Bibliothek (`src/router.ts`, `useHashRoute`): drei Routen
    `#/` (`StartView`, Links zu den anderen beiden), `#/calibrate` und `#/debug`
    (Platzhalter-Views, Inhalt folgt in B6/B7).
  - `vite.config.ts`: `server.host: true`, `port: 5173`, `strictPort: true` für den
    Codespaces-Zugriff. `// VERIFY:` ob `hmr.clientPort`/`protocol` für den weitergeleiteten
    HTTPS-Port zusätzlich nötig sind — noch nicht am echten Forward geprüft.
  - Root-`package.json`: neues Skript `dev` (startet die App); `build` deckt die App bereits
    über `pnpm -r run build` ab, da `apps/*` jetzt im Workspace ist.
  - `.github/workflows/ci.yml`: neuer Schritt „Build" (`pnpm build`) nach den Tests, baut die
    App mit.
  - `README.md`: `apps/standalone` in der Paketübersicht, neuer Abschnitt „App auf dem Handy
    öffnen" (Port-Weiterleitung auf Public während des Tests, danach zurück auf Private;
    Hinweis auf HTTPS-Anforderung von `getUserMedia`).
  - Manuell geprüft: `pnpm dev` startet den Vite-Dev-Server, `curl` auf `/` liefert die
    `index.html` mit eingebundenem `main.tsx`; `pnpm build` erzeugt `apps/standalone/dist`
    inkl. CSS-Bundle (Tailwind aktiv). Die drei Routen sind rein clientseitig (Hash-Router);
    Erreichbarkeit von `#/calibrate` und `#/debug` durch Code-Review bestätigt (kein
    Browser-Test möglich in dieser Umgebung ohne Display).
  - Vorbestehende Prettier-Formatierungsabweichungen in 17 Dateien (u. a. `README.md`,
    `pnpm-workspace.yaml`, mehrere `core`/`scryfall`-Quelldateien) sind unabhängig von diesem
    Block — per Vergleich vor/nach der Änderung verifiziert (`git stash` + `pnpm
    format:check`, identische Liste). `pnpm format:check` ist kein Teil des vom Loop-Prompt
    geforderten Gates (`lint`/`typecheck`/`test`/`build`) und wird hier nicht behoben.
  - Keine offenen Fragen außer der HMR-`// VERIFY:`-Stelle in `vite.config.ts`.
- 2026-09-17: B2 abgeschlossen — `packages/camera` mit den drei reinen Modulen angelegt.
  - `roi.ts`: `NormalizedRoi`, `clampRoi` (Mindestgröße konfigurierbar, Default 10 %),
    `toPixelRect` (ganzzahlig, bleibt bei Hoch- und Querformat innerhalb des Bildes durch
    Klemmen von `sw`/`sh` an `videoWidth - sx` bzw. `videoHeight - sy`), `moveRoi` (klemmt
    Position, ändert Größe nicht), `resizeRoi` (Anker `center`/`top-left`, klemmt Größe auf
    `[0,1]` und Position auf den Bildrand), `effectivePixels` (nutzt `toPixelRect` intern).
  - `capabilities.ts`: `toCameraFeatures` wertet `caps`/`settings` als `unknown` defensiv aus
    (kein Werfen bei Müll-Eingaben wie `string`/`number`/`null`), Zoom nur übernommen, wenn
    `min`/`max`/`step` alle Zahlen sind, `resolutionShortfall` bei tatsächlicher Breite < 90 %
    der angeforderten.
  - `calibration-schema.ts`: `saveCalibration` schreibt dieselbe Kalibrierung unter einem
    `deviceId`- und einem `label`-Schlüssel (kein zusätzlicher Index nötig); `loadCalibration`
    versucht zuerst `deviceId`, dann `label`. Kaputtes JSON und falsche/fehlende Felder liefern
    `null`, werfen nie.
  - Alle Pflicht-Testfälle aus B2 abgedeckt (Klemmen an den Bildrand, Mindestgröße,
    Hoch-/Querformat, 4K/720p, vollständige/fehlende/Müll-Capabilities, Shortfall bei 1920 statt
    3840, Speichern/Laden, Label-Fallback, kaputtes JSON, falsche Schemaversion) plus
    Zusatztests für `moveRoi`/`resizeRoi` und defensive Randfälle. 28 neue Tests, 100 %
    Statements/Branches/Functions/Lines für alle drei Module (separat per
    `vitest run --coverage` mit auf `packages/camera` eingeschränktem `include` geprüft — die
    reguläre Coverage-Schwelle in `vitest.config.ts` gilt weiterhin nur für `core`).
  - `grep` auf `document|window\.|navigator|localStorage|HTMLElement|MediaStream` in
    `packages/camera/src/*.ts` (ohne Testdateien) liefert keine Treffer — keine Browser-API in
    den reinen Modulen, obwohl `tsconfig.json` bereits `DOM`-Typen für die Browser-Module aus
    B3 bereithält.
  - Drei neue `// VERIFY:`-Stellen (Mindestgröße, Shortfall-Schwelle, Storage-Präfix) unter
    „Offene Fragen“ ergänzt.
  - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` grün (170 Tests, +28 gegenüber
    B1).
- 2026-09-17: B3 abgeschlossen — `packages/camera` um die beiden Browser-Module ergänzt. Keine
  Unit-Tests (laut Paketgrenzen-Tabelle nur für die reinen Module aus B2 vorgesehen); Prüfung
  am echten Gerät folgt in B8.
  - `stream.ts` — Exporte:
    - `openCamera(options?)`: fordert per `getUserMedia` standardmäßig 3840 × 2160 (`ideal`)
      an; ohne `deviceId` `facingMode: { ideal: 'environment' }` (per `options.facingMode`
      überschreibbar), mit `deviceId` wird `facingMode` ignoriert. Fehlt
      `navigator.mediaDevices.getUserMedia` (unsicherer Kontext oder zu alter Browser), liefert
      sofort `{ ok: false, reason: 'insecure_context' }` ohne Aufruf. Sonst Fehler von
      `getUserMedia` über `mapGetUserMediaError` auf die fünf Reason-Codes abgebildet.
    - `listCameras()`: `enumerateDevices`, gefiltert auf `videoinput`; `labelsAvailable: true`
      nur, wenn mindestens ein Label nicht leer ist (Signal für erteilte Berechtigung).
    - `readFeatures(track, requested)`: ruft `getCapabilities`/`getSettings` nur auf, wenn als
      Funktion vorhanden, reicht das Ergebnis unverändert an `toCameraFeatures` aus B2 weiter.
    - `applyZoom(track, value)`: prüft zuerst, ob `getCapabilities().zoom` existiert (sonst
      `{ ok: false, reason: 'not_supported' }`), sonst `applyConstraints({ advanced: [{ zoom
      }] })`, Fehler dabei → `{ ok: false, reason: 'unknown' }`.
    - `setContinuousFocus(track)`: nur falls `'continuous'` in `getCapabilities().focusMode`
      enthalten ist; jeder Fehlschlag (nicht unterstützt oder von `applyConstraints`
      abgelehnt) wird stillschweigend geschluckt, wie in der Spezifikation gefordert.
    - `closeCamera(stream)`: stoppt alle Tracks aus `stream.getTracks()`, nicht nur den
      Video-Track.
  - `frame-grab.ts` — Export `grabRoi(video, roi, target?)`: liefert `null`, solange
    `video.readyState < HAVE_CURRENT_DATA` (Wert 2, kein eigener Zugriff auf die
    Instanz-Konstante nötig); berechnet den Pixelausschnitt über `toPixelRect` aus B2 und
    zeichnet ihn unskaliert per `drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)` in ein
    wiederverwendbares `target`-Canvas oder ein neu erzeugtes (bevorzugt `OffscreenCanvas`,
    sonst `HTMLCanvasElement`) — keine Herunterskalierung, keine Filter.
  - `index.ts` re-exportiert beide neuen Module.
  - Verifiziert: `grep` auf Browser-Bezeichner in `roi.ts`/`capabilities.ts`/
    `calibration-schema.ts` weiterhin ohne Treffer — die reinen Module aus B2 sind unverändert.
  - Eine neue `// VERIFY:`-Stelle (Fehler-Mapping in `mapGetUserMediaError`) unter „Offene
    Fragen“ ergänzt.
  - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` grün (170 Tests, unverändert
    gegenüber B2, da B3 keine eigenen Tests hat).
- 2026-09-17: B4 abgeschlossen — `packages/ocr-worker` mit den beiden reinen Modulen und dem
  Browser-Modul angelegt.
  - `whitelist.ts` — `buildWhitelist(fixedSet)`: ohne Set Ziffern + alle Großbuchstaben +
    Leerzeichen + `/` + Foil-Trennzeichen (`★ * • · .`); mit Set nur die Buchstaben dieses
    Set-Codes (Ziffern im Code wie bei `40K` werden herausgefiltert, da Ziffern ohnehin
    enthalten sind) statt aller Großbuchstaben, dazu die Rarity-Buchstaben (aus dem `Rarity`-
    Typ dupliziert — `corner-parser.ts` exportiert die zugehörige Konstante nicht) und die
    Sprachcode-Buchstaben aus `LANGUAGE_CODE_TABLE` (aus `core` importiert). Zeichen über
    `Set` dedupliziert, stabile Reihenfolge (Ziffern, Buchstaben, Leerzeichen, `/`,
    Trennzeichen).
  - `normalize.ts` — `normalize(rawText)`: pro Zeile führendes `|`-Artefakt entfernen, trimmen,
    Mehrfach-Leerzeichen/-Tabs auf eins reduzieren, leere Zeilen verwerfen, mit `\n`
    zusammenfügen. Keine inhaltliche Korrektur (macht `parseCorner`).
  - `engine.ts` (Browser, laut Tappd-Referenz `TesseractOcrProvider.ts`, aber ohne deren
    Zwei-Modus-Aufteilung — hier reicht `buildWhitelist(fixedSet)` direkt aus B2/core):
    `createOcrEngine(opts?)` erstellt genau einen `tesseract.js`-Worker mit Sprache `eng`
    (lädt nur ~2 MB Trainingsdaten, die Kartensprache kommt aus dem Sprachcode im Aufdruck,
    nicht aus der OCR-Sprache) und `PSM.SINGLE_BLOCK`. `recognize`: zweiter Aufruf während
    laufender Erkennung wird sofort (synchron, vor jedem `await`) abgewiesen
    (`Promise.reject`), kein Queueing — Rückdruck liegt laut Prompt in der Scan-Schleife
    (B5). `setWhitelist`: über eine interne Operationswarteschlange (`createQueue`) an
    laufende Erkennung angehängt, wartet also, statt parallel auf den Worker zuzugreifen —
    setzt in dieser Reihenfolge zuerst `tessedit_char_whitelist`, der Reducer-Reset
    (`SET_CHANGED`) folgt erst in B5. `terminate` beendet den Worker.
  - `index.ts` re-exportiert alle drei Module.
  - `tesseract.js` als Abhängigkeit hinzugefügt; dessen harmloses Postinstall-Skript
    (Spendenhinweis) per `pnpm approve-builds tesseract.js` freigegeben, siehe „Offene
    Fragen“.
  - Alle Pflicht-Testfälle aus B4 abgedeckt (`buildWhitelist` ohne Set/mit `MOM`/mit `40K`,
    keine doppelten Zeichen, Foil-Trennzeichen immer enthalten; `normalize` für leere
    Eingabe, Mehrfach-Leerzeichen, Artefakte) plus Zusatztests (Groß-/Kleinschreibung des
    fixen Sets, mehrere `|` hintereinander, reine Leerzeilen). 12 neue Tests, 100 %
    Statements/Branches/Functions/Lines für `whitelist.ts`/`normalize.ts` (separat per
    `vitest run --coverage` mit auf diese beiden Dateien eingeschränktem `include` geprüft).
  - `grep` auf Browser-Bezeichner in `whitelist.ts`/`normalize.ts` liefert keine Treffer.
  - Zwei neue `// VERIFY:`-Stellen (Foil-Symbole erkennbar, PSM-Modus) unter „Offene Fragen“
    ergänzt.
  - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` grün (182 Tests, +12 gegenüber
    B3).
- 2026-09-17: B5 abgeschlossen — `packages/react` mit `scan-loop.ts` (framework-unabhängig,
  vollständig mit Fakes testbar) und zwei dünnen Hooks (`use-camera.ts`, `use-scan-loop.ts`)
  angelegt.
  - `scan-loop.ts` — `createScanLoop(deps)`: Rückdruck-Schleife über `deps.schedule` (Default
    `requestAnimationFrame`, sonst `setTimeout`), die den nächsten Frame erst greift, nachdem
    `ocr.recognize` der vorherigen Erkennung fertig ist (kein eigener Nebenläufigkeitsschutz
    nötig, folgt allein aus dem `await`-Ablauf in `tick()`). Pipeline je Frame: `grab` →
    `ocr.recognize` → `normalize` (aus `ocr-worker`) → `parseCorner` (mit `machine.fixedSet`,
    aus `core`) → `FRAME`-Action an `scanReducer`, danach `frame`-Event mit Reducer-Zustand.
    OCR-Rate über ein gleitendes 10-Werte-Fenster der gemessenen Dauern, gemeldet höchstens
    einmal pro Sekunde (`RATE_WINDOW`/`RATE_REPORT_INTERVAL_MS`, frei gewählt, keine Vorgabe
    aus der Spezifikation).
  - Validierung: Beim Übergang in `validating` (`enteredValidation` aus `core`) wird `lookup`
    genau einmal aufgerufen. Eine `generation`-Zählvariable (erhöht in `stop()` und
    `setFixedSet()`) verwirft verspätete `lookup`-Ergebnisse nach Stopp oder Set-Wechsel, statt
    sie noch auf den (dann bereits veränderten) Reducer anzuwenden. Wirft `lookup` selbst
    (statt eines `LookupResult` mit `ok: false`), wird das wie `VALIDATION_FAILED` mit
    `reason: 'unknown'` behandelt — Netzwerkfehler o. Ä., die nicht über den Result-Typ
    abgebildet sind, sollen die Schleife trotzdem nicht anhalten.
  - `setFixedSet(code)`: erst `ocr.setWhitelist(code)` abwarten, danach `SET_CHANGED` an den
    Reducer — per Test belegt (Frame während offenem `setWhitelist` bleibt `partial`, danach
    sofort `full` mit dem neuen `fixedSet`), nicht nur per Kommentar behauptet.
  - Fehler in `grab` (try/catch um den synchronen Aufruf) und in `recognize` (try/catch um den
    `await`) beenden die Schleife nicht; der Frame läuft mit leerem Text weiter (→ `reading:
    null`).
  - `confirm()`/`reject()` reichen `USER_CONFIRMED`/`USER_REJECTED` direkt an den Reducer
    durch; der neue Zustand zeigt sich im nächsten `frame`-Event.
  - `use-camera.ts`: hält den zuletzt geöffneten `MediaStream`/`Track` in einem Ref, `status`
    (`idle`/`opening`/`ready`/`error`) und `features` (aus `readFeatures`) im State;
    `applyZoom` aktualisiert `features` bei Erfolg neu. Kein eigener Nebenläufigkeitsschutz für
    parallele `open()`-Aufrufe — nicht gefordert, `CalibrationWizard` (B6) ruft `open()`
    sequenziell je Schritt auf.
  - `use-scan-loop.ts`: erstellt `createScanLoop` einmalig (lazy, per Ref), verteilt Events in
    React-State (`state` aus `frame`, `ocrPerSecond` aus `rate`, `lastEvent` für alles). Optionen
    (`grab`/`ocr`/`lookup`/`config`) werden über ein Ref aktuell gehalten, damit sich die
    Schleife bei Re-Renders nicht neu aufbaut.
  - Beide Hooks stoppen beim Unmount die Schleife bzw. schließen die Kamera (alle Tracks über
    `closeCamera`) — per `useEffect`-Cleanup, kein Test (Browser-Hooks, laut Paketgrenzen-
    Tabelle nur `scan-loop` mit Fakes getestet).
  - **Root-Skripte `typecheck`/`build` korrigiert:** `react` importiert zur Laufzeit *und* für
    Typen aus `core`, `camera`, `ocr-worker`, `scryfall` — die bisherige Reihenfolge (nur
    `core` vorab bauen, siehe B0–B4) reichte nicht mehr; ein `rm -rf packages/*/dist && pnpm
    typecheck` schlug mit `TS2307: Cannot find module '@pesel512/archivar-camera'` etc. fehl,
    weil `camera`/`ocr-worker`/`scryfall` beim reinen `typecheck`-Skript (`tsc --noEmit`, kein
    `tsup`) kein `dist/` erzeugen. `typecheck`/`build` in `package.json` bauen jetzt erst alle
    `packages/*` (`pnpm --filter './packages/**' run build`), bevor sie rekursiv laufen —
    reproduzierbar mit sauberem `dist/` verifiziert. `CLAUDE.md` entsprechend präzisiert
    (Regel zu `import type` gilt nur für reine Typ-Importe, Laufzeit-Importe zwischen Paketen
    sind erlaubt, wo tatsächlich Verhalten gebraucht wird).
  - Alle Pflicht-Testfälle aus B5 abgedeckt (drei gleiche Frames → ein `lookup`; erfolgreicher
    `lookup` → `validated`; fehlgeschlagener `lookup` → `validation_failed` + aktiver Cooldown;
    kein zweiter `grab` während laufender Erkennung; `setFixedSet` ruft `setWhitelist` vor dem
    Reset; verspätetes Ergebnis nach `stop()` verworfen; verspätetes Ergebnis nach Set-Wechsel
    verworfen; Fehler in `recognize` stoppt nicht; Rate korrekt berechnet) plus ein Zusatztest
    für `confirm()`. 10 neue Tests in `packages/react/src/scan-loop.test.ts`, Node-Umgebung ohne
    jsdom, alle Browser-/Netzwerk-Abhängigkeiten (`grab`, `ocr`, `lookup`, `schedule`, `now`)
    als Fakes injiziert.
  - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` grün, jeweils einmal zusätzlich mit
    zuvor gelöschtem `packages/*/dist` gegengeprüft (192 Tests, +10 gegenüber B4).
- 2026-09-17: B6 abgeschlossen — `packages/react` um sechs Kalibrier-Bausteine
  (`CameraPreview`, `ResolutionBadge`, `ZoomControl`, `RoiEditor`, `OcrDebugPanel`,
  `CalibrationWizard`) plus einen unterstützenden Hook (`use-video-rect.ts`) ergänzt. Keine
  neuen Unit-Tests (laut Paketgrenzen-Tabelle für `react` nur `scan-loop` mit Fakes getestet;
  Komponenten sind Browser-Module).
  - `use-video-rect.ts`: reine Funktion `computeContainRect` (Geometrie für
    `object-fit: contain`) plus Hook `useVideoRect(containerRef, videoRef)` (ResizeObserver +
    `loadedmetadata`/`resize`-Listener). Von `CameraPreview` und `RoiEditor` genutzt, damit
    beide dieselbe Overlay-Positionierung berechnen, ohne die Logik zu duplizieren.
  - `CameraPreview`: Video (`object-fit: contain` — bewusst gewählt, damit beim Kalibrieren nie
    ein Teil des Bildes durch Beschnitt verdeckt wird) plus optionaler passiver ROI-Rahmen.
    Nimmt einen optionalen externen `videoRef` entgegen, damit `CalibrationWizard` im
    Probescan-Schritt direkt auf das Videoelement zugreifen kann (`grabRoi`).
  - `ResolutionBadge`: angefordert/tatsächlich, `data-resolution-shortfall`-Attribut,
    optionale `effectivePixels`-Anzeige.
  - `ZoomControl`: rendert `null`, wenn `features.zoom` fehlt (kein leeres Element).
  - `RoiEditor`: eigenes Video+Overlay (statt `CameraPreview` zu verschachteln, siehe Log-Notiz
    unten) mit Pointer-Events für Verschieben (Overlay-Körper) und Skalieren (Resize-Handle,
    Anker `top-left`) sowie Pfeiltasten (mit Umschalt: Größe statt Position, Anker `center`) —
    fokussierbar (`role="slider"`, `tabIndex={0}`, `aria-valuenow`). Nutzt `moveRoi`/`resizeRoi`
    aus `camera` (B2), keine eigene Klemm-Logik.
  - `OcrDebugPanel`: reine Anzeigekomponente, alle Werte (inkl. normalisierter Text) werden vom
    Aufrufer übergeben statt selbst berechnet.
  - `CalibrationWizard`: sieben Schritte als lokaler `step`-State (1–7), orchestriert
    `useCamera`/`useScanLoop` und die fünf anderen Bausteine, speichert in Schritt 7 über
    `saveCalibration`. Schritt 6 (Probescan) ist in eine eigene interne Komponente
    `ProbeScanStep` ausgelagert, die mit dem Schritt mountet/unmountet — Grund: die
    zugrunde liegende Schleife aus `use-scan-loop.ts` (B5) übernimmt ihre `ocr`-Abhängigkeit
    nur einmal bei der ersten `start()` (anders als `grab`/`lookup`, die dynamisch über ein Ref
    aufgelöst werden); ein einmal erstellter Hook-Aufruf könnte die tesseract.js-Engine später
    nicht mehr austauschen. Per Mount/Unmount bekommt jeder Eintritt in Schritt 6 eine frische
    `useScanLoop`-Instanz und damit eine frische Engine. `CalibrationWizardProps.createOcr`
    dokumentiert per Kommentar, dass diese Funktion referenzstabil sein muss (sonst startet
    `ProbeScanStep` bei jedem Re-Render eine neue Engine) — relevant für die Verdrahtung in B7.
  - **Bugfix in `use-camera.ts` (aus B5):** `open()` schloss einen zuvor geöffneten Stream
    nicht, bevor ein neuer geöffnet wurde — beim Kamerawechsel im Wizard (Schritt 1 öffnet
    zunächst die Standardkamera für die Berechtigungsabfrage, danach wählt der Nutzer explizit
    eine Kamera aus der Liste) wäre die alte Kontrollleuchte an geblieben und der Track nie
    gestoppt worden. Behoben: `open()` schließt `streamRef.current`, falls vorhanden, bevor es
    `openCamera()` erneut aufruft.
  - Kein `RoiEditor`-Reuse von `CameraPreview`: ein Versuch, `RoiEditor` als Verschachtelung von
    `CameraPreview` zu bauen (interaktives Overlay als Geschwisterelement daneben), scheiterte
    an der CSS-Positionierung (`position: absolute` des interaktiven Overlays hätte sich auf
    den falschen Vorfahren bezogen, sobald die `className` eigenes Padding/Border mitbringt).
    `RoiEditor` rendert Video und Overlay deshalb selbst (kleine, bewusste Duplikation von
    ca. 10 Zeilen Video-Markup statt einer fragilen Ref-Verschachtelung).
  - Zwei neue Konstanten unter „Offene Fragen“ dokumentiert (`RoiEditor`-Schrittweite,
    `CalibrationWizard`-Default-ROI).
  - `pnpm lint && pnpm typecheck && pnpm test && pnpm build` grün (192 Tests, unverändert
    gegenüber B5 — B6 hat laut Paketgrenzen-Tabelle keine eigenen Tests).
