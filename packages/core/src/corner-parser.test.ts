import { describe, expect, it } from 'vitest';
import { parseCorner } from './corner-parser.js';

describe('parseCorner — Pflicht-Testfälle', () => {
  it('vollständiges Reading ohne Foil', () => {
    expect(parseCorner('0168 R\nDOM • EN')).toEqual({
      collectorNumber: '168',
      setCode: 'DOM',
      rarity: 'R',
      language: 'en',
      foilHint: false,
      completeness: 'full',
    });
  });

  it('vollständiges Reading mit Foil-Hinweis', () => {
    const result = parseCorner('0168 R\nDOM ★ DE');
    expect(result?.foilHint).toBe(true);
    expect(result?.language).toBe('de');
  });

  it('Sammlernummer vor "/" gesamt, Rest verworfen', () => {
    const result = parseCorner('168/280 U\nM20 • EN');
    expect(result?.collectorNumber).toBe('168');
    expect(result?.setCode).toBe('M20');
  });

  it('OCR-Korrektur O→0 im Nummernkontext', () => {
    const result = parseCorner('O168 R\nDOM • EN');
    expect(result?.collectorNumber).toBe('168');
  });

  it('Buchstabensuffix an der Sammlernummer bleibt erhalten', () => {
    const result = parseCorner('0123s M\nSNC • EN');
    expect(result?.collectorNumber).toBe('123s');
  });

  it('vierstellige Nummer ohne führende Nullen bleibt unverändert', () => {
    const result = parseCorner('1234 R\nSLD • EN');
    expect(result?.collectorNumber).toBe('1234');
  });

  it('direkter Treffer in knownSetCodes ohne Korrektur nötig', () => {
    const result = parseCorner('0168 R\nDOM • EN', { knownSetCodes: new Set(['DOM']) });
    expect(result?.setCode).toBe('DOM');
  });

  it('Set-Code-Korrektur via knownSetCodes (0↔O)', () => {
    const result = parseCorner('0168 R\nD0M • EN', { knownSetCodes: new Set(['DOM']) });
    expect(result?.setCode).toBe('DOM');
  });

  it('keine Set-Code-Korrektur ohne knownSetCodes', () => {
    const result = parseCorner('0168 R\nD0M • EN');
    expect(result?.setCode).toBe('D0M');
  });

  it('fixedSet ohne zweite Zeile: nur Nummer nötig', () => {
    const result = parseCorner('0042', { fixedSet: 'MOM' });
    expect(result).toEqual({
      collectorNumber: '42',
      setCode: 'MOM',
      rarity: null,
      language: null,
      foilHint: null,
      completeness: 'full',
    });
  });

  it('fixedSet überschreibt abweichend gelesenen Set-Code', () => {
    const result = parseCorner('0042\nXYZ • EN', { fixedSet: 'MOM' });
    expect(result?.setCode).toBe('MOM');
  });

  it('keine zweite Zeile ohne fixedSet ergibt partial mit setCode null', () => {
    const result = parseCorner('0042');
    expect(result?.completeness).toBe('partial');
    expect(result?.setCode).toBeNull();
  });

  it('keine Nummer erkennbar ergibt null', () => {
    expect(parseCorner('R\nDOM • EN')).toBeNull();
  });

  it('leere Eingabe ergibt null', () => {
    expect(parseCorner('')).toBeNull();
  });

  it('reines Rauschen ergibt null', () => {
    expect(parseCorner('~~ ;;')).toBeNull();
  });

  it('Sprachcode CS wird zu zhs gemappt', () => {
    const result = parseCorner('0168 R\nDOM • CS');
    expect(result?.language).toBe('zhs');
  });
});

describe('parseCorner — weitere Fälle', () => {
  it('Sprachcode CT wird zu zht gemappt', () => {
    expect(parseCorner('0168 R\nDOM • CT')?.language).toBe('zht');
  });

  it('Sprachcode JP wird zu ja gemappt', () => {
    expect(parseCorner('0168 R\nDOM • JP')?.language).toBe('ja');
  });

  it('unbekannter Sprachcode ergibt language null', () => {
    expect(parseCorner('0168 R\nDOM • XX')?.language).toBeNull();
  });

  it('unbekanntes Trennzeichen ergibt foilHint null', () => {
    expect(parseCorner('0168 R\nDOM ? EN')?.foilHint).toBeNull();
  });

  it('Punkt als Trennzeichen ergibt foilHint false', () => {
    expect(parseCorner('0168 R\nDOM . EN')?.foilHint).toBe(false);
  });

  it('ohne Rarity-Buchstabe wird direkt der Set-Code erkannt', () => {
    const result = parseCorner('0168\nDOM • EN');
    expect(result?.rarity).toBeNull();
    expect(result?.setCode).toBe('DOM');
  });

  it('Set-Code mit 5 Zeichen wird akzeptiert (PLST)', () => {
    expect(parseCorner('0042 C\nPLST • EN')?.setCode).toBe('PLST');
  });

  it('Set-Code mit Ziffern wird akzeptiert (40K, 2X2)', () => {
    expect(parseCorner('0042 C\n40K • EN')?.setCode).toBe('40K');
    expect(parseCorner('0042 C\n2X2 • EN')?.setCode).toBe('2X2');
  });

  it('knownSetCodes ohne passende Korrektur ergibt setCode null', () => {
    const result = parseCorner('0168 R\nZZZ • EN', { knownSetCodes: new Set(['DOM']) });
    expect(result?.setCode).toBeNull();
    expect(result?.completeness).toBe('partial');
  });

  it('Set-Code kürzer als 3 Zeichen wird nicht akzeptiert', () => {
    const result = parseCorner('0042 C\nAB • EN');
    expect(result?.setCode).toBeNull();
    expect(result?.completeness).toBe('partial');
  });
});
