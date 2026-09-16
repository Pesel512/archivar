import type { CornerReading, ReadingKey, ResolvedCard } from './types.js';
import { toReadingKey } from './types.js';

export interface StabilityConfig {
  requiredMatches: number;
  removalFrames: number;
  failedKeyCooldownFrames: number;
  autoConfirm: boolean;
}

export const DEFAULT_STABILITY_CONFIG: StabilityConfig = {
  requiredMatches: 3,
  removalFrames: 5,
  failedKeyCooldownFrames: 30,
  autoConfirm: false,
};

export type ScanState =
  | { phase: 'idle' }
  | { phase: 'candidate'; key: ReadingKey; reading: CornerReading; count: number }
  | { phase: 'validating'; key: ReadingKey; reading: CornerReading }
  | { phase: 'confirming'; key: ReadingKey; card: ResolvedCard; reading: CornerReading }
  | { phase: 'awaitingRemoval'; key: ReadingKey; absentFrames: number };

export interface ScanMachine {
  state: ScanState;
  fixedSet: string | null;
  failedKey: { key: ReadingKey; framesLeft: number } | null;
}

export type ScanAction =
  | { type: 'FRAME'; reading: CornerReading | null }
  | { type: 'VALIDATION_SUCCEEDED'; card: ResolvedCard }
  | { type: 'VALIDATION_FAILED' }
  | { type: 'USER_CONFIRMED' }
  | { type: 'USER_REJECTED' }
  | { type: 'SET_CHANGED'; setCode: string | null }
  | { type: 'RESET' };

export function createScanMachine(fixedSet: string | null = null): ScanMachine {
  return { state: { phase: 'idle' }, fixedSet, failedKey: null };
}

function tickFailedKey(failedKey: ScanMachine['failedKey']): ScanMachine['failedKey'] {
  if (!failedKey) return null;
  const framesLeft = failedKey.framesLeft - 1;
  return framesLeft > 0 ? { key: failedKey.key, framesLeft } : null;
}

function isBlocked(failedKey: ScanMachine['failedKey'], key: ReadingKey): boolean {
  return failedKey !== null && failedKey.key === key && failedKey.framesLeft > 0;
}

function keyOf(reading: CornerReading): ReadingKey {
  // completeness 'full' garantiert setCode !== null (siehe corner-parser.ts).
  return toReadingKey(reading.setCode!, reading.collectorNumber);
}

function handleFrame(
  machine: ScanMachine,
  reading: CornerReading | null,
  config: StabilityConfig,
): ScanMachine {
  const { state } = machine;
  // VERIFY: "ignoriert FRAME" wird hier als vollständiges No-Op verstanden — auch der
  // failedKey-Cooldown tickt in validating/confirming nicht mit. Alternative Lesart: der
  // Cooldown ist eine reine Zeit-/Frame-Uhr und müsste unabhängig vom Phase weiterlaufen.
  if (state.phase === 'validating' || state.phase === 'confirming') {
    return machine;
  }

  const recognized = reading && reading.completeness === 'full' ? reading : null;
  const key = recognized ? keyOf(recognized) : null;
  const blocked = key !== null && isBlocked(machine.failedKey, key);
  const failedKey = tickFailedKey(machine.failedKey);

  let nextState: ScanState;

  if (state.phase === 'idle') {
    nextState =
      recognized && key !== null && !blocked
        ? { phase: 'candidate', key, reading: recognized, count: 1 }
        : { phase: 'idle' };
  } else if (state.phase === 'candidate') {
    if (recognized && key !== null) {
      if (key === state.key) {
        const count = state.count + 1;
        nextState =
          count >= config.requiredMatches
            ? { phase: 'validating', key, reading: recognized }
            : { phase: 'candidate', key, reading: recognized, count };
      } else {
        nextState = blocked
          ? { phase: 'idle' }
          : { phase: 'candidate', key, reading: recognized, count: 1 };
      }
    } else {
      nextState = { phase: 'idle' };
    }
  } else {
    // awaitingRemoval
    if (recognized && key !== null && key === state.key) {
      nextState = { phase: 'awaitingRemoval', key: state.key, absentFrames: 0 };
    } else {
      const absentFrames = state.absentFrames + 1;
      nextState =
        absentFrames >= config.removalFrames
          ? { phase: 'idle' }
          : { phase: 'awaitingRemoval', key: state.key, absentFrames };
    }
  }

  return { state: nextState, fixedSet: machine.fixedSet, failedKey };
}

function handleValidationSucceeded(
  machine: ScanMachine,
  card: ResolvedCard,
  config: StabilityConfig,
): ScanMachine {
  if (machine.state.phase !== 'validating') return machine;
  const { key, reading } = machine.state;
  const nextState: ScanState = config.autoConfirm
    ? { phase: 'awaitingRemoval', key, absentFrames: 0 }
    : { phase: 'confirming', key, card, reading };
  return { ...machine, state: nextState };
}

function handleValidationFailed(machine: ScanMachine, config: StabilityConfig): ScanMachine {
  if (machine.state.phase !== 'validating') return machine;
  const { key } = machine.state;
  return {
    state: { phase: 'idle' },
    fixedSet: machine.fixedSet,
    failedKey: { key, framesLeft: config.failedKeyCooldownFrames },
  };
}

function handleUserConfirmed(machine: ScanMachine): ScanMachine {
  if (machine.state.phase !== 'confirming') return machine;
  const { key } = machine.state;
  return { ...machine, state: { phase: 'awaitingRemoval', key, absentFrames: 0 } };
}

function handleUserRejected(machine: ScanMachine): ScanMachine {
  if (machine.state.phase !== 'confirming') return machine;
  const { key } = machine.state;
  return { ...machine, state: { phase: 'awaitingRemoval', key, absentFrames: 0 } };
}

export function scanReducer(
  machine: ScanMachine,
  action: ScanAction,
  config: StabilityConfig = DEFAULT_STABILITY_CONFIG,
): ScanMachine {
  switch (action.type) {
    case 'FRAME':
      return handleFrame(machine, action.reading, config);
    case 'VALIDATION_SUCCEEDED':
      return handleValidationSucceeded(machine, action.card, config);
    case 'VALIDATION_FAILED':
      return handleValidationFailed(machine, config);
    case 'USER_CONFIRMED':
      return handleUserConfirmed(machine);
    case 'USER_REJECTED':
      return handleUserRejected(machine);
    case 'SET_CHANGED':
      return { state: { phase: 'idle' }, fixedSet: action.setCode, failedKey: null };
    case 'RESET':
      return { state: { phase: 'idle' }, fixedSet: machine.fixedSet, failedKey: null };
  }
}

export function enteredValidation(prev: ScanMachine, next: ScanMachine): boolean {
  return prev.state.phase !== 'validating' && next.state.phase === 'validating';
}
