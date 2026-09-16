# LOOP_PROMPT — Iteration A: `core` + `scryfall`

Du arbeitest im Repo `archivar`. Ziel von Iteration A ist die komplette **reine Logik** des Kartenscanners — ohne UI, ohne Kamera, ohne OCR. Alles hier muss vollständig per Unit-Test abgesichert sein, weil Kamera- und Hardware-Flows später nur am echten Gerät getestet werden.

## Arbeitsweise (verbindlich)

0. **Erster Lauf:** Existiert `.loop/STATE_A.md` noch nicht, ist das Repo leer — beginne mit A1 und lege die Datei dort an.
0b. **Wiederaufnahme:** Prüfe vor allem anderen `git status`. Gibt es uncommittete Änderungen, wurde ein Block unterbrochen (z. B. durch einen Codespace-Stopp). Ordne die Änderungen dem ersten offenen Block zu, prüfe sie auf Vollständigkeit und setze diesen Block fort — nicht verwerfen, nicht neu beginnen. Vermerke die Unterbrechung im Log von `STATE_A.md`.
1. Lies zuerst `CLAUDE.md` (ab A1 vorhanden) und `.loop/STATE_A.md`.
2. Bearbeite **genau einen** offenen Block — den ersten, der in `STATE_A.md` nicht abgehakt ist.
3. Nach dem Block: `pnpm lint && pnpm typecheck && pnpm test` müssen grün sein.
4. Hake den Block in `STATE_A.md` ab, notiere Kurzstatus und offene Fragen.
5. **Commit und Push nach jedem Block.** Kein ungepushter Stand über Blockgrenzen hinweg.
6. Dann **stoppen**. Nicht mit dem nächsten Block beginnen.
7. Bei Unklarheiten nicht raten: Frage in `STATE_A.md` unter „Offene Fragen“ eintragen, eine sinnvolle, konfigurierbare Annahme treffen und im Code mit `// VERIFY:` markieren.

## Scope

**Drin:** Monorepo-Gerüst, `packages/core`, `packages/scryfall`, Tests, CI.
**Nicht drin:** `packages/camera`, `packages/ocr-worker`, `packages/react`, `apps/standalone`, jede UI, jede Browser-API, echte Netzwerkaufrufe in Tests, Tappd-Anbindung.

---

## A1 — Repo-Gerüst

- pnpm workspaces, Node LTS, TypeScript `strict: true`, `noUncheckedIndexedAccess: true`.
- Vitest als Testrunner, ESLint, Prettier.
- Build der Pakete mit tsup (ESM + d.ts), Paketnamen `@pesel512/archivar-core`, `@pesel512/archivar-scryfall`.
- `packages/core/tsconfig.json` **ohne** `DOM` in `lib` — so wird erzwungen, dass `core` keine Browser-APIs nutzt.
- Coverage-Schwelle für `core`: 90 % Statements/Branches.
- GitHub Action: lint, typecheck, test bei jedem Push und PR.
- `CLAUDE.md` mit den Konventionen dieses Dokuments anlegen (Paketgrenzen, keine Browser-APIs in `core`, `fetch` immer injizieren, Result-Typen statt Exceptions für erwartbare Fehler).
- `.loop/STATE_A.md` mit Blöcken A1–A9, Abschnitt „Offene Fragen“ und „Log“.
- `IMPROVEMENT_LOG.md` anlegen.

**Akzeptanz:** leeres `pnpm test` läuft grün, CI grün, `core` bricht beim Typecheck, wenn testweise `document` referenziert wird.

## A2 — Domänentypen (`core/types.ts`)

