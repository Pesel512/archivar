import type { JSX } from 'react';

export function StartView(): JSX.Element {
  return (
    <main className="min-h-screen bg-bg p-6 text-fg">
      <h1 className="text-xl font-semibold">archivar — Kartenscanner</h1>
      <nav className="mt-4 flex flex-col gap-2">
        <a className="text-accent underline" href="#/calibrate">
          Kalibrieren
        </a>
        <a className="text-accent underline" href="#/debug">
          Debug-Scan
        </a>
      </nav>
    </main>
  );
}
