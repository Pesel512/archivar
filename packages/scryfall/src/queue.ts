export interface RequestQueue {
  enqueue<T>(task: () => Promise<T>): Promise<T>;
}

/**
 * Serialisiert Aufgaben strikt nacheinander und stellt sicher, dass zwischen dem Start
 * zweier Aufgaben mindestens `minIntervalMs` vergeht (gemessen über die injizierten
 * `now`/`sleep`-Funktionen, damit Tests ohne echte Wartezeit auskommen).
 */
export function createRequestQueue(
  minIntervalMs: number,
  now: () => number,
  sleep: (ms: number) => Promise<void>,
): RequestQueue {
  let chain: Promise<void> = Promise.resolve();
  let lastStart: number | null = null;

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = chain.then(async () => {
      if (lastStart !== null) {
        const wait = minIntervalMs - (now() - lastStart);
        if (wait > 0) await sleep(wait);
      }
      lastStart = now();
      return task();
    });
    chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return { enqueue };
}
