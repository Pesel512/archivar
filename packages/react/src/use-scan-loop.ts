import type { CornerReading, ScanState, StabilityConfig } from '@pesel512/archivar-core';
import type { OcrEngine } from '@pesel512/archivar-ocr';
import type { LookupResult } from '@pesel512/archivar-scryfall';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createScanLoop, type ScanLoop, type ScanLoopEvent } from './scan-loop.js';

export interface UseScanLoopOptions {
  grab: () => OffscreenCanvas | HTMLCanvasElement | null;
  ocr: Pick<OcrEngine, 'recognize' | 'setWhitelist'>;
  lookup: (reading: CornerReading) => Promise<LookupResult>;
  config?: Partial<StabilityConfig>;
}

export interface UseScanLoopResult {
  state: ScanState;
  lastEvent: ScanLoopEvent | null;
  ocrPerSecond: number;
  running: boolean;
  start(): void;
  stop(): void;
  confirm(): void;
  reject(): void;
  setFixedSet(code: string | null): Promise<void>;
}

/** Dünner Hook um `createScanLoop` — erstellt die Schleife einmal, verteilt Events in Zustand. */
export function useScanLoop(options: UseScanLoopOptions): UseScanLoopResult {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [state, setState] = useState<UseScanLoopResult['state']>({ phase: 'idle' });
  const [lastEvent, setLastEvent] = useState<ScanLoopEvent | null>(null);
  const [ocrPerSecond, setOcrPerSecond] = useState(0);
  const [running, setRunning] = useState(false);
  const loopRef = useRef<ScanLoop | null>(null);

  const getLoop = useCallback((): ScanLoop => {
    if (!loopRef.current) {
      loopRef.current = createScanLoop({
        grab: () => optionsRef.current.grab(),
        ocr: optionsRef.current.ocr,
        lookup: (reading) => optionsRef.current.lookup(reading),
        config: optionsRef.current.config,
        onEvent: (event) => {
          setLastEvent(event);
          if (event.type === 'frame') setState(event.state);
          if (event.type === 'rate') setOcrPerSecond(event.ocrPerSecond);
        },
      });
    }
    return loopRef.current;
  }, []);

  // Beim Unmount die Schleife stoppen (wartet laufende Erkennungen ab und verwirft sie).
  useEffect(
    () => () => {
      loopRef.current?.stop();
      loopRef.current = null;
    },
    [],
  );

  const start = useCallback((): void => {
    getLoop().start();
    setRunning(true);
  }, [getLoop]);

  const stop = useCallback((): void => {
    loopRef.current?.stop();
    setRunning(false);
  }, []);

  const confirm = useCallback((): void => loopRef.current?.confirm(), []);
  const reject = useCallback((): void => loopRef.current?.reject(), []);
  const setFixedSet = useCallback(
    (code: string | null): Promise<void> => getLoop().setFixedSet(code),
    [getLoop],
  );

  return { state, lastEvent, ocrPerSecond, running, start, stop, confirm, reject, setFixedSet };
}
