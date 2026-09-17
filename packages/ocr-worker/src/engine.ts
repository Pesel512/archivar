import { createWorker, PSM, type Worker } from 'tesseract.js';
import { buildWhitelist } from './whitelist.js';

export interface OcrRecognizeResult {
  text: string;
  confidence: number;
  durationMs: number;
}

export interface OcrEngine {
  recognize(image: OffscreenCanvas | HTMLCanvasElement): Promise<OcrRecognizeResult>;
  setWhitelist(fixedSet: string | null): Promise<void>;
  terminate(): Promise<void>;
}

export interface CreateOcrEngineOptions {
  langPath?: string;
}

// Serialisiert setParameters/recognize-Aufrufe auf demselben Worker; wird von setWhitelist
// genutzt, damit ein Aufruf während laufender Erkennung wartet statt parallel zuzugreifen.
function createQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const result = tail.then(fn, fn);
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
}

/**
 * tesseract.js läuft selbst in einem Web Worker — kein eigener Worker nötig, der
 * Haupt-Thread blockiert dadurch nicht. Lädt nur die "eng"-Traineddata: die gescannte
 * Ecke enthält nie Fließtext, nur Ziffern/Großbuchstaben, unabhängig von der Kartensprache
 * (die kommt aus dem separaten Sprachcode im Aufdruck, siehe corner-parser).
 */
export async function createOcrEngine(opts?: CreateOcrEngineOptions): Promise<OcrEngine> {
  const worker: Worker = await createWorker(
    ['eng'],
    undefined,
    opts?.langPath ? { langPath: opts.langPath } : undefined,
  );
  await worker.setParameters({
    tessedit_char_whitelist: buildWhitelist(null),
    // VERIFY: SINGLE_BLOCK aus der Tappd-Referenz übernommen (Crop als ein
    // zusammenhängender Textblock statt verstreutem Text) — am eigenen Gerät/Bild
    // noch nicht selbst verifiziert.
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
  });

  const enqueue = createQueue();
  let recognizing = false;

  return {
    recognize(image) {
      if (recognizing) {
        return Promise.reject(new Error('recognize() läuft bereits, Aufruf abgewiesen'));
      }
      recognizing = true;
      return enqueue(async () => {
        try {
          const start = Date.now();
          const { data } = await worker.recognize(image);
          return { text: data.text, confidence: data.confidence, durationMs: Date.now() - start };
        } finally {
          recognizing = false;
        }
      });
    },
    async setWhitelist(fixedSet) {
      await enqueue(() =>
        worker.setParameters({ tessedit_char_whitelist: buildWhitelist(fixedSet) }),
      );
    },
    async terminate() {
      await worker.terminate();
    },
  };
}
