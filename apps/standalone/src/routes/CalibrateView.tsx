import { loadCalibration, type DeviceCalibration } from '@pesel512/archivar-camera';
import { createOcrEngine } from '@pesel512/archivar-ocr';
import { CalibrationWizard } from '@pesel512/archivar-react';
import { useCallback, useState, type JSX } from 'react';
import { loadCalibrationPointer, saveCalibrationPointer } from '../calibration-pointer';
import { localStorageStore } from '../local-storage-store';
import { lookupCard } from '../scryfall-lookup';

function readExistingCalibration(): DeviceCalibration | null {
  const pointer = loadCalibrationPointer(localStorageStore);
  return pointer ? loadCalibration(localStorageStore, pointer.deviceId, pointer.label) : null;
}

export function CalibrateView(): JSX.Element {
  const [existing, setExisting] = useState<DeviceCalibration | null>(readExistingCalibration);
  const [wizardActive, setWizardActive] = useState(false);

  const handleDone = useCallback((calibration: DeviceCalibration) => {
    saveCalibrationPointer(localStorageStore, { deviceId: calibration.deviceId, label: calibration.label });
    setExisting(calibration);
    setWizardActive(false);
  }, []);

  const showWizard = wizardActive || existing === null;

  return (
    <main className="min-h-screen bg-bg p-6 text-fg">
      <h1 className="text-xl font-semibold">Kalibrieren</h1>

      {existing && !showWizard && (
        <div className="mt-4 flex flex-col gap-2">
          <p>Vorhandene Kalibrierung für „{existing.label || existing.deviceId}“:</p>
          <ul className="text-sm text-fg-muted">
            <li>
              Angeforderte Auflösung: {existing.requestedResolution.width} ×{' '}
              {existing.requestedResolution.height}
            </li>
            <li>Zoom: {existing.zoom ?? '—'}</li>
            <li>Kalibriert am: {new Date(existing.calibratedAt).toLocaleString()}</li>
          </ul>
          <button
            type="button"
            className="self-start text-accent underline"
            onClick={() => setWizardActive(true)}
          >
            Neu kalibrieren
          </button>
        </div>
      )}

      {showWizard && (
        <CalibrationWizard
          className="mt-4 flex flex-col gap-4"
          store={localStorageStore}
          createOcr={createOcrEngine}
          lookup={lookupCard}
          onDone={handleDone}
        />
      )}

      <a className="mt-4 inline-block text-accent underline" href="#/">
        Zurück
      </a>
    </main>
  );
}
