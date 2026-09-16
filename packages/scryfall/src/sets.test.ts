import { describe, expect, it } from 'vitest';
import { searchSets, type PhysicalSet } from './sets.js';

function set(overrides: Partial<PhysicalSet> = {}): PhysicalSet {
  return {
    code: 'DOM',
    name: 'Dominaria',
    releasedAt: '2018-04-27',
    setType: 'expansion',
    ...overrides,
  };
}

describe('searchSets', () => {
  it('priorisiert Code-Präfix-Treffer vor Namens-Treffern, Reihenfolge bleibt erhalten', () => {
    const sets = [
      set({ code: 'MOM', name: 'March of the Machine', releasedAt: '2023-04-21' }),
      set({ code: 'DMR', name: 'Dominaria Remastered', releasedAt: '2023-01-13' }),
      set({ code: 'DOM', name: 'Dominaria', releasedAt: '2018-04-27' }),
    ];

    const result = searchSets('dom', sets);

    // "DOM" ist Code-Präfix-Treffer, "DMR" nur Namens-Treffer ("Dominaria" enthalten),
    // "MOM" kein Treffer. Code-Präfix zuerst, Reihenfolge innerhalb der Gruppe bleibt.
    expect(result.map((s) => s.code)).toEqual(['DOM', 'DMR']);
  });

  it('leere Query liefert alle Sets unverändert sortiert', () => {
    const sets = [set({ code: 'A' }), set({ code: 'B' })];
    expect(searchSets('', sets)).toEqual(sets);
  });

  it('Namenstreffer ohne Code-Präfix-Treffer', () => {
    const sets = [set({ code: 'DOM', name: 'Dominaria' })];
    expect(searchSets('domin', sets).map((s) => s.code)).toEqual(['DOM']);
  });

  it('kein Treffer ergibt leeres Array', () => {
    const sets = [set({ code: 'DOM', name: 'Dominaria' })];
    expect(searchSets('xyz', sets)).toEqual([]);
  });
});
