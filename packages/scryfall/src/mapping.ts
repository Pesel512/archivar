import type { ResolvedCard } from '@pesel512/archivar-core';

// Nur die Felder, die ResolvedCard tatsächlich braucht — keine vollständigen
// Scryfall-Kartenobjekte durchreichen.
export interface RawScryfallCard {
  id: string;
  name: string;
  set: string;
  collector_number: string;
}

export function mapCard(raw: RawScryfallCard, languageFallback: boolean): ResolvedCard {
  return {
    scryfallId: raw.id,
    name: raw.name,
    setCode: raw.set.toUpperCase(),
    collectorNumber: raw.collector_number,
    languageFallback,
  };
}
