import {
  clampRoi,
  effectivePixels as computeEffectivePixels,
  grabRoi,
  listCameras,
  loadCalibration,
  saveCalibration,
  type CameraDevice,
  type CameraErrorReason,
  type DeviceCalibration,
  type KeyValueStore,
  type NormalizedRoi,
} from '@pesel512/archivar-camera';
import type { CornerReading } from '@pesel512/archivar-core';
import { normalize, type OcrEngine } from '@pesel512/archivar-ocr';
import type { LookupResult } from '@pesel512/archivar-scryfall';
import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { useCamera } from '../use-camera.js';
import { useScanLoop } from '../use-scan-loop.js';
import { CameraPreview } from './CameraPreview.js';
import { OcrDebugPanel } from './OcrDebugPanel.js';
import { ResolutionBadge } from './ResolutionBadge.js';
import { RoiEditor } from './RoiEditor.js';
import { ZoomControl } from './ZoomControl.js';

type ProbeOcr = Pick<OcrEngine, 'recognize' | 'setWhitelist' | 'terminate'>;

export interface CalibrationWizardProps {
  store: KeyValueStore;
  /**
   * Muss über Re-Renders hinweg referenzstabil sein (z. B. direkt `createOcrEngine` aus
   * `@pesel512/archivar-ocr` oder ein memoisierter Wrapper) — `ProbeScanStep` (Schritt 6)
   * erstellt bei jedem Identitätswechsel dieser Funktion eine neue tesseract.js-Engine.
   */
  createOcr: () => Promise<ProbeOcr>;
  lookup: (reading: CornerReading) => Promise<LookupResult>;
  onDone?: (calibration: DeviceCalibration) => void;
  className?: string;
}

// Nach der Halterungs-Ausrichtung (Schritt 4) liegt die Kartenecke bildmittig (der Zoom zieht
// zur Mitte) — der Default-ROI startet deshalb zentriert, nicht wie bei einem freien Scan am Rand.
const DEFAULT_ROI: NormalizedRoi = { x: 0.35, y: 0.35, width: 0.3, height: 0.3 };
const STEP_COUNT = 7;

const CAMERA_ERROR_TEXT: Record<CameraErrorReason, string> = {
  insecure_context: 'Kamerazugriff benötigt HTTPS.',
  permission_denied: 'Kamerazugriff wurde verweigert.',
  no_camera: 'Keine passende Kamera gefunden.',
  in_use: 'Kamera wird bereits von einer anderen Anwendung genutzt.',
  unknown: 'Unbekannter Kamerafehler.',
};

/** Führt durch die Kalibrier-Schritte (Kamera, Auflösung, Zoom, Halterung, ROI, Probescan, Speichern). */
export function CalibrationWizard({
  store,
  createOcr,
  lookup,
  onDone,
  className,
}: CalibrationWizardProps): JSX.Element {
  const camera = useCamera();
  const [step, setStep] = useState(1);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [labelsAvailable, setLabelsAvailable] = useState(false);
  const [selected, setSelected] = useState<CameraDevice | null>(null);
  const [roi, setRoi] = useState<NormalizedRoi>(DEFAULT_ROI);
  const [validated, setValidated] = useState(false);

  // Berechtigung zuerst anfordern (Default-Kamera öffnen), erst danach liefert
  // enumerateDevices() befüllte Labels.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await camera.open();
      if (cancelled) return;
      const result = await listCameras();
      if (cancelled) return;
      setCameras(result.cameras);
      setLabelsAvailable(result.labelsAvailable);
    })();
    return () => {
      cancelled = true;
    };
    // Bewusst nur beim Mount: Kamera einmal öffnen und Geräte einmal auflisten, nicht bei
    // jedem Re-Render (kein react-hooks-Lint in diesem Projekt, siehe eslint.config.js).
  }, []);

  const selectCamera = useCallback(
    async (device: CameraDevice) => {
      setSelected(device);
      await camera.open({ deviceId: device.deviceId });
      const existing = loadCalibration(store, device.deviceId, device.label);
      if (existing) setRoi(existing.roi);
      setStep(2);
    },
    [camera, store],
  );

  const save = useCallback(() => {
    if (!selected) return;
    const calibration: DeviceCalibration = {
      schemaVersion: 1,
      deviceId: selected.deviceId,
      label: selected.label,
      requestedResolution: camera.features?.requestedResolution ?? { width: 3840, height: 2160 },
      zoom: camera.features?.zoom?.current ?? null,
      roi: clampRoi(roi),
      calibratedAt: new Date().toISOString(),
    };
    saveCalibration(store, calibration);
    onDone?.(calibration);
  }, [selected, camera.features, roi, store, onDone]);

  return (
    <div className={className} data-calibration-wizard="" data-step={step}>
      <p>
        Schritt {step} von {STEP_COUNT}
      </p>

      {step === 1 && (
        <ul>
          {!labelsAvailable && <li>Kamera-Namen erscheinen nach der Berechtigungsfreigabe.</li>}
          {cameras.map((device) => (
            <li key={device.deviceId}>
              <button type="button" onClick={() => void selectCamera(device)}>
                {device.label || 'Kamera'}
              </button>
            </li>
          ))}
          {camera.status === 'error' && camera.error && <li role="alert">{CAMERA_ERROR_TEXT[camera.error]}</li>}
        </ul>
      )}

      {step === 2 && (
        <>
          <ResolutionBadge features={camera.features} />
          <button type="button" onClick={() => setStep(3)}>
            Weiter
          </button>
        </>
      )}

      {step === 3 && (
        <>
          {camera.features?.zoom ? (
            <ZoomControl features={camera.features} onChange={camera.applyZoom} />
          ) : (
            <p>Kein Zoom verfügbar — die Pixeldichte lässt sich nur über den Abstand zur Karte steuern.</p>
          )}
          <button type="button" onClick={() => setStep(4)}>
            Weiter
          </button>
        </>
      )}

      {step === 4 && (
        <>
          <p>
            Der Zoom zieht zur Bildmitte. Richte Halterung und Karte so aus, dass die Ecke unten links mit
            Sammlernummer und Set-Code in der Bildmitte liegt.
          </p>
          <CameraPreview stream={camera.stream} />
          <button type="button" onClick={() => setStep(5)}>
            Weiter
          </button>
        </>
      )}

      {step === 5 && (
        <>
          <RoiEditor stream={camera.stream} roi={roi} onChange={setRoi} />
          <ResolutionBadge
            features={camera.features}
            effectivePixels={
              camera.features
                ? computeEffectivePixels(
                    roi,
                    camera.features.actualResolution.width,
                    camera.features.actualResolution.height,
                  )
                : undefined
            }
          />
          <button type="button" onClick={() => setStep(6)}>
            Weiter
          </button>
        </>
      )}

      {step === 6 && (
        <>
          <ProbeScanStep
            stream={camera.stream}
            roi={roi}
            createOcr={createOcr}
            lookup={lookup}
            onValidated={() => setValidated(true)}
          />
          <button type="button" disabled={!validated} onClick={() => setStep(7)}>
            Weiter
          </button>
        </>
      )}

      {step === 7 && (
        <button type="button" onClick={save}>
          Kalibrierung speichern
        </button>
      )}
    </div>
  );
}

