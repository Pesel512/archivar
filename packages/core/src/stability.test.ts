import { describe, expect, it } from 'vitest';
import {
  createScanMachine,
  DEFAULT_STABILITY_CONFIG,
  enteredValidation,
  scanReducer,
  type ScanMachine,
  type StabilityConfig,
} from './stability.js';
import type { CornerReading, ResolvedCard } from './types.js';

function fullReading(setCode: string, collectorNumber: string): CornerReading {
  return {
    collectorNumber,
    setCode,
    rarity: null,
    language: null,
    foilHint: null,
    completeness: 'full',
  };
}

function partialReading(collectorNumber: string): CornerReading {
  return {
    collectorNumber,
    setCode: null,
    rarity: null,
    language: null,
    foilHint: null,
    completeness: 'partial',
  };
}

function card(overrides: Partial<ResolvedCard> = {}): ResolvedCard {
  return {
    scryfallId: 'abc-123',
    name: 'Test Card',
    setCode: 'DOM',
    collectorNumber: '168',
    languageFallback: false,
    ...overrides,
  };
}

const DOM168 = fullReading('DOM', '168');
const M20042 = fullReading('M20', '42');

describe('scanReducer — Einzeltransitionen', () => {
  it('idle + gültiges Reading → candidate mit count 1', () => {
    const machine = createScanMachine();
    const next = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    expect(next.state).toEqual({ phase: 'candidate', key: 'DOM:168', reading: DOM168, count: 1 });
  });

  it('candidate + gleicher Key → count + 1, unterhalb der Schwelle', () => {
    const machine: ScanMachine = {
      state: { phase: 'candidate', key: 'DOM:168', reading: DOM168, count: 1 },
      fixedSet: null,
      failedKey: null,
    };
    const next = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    expect(next.state).toEqual({ phase: 'candidate', key: 'DOM:168', reading: DOM168, count: 2 });
  });

  it('candidate + gleicher Key erreicht requiredMatches → validating', () => {
    const machine: ScanMachine = {
      state: { phase: 'candidate', key: 'DOM:168', reading: DOM168, count: 2 },
      fixedSet: null,
      failedKey: null,
    };
    const next = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    expect(next.state).toEqual({ phase: 'validating', key: 'DOM:168', reading: DOM168 });
  });

  it('candidate + anderer Key → neuer candidate mit count 1', () => {
    const machine: ScanMachine = {
      state: { phase: 'candidate', key: 'DOM:168', reading: DOM168, count: 2 },
      fixedSet: null,
      failedKey: null,
    };
    const next = scanReducer(machine, { type: 'FRAME', reading: M20042 });
    expect(next.state).toEqual({ phase: 'candidate', key: 'M20:42', reading: M20042, count: 1 });
  });

  it('candidate + anderer, aber blockierter Key → idle statt neuer Kandidat', () => {
    const machine: ScanMachine = {
      state: { phase: 'candidate', key: 'DOM:168', reading: DOM168, count: 1 },
      fixedSet: null,
      failedKey: { key: 'M20:42', framesLeft: 5 },
    };
    const next = scanReducer(machine, { type: 'FRAME', reading: M20042 });
    expect(next.state).toEqual({ phase: 'idle' });
  });

  it('candidate + nichts erkannt → idle', () => {
    const machine: ScanMachine = {
      state: { phase: 'candidate', key: 'DOM:168', reading: DOM168, count: 2 },
      fixedSet: null,
      failedKey: null,
    };
    const next = scanReducer(machine, { type: 'FRAME', reading: null });
    expect(next.state).toEqual({ phase: 'idle' });
  });

  it('failedKey mit framesLeft > 0 startet keinen Kandidaten', () => {
    const machine: ScanMachine = {
      state: { phase: 'idle' },
      fixedSet: null,
      failedKey: { key: 'DOM:168', framesLeft: 5 },
    };
    const next = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    expect(next.state).toEqual({ phase: 'idle' });
  });

  it('jeder FRAME dekrementiert framesLeft des failedKey', () => {
    const machine: ScanMachine = {
      state: { phase: 'idle' },
      fixedSet: null,
      failedKey: { key: 'DOM:168', framesLeft: 5 },
    };
    const next = scanReducer(machine, { type: 'FRAME', reading: null });
    expect(next.failedKey).toEqual({ key: 'DOM:168', framesLeft: 4 });
  });

  it('validating ignoriert FRAME', () => {
    const machine: ScanMachine = {
      state: { phase: 'validating', key: 'DOM:168', reading: DOM168 },
      fixedSet: null,
      failedKey: null,
    };
    const next = scanReducer(machine, { type: 'FRAME', reading: M20042 });
    expect(next).toBe(machine);
  });

  it('VALIDATION_SUCCEEDED → confirming', () => {
    const machine: ScanMachine = {
      state: { phase: 'validating', key: 'DOM:168', reading: DOM168 },
      fixedSet: null,
      failedKey: null,
    };
    const resolved = card();
    const next = scanReducer(machine, { type: 'VALIDATION_SUCCEEDED', card: resolved });
    expect(next.state).toEqual({
      phase: 'confirming',
      key: 'DOM:168',
      card: resolved,
      reading: DOM168,
    });
  });

  it('VALIDATION_SUCCEEDED mit autoConfirm → direkt awaitingRemoval', () => {
    const machine: ScanMachine = {
      state: { phase: 'validating', key: 'DOM:168', reading: DOM168 },
      fixedSet: null,
      failedKey: null,
    };
    const config: StabilityConfig = { ...DEFAULT_STABILITY_CONFIG, autoConfirm: true };
    const next = scanReducer(machine, { type: 'VALIDATION_SUCCEEDED', card: card() }, config);
    expect(next.state).toEqual({ phase: 'awaitingRemoval', key: 'DOM:168', absentFrames: 0 });
  });

  it('VALIDATION_FAILED → idle und setzt failedKey', () => {
    const machine: ScanMachine = {
      state: { phase: 'validating', key: 'DOM:168', reading: DOM168 },
      fixedSet: null,
      failedKey: null,
    };
    const next = scanReducer(machine, { type: 'VALIDATION_FAILED' });
    expect(next.state).toEqual({ phase: 'idle' });
    expect(next.failedKey).toEqual({ key: 'DOM:168', framesLeft: 30 });
  });

  it('confirming ignoriert FRAME', () => {
    const machine: ScanMachine = {
      state: { phase: 'confirming', key: 'DOM:168', card: card(), reading: DOM168 },
      fixedSet: null,
      failedKey: null,
    };
    const next = scanReducer(machine, { type: 'FRAME', reading: M20042 });
    expect(next).toBe(machine);
  });

  it('USER_CONFIRMED → awaitingRemoval mit absentFrames 0', () => {
    const machine: ScanMachine = {
      state: { phase: 'confirming', key: 'DOM:168', card: card(), reading: DOM168 },
      fixedSet: null,
      failedKey: null,
    };
    const next = scanReducer(machine, { type: 'USER_CONFIRMED' });
    expect(next.state).toEqual({ phase: 'awaitingRemoval', key: 'DOM:168', absentFrames: 0 });
  });

  it('USER_REJECTED → awaitingRemoval (Karte liegt noch im Bild)', () => {
    const machine: ScanMachine = {
      state: { phase: 'confirming', key: 'DOM:168', card: card(), reading: DOM168 },
      fixedSet: null,
      failedKey: null,
    };
    const next = scanReducer(machine, { type: 'USER_REJECTED' });
    expect(next.state).toEqual({ phase: 'awaitingRemoval', key: 'DOM:168', absentFrames: 0 });
  });

  it('awaitingRemoval + gleicher Key → absentFrames zurückgesetzt', () => {
    const machine: ScanMachine = {
      state: { phase: 'awaitingRemoval', key: 'DOM:168', absentFrames: 3 },
      fixedSet: null,
      failedKey: null,
    };
    const next = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    expect(next.state).toEqual({ phase: 'awaitingRemoval', key: 'DOM:168', absentFrames: 0 });
  });

  it('awaitingRemoval + nichts erkannt → absentFrames + 1', () => {
    const machine: ScanMachine = {
      state: { phase: 'awaitingRemoval', key: 'DOM:168', absentFrames: 2 },
      fixedSet: null,
      failedKey: null,
    };
    const next = scanReducer(machine, { type: 'FRAME', reading: null });
    expect(next.state).toEqual({ phase: 'awaitingRemoval', key: 'DOM:168', absentFrames: 3 });
  });

  it('awaitingRemoval + anderer Key → absentFrames + 1', () => {
    const machine: ScanMachine = {
      state: { phase: 'awaitingRemoval', key: 'DOM:168', absentFrames: 2 },
      fixedSet: null,
      failedKey: null,
    };
    const next = scanReducer(machine, { type: 'FRAME', reading: M20042 });
    expect(next.state).toEqual({ phase: 'awaitingRemoval', key: 'DOM:168', absentFrames: 3 });
  });

  it('awaitingRemoval erreicht removalFrames → idle', () => {
    const machine: ScanMachine = {
      state: { phase: 'awaitingRemoval', key: 'DOM:168', absentFrames: 4 },
      fixedSet: null,
      failedKey: null,
    };
    const next = scanReducer(machine, { type: 'FRAME', reading: null });
    expect(next.state).toEqual({ phase: 'idle' });
  });

  it.each([
    ['idle', { phase: 'idle' as const }],
    ['candidate', { phase: 'candidate' as const, key: 'DOM:168', reading: DOM168, count: 2 }],
    ['validating', { phase: 'validating' as const, key: 'DOM:168', reading: DOM168 }],
    [
      'confirming',
      { phase: 'confirming' as const, key: 'DOM:168', card: card(), reading: DOM168 },
    ],
    [
      'awaitingRemoval',
      { phase: 'awaitingRemoval' as const, key: 'DOM:168', absentFrames: 1 },
    ],
  ])('SET_CHANGED aus %s → idle, fixedSet gesetzt, failedKey null', (_label, state) => {
    const machine: ScanMachine = {
      state,
      fixedSet: null,
      failedKey: { key: 'DOM:168', framesLeft: 10 },
    };
    const next = scanReducer(machine, { type: 'SET_CHANGED', setCode: 'MOM' });
    expect(next).toEqual({ state: { phase: 'idle' }, fixedSet: 'MOM', failedKey: null });
  });

  it('RESET → Ausgangszustand mit unverändertem fixedSet', () => {
    const machine: ScanMachine = {
      state: { phase: 'candidate', key: 'DOM:168', reading: DOM168, count: 2 },
      fixedSet: 'MOM',
      failedKey: { key: 'M20:42', framesLeft: 10 },
    };
    const next = scanReducer(machine, { type: 'RESET' });
    expect(next).toEqual({ state: { phase: 'idle' }, fixedSet: 'MOM', failedKey: null });
  });
});

