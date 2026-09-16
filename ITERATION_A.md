# Iteration A — Abschlussbericht

Iteration A liefert die komplette reine Logik des Kartenscanners: Monorepo-Gerüst,
`packages/core` (Domänenlogik, keine Browser-APIs) und `packages/scryfall`
(Scryfall-API-Client, `fetch` injiziert). Kamera, OCR und UI folgen erst in Iteration B und
werden dort am echten Gerät getestet, nicht per Unit-Test.

## Was gebaut wurde

| Block | Inhalt |
|---|---|
| A1 | pnpm-Workspace, TypeScript `strict` + `noUncheckedIndexedAccess`, Vitest, ESLint/Prettier, tsup-Build (ESM + `.d.ts`), GitHub-Actions-CI, `CLAUDE.md`, `.loop/STATE_A.md`, `IMPROVEMENT_LOG.md`. |
| A2 | `core/types.ts` — Domänentypen (`Finish`, `Condition`, `LanguageCode`, `Rarity`, `CornerReading`, `ReadingKey`, `ResolvedCard`, `CollectionEntry`) und `toReadingKey`. |
| A3 | `core/corner-parser.ts` — `parseCorner` inkl. OCR-Korrektur für Sammlernummer und Set-Code, Sprachcode-Tabelle, Foil-Hinweis. |
| A4 | `core/stability.ts` — `scanReducer`, reiner Zustandsautomat für die Scan-Stabilität (`idle → candidate → validating → confirming → awaitingRemoval`), `failedKey`-Cooldown, `enteredValidation`. |
| A5 | `core/merge.ts` — `mergeKey`, `addScan`, `markExported`, `pendingExport` für die Sammlung, alles immutabel. |
| A6 | `core/csv.ts` — `toArchidektCsv`, RFC-4180-Escaping, byte-genaue Dateiaufteilung ohne Zeilenteilung. |
| A7 | `core/set-suggest.ts` — `getSetSuggestion` für den Set-Vorschlag nach bestätigten Karten. |
| A8 | `packages/scryfall` — `createScryfallClient` (`getCardBySetNumber`, `getCardByName`, `getPhysicalSets`) und `searchSets`, serielle Request-Queue mit Backoff. |

## Coverage

Stand nach A8 (`pnpm test:coverage`, Schwelle 90 % für `core`):

| Datei | Statements | Branches | Funktionen | Lines |
|---|---|---|---|---|
| Gesamt `core` | 100 % | 98,93 % | 100 % | 100 % |
| `corner-parser.ts` | 100 % | 98,11 % | 100 % | 100 % |
| `csv.ts` | 100 % | 97,14 % | 100 % | 100 % |
| `merge.ts` | 100 % | 100 % | 100 % | 100 % |
| `set-suggest.ts` | 100 % | 100 % | 100 % | 100 % |
| `stability.ts` | 100 % | 100 % | 100 % | 100 % |
| `types.ts` | 100 % | 100 % | 100 % | 100 % |

`packages/scryfall` unterliegt keiner Coverage-Schwelle (nur für `core` gefordert), ist aber
mit 26 Tests (Stand nach A10) entlang aller Pflicht-Testfälle abgedeckt (Vitest-Report bei
Bedarf lokal per `pnpm test:coverage` einsehbar, Konfiguration in `vitest.config.ts` misst
aktuell nur `core`).

Verbleibende ungetestete Branches in `core` sind durchweg durch `noUncheckedIndexedAccess`
erzwungene, durch die jeweilige Konstruktion praktisch unerreichbare Absicherungen (z. B.
`corner-parser.ts:84`, `csv.ts:77`) — keine fachliche Lücke.

## Bewusste Annahmen (`// VERIFY:`)

| Datei:Zeile | Annahme |
|---|---|
| `packages/core/src/corner-parser.ts:12` | Sprachcode-Tabelle (`LANGUAGE_CODE_TABLE`): CS→zhs, CT→zht, JP/JA→ja — aus Scryfall-Doku übernommen, nicht an echten Kartenscans verifiziert. |
| `packages/core/src/corner-parser.ts:106` | Foil-Hinweis-Symbole: `★`/`*` → Foil, `•`/`·`/`.` → kein Foil, sonst `null` — Symbolik variiert je Set/Druckjahr, an echten Karten zu prüfen. |
| `packages/core/src/csv.ts:25` | `DEFAULT_CSV_VALUE_MAP` (Finish/Sprache/Zustand/Tag-Separator): typische Archidekt-Bezeichnungen angenommen, nicht per echtem Import verifiziert. |

Vier ursprünglich hier gelistete Annahmen wurden in Block A10 (Nacharbeit nach Review)
aufgelöst und sind daher keine offenen `// VERIFY:`-Stellen mehr: die Cooldown-Semantik in
`stability.ts` (Verhalten bestätigt, nur als begründeter Kommentar dokumentiert), der
429-Backoff in `packages/scryfall/src/client.ts` (nutzt jetzt den `Retry-After`-Header, wenn
vorhanden), der `User-Agent`-String (fest auf
`archivar/0.1 (+https://github.com/Pesel512/archivar)` gesetzt) und `getPhysicalSets` (liefert
jetzt einen `SetsResult`-Typ statt einer leeren Liste im Fehlerfall). Details siehe
`.loop/STATE_A.md`, Block A10.

## Offene Fragen

Die drei verbleibenden Annahmen oben (Sprachcodes, Foil-Symbol, CSV-Werte) sind die einzigen
noch offenen Fragen aus Iteration A. Keine blockiert den Abschluss; alle sind konfigurierbar
bzw. an einer einzigen Stelle im Code anpassbar, sobald echte Kartenscans oder ein Testimport
bei Archidekt Abweichungen zeigen.

## Akzeptanzkriterien Iteration A

- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test` grün (lokal verifiziert, inkl. Lauf von
      sauberem Zustand aus); CI (`.github/workflows/ci.yml`) führt dieselben Schritte aus.
- [x] Coverage `core` ≥ 90 % (100 % Statements/Lines, 98,9 % Branches).
- [x] Kein Netzwerkzugriff in Tests — `fetch` ist in allen Scryfall-Client-Tests gemockt.
- [x] Keine Browser-API in `core` — durch `packages/core/tsconfig.json` (`lib` ohne `"DOM"`)
      erzwungen und in A1 verifiziert (`document`-Referenz bricht den Typecheck).
- [x] Alle Pflicht-Testfälle aus A3–A8 vorhanden.
- [x] Alle Annahmen zu Archidekt-Werten, Sprachcodes und Foil-Hinweis mit `// VERIFY:`
      markiert und oben gelistet.
