# STATE — Iteration A

Fortschritt der Loop-Blöcke aus `LOOP_PROMPT_A.md`. Ein Block pro Lauf, danach Commit+Push und Stopp.

## Blöcke

- [x] A1 — Repo-Gerüst
- [x] A2 — Domänentypen (`core/types.ts`)
- [x] A3 — Corner-Parser (`core/corner-parser.ts`)
- [ ] A4 — Stabilitäts-Reducer (`core/stability.ts`)
- [ ] A5 — Merge (`core/merge.ts`)
- [ ] A6 — CSV-Export (`core/csv.ts`)
- [ ] A7 — Set-Vorschlag (`core/set-suggest.ts`)
- [ ] A8 — Scryfall-Client (`packages/scryfall`)
- [ ] A9 — Abschluss

## Offene Fragen

- Sprachcode-Tabelle (`corner-parser.ts`, `LANGUAGE_CODE_TABLE`): CS→zhs, CT→zht sowie JP/JA→ja
  sind Annahmen aus der Scryfall-Doku, nicht aus echten Kartenscans verifiziert. Angenommen:
  Tabelle bleibt wie spezifiziert, bis echte Scans etwas anderes zeigen. `// VERIFY:` im Code.
- Foil-Hinweis-Symbole (`corner-parser.ts`, `resolveFoilHint`): `★`/`*` → Foil, `•`/`·`/`.` → kein
  Foil, sonst `null`. Angenommen: Symbolik variiert je Set/Druckjahr und muss an echten Karten
  geprüft werden. `// VERIFY:` im Code.

## Log

- 2026-09-16: A1 abgeschlossen. pnpm-Workspace mit `packages/core` und `packages/scryfall`
  angelegt, TypeScript `strict` + `noUncheckedIndexedAccess`, Vitest (leerer Testlauf grün dank
  `passWithNoTests`), ESLint (Flat Config) + Prettier, tsup-Build (ESM + d.ts), GitHub Action
  (lint/typecheck/test) unter `.github/workflows/ci.yml`, `CLAUDE.md` mit Konventionen angelegt.
  `core/tsconfig.json` ohne `"DOM"` in `lib` — Referenz auf `document` in `core` schlägt beim
  Typecheck fehl (manuell verifiziert, nicht im Code belassen).
- 2026-09-16: A2 abgeschlossen. `core/types.ts` mit allen Domänentypen (`Finish`, `Condition`,
  `LanguageCode`, `Rarity`, `CornerReading`, `ReadingKey`, `ResolvedCard`, `CollectionEntry`) und
  `toReadingKey` angelegt, `index.ts` re-exportiert das Modul. Tests für `toReadingKey`
  (Großschreibung, Normalisierung, Buchstabensuffix bleibt erhalten). Coverage 100 % für `core`.
  `vitest.config.ts` angepasst: reine Re-Export-Barrel (`index.ts`) aus der Coverage-Messung
  ausgeschlossen, da sie sonst fälschlich als ungetestet zählt.
- 2026-09-16: A3 abgeschlossen. `core/corner-parser.ts` mit `parseCorner` und `ParseContext`
  angelegt: Sammlernummer-Parsing (Slash-Teil verwerfen, OCR-Korrektur O/I/l/|→0/1, führende
  Nullen entfernen, Buchstabensuffix erhalten), Seltenheits-Erkennung, Set-Code-Erkennung
  (3–5 alphanumerisch, `fixedSet` überschreibt/ignoriert Text, `knownSetCodes` mit
  0↔O/1↔I/5↔S/8↔B-Korrektur), Sprachcode-Tabelle als exportierte Konstante
  (`LANGUAGE_CODE_TABLE`), Foil-Hinweis aus Trennzeichen. Alle Pflicht-Testfälle aus der Tabelle
  in A3 plus zusätzliche Edge-Cases (30 Tests gesamt für `core`). Coverage `core` 100 %
  Statements/Lines, 98,1 % Branches (>90 %-Schwelle) — verbleibende ungetestete Branch ist eine
  durch `noUncheckedIndexedAccess` erzwungene, praktisch unerreichbare Absicherung. Zwei
  `// VERIFY:`-Annahmen (Sprachcode-Tabelle, Foil-Symbole) unter „Offene Fragen“ vermerkt.
