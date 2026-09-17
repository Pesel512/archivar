import type { CornerReading, ResolvedCard } from '@pesel512/archivar-core';
import type { LookupResult } from '@pesel512/archivar-scryfall';
import { describe, expect, it, vi } from 'vitest';
import { createScanLoop, type ScanLoopDeps, type ScanLoopEvent } from './scan-loop.js';

// Vollständiger Ecken-Text (Collector Number, Rarity, Set, Foil-Trenner, Sprache) — ergibt bei
// drei identischen Frames genau eine Validierung (DEFAULT_STABILITY_CONFIG.requiredMatches = 3).
const FULL_CORNER_TEXT = '123 R MOM • EN';
const FAKE_CANVAS = {} as unknown as OffscreenCanvas;

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function createCard(): ResolvedCard {
  return {
    scryfallId: 'test-id',
    name: 'Test Card',
    setCode: 'MOM',
    collectorNumber: '123',
    languageFallback: false,
    finishes: ['nonfoil'],
  };
}

function createHarness() {
  const events: ScanLoopEvent[] = [];
  const scheduled: Array<() => void> = [];
  let time = 0;

  const grab = vi.fn(() => FAKE_CANVAS as OffscreenCanvas | HTMLCanvasElement | null);
  const recognize = vi.fn();
  const setWhitelist = vi.fn(async () => {});
  const lookup = vi.fn();

  const deps: ScanLoopDeps = {
    grab,
    ocr: { recognize, setWhitelist },
    lookup: (reading: CornerReading) => lookup(reading) as Promise<LookupResult>,
    now: () => time,
    schedule: (fn) => scheduled.push(fn),
    onEvent: (event) => events.push(event),
  };

  const loop = createScanLoop(deps);

  function runScheduled(): void {
    const fn = scheduled.shift();
    if (fn) fn();
  }

  function frameEvents(): Extract<ScanLoopEvent, { type: 'frame' }>[] {
    return events.filter((e): e is Extract<ScanLoopEvent, { type: 'frame' }> => e.type === 'frame');
  }

  return {
    loop,
    events,
    grab,
    recognize,
    setWhitelist,
    lookup,
    runScheduled,
    frameEvents,
    scheduledCount: () => scheduled.length,
    advanceTime: (ms: number): void => {
      time += ms;
    },
  };
}

type Harness = ReturnType<typeof createHarness>;

// Ein Tick ist async (grab -> await recognize -> Reducer -> scheduleNext); ein Makrotask-Warten
// stellt sicher, dass alle dabei entstehenden Microtasks (inkl. der schedule()-Aufrufe) verarbeitet
// sind, bevor der Test weiterprüft.
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function step(h: Harness): Promise<void> {
  h.runScheduled();
  await flush();
}

