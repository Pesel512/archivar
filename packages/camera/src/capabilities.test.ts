import { describe, expect, it } from 'vitest';
import { toCameraFeatures } from './capabilities.js';

describe('toCameraFeatures', () => {
  it('übernimmt vollständige Capabilities/Settings', () => {
    const caps = {
      zoom: { min: 1, max: 8, step: 0.1 },
      focusMode: ['continuous', 'manual'],
      torch: true,
    };
    const settings = { zoom: 2.5, width: 3840, height: 2160 };

    expect(toCameraFeatures(caps, settings, { width: 3840, height: 2160 })).toEqual({
      zoom: { min: 1, max: 8, step: 0.1, current: 2.5 },
      focusModes: ['continuous', 'manual'],
      torch: true,
      actualResolution: { width: 3840, height: 2160 },
      requestedResolution: { width: 3840, height: 2160 },
      resolutionShortfall: false,
    });
  });

  it('liefert zoom: null, wenn das Zoom-Feld fehlt', () => {
    const caps = { focusMode: ['continuous'], torch: false };
    const settings = { width: 1920, height: 1080 };

    const result = toCameraFeatures(caps, settings, { width: 1920, height: 1080 });
    expect(result.zoom).toBeNull();
  });

  it('liefert zoom: null, wenn das Zoom-Objekt unvollständig ist', () => {
    const caps = { zoom: { min: 1, max: 8 } };
    const result = toCameraFeatures(caps, {}, { width: 1920, height: 1080 });
    expect(result.zoom).toBeNull();
  });

  it('nutzt min als aktuellen Zoom, wenn settings.zoom fehlt', () => {
    const caps = { zoom: { min: 1, max: 8, step: 0.1 } };
    const result = toCameraFeatures(caps, {}, { width: 1920, height: 1080 });
    expect(result.zoom).toEqual({ min: 1, max: 8, step: 0.1, current: 1 });
  });

  it('wertet Müll-Eingaben defensiv aus, ohne zu werfen', () => {
    expect(() => toCameraFeatures('garbage', 42, { width: 1920, height: 1080 })).not.toThrow();
    const result = toCameraFeatures(null, undefined, { width: 1920, height: 1080 });
    expect(result).toEqual({
      zoom: null,
      focusModes: [],
      torch: false,
      actualResolution: { width: 1920, height: 1080 },
      requestedResolution: { width: 1920, height: 1080 },
      resolutionShortfall: false,
    });
  });

  it('erkennt resolutionShortfall bei 1920 statt angeforderten 3840', () => {
    const settings = { width: 1920, height: 1080 };
    const result = toCameraFeatures({}, settings, { width: 3840, height: 2160 });
    expect(result.resolutionShortfall).toBe(true);
  });

  it('meldet keinen Shortfall knapp unter der 90-%-Schwelle', () => {
    const settings = { width: 3600, height: 2025 };
    const result = toCameraFeatures({}, settings, { width: 3840, height: 2160 });
    expect(result.resolutionShortfall).toBe(false);
  });
});
