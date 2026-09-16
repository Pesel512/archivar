# Review — Iteration A

Reines Review, keine Code-/Test-/Konfigurationsänderung. Grundlage: `LOOP_PROMPT_A.md`,
`CLAUDE.md`, `.loop/STATE_A.md`, `ITERATION_A.md`. Geprüfter Commit: `f464e9e` (A9, `origin/main`).

## Gesamteinschätzung

Iteration A ist in sehr gutem Zustand. Alle Gates (Lint/Typecheck/Test/Coverage) sind grün,
CI ist für jeden Commit von A1–A9 grün (per `gh run list` verifiziert), alle Pflicht-Testfälle
aus A3–A8 sind vorhanden und stichprobenartige Code-Prüfungen gegen die Spezifikation zeigen
keine Abweichungen. Alle sieben `// VERIFY:`-Stellen im Code sind vollständig und korrekt in
`ITERATION_A.md` gelistet. Es wurden **keine funktionalen Mängel** gefunden. Zwei kosmetische
Dokumentationsungenauigkeiten in `CLAUDE.md` sind die einzigen Fundstellen (siehe Punkt 7 und
Nacharbeiten). Der Arbeitsstand ist sauber und vollständig gepusht.

## 1. Checks

**Status: OK**

- `pnpm lint` → Exit 0, keine Findings.
- `pnpm typecheck` → Exit 0 (baut zuerst `packages/core`, dann Typecheck aller Pakete).
- `pnpm test` → Exit 0, 128 Tests, 8 Testdateien, alle grün.
- `pnpm test:coverage` (Schwelle `core` 90 %): **Statements 100 %, Branches 98,93 %** — über
  der Schwelle. Einzelwerte: `corner-parser.ts` 100 %/98,11 %, `csv.ts` 100 %/97,14 %,
  `merge.ts` 100 %/100 %, `set-suggest.ts` 100 %/100 %, `stability.ts` 100 %/100 %,
  `types.ts` 100 %/100 %. Deckt sich exakt mit den in `ITERATION_A.md` angegebenen Werten.
- CI: alle 9 Commits (A1–A9) laufen laut `gh run list` mit `completed/success` — inkl. `f464e9e`.

## 2. Paketgrenzen

**Status: OK**

- `grep -rn document|window|navigator|localStorage|sessionStorage|XMLHttpRequest packages/core/src`
  liefert nur einen Treffer: `packages/core/src/set-suggest.ts:29` — dort heißt eine lokale
  Konstante `window` (Sliding-Window-Terminologie, `const window = sinceDismiss.slice(...)`),
  referenziert nicht das globale Browser-Objekt. Keine echte DOM-/Browser-API-Nutzung in `core`.
- `packages/core/tsconfig.json:6` — `"lib": ["ES2022"]`, kein `"DOM"`. Verifiziert durch
  temporäres Anhängen von `document.title;` an `packages/core/src/index.ts` und
  `tsc --noEmit`: bricht mit `TS2584: Cannot find name 'document'`. Änderung nicht committet,
  Datei nach dem Test zurückgesetzt (Diff bestätigt: `git status` zeigt keine Änderung).
- Keine testweise `document`-Zeile aus A1 im Code zurückgeblieben (`packages/core/src/index.ts`
  enthält nur sechs `export * from` Zeilen, `grep -rn document packages/core/src` liefert sonst
  keine Treffer).

## 3. Netzwerk

**Status: OK**

- `grep -rn fetch packages/*/src/*.test.ts` zeigt ausschließlich Verwendungen des injizierten
  `fetchImpl`/`wrappedFetch` (lokale Mock-Funktionen aus `createFakeFetch`), keine Aufrufe von
  globalem `fetch`.
- Literale `https://api.scryfall.com/...`-Strings in `packages/scryfall/src/client.test.ts`
  treten ausschließlich in `expect(...).toBe(...)`-Assertions auf den vom Mock erfassten
  URL-Parameter auf, nicht als tatsächlicher Netzwerkaufruf.
- `packages/scryfall/src/client.ts` referenziert `fetch` nur als Typ (`typeof fetch`,
  Zeile 69) und als injizierte Instanz (`options.fetch`, Zeile 107) — kein globaler Aufruf.

## 4. Pflicht-Testfälle A3–A8

**Status: OK — alle vorhanden, keine Lücken.**

- **A3 (Corner-Parser, 14 Pflichtfälle laut Tabelle):** alle 14 Zeilen der Tabelle in
  `packages/core/src/corner-parser.test.ts:5-96` 1:1 wiedergefunden (inkl. Foil-Hinweis,
  O→0-Korrektur, Buchstabensuffix, `fixedSet`, `knownSetCodes` mit/ohne Korrektur, `null`-Fälle,
  Sprachcode CS→zhs). Zusätzlich 10 weitere Edge-Case-Tests (Zeile 99-146).
