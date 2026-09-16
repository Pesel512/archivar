import { describe, expect, it } from 'vitest';
import { resolveFinish } from './resolve-finish.js';

describe('resolveFinish', () => {
  it('requested ist verfügbar → ok mit unverändertem Finish', () => {
    const result = resolveFinish('nonfoil', ['nonfoil', 'foil']);
    expect(result).toEqual({ ok: true, finish: 'nonfoil', adjusted: false });
  });

  it('requested nicht verfügbar, genau ein Finish verfügbar → ok mit angepasstem Finish', () => {
    const result = resolveFinish('nonfoil', ['foil']);
    expect(result).toEqual({ ok: true, finish: 'foil', adjusted: true });
  });

  it('requested nicht verfügbar, mehrere verfügbar → nicht ok', () => {
    const result = resolveFinish('etched', ['nonfoil', 'foil']);
    expect(result).toEqual({ ok: false, available: ['nonfoil', 'foil'] });
  });

  it('available leer → nicht ok', () => {
    const result = resolveFinish('nonfoil', []);
    expect(result).toEqual({ ok: false, available: [] });
  });
});