```ts
type Finish = 'nonfoil' | 'foil' | 'etched';
type Condition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';
type LanguageCode = 'en' | 'de' | 'fr' | 'it' | 'es' | 'pt' | 'ja' | 'ko' | 'ru' | 'zhs' | 'zht';
type Rarity = 'C' | 'U' | 'R' | 'M' | 'S' | 'L' | 'T';

interface CornerReading {
  collectorNumber: string;       // normalisiert, ohne führende Nullen
  setCode: string | null;        // Großbuchstaben
  rarity: Rarity | null;
  language: LanguageCode | null;
  foilHint: boolean | null;      // nur Vorschlag, nie Entscheidung
  completeness: 'full' | 'partial';
}

type ReadingKey = string;        // `${SET}:${number}`

interface ResolvedCard {
  scryfallId: string;
  name: string;
  setCode: string;
  collectorNumber: string;
  languageFallback: boolean;     // true, wenn die Sprachversion bei Scryfall fehlte
}

interface CollectionEntry {
  id: string;
  card: ResolvedCard;
  quantity: number;
  finish: Finish;
  language: LanguageCode;
  condition: Condition;
  tags: string[];
  scannedAt: string;             // ISO
  exportedAt: string | null;
}
```

Plus Hilfsfunktion `toReadingKey(setCode, collectorNumber)`.

**Akzeptanz:** Typen exportiert, `toReadingKey` getestet (Großschreibung, Normalisierung).

## A3 — Corner-Parser (`core/corner-parser.ts`)

```ts
interface ParseContext {
  fixedSet?: string | null;          // vorgewählter Set-Code
  knownSetCodes?: ReadonlySet<string>; // für OCR-Korrektur des Set-Codes
}
function parseCorner(raw: string, ctx?: ParseContext): CornerReading | null;
```

Regeln:

- Eingabe ist roher, mehrzeiliger Tesseract-Text. Leerzeichen und Zeilenumbrüche tolerant behandeln.
- Sammlernummer: Formate `0168`, `168/280`, `0168a`, `123s`, vierstellige Nummern. Führende Nullen entfernen, Buchstabensuffix behalten, den Teil nach `/` verwerfen.
- Im **Nummernkontext** OCR-Verwechslungen korrigieren: `O→0`, `I`/`l`/`|→1`. Nicht im Set-Code.
- Seltenheit: einzelner Buchstabe aus `Rarity` nach der Nummer, optional.
- Set-Code: 3–5 alphanumerische Zeichen (z. B. `MH3`, `40K`, `PLST`, `2X2`). Wenn `knownSetCodes` gesetzt ist, nur Codes aus der Liste akzeptieren; dabei die Varianten `0↔O`, `1↔I`, `5↔S`, `8↔B` durchprobieren.
- Mit `fixedSet`: Set-Code aus dem Kontext übernehmen, nur die Nummer ist Pflicht. Ein abweichend gelesener Set-Code wird ignoriert.
- Sprachcode: Tabelle gedruckter Code → `LanguageCode` als eigene, exportierte Konstante. Startwerte `EN, DE, FR, IT, ES, PT, JP/JA, KO, RU, CS→zhs, CT→zht` — mit `// VERIFY:` markieren, an echten Karten zu prüfen.
- Foil-Hinweis: Trennzeichen zwischen Set- und Sprachcode. `★` oder `*` → `true`, `•`, `·`, `.` → `false`, sonst `null`. Mit `// VERIFY:` markieren.
- `completeness: 'full'`, wenn Nummer und Set-Code vorliegen (aus Text oder `fixedSet`), sonst `'partial'`.
- Keine Nummer gefunden → `null`.

**Pflicht-Testfälle (mindestens):**

