export interface PhysicalSet {
  code: string;
  name: string;
  releasedAt: string;
  setType: string;
}

/**
 * Reine Funktion für das spätere Autocomplete. Erwartet `sets` bereits nach
 * `releasedAt` absteigend sortiert (wie von `getPhysicalSets` geliefert) und behält
 * diese Reihenfolge innerhalb der beiden Trefferklassen bei.
 */
export function searchSets(query: string, sets: readonly PhysicalSet[]): PhysicalSet[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [...sets];

  const codeMatches: PhysicalSet[] = [];
  const nameMatches: PhysicalSet[] = [];

  for (const set of sets) {
    if (set.code.toLowerCase().startsWith(q)) {
      codeMatches.push(set);
    } else if (set.name.toLowerCase().includes(q)) {
      nameMatches.push(set);
    }
  }

  return [...codeMatches, ...nameMatches];
}