- **A4 (Stabilitäts-Reducer):** alle Einzeltransitionen aus der Verhaltensliste sowie alle 7
  geforderten Sequenzen in `packages/core/src/stability.test.ts` vorhanden: drei gleiche Frames
  (Z.303), zwei+ein anderer+zwei (Z.311), Karte bleibt liegen (Z.322), Doppelkarten im Stapel
  (Z.340), Cooldown-Blockade (Z.361), `SET_CHANGED` in validating (Z.386) und confirming
  (Z.397) je einzeln, `partial` zählt nicht (Z.409).
- **A5 (Merge):** gleicher Key → Menge erhöht (Z.59), andere Finish/Sprache/Zustand → neuer
  Eintrag (Z.67/75/83, je einzeln), exportierter Eintrag unverändert (Z.91), Tag-Vereinigung
  (Z.101), `pendingExport` filtert (Z.155), Eingabe-Array unverändert (Z.123, Z.144).
- **A6 (CSV-Export):** Header exakt (Z.59), Escaping `"`/`,`/Zeilenumbruch (Z.66/71/78),
  Umlaute in Bytes (Z.83), Split bei kleiner `maxBytes` mit Header je Datei (Z.103), Summe der
  Zeilen stimmt (Z.124), eigene `valueMap` (Z.140), mehrere Tags mit Separator (Z.146).
- **A7 (Set-Vorschlag):** leere Liste (Z.14), erste Karte (Z.18), fixiertes Set (Z.29),
  abgelehnt+gemischt (Z.36), abgelehnt+drei gleiche (Z.43).
- **A8 (Scryfall-Client):** URL-Bildung inkl. Encoding (`client.test.ts:74`), Sprach-Fallback
  (Z.100), Cache-Treffer ohne zweiten Aufruf (Z.271), Abstand zwischen Anfragen (Z.194),
  429→Backoff→Erfolg (Z.222), 429 dreimal→`rate_limited` (Z.234), Set-Filter/Sortierung
  (Z.298), `searchSets` priorisiert Code-Präfix (`sets.test.ts:16`).

## 5. Verhalten gegen Spezifikation (Stichproben)

**Status: OK** — an den fünf explizit genannten Stellen sowie ergänzend am Corner-Parser und
Set-Vorschlag geprüft:

- **partial-Readings zählen im Reducer nicht:** `packages/core/src/stability.ts:72` —
  `const recognized = reading && reading.completeness === 'full' ? reading : null;` — `partial`
  wird wie „nichts erkannt" behandelt. Bestätigt.
- **Merge nur in nicht exportierte Einträge:** `packages/core/src/merge.ts:24-26` —
  `entries.findIndex((entry) => entry.exportedAt === null && mergeKey(entry) === key)`. Ein
  exportierter Treffer wird nicht gefunden, es entsteht ein neuer Eintrag. Bestätigt.
- **CSV-Split nach UTF-8-Bytes mit Header in jeder Datei:** `packages/core/src/csv.ts:119-133` —
  `flush()` schreibt `bomPrefix + headerLine + currentRows.join('')` in jede Datei; die
  Byte-Prüfung (`currentBytes + rowBytes > maxBytes`) nutzt `utf8ByteLength` (Z.73-85), nicht
  `String.length`. Bestätigt, keine Zeile wird geteilt (jede `rowLine` wird atomar gepusht).
- **404 als Result statt Exception:** `packages/scryfall/src/client.ts:121-122, 131-133,
  144-146` — alle drei Lookup-Pfade (`getCardBySetNumber` primär/Fallback, `getCardByName`)
  geben bei Status 404 `{ ok: false, reason: 'not_found' }` zurück, keine geworfene Exception.
- **Sprach-Fallback mit `languageFallback`:** `packages/scryfall/src/client.ts:124-129` — bei
  404 der Sprachversion wird ohne `lang` erneut angefragt und bei Erfolg
  `mapCard(raw, true)` aufgerufen (`languageFallback: true`); Erstversuch nutzt `mapCard(raw,
  false)` (Z.119). Bestätigt.
- Ergänzend geprüft: **Corner-Parser** (`fixedSet` überschreibt/ignoriert gelesenen Set-Code,
  `corner-parser.ts:140-145`; `knownSetCodes`-Korrektur nur bidirektional bei gesetzter Liste,
  Z.93-102) und **Set-Vorschlag** (Fenster über die letzten `repeatAfterDismiss` Karten seit
  Ablehnung, nicht die gesamte Historie, `set-suggest.ts:26-31`) — beide konform.
- Ergänzend geprüft: **Mapping** (`packages/scryfall/src/mapping.ts`) reicht nur die vier
  benötigten Felder (`id`, `name`, `set`, `collector_number`) durch, keine vollständigen
  Scryfall-Objekte. **Queue** (`packages/scryfall/src/queue.ts`) serialisiert strikt über eine
  Promise-Chain mit `minIntervalMs`-Wartezeit vor jedem Task.

## 6. VERIFY-Stellen

