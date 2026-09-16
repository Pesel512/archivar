import type { ResolvedCard } from '@pesel512/archivar-core';
import type { PhysicalSet } from './sets.js';

export interface Cache {
  get(key: string): unknown | undefined;
  set(key: string, value: unknown): void;
}

export interface ScryfallClientOptions {
  fetch: typeof fetch;
  cache?: Cache;
  minIntervalMs?: number;
  headers?: Record<string, string>;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export type LookupResult =
  | { ok: true; card: ResolvedCard }
  | { ok: false; reason: 'not_found' | 'rate_limited' | 'network' };

export type SetsResult =
  | { ok: true; sets: PhysicalSet[] }
  | { ok: false; reason: 'rate_limited' | 'network' };
