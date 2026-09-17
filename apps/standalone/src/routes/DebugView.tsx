import { grabRoi, loadCalibration, type DeviceCalibration } from '@pesel512/archivar-camera';
import { createOcrEngine, normalize, type OcrEngine } from '@pesel512/archivar-ocr';
import { CameraPreview, OcrDebugPanel, useCamera, useScanLoop } from '@pesel512/archivar-react';
import type { ResolvedCard } from '@pesel512/archivar-core';
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { loadCalibrationPointer } from '../calibration-pointer';
import { localStorageStore } from '../local-storage-store';
import { lookupCard } from '../scryfall-lookup';

interface ValidatedEntry {
  card: ResolvedCard;
  at: string;
}

const NOOP_OCR: Pick<OcrEngine, 'recognize' | 'setWhitelist'> = {
  recognize: () => Promise.reject(new Error('OCR-Engine noch nicht bereit')),
  setWhitelist: () => Promise.resolve(),
};

function readCalibration(): DeviceCalibration | null {
  const pointer = loadCalibrationPointer(localStorageStore);
  return pointer ? loadCalibration(localStorageStore, pointer.deviceId, pointer.label) : null;
}

/** Dauerbetrieb-Debug-Scan: Kamera mit gespeicherter Kalibrierung, dauerhaftes Debug-Panel. */
export function DebugView(): JSX.Element {
  const [calibration] = useState<DeviceCalibration | null>(readCalibration);
  const camera = useCamera();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const engineRef = useRef<OcrEngine | null>(null);
  const [engine, setEngine] = useState<OcrEngine | null>(null);
  const [fixedSetInput, setFixedSetInput] = useState('');
  const [entries, setEntries] = useState<ValidatedEntry[]>([]);

  useEffect(() => {
    if (!calibration) return;
    void camera.open({ deviceId: calibration.deviceId, resolution: calibration.requestedResolution }).then(() => {
      if (calibration.zoom !== null) void camera.applyZoom(calibration.zoom);
    });
    // `calibration` ist per `useState`-Initializer einmalig gesetzt (nie neu zugewiesen), der
    // Effekt läuft daher effektiv nur beim Mount.
  }, [calibration]);

  useEffect(() => {
    let cancelled = false;
    void createOcrEngine().then((created) => {
      if (cancelled) {
        void created.terminate();
        return;
      }
      engineRef.current = created;
      setEngine(created);
    });
    return () => {
      cancelled = true;
      void engineRef.current?.terminate();
      engineRef.current = null;
    };
  }, []);

  const grab = useCallback((): OffscreenCanvas | HTMLCanvasElement | null => {
    const video = videoRef.current;
    return video && calibration ? grabRoi(video, calibration.roi) : null;
  }, [calibration]);

  const scan = useScanLoop({ grab, ocr: engine ?? NOOP_OCR, lookup: lookupCard });

  useEffect(() => {
    if (!engine || !calibration) return;
    scan.start();
    return () => scan.stop();
    // `scan.start`/`scan.stop` sind über `useCallback` stabil (siehe `use-scan-loop.ts`).
  }, [engine, calibration]);

  useEffect(() => {
    if (scan.lastEvent?.type === 'validated') {
      const { card } = scan.lastEvent;
      setEntries((prev) => [...prev, { card, at: new Date().toLocaleTimeString() }]);
    }
  }, [scan.lastEvent]);

  const applyFixedSet = useCallback(() => {
    const trimmed = fixedSetInput.trim();
    void scan.setFixedSet(trimmed ? trimmed.toUpperCase() : null);
  }, [scan, fixedSetInput]);

  if (!calibration) {
    return (
      <main className="min-h-screen bg-bg p-6 text-fg">
        <h1 className="text-xl font-semibold">Debug-Scan</h1>
        <p className="mt-2 text-fg-muted">
          Keine Kalibrierung gefunden. Bitte zuerst{' '}
          <a className="text-accent underline" href="#/calibrate">
            kalibrieren
          </a>
          .
        </p>
        <a className="mt-4 inline-block text-accent underline" href="#/">
          Zurück
        </a>
      </main>
    );
  }

  const frame = scan.lastEvent?.type === 'frame' ? scan.lastEvent : null;
  const lastValidated = entries.length > 0 ? entries[entries.length - 1]!.card : null;

  return (
    <main className="min-h-screen bg-bg p-6 text-fg">
      <h1 className="text-xl font-semibold">Debug-Scan</h1>

      {camera.status === 'error' && camera.error && (
        <p role="alert" className="mt-2 text-danger">
          Kamerafehler: {camera.error}
        </p>
      )}

      <CameraPreview className="mt-4 aspect-video" stream={camera.stream} roi={calibration.roi} videoRef={videoRef} />

      <div className="mt-4 flex items-center gap-2">
        <label className="text-sm text-fg-muted" htmlFor="fixed-set">
          Set fixieren
        </label>
        <input
          id="fixed-set"
          className="border border-border bg-bg-elevated px-2 py-1 text-sm"
          value={fixedSetInput}
          onChange={(event) => setFixedSetInput(event.target.value)}
        />
        <button type="button" className="text-accent underline" onClick={applyFixedSet}>
          Anwenden
        </button>
      </div>

      {scan.state.phase === 'confirming' && (
        <div className="mt-4 flex gap-2">
          <button type="button" className="text-accent underline" onClick={scan.confirm}>
            Bestätigen
          </button>
          <button type="button" className="text-danger underline" onClick={scan.reject}>
            Verwerfen
          </button>
        </div>
      )}

      <OcrDebugPanel
        className="mt-4 text-sm text-fg-muted"
        rawText={frame?.rawText ?? ''}
        normalizedText={frame ? normalize(frame.rawText) : ''}
        reading={frame?.reading ?? null}
        state={scan.state}
        ocrMs={frame?.ocrMs ?? 0}
        ocrPerSecond={scan.ocrPerSecond}
        lastResult={lastValidated}
      />

      <h2 className="mt-4 text-sm font-semibold">Validierte Karten dieser Sitzung</h2>
      <ul className="mt-2 text-sm text-fg-muted">
        {entries.map((entry, index) => (
          <li key={index}>
            {entry.at} — {entry.card.name} ({entry.card.setCode.toUpperCase()} {entry.card.collectorNumber})
          </li>
        ))}
      </ul>

      <a className="mt-4 inline-block text-accent underline" href="#/">
        Zurück
      </a>
    </main>
  );
}
