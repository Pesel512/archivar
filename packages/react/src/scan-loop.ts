import {
  DEFAULT_STABILITY_CONFIG,
  createScanMachine,
  enteredValidation,
  parseCorner,
  scanReducer,
  type CornerReading,
  type ResolvedCard,
  type ScanMachine,
  type ScanState,
  type StabilityConfig,
} from '@pesel512/archivar-core';
import { normalize, type OcrEngine } from '@pesel512/archivar-ocr';
import type { LookupResult } from '@pesel512/archivar-scryfall';

export type ScanLoopEvent =
  | { type: 'frame'; rawText: string; reading: CornerReading | null; state: ScanState; ocrMs: number }
  | { type: 'validated'; card: ResolvedCard; reading: CornerReading }
  | { type: 'validation_failed'; reason: string }
  | { type: 'rate'; ocrPerSecond: number };

export interface ScanLoopDeps {
  grab: () => OffscreenCanvas | HTMLCanvasElement | null;
  ocr: Pick<OcrEngine, 'recognize' | 'setWhitelist'>;
  lookup: (reading: CornerReading) => Promise<LookupResult>;
  config?: Partial<StabilityConfig>;
  now?: () => number;
  schedule?: (fn: () => void) => void;
  onEvent: (event: ScanLoopEvent) => void;
}

export interface ScanLoop {
  start(): void;
  stop(): void;
  confirm(): void;
  reject(): void;
  setFixedSet(code: string | null): Promise<void>;
  readonly running: boolean;
}

// Fenstergröße für die gleitende OCR-Rate: Durchschnitt über die letzten N Dauern, gemeldet
// höchstens einmal pro Sekunde — glättet einzelne Ausreißer, ohne Änderungen der tatsächlichen
// Rate träge nachzuziehen.
const RATE_WINDOW = 10;
const RATE_REPORT_INTERVAL_MS = 1000;

function defaultSchedule(fn: () => void): void {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(fn);
  } else {
    setTimeout(fn, 0);
  }
}

export function createScanLoop(deps: ScanLoopDeps): ScanLoop {
  const config: StabilityConfig = { ...DEFAULT_STABILITY_CONFIG, ...deps.config };
  const now = deps.now ?? Date.now;
  const schedule = deps.schedule ?? defaultSchedule;

  let machine: ScanMachine = createScanMachine(null);
  let running = false;
  // Wird bei stop() und setFixedSet() erhöht, damit ein zu diesem Zeitpunkt bereits
  // laufendes lookup() sein verspätetes Ergebnis verwirft (siehe startValidationLookup).
  let generation = 0;

  const durations: number[] = [];
  let lastRateReportAt = now();

  function recordDuration(ms: number, atTime: number): void {
    durations.push(ms);
    if (durations.length > RATE_WINDOW) durations.shift();
    if (atTime - lastRateReportAt >= RATE_REPORT_INTERVAL_MS) {
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      deps.onEvent({ type: 'rate', ocrPerSecond: avg > 0 ? 1000 / avg : 0 });
      lastRateReportAt = atTime;
    }
  }

  function startValidationLookup(reading: CornerReading): void {
    const gen = generation;
    deps.lookup(reading).then(
      (result) => {
        if (gen !== generation) return;
        if (result.ok) {
          machine = scanReducer(machine, { type: 'VALIDATION_SUCCEEDED', card: result.card }, config);
          deps.onEvent({ type: 'validated', card: result.card, reading });
        } else {
          machine = scanReducer(machine, { type: 'VALIDATION_FAILED' }, config);
          deps.onEvent({ type: 'validation_failed', reason: result.reason });
        }
      },
      () => {
        if (gen !== generation) return;
        machine = scanReducer(machine, { type: 'VALIDATION_FAILED' }, config);
        deps.onEvent({ type: 'validation_failed', reason: 'unknown' });
      },
    );
  }

  function scheduleNext(): void {
    if (!running) return;
    schedule(() => {
      void tick();
    });
  }

  async function tick(): Promise<void> {
    if (!running) return;

    let canvas: OffscreenCanvas | HTMLCanvasElement | null;
    try {
      canvas = deps.grab();
    } catch {
      canvas = null;
    }

    if (canvas === null) {
      scheduleNext();
      return;
    }

    const start = now();
    let rawText = '';
    try {
      const result = await deps.ocr.recognize(canvas);
      rawText = result.text;
    } catch {
      // Fehler in recognize beendet die Schleife nicht — der Frame zählt als "nichts erkannt".
      rawText = '';
    }
    const finishedAt = now();
    const ocrMs = finishedAt - start;
    recordDuration(ocrMs, finishedAt);

    // stop() kann während des await oben aufgerufen worden sein.
    if (!running) return;

    const reading = parseCorner(normalize(rawText), { fixedSet: machine.fixedSet });
    const prev = machine;
    machine = scanReducer(machine, { type: 'FRAME', reading }, config);
    deps.onEvent({ type: 'frame', rawText, reading, state: machine.state, ocrMs });

    if (enteredValidation(prev, machine) && machine.state.phase === 'validating') {
      startValidationLookup(machine.state.reading);
    }

    scheduleNext();
  }

  return {
    start(): void {
      if (running) return;
      running = true;
      scheduleNext();
    },
    stop(): void {
      running = false;
      generation += 1;
    },
    confirm(): void {
      machine = scanReducer(machine, { type: 'USER_CONFIRMED' }, config);
    },
    reject(): void {
      machine = scanReducer(machine, { type: 'USER_REJECTED' }, config);
    },
    async setFixedSet(code: string | null): Promise<void> {
      // Erst Whitelist setzen, dann den Reducer zurücksetzen — sonst könnte ein Frame mit
      // alter Whitelist noch in den neuen Zustand laufen.
      generation += 1;
      await deps.ocr.setWhitelist(code);
      machine = scanReducer(machine, { type: 'SET_CHANGED', setCode: code }, config);
    },
    get running(): boolean {
      return running;
    },
  };
}
