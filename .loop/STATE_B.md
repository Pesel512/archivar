# STATE — Iteration B

Fortschritt der Loop-Blöcke aus `LOOP_PROMPT_B.md`. Ein Block pro Lauf, danach Commit+Push und Stopp.

## Blöcke

- [x] B0 — Voraussetzungen prüfen
- [ ] B1 — App-Gerüst `apps/standalone`
- [ ] B2 — `camera`: reine Module
- [ ] B3 — `camera`: Browser-Module
- [ ] B4 — `ocr-worker`
- [ ] B5 — `react`: Scan-Schleife
- [ ] B6 — `react`: Kalibrier-Bausteine
- [ ] B7 — App-Ansichten
- [ ] B8 — Gerätetest vorbereiten
- [ ] B9 — Auswertung und Abschluss

## Offene Fragen

(noch keine)

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