describe('createScanLoop', () => {
  it('drei gleiche Frames führen zu genau einem lookup-Aufruf', async () => {
    const h = createHarness();
    h.recognize.mockResolvedValue({ text: FULL_CORNER_TEXT, confidence: 90, durationMs: 5 });
    h.lookup.mockReturnValue(new Promise<LookupResult>(() => {}));

    h.loop.start();
    await step(h);
    await step(h);
    await step(h);

    expect(h.recognize).toHaveBeenCalledTimes(3);
    expect(h.lookup).toHaveBeenCalledTimes(1);
  });

  it('ein erfolgreicher lookup löst ein validated-Event aus', async () => {
    const h = createHarness();
    h.recognize.mockResolvedValue({ text: FULL_CORNER_TEXT, confidence: 90, durationMs: 5 });
    const card = createCard();
    h.lookup.mockResolvedValue({ ok: true, card } satisfies LookupResult);

    h.loop.start();
    await step(h);
    await step(h);
    await step(h);
    await flush();

    const validated = h.events.find((e) => e.type === 'validated');
    expect(validated).toEqual({
      type: 'validated',
      card,
      reading: expect.objectContaining({ collectorNumber: '123', setCode: 'MOM' }),
    });
  });

  it('ein fehlgeschlagener lookup löst validation_failed aus und aktiviert den Cooldown', async () => {
    const h = createHarness();
    h.recognize.mockResolvedValue({ text: FULL_CORNER_TEXT, confidence: 90, durationMs: 5 });
    h.lookup.mockResolvedValue({ ok: false, reason: 'not_found' } satisfies LookupResult);

    h.loop.start();
    await step(h);
    await step(h);
    await step(h);
    await flush();

    expect(h.events).toContainEqual({ type: 'validation_failed', reason: 'not_found' });

    h.events.length = 0;
    await step(h);

    // Cooldown aktiv: derselbe Schlüssel wird geblockt, der Zustand bleibt idle statt candidate.
    expect(h.frameEvents().at(-1)?.state.phase).toBe('idle');
  });

  it('grabt keinen zweiten Frame, solange recognize noch läuft', async () => {
    const h = createHarness();
    const deferred = createDeferred<{ text: string; confidence: number; durationMs: number }>();
    h.recognize.mockReturnValue(deferred.promise);

    h.loop.start();
    h.runScheduled();
    await flush();

    expect(h.grab).toHaveBeenCalledTimes(1);
    expect(h.scheduledCount()).toBe(0);

    deferred.resolve({ text: '', confidence: 0, durationMs: 0 });
    await flush();

    expect(h.grab).toHaveBeenCalledTimes(1);
    expect(h.scheduledCount()).toBe(1);
  });

  it('setFixedSet ruft setWhitelist auf und setzt den Reducer erst danach zurück', async () => {
    const h = createHarness();
    const deferred = createDeferred<void>();
    h.setWhitelist.mockReturnValue(deferred.promise);
    // Nur die Collector Number — ohne fixedSet bleibt die Lesung 'partial', mit fixedSet 'full'.
    h.recognize.mockResolvedValue({ text: '123', confidence: 80, durationMs: 4 });

    h.loop.start();
    const setFixedSetPromise = h.loop.setFixedSet('MOM');
    expect(h.setWhitelist).toHaveBeenCalledWith('MOM');

    await step(h);
    expect(h.frameEvents().at(-1)?.reading?.completeness).toBe('partial');

    deferred.resolve();
    await setFixedSetPromise;

    await step(h);
    expect(h.frameEvents().at(-1)?.reading).toMatchObject({ setCode: 'MOM', completeness: 'full' });
  });

  it('ein verspätetes lookup-Ergebnis nach stop() wird verworfen', async () => {
    const h = createHarness();
    h.recognize.mockResolvedValue({ text: FULL_CORNER_TEXT, confidence: 90, durationMs: 5 });
    const deferred = createDeferred<LookupResult>();
    h.lookup.mockReturnValue(deferred.promise);

    h.loop.start();
    await step(h);
    await step(h);
    await step(h);
    expect(h.lookup).toHaveBeenCalledTimes(1);

    h.loop.stop();
    deferred.resolve({ ok: true, card: createCard() });
    await flush();

    expect(h.events.some((e) => e.type === 'validated')).toBe(false);
  });

  it('ein verspätetes lookup-Ergebnis nach einem Set-Wechsel wird verworfen', async () => {
    const h = createHarness();
    h.recognize.mockResolvedValue({ text: FULL_CORNER_TEXT, confidence: 90, durationMs: 5 });
    const deferred = createDeferred<LookupResult>();
    h.lookup.mockReturnValue(deferred.promise);

    h.loop.start();
    await step(h);
    await step(h);
    await step(h);
    expect(h.lookup).toHaveBeenCalledTimes(1);

    await h.loop.setFixedSet('MOM');

    deferred.resolve({ ok: true, card: createCard() });
    await flush();

    expect(h.events.some((e) => e.type === 'validated')).toBe(false);
  });

  it('ein Fehler in recognize beendet die Schleife nicht — der Frame zählt als nichts erkannt', async () => {
    const h = createHarness();
    h.recognize.mockRejectedValueOnce(new Error('boom'));
    h.recognize.mockResolvedValue({ text: '', confidence: 0, durationMs: 1 });

    h.loop.start();
    await step(h);

    expect(h.frameEvents()).toHaveLength(1);
    expect(h.frameEvents()[0]?.reading).toBeNull();
    expect(h.loop.running).toBe(true);

    await step(h);
    expect(h.grab).toHaveBeenCalledTimes(2);
  });

  it('berechnet die OCR-Rate korrekt aus den gemessenen Dauern', async () => {
    const h = createHarness();
    h.recognize.mockImplementation(async () => {
      h.advanceTime(100);
      return { text: '', confidence: 0, durationMs: 100 };
    });

    h.loop.start();
    for (let i = 0; i < 10; i += 1) {
      await step(h);
    }

    const rateEvents = h.events.filter((e): e is Extract<ScanLoopEvent, { type: 'rate' }> => e.type === 'rate');
    expect(rateEvents).toHaveLength(1);
    expect(rateEvents[0]?.ocrPerSecond).toBeCloseTo(10);
  });

  it('confirm() nach erfolgreicher Validierung wechselt in awaitingRemoval', async () => {
    const h = createHarness();
    h.recognize.mockResolvedValue({ text: FULL_CORNER_TEXT, confidence: 90, durationMs: 5 });
    h.lookup.mockResolvedValue({ ok: true, card: createCard() } satisfies LookupResult);

    h.loop.start();
    await step(h);
    await step(h);
    await step(h);
    await flush();
    expect(h.events.some((e) => e.type === 'validated')).toBe(true);

    h.loop.confirm();
    await step(h);

    expect(h.frameEvents().at(-1)?.state.phase).toBe('awaitingRemoval');
  });
});
