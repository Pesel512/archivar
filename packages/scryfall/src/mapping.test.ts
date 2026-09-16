import { describe, expect, it } from 'vitest';
import { mapCard, type RawScryfallCard } from './mapping.js';

function rawCard(overrides: Partial<RawScryfallCard> = {}): RawScryfallCard {
  return {
    id: 'id-1',
    name: 'Shivan Dragon',
    set: 'dom',
    collector_number: '168',
    finishes: ['nonfoil', 'foil'],
    ...overrides,
  };
}

describe('mapCard', () => {
  it('übernimmt finishes von Scryfall unverändert, wenn alle bekannt sind', () => {
    const result = mapCard(rawCard({ finishes: ['nonfoil', 'foil', 'etched'] }), false);
    expect(result.finishes).toEqual(['nonfoil', 'foil', 'etched']);
  });

  it('übernimmt eine einzelne Finish (z. B. nur etched)', () => {
    const result = mapCard(rawCard({ finishes: ['etched'] }), false);
    expect(result.finishes).toEqual(['etched']);
  });

  it('verwirft unbekannte Finish-Werte', () => {
    const result = mapCard(rawCard({ finishes: ['nonfoil', 'signed', 'glossy'] }), false);
    expect(result.finishes).toEqual(['nonfoil']);
  });

  it('leere finishes-Liste bleibt leer', () => {
    const result = mapCard(rawCard({ finishes: [] }), false);
    expect(result.finishes).toEqual([]);
  });

  it('mapped die übrigen Felder unverändert', () => {
    const result = mapCard(rawCard(), true);
    expect(result).toEqual({
      scryfallId: 'id-1',
      name: 'Shivan Dragon',
      setCode: 'DOM',
      collectorNumber: '168',
      languageFallback: true,
      finishes: ['nonfoil', 'foil'],
    });
  });
});
