import type { NormalizedRoi } from './roi.js';

export interface DeviceCalibration {
  schemaVersion: 1;
  deviceId: string;
  label: string;
  requestedResolution: { width: number; height: number };
  zoom: number | null;
  roi: NormalizedRoi;
  calibratedAt: string;
}

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

// VERIFY: Speicherschlüssel-Präfix frei gewählt, keine Vorgabe aus der Spezifikation.
const STORAGE_PREFIX = 'archivar:camera-calibration:';

function deviceKey(deviceId: string): string {
  return `${STORAGE_PREFIX}device:${deviceId}`;
}

function labelKey(label: string): string {
  return `${STORAGE_PREFIX}label:${label}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDimensions(value: unknown): value is { width: number; height: number } {
  return isRecord(value) && typeof value.width === 'number' && typeof value.height === 'number';
}

function isNormalizedRoi(value: unknown): value is NormalizedRoi {
  return (
    isRecord(value) &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.width === 'number' &&
    typeof value.height === 'number'
  );
}

function isValidCalibration(value: unknown): value is DeviceCalibration {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    typeof value.deviceId === 'string' &&
    typeof value.label === 'string' &&
    typeof value.calibratedAt === 'string' &&
    (value.zoom === null || typeof value.zoom === 'number') &&
    isDimensions(value.requestedResolution) &&
    isNormalizedRoi(value.roi)
  );
}

export function saveCalibration(store: KeyValueStore, cal: DeviceCalibration): void {
  const serialized = JSON.stringify(cal);
  store.set(deviceKey(cal.deviceId), serialized);
  store.set(labelKey(cal.label), serialized);
}

export function loadCalibration(
  store: KeyValueStore,
  deviceId: string,
  label: string,
): DeviceCalibration | null {
  const raw = store.get(deviceKey(deviceId)) ?? store.get(labelKey(label));
  if (raw === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return isValidCalibration(parsed) ? parsed : null;
}
