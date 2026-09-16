import type { Finish } from './types.js';

export type ResolveFinishResult =
  | { ok: true; finish: Finish; adjusted: boolean }
  | { ok: false; available: Finish[] };

/**
 * Prüft, ob ein gewünschtes Finish bei einer Druckversion tatsächlich existiert. Archidekt
 * lehnt ein nicht existierendes Finish beim CSV-Import sonst stillschweigend ab und erzwingt
 * den Standardwert. Gibt bei genau einer verfügbaren Alternative diese als Vorschlag zurück,
 * bei keiner oder mehreren Alternativen muss der Aufrufer entscheiden.
 */
export function resolveFinish(requested: Finish, available: Finish[]): ResolveFinishResult {
  if (available.includes(requested)) {
    return { ok: true, finish: requested, adjusted: false };
  }
  if (available.length === 1) {
    return { ok: true, finish: available[0]!, adjusted: true };
  }
  return { ok: false, available };
}
