import { LANGUAGE_CODE_TABLE, type Rarity } from '@pesel512/archivar-core';

// Seltenheitsbuchstaben aus Rarity (types.ts) — dort nicht als Wertliste exportiert,
// deshalb hier über den Typ dupliziert statt aus core importiert.
const RARITY_LETTERS: readonly Rarity[] = ['C', 'U', 'R', 'M', 'S', 'L', 'T'];

const DIGITS = '0123456789';
const UPPERCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// VERIFY: ob das englische Tesseract-Modell '★', '•' und '·' überhaupt erkennen kann.
// Wenn nicht, ist der Foil-Hinweis in der Praxis immer null.
const FOIL_SEPARATORS = '★*•·.';

function dedupe(chars: string): string {
  return [...new Set(chars)].join('');
}

/**
 * Zeichen-Whitelist für den Ecken-Aufdruck.
 * Ohne festes Set: Ziffern, alle Großbuchstaben (Set-Code, Rarity, Sprachcode unbekannt),
 * Leerzeichen, `/`, Foil-Trennzeichen.
 * Mit festem Set: nur die Buchstaben dieses Set-Codes statt aller Großbuchstaben, dazu
 * Rarity- und Sprachcode-Buchstaben — reduziert O/0-, I/1-, B/8-Verwechslungen.
 */
export function buildWhitelist(fixedSet: string | null): string {
  const letters =
    fixedSet === null
      ? UPPERCASE_LETTERS
      : [...fixedSet.toUpperCase()].filter((ch) => /[A-Z]/.test(ch)).join('') +
        RARITY_LETTERS.join('') +
        Object.keys(LANGUAGE_CODE_TABLE).join('');

  return dedupe(DIGITS + letters + ' ' + '/' + FOIL_SEPARATORS);
}
