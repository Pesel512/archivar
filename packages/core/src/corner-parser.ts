import type { CornerReading, LanguageCode, Rarity } from './types.js';

export interface ParseContext {
  fixedSet?: string | null;
  knownSetCodes?: ReadonlySet<string>;
}

const RARITY_LETTERS: ReadonlySet<Rarity> = new Set(['C', 'U', 'R', 'M', 'S', 'L', 'T']);

/**
 * Gedruckter Sprachcode -> internes LanguageCode.
 * // VERIFY: an echten Karten prüfen, insbesondere CS/CT (vereinfachtes/traditionelles Chinesisch)
 * und JP vs. JA — Startwerte stammen aus Scryfall-Dokumentation, nicht aus Kartenscans.
 */
export const LANGUAGE_CODE_TABLE: Readonly<Record<string, LanguageCode>> = {
  EN: 'en',
  DE: 'de',
  FR: 'fr',
  IT: 'it',
  ES: 'es',
  PT: 'pt',
  JP: 'ja',
  JA: 'ja',
  KO: 'ko',
  RU: 'ru',
  CS: 'zhs',
  CT: 'zht',
};

// OCR-Verwechslungen im Nummernkontext. Gilt nicht für Set-Codes.
const NUMBER_OCR_SUBSTITUTIONS: Readonly<Record<string, string>> = {
  O: '0',
  I: '1',
  l: '1',
  '|': '1',
};

// Bidirektionale Verwechslungen für Set-Codes, nur angewandt wenn knownSetCodes gesetzt ist.
const SET_CODE_OCR_SUBSTITUTIONS: Readonly<Record<string, string>> = {
  '0': 'O',
  O: '0',
  '1': 'I',
  I: '1',
  '5': 'S',
  S: '5',
  '8': 'B',
  B: '8',
};

function parseCollectorNumber(rawToken: string): string | null {
  // split('/') liefert immer mindestens ein Element.
  const beforeSlash = rawToken.split('/')[0]!;
  const corrected = Array.from(beforeSlash)
    .map((ch) => NUMBER_OCR_SUBSTITUTIONS[ch] ?? ch)
    .join('');
  const match = /^(\d+)([A-Za-z]?)$/.exec(corrected);
  if (!match) return null;
  // Beide Gruppen matchen laut Pattern immer (Gruppe 2 ggf. leer, nie undefined).
  const digits = match[1]!;
  const suffix = match[2]!;
  return String(Number(digits)) + suffix;
}

function isRarityLetter(token: string): boolean {
  return RARITY_LETTERS.has(token.toUpperCase() as Rarity);
}

function generateSetCodeVariants(code: string): string[] {
  const positions: number[] = [];
  for (let i = 0; i < code.length; i += 1) {
    const char = code[i];
    if (char !== undefined && char in SET_CODE_OCR_SUBSTITUTIONS) {
      positions.push(i);
    }
  }
  const variants = new Set<string>();
  const total = 1 << positions.length;
  for (let mask = 0; mask < total; mask += 1) {
    const chars = code.split('');
    positions.forEach((pos, bitIndex) => {
      if (mask & (1 << bitIndex)) {
        // pos stammt aus positions, also ein gültiger Index in code.
        const original = code[pos]!;
        chars[pos] = SET_CODE_OCR_SUBSTITUTIONS[original] ?? original;
      }
    });
    variants.add(chars.join(''));
  }
  variants.delete(code);
  return [...variants];
}

function resolveSetCode(rawToken: string, ctx: ParseContext | undefined): string | null {
  const upper = rawToken.toUpperCase();
  if (!/^[A-Z0-9]{3,5}$/.test(upper)) return null;
  if (!ctx?.knownSetCodes) return upper;
  if (ctx.knownSetCodes.has(upper)) return upper;
  for (const variant of generateSetCodeVariants(upper)) {
    if (ctx.knownSetCodes.has(variant)) return variant;
  }
  return null;
}

/**
 * Trennzeichen zwischen Set- und Sprachcode als Foil-Hinweis.
 * // VERIFY: an echten Karten prüfen — Symbol variiert je nach Set/Druckjahr.
 */
function resolveFoilHint(sepToken: string): boolean | null {
  if (sepToken === '★' || sepToken === '*') return true;
  if (sepToken === '•' || sepToken === '·' || sepToken === '.') return false;
  return null;
}

function resolveLanguage(langToken: string): LanguageCode | null {
  return LANGUAGE_CODE_TABLE[langToken.toUpperCase()] ?? null;
}

export function parseCorner(raw: string, ctx?: ParseContext): CornerReading | null {
  const tokens = raw.split(/\s+/).filter((token) => token.length > 0);
  const numberToken = tokens[0];
  if (numberToken === undefined) return null;

  const collectorNumber = parseCollectorNumber(numberToken);
  if (collectorNumber === null) return null;

  let idx = 1;
  let rarity: Rarity | null = null;
  const maybeRarityToken = tokens[idx];
  if (maybeRarityToken !== undefined && maybeRarityToken.length === 1 && isRarityLetter(maybeRarityToken)) {
    rarity = maybeRarityToken.toUpperCase() as Rarity;
    idx += 1;
  }

  const setToken = tokens[idx];
  idx += 1;
  const sepToken = tokens[idx];
  idx += 1;
  const langToken = tokens[idx];

  const fixedSet = ctx?.fixedSet;
  const setCode = fixedSet
    ? fixedSet.toUpperCase()
    : setToken !== undefined
      ? resolveSetCode(setToken, ctx)
      : null;

  const foilHint = sepToken !== undefined ? resolveFoilHint(sepToken) : null;
  const language = langToken !== undefined ? resolveLanguage(langToken) : null;

  return {
    collectorNumber,
    setCode,
    rarity,
    language,
    foilHint,
    completeness: setCode !== null ? 'full' : 'partial',
  };
}