describe('scanReducer — Aktionen außerhalb der erwarteten Phase sind No-Ops', () => {
  it('VALIDATION_SUCCEEDED außerhalb von validating ändert nichts', () => {
    const machine = createScanMachine();
    const next = scanReducer(machine, { type: 'VALIDATION_SUCCEEDED', card: card() });
    expect(next).toBe(machine);
  });

  it('VALIDATION_FAILED außerhalb von validating ändert nichts', () => {
    const machine = createScanMachine();
    const next = scanReducer(machine, { type: 'VALIDATION_FAILED' });
    expect(next).toBe(machine);
  });

  it('USER_CONFIRMED außerhalb von confirming ändert nichts', () => {
    const machine = createScanMachine();
    const next = scanReducer(machine, { type: 'USER_CONFIRMED' });
    expect(next).toBe(machine);
  });

  it('USER_REJECTED außerhalb von confirming ändert nichts', () => {
    const machine = createScanMachine();
    const next = scanReducer(machine, { type: 'USER_REJECTED' });
    expect(next).toBe(machine);
  });
});

describe('scanReducer — Sequenzen', () => {
  it('drei gleiche Frames → validating', () => {
    let machine = createScanMachine();
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    expect(machine.state).toEqual({ phase: 'validating', key: 'DOM:168', reading: DOM168 });
  });

  it('zwei gleiche, ein anderer, zwei gleiche → kein validating', () => {
    let machine = createScanMachine();
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'FRAME', reading: M20042 });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    expect(machine.state.phase).toBe('candidate');
    expect(machine.state).toMatchObject({ count: 2 });
  });

  it('Karte bleibt liegen → keine zweite Validierung', () => {
    let machine = createScanMachine();
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    expect(machine.state.phase).toBe('validating');

    machine = scanReducer(machine, { type: 'VALIDATION_SUCCEEDED', card: card() });
    machine = scanReducer(machine, { type: 'USER_CONFIRMED' });
    expect(machine.state.phase).toBe('awaitingRemoval');

    // Karte liegt weiter im Bild — beliebig viele Frames mit demselben Key.
    for (let i = 0; i < 10; i += 1) {
      machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    }
    expect(machine.state).toEqual({ phase: 'awaitingRemoval', key: 'DOM:168', absentFrames: 0 });
  });

  it('Karte weg, dieselbe Karte wieder hingelegt → neue Validierung (Doppelkarten im Stapel)', () => {
    let machine = createScanMachine();
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'VALIDATION_SUCCEEDED', card: card() });
    machine = scanReducer(machine, { type: 'USER_CONFIRMED' });

    // Karte wird entfernt (removalFrames=5 im Default).
    for (let i = 0; i < DEFAULT_STABILITY_CONFIG.removalFrames; i += 1) {
      machine = scanReducer(machine, { type: 'FRAME', reading: null });
    }
    expect(machine.state).toEqual({ phase: 'idle' });

    // Dieselbe Karte (zweites Exemplar im Stapel) wird erneut aufgelegt.
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    expect(machine.state).toEqual({ phase: 'validating', key: 'DOM:168', reading: DOM168 });
  });

  it('fehlgeschlagener Key blockiert für N Frames, danach wieder möglich', () => {
    const config: StabilityConfig = { ...DEFAULT_STABILITY_CONFIG, failedKeyCooldownFrames: 3 };
    let machine = createScanMachine();
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 }, config);
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 }, config);
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 }, config);
    expect(machine.state.phase).toBe('validating');

    machine = scanReducer(machine, { type: 'VALIDATION_FAILED' }, config);
    expect(machine.failedKey).toEqual({ key: 'DOM:168', framesLeft: 3 });

    // Frames 1..3: Key bleibt blockiert.
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 }, config);
    expect(machine.state).toEqual({ phase: 'idle' });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 }, config);
    expect(machine.state).toEqual({ phase: 'idle' });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 }, config);
    expect(machine.state).toEqual({ phase: 'idle' });
    expect(machine.failedKey).toBeNull();

    // Danach wieder möglich.
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 }, config);
    expect(machine.state).toEqual({ phase: 'candidate', key: 'DOM:168', reading: DOM168, count: 1 });
  });

  it('SET_CHANGED während validating beendet den Vorgang', () => {
    let machine = createScanMachine();
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    expect(machine.state.phase).toBe('validating');

    machine = scanReducer(machine, { type: 'SET_CHANGED', setCode: 'MOM' });
    expect(machine).toEqual({ state: { phase: 'idle' }, fixedSet: 'MOM', failedKey: null });
  });

  it('SET_CHANGED während confirming beendet den Vorgang', () => {
    let machine = createScanMachine();
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    machine = scanReducer(machine, { type: 'VALIDATION_SUCCEEDED', card: card() });
    expect(machine.state.phase).toBe('confirming');

    machine = scanReducer(machine, { type: 'SET_CHANGED', setCode: 'MOM' });
    expect(machine).toEqual({ state: { phase: 'idle' }, fixedSet: 'MOM', failedKey: null });
  });

  it('partial-Readings zählen nicht als Erkennung', () => {
    let machine = createScanMachine();
    machine = scanReducer(machine, { type: 'FRAME', reading: partialReading('168') });
    expect(machine.state).toEqual({ phase: 'idle' });

    machine = scanReducer(machine, { type: 'FRAME', reading: DOM168 });
    expect(machine.state).toMatchObject({ phase: 'candidate', count: 1 });

    machine = scanReducer(machine, { type: 'FRAME', reading: partialReading('168') });
    expect(machine.state).toEqual({ phase: 'idle' });
  });
});

