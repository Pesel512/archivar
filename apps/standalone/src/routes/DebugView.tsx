import type { JSX } from 'react';

export function DebugView(): JSX.Element {
  return (
    <main className="min-h-screen bg-bg p-6 text-fg">
      <h1 className="text-xl font-semibold">Debug-Scan</h1>
      <p className="mt-2 text-fg-muted">Der Dauerbetrieb-Debug-Scan folgt in Block B7.</p>
      <a className="mt-4 inline-block text-accent underline" href="#/">
        Zurück
      </a>
    </main>
  );
}
