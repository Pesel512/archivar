import type { CornerReading } from '@pesel512/archivar-core';
import { createScryfallClient, type LookupResult } from '@pesel512/archivar-scryfall';

// Ein Client für die gesamte App-Lebensdauer (Rate-Limit/Cache aus `scryfall` sind pro
// Instanz) — `fetch` wird hier, am Rand der App, injiziert (siehe CLAUDE.md).
const client = createScryfallClient({ fetch: window.fetch.bind(window) });

/**
 * Bindeglied zwischen `scan-loop`s `lookup`-Deps und dem Scryfall-Client: `CornerReading` hat
 * `completeness: 'full'` garantiert `setCode !== null`, sobald der Reducer `validating`
 * erreicht (siehe `stability.ts`) — der Null-Fall hier greift nur defensiv.
 */
export function lookupCard(reading: CornerReading): Promise<LookupResult> {
  if (!reading.setCode) {
    return Promise.resolve({ ok: false, reason: 'not_found' });
  }
  return client.getCardBySetNumber(reading.setCode, reading.collectorNumber, reading.language ?? undefined);
}
