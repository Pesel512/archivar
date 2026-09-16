import type { CollectionEntry, Finish } from './types.js';

export function mergeKey(
  entry: Pick<CollectionEntry, 'card' | 'finish' | 'language' | 'condition'>,
): string {
  return [entry.card.scryfallId, entry.finish, entry.language, entry.condition].join('|');
}

function mergeTags(existing: readonly string[], incoming: readonly string[]): string[] {
  const result = [...existing];
  for (const tag of incoming) {
    if (!result.includes(tag)) result.push(tag);
  }
  return result;
}

export type AddScanResult =
  | { ok: true; entries: CollectionEntry[] }
  | { ok: false; reason: 'invalid_finish'; available: Finish[] };

export function addScan(
  entries: CollectionEntry[],
  scan: Omit<CollectionEntry, 'id' | 'quantity' | 'exportedAt'> & { quantity?: number },
  newId: () => string,
): AddScanResult {
  // Archidekt erzwingt beim CSV-Import stillschweigend den Standardwert, wenn das Finish bei
  // der Druckversion nicht existiert (siehe STATE_A.md, Block A11) — solche Einträge werden
  // hier gar nicht erst übernommen.
  if (!scan.card.finishes.includes(scan.finish)) {
    return { ok: false, reason: 'invalid_finish', available: scan.card.finishes };
  }

  const key = mergeKey(scan);
  const quantity = scan.quantity ?? 1;
  const existingIndex = entries.findIndex(
    (entry) => entry.exportedAt === null && mergeKey(entry) === key,
  );

  if (existingIndex === -1) {
    const newEntry: CollectionEntry = {
      id: newId(),
      card: scan.card,
      quantity,
      finish: scan.finish,
      language: scan.language,
      condition: scan.condition,
      tags: [...scan.tags],
      scannedAt: scan.scannedAt,
      exportedAt: null,
    };
    return { ok: true, entries: [...entries, newEntry] };
  }

  return {
    ok: true,
    entries: entries.map((entry, index) =>
      index === existingIndex
        ? {
            ...entry,
            quantity: entry.quantity + quantity,
            tags: mergeTags(entry.tags, scan.tags),
          }
        : entry,
    ),
  };
}

export function markExported(
  entries: CollectionEntry[],
  ids: string[],
  at: string,
): CollectionEntry[] {
  const idSet = new Set(ids);
  return entries.map((entry) => (idSet.has(entry.id) ? { ...entry, exportedAt: at } : entry));
}

export function pendingExport(entries: CollectionEntry[]): CollectionEntry[] {
  return entries.filter((entry) => entry.exportedAt === null);
}
