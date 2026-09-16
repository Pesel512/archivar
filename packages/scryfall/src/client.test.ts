import { describe, expect, it } from 'vitest';
import { createScryfallClient } from './client.js';

interface MockResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

interface FakeCall {
  url: string;
  init?: { headers?: Record<string, string> };
}

function createFakeFetch(responses: MockResponse[]) {
  const calls: FakeCall[] = [];
  let index = 0;
  const fetchImpl = (async (url: string, init?: { headers?: Record<string, string> }) => {
    calls.push({ url, init });
    const response = responses[index];
    index += 1;
    if (!response) throw new Error('Keine weitere gemockte Antwort vorhanden');
    const responseHeaders = response.headers ?? {};
    return {
      status: response.status,
      json: async () => response.body,
      headers: { get: (name: string) => responseHeaders[name] ?? null },
    } as Response;
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function createFakeClock() {
  let time = 0;
  const sleepCalls: number[] = [];
  return {
    now: () => time,
    sleep: async (ms: number) => {
      sleepCalls.push(ms);
      time += ms;
    },
    sleepCalls,
  };
}

function rawCard(
  overrides: Partial<{
    id: string;
    name: string;
    set: string;
    collector_number: string;
    finishes: string[];
  }> = {},
) {
  return {
    id: 'id-1',
    name: 'Shivan Dragon',
    set: 'dom',
    collector_number: '168',
    finishes: ['nonfoil', 'foil'],
    ...overrides,
  };
}

function rawSet(
  overrides: Partial<{
    code: string;
    name: string;
    released_at: string;
    set_type: string;
    digital: boolean;
  }> = {},
) {
  return {
    code: 'dom',
    name: 'Dominaria',
    released_at: '2018-04-27',
    set_type: 'expansion',
    digital: false,
    ...overrides,
  };
}

describe('createScryfallClient — getCardBySetNumber', () => {
  it('baut die URL korrekt inkl. Encoding', async () => {
    const { fetchImpl, calls } = createFakeFetch([{ status: 200, body: rawCard() }]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    await client.getCardBySetNumber('DOM', '1 2');

    expect(calls[0]?.url).toBe('https://api.scryfall.com/cards/dom/1%202');
  });

  it('hängt den Sprachcode an, wenn angegeben', async () => {
    const { fetchImpl, calls } = createFakeFetch([{ status: 200, body: rawCard() }]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    await client.getCardBySetNumber('DOM', '168', 'de');

    expect(calls[0]?.url).toBe('https://api.scryfall.com/cards/dom/168/de');
  });

  it('fällt bei 404 der Sprachversion auf Englisch zurück und markiert languageFallback', async () => {
    const { fetchImpl, calls } = createFakeFetch([{ status: 404 }, { status: 200, body: rawCard() }]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    const result = await client.getCardBySetNumber('DOM', '168', 'de');

    expect(result).toEqual({
      ok: true,
      card: {
        scryfallId: 'id-1',
        name: 'Shivan Dragon',
        setCode: 'DOM',
        collectorNumber: '168',
        languageFallback: true,
        finishes: ['nonfoil', 'foil'],
      },
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]?.url).toBe('https://api.scryfall.com/cards/dom/168/de');
    expect(calls[1]?.url).toBe('https://api.scryfall.com/cards/dom/168');
  });

  it('404 ohne Sprachcode ergibt not_found ohne Fallback-Aufruf', async () => {
    const { fetchImpl, calls } = createFakeFetch([{ status: 404 }]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    const result = await client.getCardBySetNumber('DOM', '999');

    expect(result).toEqual({ ok: false, reason: 'not_found' });
    expect(calls).toHaveLength(1);
  });

  it('404 der Fallback-Anfrage ergibt ebenfalls not_found', async () => {
    const { fetchImpl } = createFakeFetch([{ status: 404 }, { status: 404 }]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    const result = await client.getCardBySetNumber('DOM', '168', 'de');

    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  it('unerwarteter Statuscode ergibt network', async () => {
    const { fetchImpl } = createFakeFetch([{ status: 500 }]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    const result = await client.getCardBySetNumber('DOM', '168');

    expect(result).toEqual({ ok: false, reason: 'network' });
  });

  it('Netzwerkfehler (fetch wirft) ergibt network', async () => {
    const fetchImpl = (async () => {
      throw new Error('boom');
    }) as typeof fetch;
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    const result = await client.getCardBySetNumber('DOM', '168');

    expect(result).toEqual({ ok: false, reason: 'network' });
  });

  it('setzt Accept- und User-Agent-Header außerhalb des Browsers', async () => {
    const { fetchImpl, calls } = createFakeFetch([{ status: 200, body: rawCard() }]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    await client.getCardBySetNumber('DOM', '168');

    const headers = calls[0]?.init?.headers ?? {};
    expect(headers['Accept']).toBe('application/json');
    expect(headers['User-Agent']).toBeDefined();
  });

  it('eigene Headers überschreiben die Defaults', async () => {
    const { fetchImpl, calls } = createFakeFetch([{ status: 200, body: rawCard() }]);
    const clock = createFakeClock();
    const client = createScryfallClient({
      fetch: fetchImpl,
      now: clock.now,
      sleep: clock.sleep,
      headers: { 'User-Agent': 'custom-agent' },
    });

    await client.getCardBySetNumber('DOM', '168');

    expect(calls[0]?.init?.headers?.['User-Agent']).toBe('custom-agent');
  });
});

describe('createScryfallClient — Serialisierung & Rate-Limiting', () => {
  it('hält den minimalen Abstand zwischen zwei Anfragen ein', async () => {
    const { fetchImpl } = createFakeFetch([
      { status: 200, body: rawCard() },
      { status: 200, body: rawCard({ collector_number: '169' }) },
    ]);
    const clock = createFakeClock();
    const timestamps: number[] = [];
    const wrappedFetch = (async (url: string, init?: { headers?: Record<string, string> }) => {
      timestamps.push(clock.now());
      return fetchImpl(url, init);
    }) as typeof fetch;

    const client = createScryfallClient({
      fetch: wrappedFetch,
      now: clock.now,
      sleep: clock.sleep,
      minIntervalMs: 100,
    });

    await Promise.all([
      client.getCardBySetNumber('DOM', '168'),
      client.getCardBySetNumber('DOM', '169'),
    ]);

    expect(timestamps).toHaveLength(2);
    expect(timestamps[1]! - timestamps[0]!).toBeGreaterThanOrEqual(100);
  });

  it('Retry-After-Header wird als Wartezeit verwendet, statt des Backoffs', async () => {
    const { fetchImpl, calls } = createFakeFetch([
      { status: 429, headers: { 'Retry-After': '2' } },
      { status: 200, body: rawCard() },
    ]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    const result = await client.getCardBySetNumber('DOM', '168');

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(2);
    expect(clock.sleepCalls).toEqual([2000]);
  });

  it('fehlt der Retry-After-Header, greift das bestehende Backoff', async () => {
    const { fetchImpl, calls } = createFakeFetch([{ status: 429 }, { status: 200, body: rawCard() }]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    const result = await client.getCardBySetNumber('DOM', '168');

    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(2);
    expect(clock.sleepCalls).toEqual([1000]);
  });

  it('429 bei allen drei Versuchen ergibt rate_limited mit exponentiellem Backoff', async () => {
    const { fetchImpl, calls } = createFakeFetch([{ status: 429 }, { status: 429 }, { status: 429 }]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    const result = await client.getCardBySetNumber('DOM', '168');

    expect(result).toEqual({ ok: false, reason: 'rate_limited' });
    expect(calls).toHaveLength(3);
    expect(clock.sleepCalls).toEqual([1000, 2000]);
  });
});

describe('createScryfallClient — getCardByName', () => {
  it('baut fuzzy/set-Query korrekt und mapped das Ergebnis', async () => {
    const { fetchImpl, calls } = createFakeFetch([
      { status: 200, body: rawCard({ name: 'Lightning Bolt' }) },
    ]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    const result = await client.getCardByName('Lightning Bolt', 'lea');

    expect(calls[0]?.url).toBe(
      'https://api.scryfall.com/cards/named?fuzzy=Lightning%20Bolt&set=lea',
    );
    expect(result).toEqual({
      ok: true,
      card: {
        scryfallId: 'id-1',
        name: 'Lightning Bolt',
        setCode: 'DOM',
        collectorNumber: '168',
        languageFallback: false,
        finishes: ['nonfoil', 'foil'],
      },
    });
  });

  it('ohne set-Parameter wird kein set-Query-Teil angehängt', async () => {
    const { fetchImpl, calls } = createFakeFetch([{ status: 200, body: rawCard() }]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    await client.getCardByName('Shivan Dragon');

    expect(calls[0]?.url).toBe('https://api.scryfall.com/cards/named?fuzzy=Shivan%20Dragon');
  });

  it('404 ergibt not_found', async () => {
    const { fetchImpl } = createFakeFetch([{ status: 404 }]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    const result = await client.getCardByName('Unbekannte Karte');

    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });
});

describe('createScryfallClient — getPhysicalSets', () => {
  it('Cache-Treffer löst keinen zweiten Fetch-Aufruf aus', async () => {
    const { fetchImpl, calls } = createFakeFetch([
      { status: 200, body: { data: [rawSet()] } },
    ]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    const first = await client.getPhysicalSets();
    const second = await client.getPhysicalSets();

    expect(calls).toHaveLength(1);
    expect(first).toEqual(second);
  });

  it('filtert digitale Sets heraus und sortiert nach released_at absteigend', async () => {
    const { fetchImpl } = createFakeFetch([
      {
        status: 200,
        body: {
          data: [
            rawSet({ code: 'old', released_at: '2010-01-01' }),
            rawSet({ code: 'digi', digital: true, released_at: '2024-01-01' }),
            rawSet({ code: 'new', released_at: '2024-06-01' }),
          ],
        },
      },
    ]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    const result = await client.getPhysicalSets();

    if (!result.ok) throw new Error('expected ok result');
    expect(result.sets.map((s) => s.code)).toEqual(['NEW', 'OLD']);
  });

  it('excludeSetTypes filtert auf dem gecachten Ergebnis, ohne erneut zu laden', async () => {
    const { fetchImpl, calls } = createFakeFetch([
      {
        status: 200,
        body: {
          data: [
            rawSet({ code: 'exp', set_type: 'expansion', released_at: '2020-01-01' }),
            rawSet({ code: 'fun', set_type: 'funny', released_at: '2021-01-01' }),
          ],
        },
      },
    ]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    await client.getPhysicalSets();
    const filtered = await client.getPhysicalSets({ excludeSetTypes: ['funny'] });

    if (!filtered.ok) throw new Error('expected ok result');
    expect(filtered.sets.map((s) => s.code)).toEqual(['EXP']);
    expect(calls).toHaveLength(1);
  });

  it('liefert ok:false bei unerwartetem Statuscode', async () => {
    const { fetchImpl } = createFakeFetch([{ status: 500 }]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    const result = await client.getPhysicalSets();

    expect(result).toEqual({ ok: false, reason: 'network' });
  });

  it('liefert ok:false mit reason rate_limited, wenn 429 dreimal auftritt', async () => {
    const { fetchImpl } = createFakeFetch([{ status: 429 }, { status: 429 }, { status: 429 }]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    const result = await client.getPhysicalSets();

    expect(result).toEqual({ ok: false, reason: 'rate_limited' });
  });

  it('nach einem Fehlschlag löst der nächste Aufruf eine neue Anfrage aus (kein Cache für Fehler)', async () => {
    const { fetchImpl, calls } = createFakeFetch([
      { status: 500 },
      { status: 200, body: { data: [rawSet()] } },
    ]);
    const clock = createFakeClock();
    const client = createScryfallClient({ fetch: fetchImpl, now: clock.now, sleep: clock.sleep });

    const first = await client.getPhysicalSets();
    expect(first).toEqual({ ok: false, reason: 'network' });

    const second = await client.getPhysicalSets();
    expect(second.ok).toBe(true);
    expect(calls).toHaveLength(2);
  });
});