describe('enteredValidation', () => {
  it('erkennt den Übergang in validating', () => {
    const prev: ScanMachine = {
      state: { phase: 'candidate', key: 'DOM:168', reading: DOM168, count: 2 },
      fixedSet: null,
      failedKey: null,
    };
    const next: ScanMachine = {
      state: { phase: 'validating', key: 'DOM:168', reading: DOM168 },
      fixedSet: null,
      failedKey: null,
    };
    expect(enteredValidation(prev, next)).toBe(true);
  });

  it('erkennt keinen Übergang, wenn bereits validating', () => {
    const state: ScanMachine['state'] = { phase: 'validating', key: 'DOM:168', reading: DOM168 };
    const prev: ScanMachine = { state, fixedSet: null, failedKey: null };
    const next: ScanMachine = { state, fixedSet: null, failedKey: null };
    expect(enteredValidation(prev, next)).toBe(false);
  });

  it('erkennt keinen Übergang bei anderen Phasenwechseln', () => {
    const prev: ScanMachine = { state: { phase: 'idle' }, fixedSet: null, failedKey: null };
    const next: ScanMachine = {
      state: { phase: 'candidate', key: 'DOM:168', reading: DOM168, count: 1 },
      fixedSet: null,
      failedKey: null,
    };
    expect(enteredValidation(prev, next)).toBe(false);
  });
});
