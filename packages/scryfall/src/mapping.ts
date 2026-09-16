import type { Finish, ResolvedCard } from '@pesel512/archivar-core';

const KNOWN_FINISHES: ReadonlySet<string> = new Set<Finish>(['nonfoil', 'foil', 'etched']);

// Nur die Felder, die ResolvedCard tatsächlich braucht — keine vollständigen
// Scryfall-Kartenobjekte durchreichen.
export interface RawScryfallCard {
  id: string;
  name: string;
  set: string;
  collector_number: string;
  finishes: string[];
}

function mapFinishes(raw: string[]): Finish[] {
  return raw.filter((value): value is Finish => KNOWN_FINISHES.has(value));
}

export function mapCard(raw: RawScryfallCard, languageFallback: boolean): ResolvedCard {
  return {
    scryfallId: raw.id,
    name: raw.name,
    setCode: raw.set.toUpperCase(),
    collectorNumber: raw.collector_number,
    languageFallback,
    finishes: mapFinishes(raw.finishes),
  };
}
