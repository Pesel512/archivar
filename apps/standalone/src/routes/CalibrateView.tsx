import type { JSX } from 'react';

export function CalibrateView(): JSX.Element {
  return (
    <main className="min-h-screen bg-bg p-6 text-fg">
      <h1 className="text-xl font-semibold">Kalibrieren</h1>
      <p className="mt-2 text-fg-muted">Der Kalibrier-Wizard folgt in Block B7.</p>
      <a className="mt-4 inline-block text-accent underline" href="#/">
        Zurück
      </a>
    </main>
  );
}
