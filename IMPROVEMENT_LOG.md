# Improvement Log

Chronologische Notizen zu Entscheidungen, Abweichungen und Nacharbeiten während der Loop-Iterationen.

## Iteration A

- A1: Grundgerüst angelegt (pnpm-Workspace, TypeScript, Vitest, ESLint/Prettier, tsup, CI).
  Keine Abweichungen vom Prompt.
- A2: Domänentypen in `core/types.ts` angelegt. Coverage-Konfiguration angepasst, damit reine
  Re-Export-Barrels (`index.ts`) nicht als ungetesteter Code gezählt werden.
