import type { CornerReading, ResolvedCard, ScanState } from '@pesel512/archivar-core';
import type { JSX } from 'react';

export interface OcrDebugPanelProps {
  rawText: string;
  normalizedText: string;
  reading: CornerReading | null;
  state: ScanState;
  ocrMs: number;
  ocrPerSecond: number;
  lastResult: ResolvedCard | null;
  className?: string;
}

function describeState(state: ScanState): string {
  return state.phase === 'candidate' ? `${state.phase} (${state.count})` : state.phase;
}

function describeLastResult(card: ResolvedCard | null): string {
  if (!card) return '—';
  const fallback = card.languageFallback ? ' · Sprach-Fallback' : '';
  return `${card.name} (${card.setCode.toUpperCase()} ${card.collectorNumber}) · ${card.finishes.join(', ')}${fallback}`;
}

/**
 * Rohtext, normalisierter Text, geparstes Reading, Reducer-Zustand, Trefferzähler, OCR-Dauer/
 * -Rate und letztes Scryfall-Ergebnis (inkl. `finishes`/`languageFallback`) — reine Anzeige,
 * alle Werte kommen fertig berechnet vom Aufrufer (`scan-loop`-Events, `normalize`).
 */
export function OcrDebugPanel({
  rawText,
  normalizedText,
  reading,
  state,
  ocrMs,
  ocrPerSecond,
  lastResult,
  className,
}: OcrDebugPanelProps): JSX.Element {
  return (
    <dl className={className} data-ocr-debug-panel="" data-phase={state.phase}>
      <dt>Rohtext</dt>
      <dd>{rawText || '—'}</dd>
      <dt>Normalisiert</dt>
      <dd>{normalizedText || '—'}</dd>
      <dt>Reading</dt>
      <dd>{reading ? JSON.stringify(reading) : '—'}</dd>
      <dt>Zustand</dt>
      <dd>{describeState(state)}</dd>
      <dt>OCR-Dauer</dt>
      <dd>{ocrMs.toFixed(0)} ms</dd>
      <dt>OCR-Rate</dt>
      <dd>{ocrPerSecond.toFixed(1)} / s</dd>
      <dt>Letztes Ergebnis</dt>
      <dd>{describeLastResult(lastResult)}</dd>
    </dl>
  );
}
