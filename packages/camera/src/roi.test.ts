import { describe, expect, it } from 'vitest';
import { clampRoi, effectivePixels, moveRoi, resizeRoi, toPixelRect } from './roi.js';

describe('clampRoi', () => {
  it('klemmt einen ROI, der über den rechten/unteren Bildrand hinausragt', () => {
    expect(clampRoi({ x: 0.8, y: 0.9, width: 0.5, height: 0.5 })).toEqual({
      x: 0.5,
      y: 0.5,
      width: 0.5,
      height: 0.5,
    });
  });

  it('klemmt einen ROI mit negativer Position an den linken/oberen Bildrand', () => {
    expect(clampRoi({ x: -0.2, y: -0.1, width: 0.3, height: 0.3 })).toEqual({
      x: 0,
      y: 0,
      width: 0.3,
      height: 0.3,
    });
  });

  it('erzwingt die Mindestgröße, wenn der ROI kleiner ist', () => {
    const result = clampRoi({ x: 0.5, y: 0.5, width: 0.02, height: 0.02 }, 0.1);
    expect(result.width).toBe(0.1);
    expect(result.height).toBe(0.1);
  });

  it('nutzt den Standard-Minimalwert, wenn kein minSize angegeben ist', () => {
    const result = clampRoi({ x: 0, y: 0, width: 0.01, height: 0.01 });
    expect(result.width).toBeGreaterThanOrEqual(0.1);
    expect(result.height).toBeGreaterThanOrEqual(0.1);
  });

  it('wirft nicht, wenn minSize größer als 1 ist, sondern liefert minSize als Notfallwert', () => {
    expect(() => clampRoi({ x: 0, y: 0, width: 0.5, height: 0.5 }, 1.5)).not.toThrow();
    const result = clampRoi({ x: 0, y: 0, width: 0.5, height: 0.5 }, 1.5);
    expect(result.width).toBe(1.5);
    expect(result.height).toBe(1.5);
  });
});

describe('toPixelRect', () => {
  it('bleibt bei Querformat innerhalb des Bildes, auch am Rand', () => {
    const rect = toPixelRect({ x: 0.9, y: 0.9, width: 0.3, height: 0.3 }, 1920, 1080);
    expect(rect.sx + rect.sw).toBeLessThanOrEqual(1920);
    expect(rect.sy + rect.sh).toBeLessThanOrEqual(1080);
    expect(rect.sx).toBeGreaterThanOrEqual(0);
    expect(rect.sy).toBeGreaterThanOrEqual(0);
  });

  it('bleibt bei Hochformat innerhalb des Bildes, auch am Rand', () => {
    const rect = toPixelRect({ x: 0.9, y: 0.9, width: 0.3, height: 0.3 }, 1080, 1920);
    expect(rect.sx + rect.sw).toBeLessThanOrEqual(1080);
    expect(rect.sy + rect.sh).toBeLessThanOrEqual(1920);
    expect(rect.sx).toBeGreaterThanOrEqual(0);
    expect(rect.sy).toBeGreaterThanOrEqual(0);
  });

  it('liefert ganzzahlige Werte', () => {
    const rect = toPixelRect({ x: 0.1234, y: 0.5678, width: 0.3, height: 0.2 }, 1920, 1080);
    expect(Number.isInteger(rect.sx)).toBe(true);
    expect(Number.isInteger(rect.sy)).toBe(true);
    expect(Number.isInteger(rect.sw)).toBe(true);
    expect(Number.isInteger(rect.sh)).toBe(true);
  });
});

describe('effectivePixels', () => {
  it('berechnet die Pixelzahl des ROI bei 4K', () => {
    expect(effectivePixels({ x: 0, y: 0, width: 0.5, height: 0.25 }, 3840, 2160)).toEqual({
      width: 1920,
      height: 540,
    });
  });

  it('berechnet die Pixelzahl des ROI bei 720p', () => {
    expect(effectivePixels({ x: 0, y: 0, width: 0.5, height: 0.5 }, 1280, 720)).toEqual({
      width: 640,
      height: 360,
    });
  });
});

describe('moveRoi', () => {
  it('verschiebt den ROI um das Delta', () => {
    const result = moveRoi({ x: 0.2, y: 0.2, width: 0.3, height: 0.3 }, 0.1, -0.1);
    expect(result.x).toBeCloseTo(0.3);
    expect(result.y).toBeCloseTo(0.1);
    expect(result.width).toBe(0.3);
    expect(result.height).toBe(0.3);
  });

  it('klemmt die Verschiebung an den Bildrand, ohne die Größe zu ändern', () => {
    const result = moveRoi({ x: 0.6, y: 0.6, width: 0.3, height: 0.3 }, 0.5, 0.5);
    expect(result.x).toBeCloseTo(0.7);
    expect(result.y).toBeCloseTo(0.7);
    expect(result.width).toBe(0.3);
    expect(result.height).toBe(0.3);
  });
});

describe('resizeRoi', () => {
  it('vergrößert von der Bildschirmmitte aus (anchor "center")', () => {
    const result = resizeRoi({ x: 0.4, y: 0.4, width: 0.2, height: 0.2 }, 0.1, 0.1, 'center');
    expect(result.width).toBeCloseTo(0.3);
    expect(result.height).toBeCloseTo(0.3);
    expect(result.x).toBeCloseTo(0.35);
    expect(result.y).toBeCloseTo(0.35);
  });

  it('vergrößert ab der oberen linken Ecke (anchor "top-left"), Position bleibt fix', () => {
    const result = resizeRoi({ x: 0.2, y: 0.2, width: 0.2, height: 0.2 }, 0.1, 0.1, 'top-left');
    expect(result.x).toBe(0.2);
    expect(result.y).toBe(0.2);
    expect(result.width).toBeCloseTo(0.3);
    expect(result.height).toBeCloseTo(0.3);
  });

  it('klemmt die neue Größe an den Bildrand', () => {
    const result = resizeRoi({ x: 0.8, y: 0.8, width: 0.2, height: 0.2 }, 0.5, 0.5, 'top-left');
    expect(result.x + result.width).toBeLessThanOrEqual(1);
    expect(result.y + result.height).toBeLessThanOrEqual(1);
  });
});
