# archivar — Konventionen

Monorepo für einen Kartenscanner (Magic: The Gathering). pnpm-Workspace, TypeScript `strict`.

## Paketgrenzen

- `packages/core` — reine Domänenlogik. **Keine Browser-APIs, kein DOM.** Erzwungen durch
  `packages/core/tsconfig.json` (`lib` ohne `"DOM"`). Keine Netzwerkaufrufe, keine Timer, keine
  Seiteneffekte. Reine Funktionen und Reducer.
- `packages/scryfall` — Scryfall-API-Client. Netzwerk nur über injizierten `fetch`, niemals global
  referenziert.
- `packages/camera`, `packages/ocr-worker`, `packages/react`, `apps/standalone` — Iteration B,
  dort Browser-/Hardware-Zugriff. Der Kalibrier-/Debug-Scan-Anteil wird zusätzlich am echten
  Gerät geprüft, nicht nur per Unit-Test.

| Paket | Name | darf nutzen | Tests |
|---|---|---|---|
| `packages/camera` | `@pesel512/archivar-camera` | DOM, `core` | reine Module (`roi`, `capabilities`, `calibration-schema`) |
| `packages/ocr-worker` | `@pesel512/archivar-ocr` | DOM, tesseract.js, `core` | reine Module (`whitelist`, `normalize`) |
| `packages/react` | `@pesel512/archivar-react` | React (peer), alle Pakete oben, `scryfall` | `scan-loop` mit Fakes |
| `apps/standalone` | — | alles | keine Unit-Tests, Gerätetest |

Browser-APIs dürfen nur in Modulen stehen, die ausdrücklich dafür vorgesehen sind (`stream.ts`,
`frame-grab.ts`, `engine.ts`, Hooks, Komponenten). Reine Module importieren keine
Browser-Module. Unit-Tests laufen in der Node-Umgebung von Vitest, ohne jsdom.

## Regeln

- **`fetch` immer injizieren.** Kein Modul importiert oder referenziert globales `fetch`,
  `document`, `window` o. Ä. direkt aus `core` oder `scryfall`. Clients bekommen `fetch` (und bei
  Bedarf `now`/`sleep`) als Option übergeben — testbar ohne echten Netzwerkzugriff.
- **Result-Typen statt Exceptions** für erwartbare Fehler (z. B. Karte nicht gefunden, Rate-Limit).
  Exceptions bleiben Programmierfehlern vorbehalten.
- Funktionen in `core` sind immutabel: keine Mutation von Eingabeparametern.
- Unklare/unbestätigte Annahmen (Sprachcodes, Foil-Symbole, Archidekt-CSV-Werte) werden im Code mit
  `// VERIFY:` markiert und in `ITERATION_A.md` gesammelt.
- Keine echten Netzwerkaufrufe in Tests — `fetch` wird immer gemockt.
- Build je Paket über `tsup` (ESM + `.d.ts`).
- Abhängige Pakete importieren **Typen** aus anderen `@pesel512/archivar-*`-Paketen
  ausschließlich per `import type` (Laufzeit-Import wird vollständig wegoptimiert). Braucht ein
  Paket tatsächlich Laufzeit-Verhalten eines anderen Pakets (z. B. `react` den Reducer aus
  `core` oder `normalize` aus `ocr-worker`), ist ein normaler Laufzeit-Import ausdrücklich
  erlaubt — die Regel gilt nur für reine Typ-Importe. Jedes Paket löst die `@pesel512/archivar-*`-
  Importe seiner Abhängigkeiten über deren `dist/` auf (`package.json`-Feld `types`/`main`), nicht
  über `src/`. Die Root-Skripte `typecheck` und `build` bauen deshalb erst alle `packages/*`
  (`pnpm --filter './packages/**' run build`), bevor sie rekursiv `typecheck`/`build` laufen
  lassen — sonst fehlt einem Paket wie `react`, das mehrere Geschwisterpakete nutzt, deren
  `dist/` beim eigenen Typecheck. Kein `composite: true` in den Paket-`tsconfig.json`s — das
  bricht tsups DTS-Bundler (TS6307) bei mehrdateiigen Paketen.

## Befehle

- `pnpm lint` / `pnpm typecheck` / `pnpm test` — müssen nach jedem Loop-Block grün sein.
- `pnpm test:coverage` — Coverage-Report, Schwelle für `core`: 90 % Statements/Branches.
