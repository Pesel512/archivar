import { describe, expect, it } from 'vitest';
import { getSetSuggestion, type SuggestInput } from './set-suggest.js';

function input(overrides: Partial<SuggestInput> = {}): SuggestInput {
  return {
    fixedSet: null,
    confirmedSetCodes: [],
    dismissedAtCount: null,
    ...overrides,
  };
}

describe('getSetSuggestion', () => {
  it('leere Liste ergibt keinen Vorschlag', () => {
    expect(getSetSuggestion(input())).toBeNull();
  });

  it('erste bestätigte Karte wird vorgeschlagen', () => {
    expect(getSetSuggestion(input({ confirmedSetCodes: ['DOM'] }))).toBe('DOM');
  });

  it('bleibt bei der ersten Karte, solange nicht abgelehnt wurde', () => {
    const result = getSetSuggestion(
      input({ confirmedSetCodes: ['DOM', 'DOM', 'M20'], dismissedAtCount: null }),
    );
    expect(result).toBe('DOM');
  });

  it('fixiertes Set unterdrückt jeden Vorschlag', () => {
    const result = getSetSuggestion(
      input({ fixedSet: 'MOM', confirmedSetCodes: ['DOM', 'DOM', 'DOM'] }),
    );
    expect(result).toBeNull();
  });

  it('nach Ablehnung: gemischte Sets ergeben keinen Vorschlag', () => {
    const result = getSetSuggestion(
      input({ confirmedSetCodes: ['DOM', 'M20', 'SNC'], dismissedAtCount: 0 }),
    );
    expect(result).toBeNull();
  });

  it('nach Ablehnung: drei gleiche Sets in Folge ergeben einen Vorschlag', () => {
    const result = getSetSuggestion(
      input({ confirmedSetCodes: ['DOM', 'MOM', 'MOM', 'MOM'], dismissedAtCount: 1 }),
    );
    expect(result).toBe('MOM');
  });

  it('nach Ablehnung: weniger als repeatAfterDismiss Karten ergeben noch keinen Vorschlag', () => {
    const result = getSetSuggestion(
      input({ confirmedSetCodes: ['DOM', 'MOM', 'MOM'], dismissedAtCount: 1 }),
    );
    expect(result).toBeNull();
  });

  it('nach Ablehnung: nur das letzte Fenster zählt, nicht die ganze Historie', () => {
    const result = getSetSuggestion(
      input({
        confirmedSetCodes: ['DOM', 'M20', 'SNC', 'MOM', 'MOM', 'MOM'],
        dismissedAtCount: 1,
      }),
    );
    expect(result).toBe('MOM');
  });

  it('respektiert eine benutzerdefinierte repeatAfterDismiss-Konfiguration', () => {
    const result = getSetSuggestion(
      input({ confirmedSetCodes: ['DOM', 'MOM', 'MOM'], dismissedAtCount: 1 }),
      { repeatAfterDismiss: 2 },
    );
    expect(result).toBe('MOM');
  });
});
