# archivar

Kartenscanner für Magic: The Gathering — erkennt Karten per Kamera/OCR, gleicht sie gegen
Scryfall ab und exportiert die Sammlung als Archidekt-kompatibles CSV.

## Pakete

| Paket | Beschreibung |
|---|---|
| [`packages/core`](packages/core) | Reine Domänenlogik: Domänentypen, Corner-Parser (OCR-Text → strukturiertes Reading), Stabilitäts-Reducer für den Scan-Ablauf, Merge-Logik für die Sammlung, Archidekt-CSV-Export, Set-Vorschlag. Keine Browser-APIs, keine Netzwerkaufrufe, keine Seiteneffekte — vollständig unit-testbar. |
| [`packages/scryfall`](packages/scryfall) | Scryfall-API-Client mit injiziertem `fetch`, serieller Request-Queue, Backoff bei Rate-Limiting und In-Memory-Cache für Set-Listen. |
| [`apps/standalone`](apps/standalone) | Vite + React App: Kalibrier-Wizard und Debug-Scan für den Gerätetest (Iteration B, im Aufbau). |

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
pnpm dev
```

`pnpm typecheck` und `pnpm build` bauen `packages/core` zuerst, da `packages/scryfall` dessen
Typdeklarationen aus `dist/` auflöst (siehe `CLAUDE.md`). `pnpm dev` startet `apps/standalone`
(Vite-Dev-Server, Port 5173).

### App auf dem Handy öffnen

`apps/standalone` braucht Kamerazugriff (`getUserMedia`), der nur über HTTPS erlaubt ist. Im
Codespace:

1. `pnpm dev` starten.
2. Im Tab **Ports** den weitergeleiteten Port `5173` suchen, per Rechtsklick die Sichtbarkeit für
   die Dauer des Tests auf **Public** stellen (sonst verlangt die Weiterleitung einen
   GitHub-Login, den mobile Browser beim Kamerazugriff nicht zuverlässig durchreichen).
3. Die vom Codespace vergebene HTTPS-Adresse des Ports (z. B.
   `https://<codespace-name>-5173.app.github.dev`) auf dem Handy öffnen — sie erfüllt die
   HTTPS-Anforderung von `getUserMedia`.
4. Nach dem Test die Sichtbarkeit wieder auf **Private** zurückstellen.

## Iterationen

- **Iteration A** (abgeschlossen): `core` + `scryfall` — reine Logik, vollständig per Unit-Test
  abgesichert.
- **Iteration B** (noch offen): `packages/camera`, `packages/ocr-worker`, `packages/react`,
  `apps/standalone` sowie ein Kalibrier-Wizard. Diese Pakete greifen auf Kamera- und
  Browser-Hardware zu und werden **nicht** per Unit-Test, sondern am echten Gerät getestet.
