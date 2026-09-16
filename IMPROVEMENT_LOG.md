# Improvement Log

Chronologische Notizen zu Entscheidungen, Abweichungen und Nacharbeiten während der Loop-Iterationen.

## Iteration A

- A1: Grundgerüst angelegt (pnpm-Workspace, TypeScript, Vitest, ESLint/Prettier, tsup, CI).
  Keine Abweichungen vom Prompt.
- A2: Domänentypen in `core/types.ts` angelegt. Coverage-Konfiguration angepasst, damit reine
  Re-Export-Barrels (`index.ts`) nicht als ungetesteter Code gezählt werden.
- A3: Corner-Parser (`core/corner-parser.ts`) inkl. aller Pflicht-Testfälle. Zwei Annahmen
  (Sprachcode-Tabelle, Foil-Symbole) mit `// VERIFY:` markiert, siehe `STATE_A.md` „Offene
  Fragen“.
- A4: Stabilitäts-Reducer (`core/stability.ts`) mit allen Pflicht-Transitionen und -Sequenzen.
  Eine Annahme zur Cooldown-Semantik während validating/confirming mit `// VERIFY:` markiert.
- A5: Merge-Logik (`core/merge.ts`) inkl. aller Pflicht-Testfälle. Keine Abweichungen vom
  Prompt.
- A6: CSV-Export (`core/csv.ts`) für Archidekt. Wertetabellen komplett mit `// VERIFY:`
  markiert, siehe `STATE_A.md` „Offene Fragen“. Bytelängen-Berechnung bewusst ohne
  TextEncoder/Buffer implementiert, um `core` plattformneutral zu halten.
- A7: Set-Vorschlag (`core/set-suggest.ts`) inkl. aller Pflicht-Testfälle. Keine Abweichungen
  vom Prompt.
- A8: Scryfall-Client (`packages/scryfall`) inkl. aller Pflicht-Testfälle. `composite: true`
  aus beiden Paket-tsconfigs entfernt (brach tsups DTS-Bundler bei mehrdateiigen Paketen,
  TS6307); Root-`typecheck`/`build` bauen `core` seitdem explizit zuerst. Zwei Annahmen
  (Backoff-Basiswert, User-Agent) mit `// VERIFY:` markiert.
- A9: Iteration A abgeschlossen. `ITERATION_A.md` (Übersicht, Coverage, alle sieben
  `// VERIFY:`-Stellen mit Datei:Zeile, Akzeptanzkriterien) und `README.md`
  (Paketübersicht, Hinweis auf Iteration B am echten Gerät) angelegt. Keine Abweichungen vom
  Prompt; alle Akzeptanzkriterien aus `LOOP_PROMPT_A.md` erfüllt.
