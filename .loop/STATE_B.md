# STATE — Iteration B

Fortschritt der Loop-Blöcke aus `LOOP_PROMPT_B.md`. Ein Block pro Lauf, danach Commit+Push und Stopp.

## Blöcke

- [x] B0 — Voraussetzungen prüfen
- [x] B1 — App-Gerüst `apps/standalone`
- [ ] B2 — `camera`: reine Module
- [ ] B3 — `camera`: Browser-Module
- [ ] B4 — `ocr-worker`
- [ ] B5 — `react`: Scan-Schleife
- [ ] B6 — `react`: Kalibrier-Bausteine
- [ ] B7 — App-Ansichten
- [ ] B8 — Gerätetest vorbereiten
- [ ] B9 — Auswertung und Abschluss

## Offene Fragen

- `apps/standalone/vite.config.ts`, `server`: HMR-Verhalten über den von Codespaces
  weitergeleiteten HTTPS-Port ungeprüft. Falls WebSocket-Updates dort nicht ankommen, braucht
  `hmr` vermutlich `clientPort: 443` bzw. `protocol: 'wss'`. Am Gerätetest (B8) mitprüfen.
  `// VERIFY:` im Code.

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
