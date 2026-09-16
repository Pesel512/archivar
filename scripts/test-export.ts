/**
 * Einmaliges Hilfsskript für den Archidekt-Testimport (siehe ITERATION_A.md, „Bewusste
 * Annahmen“ zu DEFAULT_CSV_VALUE_MAP). Kein Teil der Pakete unter packages/ — importiert
 * core/scryfall direkt aus deren gebauten dist/-Ausgaben, damit weder packages/ noch die
 * Root-package.json für dieses Skript geändert werden müssen.
 *
 * Voraussetzung: `pnpm build` wurde vorher ausgeführt (dist/ existiert für core + scryfall).
 * Ausführen mit: node scripts/test-export.ts
 * Erzeugt test-import.csv im Repo-Root (nicht eingecheckt, siehe .gitignore).
 */
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import {
  toArchidektCsv,
  type CollectionEntry,
  type Condition,
  type Finish,
  type LanguageCode,
} from '../packages/core/dist/index.js';
import { createScryfallClient } from '../packages/scryfall/dist/index.js';

interface CardSpec {
  set: string;
  number: string;
  lookupLang?: LanguageCode;
  finish: Finish;
  language: LanguageCode;
  condition: Condition;
  tags: string[];
}

// Real existierende Karten, per curl gegen die Scryfall-API verifiziert:
// - m11/149 (Lightning Bolt, en): finishes nonfoil+foil
// - dmr/457 (Counterspell / „Gegenzauber“): hat eine deutsche Druckfassung
// - acr/262 (Sword of Light and Shadow, en): finish etched
const CARDS: CardSpec[] = [
  {
    set: 'm11',
    number: '149',
    lookupLang: 'en',
    finish: 'nonfoil',
    language: 'en',
    condition: 'NM',
    tags: ['Test'],
  },
  {
    set: 'm11',
    number: '149',
    lookupLang: 'en',
    finish: 'foil',
    language: 'en',
    condition: 'NM',
    tags: ['Test'],
  },
  {
    set: 'dmr',
    number: '457',
    lookupLang: 'de',
    finish: 'nonfoil',
    language: 'de',
    condition: 'LP',
    tags: ['Test'],
  },
  {
    set: 'acr',
    number: '262',
    lookupLang: 'en',
    finish: 'etched',
    language: 'en',
    condition: 'MP',
    tags: ['Test', 'Karton 01'],
  },
];

async function main(): Promise<void> {
  const client = createScryfallClient({ fetch });

  const entries: CollectionEntry[] = [];
  for (const spec of CARDS) {
    const result = await client.getCardBySetNumber(spec.set, spec.number, spec.lookupLang);
    if (!result.ok) {
      const langSuffix = spec.lookupLang ? `/${spec.lookupLang}` : '';
      throw new Error(
        `Karte ${spec.set}/${spec.number}${langSuffix} nicht auflösbar: ${result.reason}`,
      );
    }

    entries.push({
      id: randomUUID(),
      card: result.card,
      quantity: 1,
      finish: spec.finish,
      language: spec.language,
      condition: spec.condition,
      tags: spec.tags,
      scannedAt: new Date().toISOString(),
      exportedAt: null,
    });

    console.log(
      `Aufgelöst: ${result.card.name} (${result.card.setCode} ${result.card.collectorNumber}), ` +
        `languageFallback=${result.card.languageFallback}`,
    );
  }

  const files = toArchidektCsv(entries);
  if (files.length !== 1) {
    console.warn(`Erwartet eine CSV-Datei, erhalten: ${files.length}. Schreibe nur die erste.`);
  }
  writeFileSync('test-import.csv', files[0] ?? '');
  console.log(`test-import.csv geschrieben mit ${entries.length} Einträgen.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
