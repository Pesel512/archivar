import type { LanguageCode } from '@pesel512/archivar-core';
import { createMemoryCache } from './memory-cache.js';
import { mapCard, type RawScryfallCard } from './mapping.js';
import { createRequestQueue } from './queue.js';
import type { PhysicalSet } from './sets.js';
import type { Cache, LookupResult, ScryfallClientOptions, SetsResult } from './types.js';

const BASE_URL = 'https://api.scryfall.com';
const DEFAULT_MIN_INTERVAL_MS = 100;
const MAX_ATTEMPTS = 3;
// Fallback-Backoff, falls eine 429-Antwort keinen (numerischen) Retry-After-Header liefert:
// Basiswert 1s, je Versuch verdoppelt. Liefert Scryfall Retry-After, hat der Vorrang.
const BACKOFF_BASE_MS = 1000;

interface RawScryfallSet {
  code: string;
  name: string;
  released_at: string;
  set_type: string;
  digital: boolean;
}

interface RawScryfallSetList {
  data: RawScryfallSet[];
}

type FetchOutcome =
  | { kind: 'status'; status: number; json: () => Promise<unknown> }
  | { kind: 'rate_limited' }
  | { kind: 'network' };

export interface ScryfallClient {
  getCardBySetNumber(set: string, number: string, lang?: LanguageCode): Promise<LookupResult>;
  getCardByName(name: string, set?: string): Promise<LookupResult>;
  getPhysicalSets(opts?: { excludeSetTypes?: string[] }): Promise<SetsResult>;
}

function isBrowser(): boolean {
  return typeof (globalThis as Record<string, unknown>)['window'] !== 'undefined';
}

function buildHeaders(custom: Record<string, string> | undefined): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (!isBrowser()) {
    headers['User-Agent'] = 'archivar/0.1 (+https://github.com/Pesel512/archivar)';
  }
  return { ...headers, ...custom };
}

function buildCardUrl(set: string, number: string, lang?: LanguageCode): string {
  const segments = [
    BASE_URL,
    'cards',
    encodeURIComponent(set.toLowerCase()),
    encodeURIComponent(number),
  ];
  if (lang) segments.push(encodeURIComponent(lang));
  return segments.join('/');
}

function buildNamedUrl(name: string, set: string | undefined): string {
  const params = [`fuzzy=${encodeURIComponent(name)}`];
  if (set) params.push(`set=${encodeURIComponent(set.toLowerCase())}`);
  return `${BASE_URL}/cards/named?${params.join('&')}`;
}

// Retry-After nur in der numerischen Sekunden-Form unterstützt (HTTP erlaubt auch ein
// Datum, das Scryfall aber nicht verwendet).
function parseRetryAfterMs(headerValue: string | null): number | null {
  if (headerValue === null) return null;
  const seconds = Number(headerValue);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return seconds * 1000;
}

async function fetchWithRetry(
  fetchImpl: typeof fetch,
  url: string,
  headers: Record<string, string>,
  sleep: (ms: number) => Promise<void>,
): Promise<FetchOutcome> {
  let delay = BACKOFF_BASE_MS;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let response: Response;
    try {
      response = await fetchImpl(url, { headers });
    } catch {
      return { kind: 'network' };
    }
    if (response.status === 429) {
      if (attempt >= MAX_ATTEMPTS) return { kind: 'rate_limited' };
      const retryAfterMs = parseRetryAfterMs(response.headers.get('Retry-After'));
      await sleep(retryAfterMs ?? delay);
      delay *= 2;
      continue;
    }
    return { kind: 'status', status: response.status, json: () => response.json() };
  }
  return { kind: 'rate_limited' };
}

function sortByReleasedAtDesc(sets: PhysicalSet[]): PhysicalSet[] {
  return [...sets].sort((a, b) => (a.releasedAt < b.releasedAt ? 1 : a.releasedAt > b.releasedAt ? -1 : 0));
}

export function createScryfallClient(options: ScryfallClientOptions): ScryfallClient {
  const cache: Cache = options.cache ?? createMemoryCache();
  const minIntervalMs = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
  const now = options.now ?? (() => Date.now());
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const headers = buildHeaders(options.headers);
  const queue = createRequestQueue(minIntervalMs, now, sleep);

  const request = (url: string): Promise<FetchOutcome> =>
    queue.enqueue(() => fetchWithRetry(options.fetch, url, headers, sleep));

  async function getCardBySetNumber(
    set: string,
    number: string,
    lang?: LanguageCode,
  ): Promise<LookupResult> {
    const primary = await request(buildCardUrl(set, number, lang));
    if (primary.kind === 'network') return { ok: false, reason: 'network' };
    if (primary.kind === 'rate_limited') return { ok: false, reason: 'rate_limited' };
    if (primary.status === 200) {
      const raw = (await primary.json()) as RawScryfallCard;
      return { ok: true, card: mapCard(raw, false) };
    }
    if (primary.status !== 404) return { ok: false, reason: 'network' };
    if (lang === undefined) return { ok: false, reason: 'not_found' };

    const fallback = await request(buildCardUrl(set, number));
    if (fallback.kind === 'network') return { ok: false, reason: 'network' };
    if (fallback.kind === 'rate_limited') return { ok: false, reason: 'rate_limited' };
    if (fallback.status === 200) {
      const raw = (await fallback.json()) as RawScryfallCard;
      return { ok: true, card: mapCard(raw, true) };
    }
    return fallback.status === 404
      ? { ok: false, reason: 'not_found' }
      : { ok: false, reason: 'network' };
  }

  async function getCardByName(name: string, set?: string): Promise<LookupResult> {
    const outcome = await request(buildNamedUrl(name, set));
    if (outcome.kind === 'network') return { ok: false, reason: 'network' };
    if (outcome.kind === 'rate_limited') return { ok: false, reason: 'rate_limited' };
    if (outcome.status === 200) {
      const raw = (await outcome.json()) as RawScryfallCard;
      return { ok: true, card: mapCard(raw, false) };
    }
    return outcome.status === 404
      ? { ok: false, reason: 'not_found' }
      : { ok: false, reason: 'network' };
  }

  async function getPhysicalSets(opts?: { excludeSetTypes?: string[] }): Promise<SetsResult> {
    const cacheKey = 'physical-sets';
    const cached = cache.get(cacheKey) as PhysicalSet[] | undefined;
    let sets: PhysicalSet[];

    if (cached !== undefined) {
      sets = cached;
    } else {
      const outcome = await request(`${BASE_URL}/sets`);
      if (outcome.kind === 'network') return { ok: false, reason: 'network' };
      if (outcome.kind === 'rate_limited') return { ok: false, reason: 'rate_limited' };
      if (outcome.status !== 200) return { ok: false, reason: 'network' };
      const raw = (await outcome.json()) as RawScryfallSetList;
      const physical = raw.data
        .filter((set) => !set.digital)
        .map((set) => ({
          code: set.code.toUpperCase(),
          name: set.name,
          releasedAt: set.released_at,
          setType: set.set_type,
        }));
      sets = sortByReleasedAtDesc(physical);
      cache.set(cacheKey, sets);
    }

    if (!opts?.excludeSetTypes || opts.excludeSetTypes.length === 0) return { ok: true, sets };
    const excluded = new Set(opts.excludeSetTypes);
    return { ok: true, sets: sets.filter((set) => !excluded.has(set.setType)) };
  }

  return { getCardBySetNumber, getCardByName, getPhysicalSets };
}
