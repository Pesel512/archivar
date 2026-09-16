import { describe, expect, it } from 'vitest';
import { DEFAULT_CSV_VALUE_MAP, toArchidektCsv, type CsvValueMap } from './csv.js';
import type { CollectionEntry, ResolvedCard } from './types.js';

// Dupliziert absichtlich die UTF-8-Bytelängen-Logik aus csv.ts, damit Tests unabhängig von
// Node-/DOM-APIs bleiben (core/tsconfig.json hat weder "dom" noch "node" in types/lib).
function byteLength(str: string): number {
  let bytes = 0;
  for (let i = 0; i < str.length; i += 1) {
    const codePoint = str.codePointAt(i);
    if (codePoint === undefined) continue;
    if (codePoint > 0xffff) i += 1;
    if (codePoint <= 0x7f) bytes += 1;
    else if (codePoint <= 0x7ff) bytes += 2;
    else if (codePoint <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

function resolvedCard(overrides: Partial<ResolvedCard> = {}): ResolvedCard {
  return {
    scryfallId: 'id-1',
    name: 'Test Card',
    setCode: 'ST',
    collectorNumber: '1',
    languageFallback: false,
    ...overrides,
  };
}

function entry(overrides: Partial<CollectionEntry> = {}): CollectionEntry {
  return {
    id: 'e1',
    card: resolvedCard(),
    quantity: 1,
    finish: 'nonfoil',
    language: 'en',
    condition: 'NM',
    tags: [],
    scannedAt: '2026-01-01T00:00:00.000Z',
    exportedAt: null,
    ...overrides,
  };
}

const SIMPLE_VALUE_MAP: CsvValueMap = {
  finish: { nonfoil: 'N', foil: 'F', etched: 'E' },
  language: { ...DEFAULT_CSV_VALUE_MAP.language, en: 'L' },
  condition: { ...DEFAULT_CSV_VALUE_MAP.condition, NM: 'C' },
  tagSeparator: ';',
};

describe('toArchidektCsv', () => {
  it('leere Eingabe ergibt leeres Array', () => {
    expect(toArchidektCsv([])).toEqual([]);
  });

  it('Header exakt', () => {
    const [file] = toArchidektCsv([entry()]);
    expect(file?.split('\n')[0]).toBe(
      'Quantity,Name,Set Code,Collector Number,Scryfall ID,Finish,Language,Condition,Tags',
    );
  });

  it('escaped Kommas im Namen', () => {
    const [file] = toArchidektCsv([entry({ card: resolvedCard({ name: 'Fire, Ice' }) })]);
    expect(file).toContain('"Fire, Ice"');
  });

  it('escaped Anführungszeichen im Namen (verdoppelt)', () => {
    const [file] = toArchidektCsv([
      entry({ card: resolvedCard({ name: 'Kongming, "Sleeping Dragon"' }) }),
    ]);
    expect(file).toContain('"Kongming, ""Sleeping Dragon"""');
  });

  it('escaped Zeilenumbrüche im Namen (Split-Karten)', () => {
    const [file] = toArchidektCsv([entry({ card: resolvedCard({ name: 'Fire // Ice\n' }) })]);
    expect(file).toContain('"Fire // Ice\n"');
  });

  it('zählt Umlaute korrekt in Bytes statt in Zeichen', () => {
    const ascii = toArchidektCsv([entry({ card: resolvedCard({ name: 'AAAA' }) })], {
      maxBytes: 10_000_000,
    })[0]!;
    const umlaut = toArchidektCsv([entry({ card: resolvedCard({ name: 'ÄÄÄÄ' }) })], {
      maxBytes: 10_000_000,
    })[0]!;

    // Gleiche Zeichenanzahl im Namen, aber Ä ist 2 Byte in UTF-8 statt 1 Byte wie A.
    expect(ascii.length).toBe(umlaut.length);
    expect(byteLength(umlaut)).toBe(byteLength(ascii) + 4);
  });

  it('zählt Zeichen außerhalb der BMP (z. B. Emoji) als 4 Bytes', () => {
    const plain = toArchidektCsv([entry({ tags: ['x'] })], { maxBytes: 10_000_000 })[0]!;
    const emoji = toArchidektCsv([entry({ tags: ['🂠'] })], { maxBytes: 10_000_000 })[0]!;

    expect(byteLength(emoji)).toBe(byteLength(plain) + 3);
  });

  it('Split bei kleiner maxBytes erzeugt mehrere Dateien mit Header, keine Zeile wird geteilt', () => {
    const entries = [
      entry({ id: 'a', card: resolvedCard({ name: 'Karte Eins' }) }),
      entry({ id: 'b', card: resolvedCard({ name: 'Karte Zwei' }) }),
      entry({ id: 'c', card: resolvedCard({ name: 'Karte Drei' }) }),
    ];

    const [single] = toArchidektCsv([entries[0]!], { maxBytes: 10_000_000 });
    const maxBytes = byteLength(single!) + 1; // reicht für Header + genau eine Zeile

    const files = toArchidektCsv(entries, { maxBytes });

    expect(files.length).toBeGreaterThan(1);
    const header =
      'Quantity,Name,Set Code,Collector Number,Scryfall ID,Finish,Language,Condition,Tags';
    for (const file of files) {
      expect(file.startsWith(header)).toBe(true);
      expect(byteLength(file)).toBeLessThanOrEqual(maxBytes);
    }
  });

  it('Summe der Zeilen über alle Dateien stimmt', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      entry({ id: `e${i}`, card: resolvedCard({ name: `Karte ${i}` }) }),
    );
    const [single] = toArchidektCsv([entries[0]!], { maxBytes: 10_000_000 });
    const maxBytes = byteLength(single!) + 1;

    const files = toArchidektCsv(entries, { maxBytes });
    // Jede Datei hat eine Headerzeile + N Datenzeilen (trailing \n erzeugt ein leeres Element).
    const totalNonEmptyLines = files.reduce(
      (sum, file) => sum + file.split('\n').filter((line) => line.length > 0).length,
      0,
    );
    expect(totalNonEmptyLines).toBe(entries.length + files.length);
  });

  it('eigene valueMap greift', () => {
    const [file] = toArchidektCsv([entry()], { valueMap: SIMPLE_VALUE_MAP });
    const [, row] = file!.split('\n');
    expect(row).toBe('1,Test Card,ST,1,id-1,N,L,C,');
  });

  it('mehrere Tags mit Separator', () => {
    const [file] = toArchidektCsv([entry({ tags: ['Alter', 'Foil'] })], {
      valueMap: { tagSeparator: ' | ' },
    });
    expect(file).toContain('Alter | Foil');
  });

  it('bom fügt ein Byte-Order-Mark voran', () => {
    const [file] = toArchidektCsv([entry()], { bom: true });
    expect(file?.startsWith('﻿')).toBe(true);
  });

  it('lineEnding \\r\\n wird verwendet', () => {
    const [file] = toArchidektCsv([entry()], { lineEnding: '\r\n' });
    expect(file).toContain('\r\n');
  });
});
