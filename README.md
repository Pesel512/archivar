# archivar

Kartenscanner für Magic: The Gathering — erkennt Karten per Kamera/OCR, gleicht sie gegen
Scryfall ab und exportiert die Sammlung als Archidekt-kompatibles CSV.

## Pakete

| Paket | Beschreibung |
|---|---|
| [`packages/core`](packages/core) | Reine Domänenlogik: Domänentypen, Corner-Parser (OCR-Text → strukturiertes Reading), Stabilitäts-Reducer für den Scan-Ablauf, Merge-Logik für die Sammlung, Archidekt-CSV-Export, Set-Vorschlag. Keine Browser-APIs, keine Netzwerkaufrufe, keine Seiteneffekte — vollständig unit-testbar. |
| [`packages/scryfall`](packages/scryfall) | Scryfall-API-Client mit injiziertem `fetch`, serieller Request-Queue, Backoff bei Rate-Limiting und In-Memory-Cache für Set-Listen. |

Details zu den Konventionen (Paketgrenzen, `fetch`-Injektion, Result-Typen statt Exceptions)
stehen in [`CLAUDE.md`](CLAUDE.md). Der Abschlussbericht zu Iteration A inkl. Coverage-Werten
und allen bewussten Annahmen steht in [`ITERATION_A.md`](ITERATION_A.md).

## Entwicklung

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

`pnpm typecheck` und `pnpm build` bauen `packages/core` zuerst, da `packages/scryfall` dessen
Typdeklarationen aus `dist/` auflöst (siehe `CLAUDE.md`).

## Iterationen

- **Iteration A** (abgeschlossen): `core` + `scryfall` — reine Logik, vollständig per Unit-Test
  abgesichert.
- **Iteration B** (noch offen): `packages/camera`, `packages/ocr-worker`, `packages/react`,
  `apps/standalone` sowie ein Kalibrier-Wizard. Diese Pakete greifen auf Kamera- und
  Browser-Hardware zu und werden **nicht** per Unit-Test, sondern am echten Gerät getestet.
