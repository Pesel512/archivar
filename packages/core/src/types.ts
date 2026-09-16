export type Finish = 'nonfoil' | 'foil' | 'etched';

export type Condition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';

export type LanguageCode =
  | 'en'
  | 'de'
  | 'fr'
  | 'it'
  | 'es'
  | 'pt'
  | 'ja'
  | 'ko'
  | 'ru'
  | 'zhs'
  | 'zht';

export type Rarity = 'C' | 'U' | 'R' | 'M' | 'S' | 'L' | 'T';

export interface CornerReading {
  collectorNumber: string;
  setCode: string | null;
  rarity: Rarity | null;
  language: LanguageCode | null;
  foilHint: boolean | null;
  completeness: 'full' | 'partial';
}

export type ReadingKey = string;

export interface ResolvedCard {
  scryfallId: string;
  name: string;
  setCode: string;
  collectorNumber: string;
  languageFallback: boolean;
}

export interface CollectionEntry {
  id: string;
  card: ResolvedCard;
  quantity: number;
  finish: Finish;
  language: LanguageCode;
  condition: Condition;
  tags: string[];
  scannedAt: string;
  exportedAt: string | null;
}

export function toReadingKey(setCode: string, collectorNumber: string): ReadingKey {
  return `${setCode.toUpperCase()}:${collectorNumber}`;
}