**Status: OK** — alle 7 im Repo gefundenen `// VERIFY:`-Markierungen sind 1:1 und mit korrekter
Zeilennummer in `ITERATION_A.md` (Abschnitt „Bewusste Annahmen“) gelistet, keine fehlt, keine
Listenzeile ist veraltet:

| Fundstelle (aktuell) | In `ITERATION_A.md` gelistet? |
|---|---|
| `packages/core/src/corner-parser.ts:12` | Ja, Zeile 47 |
| `packages/core/src/corner-parser.ts:106` | Ja, Zeile 48 |
| `packages/core/src/stability.ts:65` | Ja, Zeile 49 |
| `packages/core/src/csv.ts:25` | Ja, Zeile 50 |
| `packages/scryfall/src/client.ts:11` | Ja, Zeile 51 |
| `packages/scryfall/src/client.ts:45` | Ja, Zeile 52 |
| `packages/scryfall/src/client.ts:159` | Ja, Zeile 53 |

`packages/core/dist/index.d.ts` enthält zwei weitere Treffer, das sind aber Build-Artefakte
(gitignored, nicht Quellcode) und zählen nicht als eigenständige Stellen.

## 7. Konventionen (`CLAUDE.md`)

**Status: OK, mit einer geringfügigen Dokumentationsungenauigkeit.**

- „`fetch` immer injizieren" — eingehalten (siehe Punkt 3).
- „Result-Typen statt Exceptions" — eingehalten (`LookupResult`, siehe Punkt 5).
- „Funktionen in `core` sind immutabel" — stichprobenartig per `grep` auf `.push(/.splice(/.sort(`
  geprüft: alle mutierenden Aufrufe (`corner-parser.ts:73`, `csv.ts:120/130`, `merge.ts:12`)
  wirken ausschließlich auf lokal erzeugte Arrays/Kopien, nie auf Eingabeparameter. Bestätigt
  auch explizit per Test in `merge.test.ts:123` und `:144`.
- „Kein `composite: true` in den Paket-`tsconfig.json`s" (`CLAUDE.md:31`) — bestätigt, kein
  Treffer in `packages/*/tsconfig.json`.
- **Abweichung (geringfügig, rein dokumentarisch):** `CLAUDE.md:29-30` behauptet, die
  Root-Skripte `typecheck` **und** `build` würden `core` „deshalb explizit zuerst" bauen.
  Tatsächlich hat nur `typecheck` (`package.json:11`,
  `pnpm --filter @pesel512/archivar-core run build && pnpm -r run typecheck`) einen expliziten
  Vorab-Build. `build` (`package.json:9`, `"pnpm -r run build"`) verlässt sich auf pnpms
  implizite topologische Ausführungsreihenfolge über die `workspace:*`-Abhängigkeit — das
  funktioniert nachweislich korrekt (per Test verifiziert: `core` wird vor `scryfall` gebaut),
  ist aber nicht „explizit" im Sinne des Textes. Keine Funktionsauswirkung, nur eine
  ungenaue Formulierung.
- Scope-Treue: `find packages -maxdepth 1 -type d` zeigt nur `packages/core` und
  `packages/scryfall`; kein `apps/`-Verzeichnis vorhanden; `pnpm-workspace.yaml` verweist nur
  auf `packages/*`. Keine vorzeitig angelegten Pakete für `camera`, `ocr-worker`, `react` oder
  eine App.

## 8. Git

**Status: OK**

- `git status` → „nothing to commit, working tree clean".
- `git rev-parse HEAD` und `git rev-parse origin/main` sind identisch (`f464e9e`) — vollständig
  gepusht, kein lokal fortgeschrittener oder zurückgebliebener Stand.
- `git ls-files | grep -E "dist/|coverage/|node_modules/"` → keine Treffer, keine
  Build-/Coverage-Artefakte versehentlich getrackt.

## Priorisierte Nacharbeiten

1. **Niedrig — erledigt.** `package.json:9` (`build`-Skript) baut `@pesel512/archivar-core`
   jetzt per `pnpm --filter @pesel512/archivar-core run build &&` explizit vor, analog zu
   `typecheck`. Die Aussage in `CLAUDE.md:29-30` stimmt damit. Verifiziert: `pnpm lint`,
   `pnpm typecheck`, `pnpm test` und `pnpm build` (von sauberem Zustand, `dist/` vorher
   gelöscht) laufen grün.
2. **Sehr niedrig / optional — erledigt.** Lokale Konstante in
   `packages/core/src/set-suggest.ts` von `window` in `windowCodes` umbenannt (Zeile 29-31),
   um jede Verwechslung mit dem Browser-Global auszuschließen. Verifiziert: `pnpm lint`,
   `pnpm typecheck`, `pnpm test` laufen grün.

Keine weiteren Nacharbeiten identifiziert. Iteration A erfüllt alle Akzeptanzkriterien aus
`LOOP_PROMPT_A.md` unverändert.
