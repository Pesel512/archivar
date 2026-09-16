# archivar — Konventionen

Monorepo für einen Kartenscanner (Magic: The Gathering). pnpm-Workspace, TypeScript `strict`.

## Paketgrenzen

- `packages/core` — reine Domänenlogik. **Keine Browser-APIs, kein DOM.** Erzwungen durch
  `packages/core/tsconfig.json` (`lib` ohne `"DOM"`). Keine Netzwerkaufrufe, keine Timer, keine
  Seiteneffekte. Reine Funktionen und Reducer.
- `packages/scryfall` — Scryfall-API-Client. Netzwerk nur über injizierten `fetch`, niemals global
  referenziert.
- `packages/camera`, `packages/ocr-worker`, `packages/react`, `apps/standalone` — folgen in
  Iteration B, dort Browser-/Hardware-Zugriff. Werden nicht mit Unit-Tests, sondern am echten
  Gerät geprüft.

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

## Befehle

- `pnpm lint` / `pnpm typecheck` / `pnpm test` — müssen nach jedem Loop-Block grün sein.
- `pnpm test:coverage` — Coverage-Report, Schwelle für `core`: 90 % Statements/Branches.