| Eingabe | Kontext | Erwartung |
|---|---|---|
| `"0168 R\nDOM • EN"` | — | `168`, `DOM`, `R`, `en`, foilHint `false`, full |
| `"0168 R\nDOM ★ DE"` | — | foilHint `true`, `de` |
| `"168/280 U\nM20 • EN"` | — | Nummer `168`, Set `M20` |
| `"O168 R\nDOM • EN"` | — | Nummer `168` (O→0) |
| `"0123s M\nSNC • EN"` | — | Nummer `123s` |
| `"1234 R\nSLD • EN"` | — | Nummer `1234` |
| `"0168 R\nD0M • EN"` | knownSetCodes enthält `DOM` | Set `DOM` |
| `"0168 R\nD0M • EN"` | ohne knownSetCodes | Set `D0M` (keine Korrektur) |
| `"0042"` | fixedSet `MOM` | `42`, `MOM`, full |
| `"0042\nXYZ • EN"` | fixedSet `MOM` | Set bleibt `MOM` |
| `"0042"` | — | partial, setCode `null` |
| `"R\nDOM • EN"` | — | `null` |
| `""` / Rauschen `"~~ ;;"` | — | `null` |
| `"0168 R\nDOM • CS"` | — | Sprache `zhs` |

## A4 — Stabilitäts-Reducer (`core/stability.ts`)

Reiner Reducer, keine Timer, keine Promises. Seiteneffekte (Scryfall-Aufruf) löst der Aufrufer aus, wenn der Zustand nach `validating` wechselt.

```ts
interface StabilityConfig {
  requiredMatches: number;          // Default 3
  removalFrames: number;            // Default 5
  failedKeyCooldownFrames: number;  // Default 30
  autoConfirm: boolean;             // Default false
}

type ScanState =
  | { phase: 'idle' }
  | { phase: 'candidate'; key: ReadingKey; reading: CornerReading; count: number }
  | { phase: 'validating'; key: ReadingKey; reading: CornerReading }
  | { phase: 'confirming'; key: ReadingKey; card: ResolvedCard; reading: CornerReading }
  | { phase: 'awaitingRemoval'; key: ReadingKey; absentFrames: number };

interface ScanMachine {
  state: ScanState;
  fixedSet: string | null;
  failedKey: { key: ReadingKey; framesLeft: number } | null;
}

type ScanAction =
  | { type: 'FRAME'; reading: CornerReading | null }
  | { type: 'VALIDATION_SUCCEEDED'; card: ResolvedCard }
  | { type: 'VALIDATION_FAILED' }
  | { type: 'USER_CONFIRMED' }
  | { type: 'USER_REJECTED' }
  | { type: 'SET_CHANGED'; setCode: string | null }
  | { type: 'RESET' };
```

Verhalten:

- Nur Readings mit `completeness: 'full'` zählen. `partial` und `null` gelten als „nichts erkannt“.
- `idle` + gültiges Reading → `candidate` mit `count = 1`.
- `candidate` + gleicher Key → `count + 1`; bei `count >= requiredMatches` → `validating`.
- `candidate` + anderer Key → neuer `candidate` mit `count = 1`.
- `candidate` + nichts erkannt → `idle`.
- Key in `failedKey` mit `framesLeft > 0` startet keinen Kandidaten; jeder `FRAME` dekrementiert `framesLeft`.
- `validating` ignoriert `FRAME`.
- `VALIDATION_SUCCEEDED` → `confirming`; bei `autoConfirm` direkt `awaitingRemoval`.
- `VALIDATION_FAILED` → `idle`, `failedKey` setzen.
- `confirming` ignoriert `FRAME`. `USER_CONFIRMED` → `awaitingRemoval` mit `absentFrames = 0`. `USER_REJECTED` → `awaitingRemoval` (dieselbe Karte liegt noch im Bild).
- `awaitingRemoval` + gleicher Key → `absentFrames = 0`.
- `awaitingRemoval` + nichts oder anderer Key → `absentFrames + 1`; bei `>= removalFrames` → `idle`.
- `SET_CHANGED` aus jedem Zustand → `idle`, `fixedSet` setzen, `failedKey = null`.
- `RESET` → Ausgangszustand mit unverändertem `fixedSet`.
- Hilfsfunktion `enteredValidation(prev, next): boolean` für den Aufrufer.