const NOOP_OCR: Pick<OcrEngine, 'recognize' | 'setWhitelist'> = {
  recognize: () => Promise.reject(new Error('OCR-Engine noch nicht bereit')),
  setWhitelist: () => Promise.resolve(),
};

interface ProbeScanStepProps {
  stream: MediaStream | null;
  roi: NormalizedRoi;
  createOcr: () => Promise<ProbeOcr>;
  lookup: (reading: CornerReading) => Promise<LookupResult>;
  onValidated: () => void;
}

/**
 * Eigene Komponente statt Inline-Logik im Wizard: mountet/unmountet mit Schritt 6, sodass
 * `useScanLoop` (dessen zugrunde liegende Schleife die `ocr`-Abhängigkeit nur einmal bei der
 * ersten `start()` übernimmt, siehe `use-scan-loop.ts`) bei jedem Betreten des Schritts eine
 * frische OCR-Engine bekommt, statt eine veraltete weiterzuverwenden.
 */
function ProbeScanStep({ stream, roi, createOcr, lookup, onValidated }: ProbeScanStepProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const engineRef = useRef<ProbeOcr | null>(null);
  const [engine, setEngine] = useState<ProbeOcr | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createOcr().then((created) => {
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
  }, [createOcr]);

  const grab = useCallback((): OffscreenCanvas | HTMLCanvasElement | null => {
    const video = videoRef.current;
    return video ? grabRoi(video, roi) : null;
  }, [roi]);

  const scan = useScanLoop({ grab, ocr: engine ?? NOOP_OCR, lookup });

  useEffect(() => {
    if (!engine) return;
    scan.start();
    return () => scan.stop();
    // `scan.start`/`scan.stop` sind über `useCallback` stabil (siehe `use-scan-loop.ts`), daher
    // reicht `engine` als einzige Abhängigkeit.
  }, [engine]);

  useEffect(() => {
    if (scan.lastEvent?.type === 'validated') onValidated();
  }, [scan.lastEvent, onValidated]);

  const frame = scan.lastEvent?.type === 'frame' ? scan.lastEvent : null;

  return (
    <>
      <CameraPreview stream={stream} roi={roi} videoRef={videoRef} />
      <OcrDebugPanel
        rawText={frame?.rawText ?? ''}
        normalizedText={frame ? normalize(frame.rawText) : ''}
        reading={frame?.reading ?? null}
        state={scan.state}
        ocrMs={frame?.ocrMs ?? 0}
        ocrPerSecond={scan.ocrPerSecond}
        lastResult={scan.lastEvent?.type === 'validated' ? scan.lastEvent.card : null}
      />
    </>
  );
}
