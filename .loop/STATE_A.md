# STATE — Iteration A

Fortschritt der Loop-Blöcke aus `LOOP_PROMPT_A.md`. Ein Block pro Lauf, danach Commit+Push und Stopp.

## Blöcke

- [x] A1 — Repo-Gerüst
- [ ] A2 — Domänentypen (`core/types.ts`)
- [ ] A3 — Corner-Parser (`core/corner-parser.ts`)
- [ ] A4 — Stabilitäts-Reducer (`core/stability.ts`)
- [ ] A5 — Merge (`core/merge.ts`)
- [ ] A6 — CSV-Export (`core/csv.ts`)
- [ ] A7 — Set-Vorschlag (`core/set-suggest.ts`)
- [ ] A8 — Scryfall-Client (`packages/scryfall`)
- [ ] A9 — Abschluss

## Offene Fragen

_(keine)_

## Log

- 2026-09-16: A1 abgeschlossen. pnpm-Workspace mit `packages/core` und `packages/scryfall`
  angelegt, TypeScript `strict` + `noUncheckedIndexedAccess`, Vitest (leerer Testlauf grün dank
  `passWithNoTests`), ESLint (Flat Config) + Prettier, tsup-Build (ESM + d.ts), GitHub Action
  (lint/typecheck/test) unter `.github/workflows/ci.yml`, `CLAUDE.md` mit Konventionen angelegt.
  `core/tsconfig.json` ohne `"DOM"` in `lib` — Referenz auf `document` in `core` schlägt beim
  Typecheck fehl (manuell verifiziert, nicht im Code belassen).
