import { describe, expect, it } from 'vitest';
import { normalize } from './normalize.js';

describe('normalize', () => {
  it('liefert einen leeren String für eine leere Eingabe', () => {
    expect(normalize('')).toBe('');
  });

  it('liefert einen leeren String, wenn nur Leerzeichen/Leerzeilen enthalten sind', () => {
    expect(normalize('   \n\n  \n')).toBe('');
  });

  it('reduziert Mehrfach-Leerzeichen innerhalb einer Zeile auf ein einzelnes', () => {
    expect(normalize('123   M    MOM   •   EN')).toBe('123 M MOM • EN');
  });

  it('entfernt leere Zeilen', () => {
    expect(normalize('123 M MOM\n\n\n• EN')).toBe('123 M MOM\n• EN');
  });

  it('entfernt ein Artefakt-"|" am Zeilenanfang', () => {
    expect(normalize('|123 M MOM')).toBe('123 M MOM');
    expect(normalize('  |123 M MOM')).toBe('123 M MOM');
    expect(normalize('||123 M MOM')).toBe('123 M MOM');
  });

  it('trimmt führende und abschließende Leerzeichen je Zeile', () => {
    expect(normalize('  123 M MOM  \n  • EN  ')).toBe('123 M MOM\n• EN');
  });
});