**Pflicht-Testfälle:** jede Transition oben einzeln; Sequenz „drei gleiche Frames → validating“; „zwei gleiche, ein anderer, zwei gleiche → kein validating“; „Karte bleibt liegen → keine zweite Validierung“; „Karte weg, dieselbe Karte wieder hingelegt → neue Validierung“ (Doppelkarten im Stapel!); „fehlgeschlagener Key blockiert für N Frames, danach wieder möglich“; `SET_CHANGED` während `validating` und `confirming`; `partial`-Readings zählen nicht.

## A5 — Merge (`core/merge.ts`)

```ts
function mergeKey(e: Pick<CollectionEntry, 'card' | 'finish' | 'language' | 'condition'>): string;
function addScan(entries: CollectionEntry[], scan: Omit<CollectionEntry, 'id' | 'quantity' | 'exportedAt'> & { quantity?: number }, newId: () => string): CollectionEntry[];
function markExported(entries: CollectionEntry[], ids: string[], at: string): CollectionEntry[];
function pendingExport(entries: CollectionEntry[]): CollectionEntry[];
```

Regeln:

- Merge-Key: `scryfallId + finish + language + condition`.
- Merge nur in **nicht exportierte** Einträge. Existiert der Key nur als exportierter Eintrag, entsteht ein neuer Eintrag. (Hintergrund: Archidekts Importer legt ohnehin neue Einträge an — so wird nichts doppelt importiert.)
- Tags werden beim Merge vereinigt, ohne Duplikate, Reihenfolge stabil.
- Funktionen sind immutabel; `newId` wird injiziert.

**Pflicht-Testfälle:** gleicher Key → Menge erhöht; anderes Finish/Sprache/Zustand → neuer Eintrag; exportierter Eintrag wird nicht verändert; Tag-Vereinigung; `pendingExport` filtert korrekt; Eingabe-Array bleibt unverändert.

## A6 — CSV-Export (`core/csv.ts`)

```ts
interface CsvValueMap {
  finish: Record<Finish, string>;
  language: Record<LanguageCode, string>;
  condition: Record<Condition, string>;
  tagSeparator: string;
}
interface CsvOptions {
  valueMap?: Partial<CsvValueMap>;
  maxBytes?: number;          // Default 1_900_000 (Puffer unter Archidekts 2-MB-Grenze)
  lineEnding?: '\n' | '\r\n'; // Default '\n'
  bom?: boolean;              // Default false
}
function toArchidektCsv(entries: CollectionEntry[], opts?: CsvOptions): string[]; // ein String pro Datei
```

- Spalten: `Quantity,Name,Set Code,Collector Number,Scryfall ID,Finish,Language,Condition,Tags`.
- RFC-4180-Escaping (Kommas, Anführungszeichen, Zeilenumbrüche in Namen, z. B. Split-Karten mit `//`).
- Standardwerte für `CsvValueMap` als exportierte Konstante, komplett mit `// VERIFY:` markiert — die exakten Werte, die Archidekt erwartet, werden per Testimport ermittelt und nur dort angepasst.
- Aufteilung nach Bytes (UTF-8 gemessen, nicht nach Zeichen): jede Datei mit Header, keine Zeile wird geteilt.
- Leere Eingabe → leeres Array.

**Pflicht-Testfälle:** Header exakt; Escaping von `"`, `,` und Zeilenumbruch; Umlaute korrekt in Bytes gezählt; Split bei kleiner `maxBytes` erzeugt mehrere Dateien mit Header; Summe der Zeilen über alle Dateien stimmt; eigene `valueMap` greift; mehrere Tags mit Separator.

## A7 — Set-Vorschlag (`core/set-suggest.ts`)

```ts
interface SuggestConfig { repeatAfterDismiss: number } // Default 3
interface SuggestInput {
  fixedSet: string | null;
  confirmedSetCodes: string[];   // chronologisch, nur diese Session
  dismissedAtCount: number | null; // Anzahl bestätigter Karten beim letzten Ablehnen
}
function getSetSuggestion(input: SuggestInput, cfg?: SuggestConfig): string | null;
```

