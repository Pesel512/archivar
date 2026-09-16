export interface SuggestConfig {
  repeatAfterDismiss: number;
}

export const DEFAULT_SUGGEST_CONFIG: SuggestConfig = {
  repeatAfterDismiss: 3,
};

export interface SuggestInput {
  fixedSet: string | null;
  confirmedSetCodes: string[];
  dismissedAtCount: number | null;
}

export function getSetSuggestion(
  input: SuggestInput,
  cfg: SuggestConfig = DEFAULT_SUGGEST_CONFIG,
): string | null {
  if (input.fixedSet !== null) return null;
  if (input.confirmedSetCodes.length === 0) return null;

  if (input.dismissedAtCount === null) {
    return input.confirmedSetCodes[0]!;
  }

  const sinceDismiss = input.confirmedSetCodes.slice(input.dismissedAtCount);
  if (sinceDismiss.length < cfg.repeatAfterDismiss) return null;

  const windowCodes = sinceDismiss.slice(-cfg.repeatAfterDismiss);
  const candidate = windowCodes[0]!;
  return windowCodes.every((code) => code === candidate) ? candidate : null;
}
