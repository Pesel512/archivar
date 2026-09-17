import type { KeyValueStore } from '@pesel512/archivar-camera';

export interface CalibrationPointer {
  deviceId: string;
  label: string;
}

// `calibration-schema.ts` (camera, B2) speichert Kalibrierungen selbst unter Geräte-ID/Label-
// Schlüsseln, kennt aber keinen "zuletzt kalibriertes Gerät"-Zeiger — den braucht nur die App
// (#/debug muss wissen, WELCHE der ggf. mehreren gespeicherten Kalibrierungen zu laden ist).
const POINTER_KEY = 'archivar:calibration-pointer';

function isPointer(value: unknown): value is CalibrationPointer {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).deviceId === 'string' &&
    typeof (value as Record<string, unknown>).label === 'string'
  );
}

export function saveCalibrationPointer(store: KeyValueStore, pointer: CalibrationPointer): void {
  store.set(POINTER_KEY, JSON.stringify(pointer));
}

export function loadCalibrationPointer(store: KeyValueStore): CalibrationPointer | null {
  const raw = store.get(POINTER_KEY);
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isPointer(parsed) ? parsed : null;
}