- Kein Vorschlag, wenn `fixedSet` gesetzt ist.
- Nach der **ersten** bestätigten Karte: deren Set vorschlagen.
- Nach Ablehnung: erst wieder vorschlagen, wenn seit der Ablehnung die letzten `repeatAfterDismiss` Karten alle dasselbe Set haben.

**Pflicht-Testfälle:** leere Liste; erste Karte; fixiertes Set; abgelehnt und gemischte Sets danach; abgelehnt und danach drei gleiche.

## A8 — Scryfall-Client (`packages/scryfall`)

```ts
interface ScryfallClientOptions {
  fetch: typeof fetch;                 // immer injiziert
  cache?: Cache;                       // Default: In-Memory
  minIntervalMs?: number;              // Default 100
  headers?: Record<string, string>;    // Accept immer gesetzt; User-Agent nur außerhalb des Browsers
  now?: () => number; sleep?: (ms: number) => Promise<void>; // für Tests
}
interface Cache { get(key: string): unknown | undefined; set(key: string, value: unknown): void }

type LookupResult =
  | { ok: true; card: ResolvedCard }
  | { ok: false; reason: 'not_found' | 'rate_limited' | 'network' };
```

Funktionen:

- `getCardBySetNumber(set, number, lang?)`: `/cards/{set}/{number}` bzw. `/cards/{set}/{number}/{lang}`. Liefert die Sprachversion 404, auf die englische Version zurückfallen und `languageFallback: true` setzen.
- `getCardByName(name, set?)`: `/cards/named?fuzzy=…&set=…`.
- `getPhysicalSets(opts?: { excludeSetTypes?: string[] })`: `/sets`, `digital === false`, sortiert nach `released_at` absteigend, Ergebnis gecacht.
- `searchSets(query, sets)`: reine Funktion für das spätere Autocomplete — Treffer auf Code (Präfix, priorisiert) und Name (enthält), Sortierung bleibt „neueste zuerst“.
- Queue: Anfragen strikt seriell mit `minIntervalMs` Abstand. Bei 429 exponentieller Backoff, maximal 3 Versuche, dann `rate_limited`.
- 404 ist ein `Result`, keine Exception. Unerwartete Statuscodes → `network`.
- Mapping nur der benötigten Felder in `ResolvedCard`, keine vollständigen Scryfall-Objekte durchreichen.

**Pflicht-Testfälle** (nur mit gemocktem `fetch`, gefälschtem `sleep`/`now`): korrekte URL-Bildung inkl. Encoding; Sprach-Fallback; Cache-Treffer löst keinen zweiten Aufruf aus; Abstand zwischen Anfragen wird eingehalten; 429 → Backoff → Erfolg; 429 dreimal → `rate_limited`; Set-Filter und Sortierung; `searchSets` priorisiert Code-Präfix.

## A9 — Abschluss

- `ITERATION_A.md`: was gebaut wurde, bewusste Annahmen (alle `// VERIFY:`-Stellen als Liste mit Datei und Zeile), offene Fragen, Coverage-Werte.
- Eintrag in `IMPROVEMENT_LOG.md`.
- README mit Paketübersicht und Hinweis, dass Iteration B (`camera`, `ocr-worker`, Kalibrier-Wizard) am echten Gerät getestet wird.

**Akzeptanz Iteration A gesamt:**

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` grün, CI grün
- [ ] Coverage `core` ≥ 90 %
- [ ] Kein Netzwerkzugriff in Tests
- [ ] Keine Browser-API in `core` (durch tsconfig erzwungen)
- [ ] Alle Pflicht-Testfälle aus A3–A8 vorhanden
- [ ] Alle Annahmen zu Archidekt-Werten, Sprachcodes und Foil-Hinweis mit `// VERIFY:` markiert und in `ITERATION_A.md` gelistet