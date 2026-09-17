import { describe, expect, it } from 'vitest';
import { loadCalibration, saveCalibration, type DeviceCalibration, type KeyValueStore } from './calibration-schema.js';

function createFakeStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => map.set(key, value),
    remove: (key) => {
      map.delete(key);
    },
  };
}

function calibration(overrides: Partial<DeviceCalibration> = {}): DeviceCalibration {
  return {
    schemaVersion: 1,
    deviceId: 'device-1',
    label: 'Desktop-Webcam',
    requestedResolution: { width: 3840, height: 2160 },
    zoom: 2,
    roi: { x: 0.3, y: 0.3, width: 0.2, height: 0.2 },
    calibratedAt: '2026-09-17T12:00:00.000Z',
    ...overrides,
  };
}

describe('saveCalibration / loadCalibration', () => {
  it('speichert und lädt eine Kalibrierung über deviceId', () => {
    const store = createFakeStore();
    const cal = calibration();

    saveCalibration(store, cal);

    expect(loadCalibration(store, cal.deviceId, cal.label)).toEqual(cal);
  });

  it('fällt auf label zurück, wenn die deviceId nicht (mehr) bekannt ist', () => {
    const store = createFakeStore();
    const cal = calibration();
    saveCalibration(store, cal);

    expect(loadCalibration(store, 'unbekannte-device-id', cal.label)).toEqual(cal);
  });

  it('liefert null, wenn weder deviceId noch label etwas finden', () => {
    const store = createFakeStore();
    expect(loadCalibration(store, 'unbekannt', 'unbekannt')).toBeNull();
  });

  it('liefert null bei kaputtem JSON', () => {
    const store = createFakeStore();
    store.set('archivar:camera-calibration:device:device-1', '{nicht valides json');

    expect(loadCalibration(store, 'device-1', 'Desktop-Webcam')).toBeNull();
  });

  it('liefert null bei falscher Schemaversion', () => {
    const store = createFakeStore();
    const cal = calibration();
    store.set(
      'archivar:camera-calibration:device:device-1',
      JSON.stringify({ ...cal, schemaVersion: 2 }),
    );

    expect(loadCalibration(store, 'device-1', 'Desktop-Webcam')).toBeNull();
  });

  it('liefert null, wenn Pflichtfelder fehlen', () => {
    const store = createFakeStore();
    store.set('archivar:camera-calibration:device:device-1', JSON.stringify({ schemaVersion: 1 }));

    expect(loadCalibration(store, 'device-1', 'Desktop-Webcam')).toBeNull();
  });
});
