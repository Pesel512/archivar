import { describe, expect, it } from 'vitest';
import { addScan, markExported, mergeKey, pendingExport, type AddScanResult } from './merge.js';
import type { CollectionEntry, ResolvedCard } from './types.js';

function expectOk(result: AddScanResult): CollectionEntry[] {
  if (!result.ok) throw new Error(`expected ok result, got: ${JSON.stringify(result)}`);
  return result.entries;
}

function resolvedCard(overrides: Partial<ResolvedCard> = {}): ResolvedCard {
  return {
    scryfallId: 'sc-1',
    name: 'Test Card',
    setCode: 'DOM',
    collectorNumber: '168',
    languageFallback: false,
    finishes: ['nonfoil', 'foil'],
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

function scanInput(
  overrides: Partial<Omit<CollectionEntry, 'id' | 'quantity' | 'exportedAt'>> & {
    quantity?: number;
  } = {},
) {
  return {
    card: resolvedCard(),
    finish: 'nonfoil' as const,
    language: 'en' as const,
    condition: 'NM' as const,
    tags: [],
    scannedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

function nextId(prefix = 'new'): () => string {
  let n = 0;
  return () => `${prefix}-${(n += 1)}`;
}

describe('mergeKey', () => {
  it('kombiniert scryfallId, finish, language, condition', () => {
    expect(mergeKey(entry())).toBe('sc-1|nonfoil|en|NM');
  });
});

describe('addScan', () => {
  it('gleicher Key in nicht exportiertem Eintrag → Menge erhöht', () => {
    const entries = [entry({ quantity: 2 })];
    const result = expectOk(addScan(entries, scanInput({ quantity: 3 }), nextId()));

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'e1', quantity: 5 });
  });

  it('anderes Finish → neuer Eintrag', () => {
    const entries = [entry()];
    const result = expectOk(addScan(entries, scanInput({ finish: 'foil' }), nextId()));

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: 'new-1', finish: 'foil', quantity: 1 });
  });

  it('andere Sprache → neuer Eintrag', () => {
    const entries = [entry()];
    const result = expectOk(addScan(entries, scanInput({ language: 'de' }), nextId()));

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: 'new-1', language: 'de', quantity: 1 });
  });

  it('anderer Zustand → neuer Eintrag', () => {
    const entries = [entry()];
    const result = expectOk(addScan(entries, scanInput({ condition: 'LP' }), nextId()));

    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ id: 'new-1', condition: 'LP', quantity: 1 });
  });

  it('exportierter Eintrag mit gleichem Key wird nicht verändert, neuer Eintrag entsteht', () => {
    const exported = entry({ exportedAt: '2026-01-01T00:00:00.000Z', quantity: 4 });
    const entries = [exported];
    const result = expectOk(addScan(entries, scanInput(), nextId()));

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(exported);
    expect(result[1]).toMatchObject({ id: 'new-1', quantity: 1, exportedAt: null });
  });

  it('vereinigt Tags beim Merge ohne Duplikate, Reihenfolge stabil', () => {
    const entries = [entry({ tags: ['alpha', 'beta'] })];
    const result = expectOk(addScan(entries, scanInput({ tags: ['beta', 'gamma'] }), nextId()));

    expect(result[0]?.tags).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('lässt andere Einträge beim Merge unverändert', () => {
    const other = entry({ id: 'other', card: resolvedCard({ scryfallId: 'sc-2' }) });
    const target = entry({ id: 'target', quantity: 1 });
    const result = expectOk(addScan([other, target], scanInput({ quantity: 1 }), nextId()));

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(other);
    expect(result[1]).toMatchObject({ id: 'target', quantity: 2 });
  });

  it('neuer Eintrag ohne quantity-Angabe erhält Menge 1', () => {
    const result = expectOk(addScan([], scanInput(), nextId()));
    expect(result[0]).toMatchObject({ quantity: 1 });
  });

  it('mutiert das Eingabe-Array und dessen Einträge nicht', () => {
    const original = entry({ quantity: 1, tags: ['alpha'] });
    const entries = [original];
    const snapshot = JSON.parse(JSON.stringify(entries));

    addScan(entries, scanInput({ tags: ['beta'] }), nextId());

    expect(entries).toEqual(snapshot);
    expect(entries[0]).toBe(original);
  });

  it('Finish nicht in card.finishes → Eintrag wird nicht übernommen', () => {
    const entries = [entry()];
    const result = addScan(
      entries,
      scanInput({ finish: 'etched', card: resolvedCard({ finishes: ['nonfoil', 'foil'] }) }),
      nextId(),
    );

    expect(result).toEqual({ ok: false, reason: 'invalid_finish', available: ['nonfoil', 'foil'] });
    expect(entries).toHaveLength(1); // Eingabe unverändert, kein Eintrag hinzugefügt
  });

  it('card.finishes leer → jedes Finish wird abgelehnt', () => {
    const result = addScan(
      [],
      scanInput({ finish: 'nonfoil', card: resolvedCard({ finishes: [] }) }),
      nextId(),
    );

    expect(result).toEqual({ ok: false, reason: 'invalid_finish', available: [] });
  });
});

describe('markExported', () => {
  it('setzt exportedAt nur für angegebene IDs', () => {
    const entries = [entry({ id: 'a' }), entry({ id: 'b' })];
    const result = markExported(entries, ['a'], '2026-02-01T00:00:00.000Z');

    expect(result.find((e) => e.id === 'a')?.exportedAt).toBe('2026-02-01T00:00:00.000Z');
    expect(result.find((e) => e.id === 'b')?.exportedAt).toBeNull();
  });

  it('mutiert das Eingabe-Array nicht', () => {
    const entries = [entry({ id: 'a' })];
    const snapshot = JSON.parse(JSON.stringify(entries));

    markExported(entries, ['a'], '2026-02-01T00:00:00.000Z');

    expect(entries).toEqual(snapshot);
  });
});

describe('pendingExport', () => {
  it('filtert nur nicht exportierte Einträge', () => {
    const entries = [
      entry({ id: 'a', exportedAt: null }),
      entry({ id: 'b', exportedAt: '2026-01-01T00:00:00.000Z' }),
      entry({ id: 'c', exportedAt: null }),
    ];

    const result = pendingExport(entries);

    expect(result.map((e) => e.id)).toEqual(['a', 'c']);
  });
});
