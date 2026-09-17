import { describe, expect, it } from 'vitest';
import { buildWhitelist } from './whitelist.js';

describe('buildWhitelist', () => {
  it('enthält ohne Set Ziffern, alle Großbuchstaben, Leerzeichen, / und die Foil-Trennzeichen', () => {
    const whitelist = buildWhitelist(null);
    for (const ch of '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ /★*•·.') {
      expect(whitelist).toContain(ch);
    }
  });

  it('beschränkt die Set-Code-Buchstaben mit fixem Set (MOM) auf die Buchstaben dieses Codes', () => {
    const whitelist = buildWhitelist('MOM');
    expect(whitelist).toContain('M');
    expect(whitelist).toContain('O');
    // Rarity- und Sprachcode-Buchstaben bleiben trotzdem enthalten.
    expect(whitelist).toContain('C');
    expect(whitelist).toContain('E');
    // Buchstaben, die weder im Set-Code noch bei Rarity/Sprache vorkommen, fehlen.
    expect(whitelist).not.toContain('Q');
    expect(whitelist).not.toContain('X');
  });

  it('verarbeitet Ziffern innerhalb eines Set-Codes (40K) korrekt — nur der Buchstabe wird übernommen', () => {
    const whitelist = buildWhitelist('40K');
    expect(whitelist).toContain('K');
    expect(whitelist).toContain('4');
    expect(whitelist).toContain('0');
  });

  it('enthält keine doppelten Zeichen', () => {
    const whitelist = buildWhitelist(null);
    expect(new Set(whitelist).size).toBe(whitelist.length);

    const withSet = buildWhitelist('MOM');
    expect(new Set(withSet).size).toBe(withSet.length);
  });

  it('enthält die Foil-Trennzeichen auch mit fixem Set', () => {
    const whitelist = buildWhitelist('MOM');
    for (const ch of '★*•·.') {
      expect(whitelist).toContain(ch);
    }
  });

  it('normalisiert einen kleingeschriebenen fixen Set-Code auf Großbuchstaben', () => {
    expect(buildWhitelist('mom')).toBe(buildWhitelist('MOM'));
  });
});
