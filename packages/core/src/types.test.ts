import { describe, expect, it } from 'vitest';
import { toReadingKey } from './types.js';

describe('toReadingKey', () => {
  it('baut den Key aus Großbuchstaben-Set-Code und Nummer', () => {
    expect(toReadingKey('DOM', '168')).toBe('DOM:168');
  });

  it('normalisiert einen kleingeschriebenen Set-Code zu Großbuchstaben', () => {
    expect(toReadingKey('dom', '168')).toBe('DOM:168');
  });

  it('normalisiert gemischte Groß-/Kleinschreibung', () => {
    expect(toReadingKey('DoM', '42a')).toBe('DOM:42a');
  });

  it('lässt die Sammlernummer unverändert (Buchstabensuffix bleibt erhalten)', () => {
    expect(toReadingKey('SNC', '123s')).toBe('SNC:123s');
  });
});
