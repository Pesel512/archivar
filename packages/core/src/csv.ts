import type { CollectionEntry, Condition, Finish, LanguageCode } from './types.js';

export interface CsvValueMap {
  finish: Record<Finish, string>;
  language: Record<LanguageCode, string>;
  condition: Record<Condition, string>;
  tagSeparator: string;
}

export interface CsvOptions {
  valueMap?: Partial<CsvValueMap>;
  maxBytes?: number;
  lineEnding?: '\n' | '\r\n';
  bom?: boolean;
}

const HEADER =
  'Quantity,Name,Set Code,Collector Number,Scryfall ID,Finish,Language,Condition,Tags';

const DEFAULT_MAX_BYTES = 1_900_000;

/**
 * Werte, die Archidekt beim CSV-Import für Finish/Sprache/Zustand erwartet, sowie der
 * Trenner für mehrere Tags in einer Zelle.
 * // VERIFY: exakte Werte per Testimport bei Archidekt ermitteln und nur dort anpassen.
 */
export const DEFAULT_CSV_VALUE_MAP: CsvValueMap = {
  finish: {
    nonfoil: 'Normal',
    foil: 'Foil',
    etched: 'Etched Foil',
  },
  language: {
    en: 'English',
    de: 'German',
    fr: 'French',
    it: 'Italian',
    es: 'Spanish',
    pt: 'Portuguese',
    ja: 'Japanese',
    ko: 'Korean',
    ru: 'Russian',
    zhs: 'Chinese Simplified',
    zht: 'Chinese Traditional',
  },
  condition: {
    NM: 'Near Mint',
    LP: 'Lightly Played',
    MP: 'Moderately Played',
    HP: 'Heavily Played',
    DMG: 'Damaged',
  },
  tagSeparator: ';',
};

function resolveValueMap(partial: Partial<CsvValueMap> | undefined): CsvValueMap {
  return {
    finish: partial?.finish ?? DEFAULT_CSV_VALUE_MAP.finish,
    language: partial?.language ?? DEFAULT_CSV_VALUE_MAP.language,
    condition: partial?.condition ?? DEFAULT_CSV_VALUE_MAP.condition,
    tagSeparator: partial?.tagSeparator ?? DEFAULT_CSV_VALUE_MAP.tagSeparator,
  };
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// UTF-8-Bytelänge ohne Runtime-API (kein TextEncoder/Buffer) — core bleibt plattformneutral.
function utf8ByteLength(str: string): number {
  let bytes = 0;
  for (let i = 0; i < str.length; i += 1) {
    const codePoint = str.codePointAt(i);
    if (codePoint === undefined) continue;
    if (codePoint > 0xffff) i += 1; // Surrogatpaar belegt zwei UTF-16-Einheiten
    if (codePoint <= 0x7f) bytes += 1;
    else if (codePoint <= 0x7ff) bytes += 2;
    else if (codePoint <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

function toCsvRow(entry: CollectionEntry, valueMap: CsvValueMap): string {
  const fields = [
    String(entry.quantity),
    entry.card.name,
    entry.card.setCode,
    entry.card.collectorNumber,
    entry.card.scryfallId,
    valueMap.finish[entry.finish],
    valueMap.language[entry.language],
    valueMap.condition[entry.condition],
    entry.tags.join(valueMap.tagSeparator),
  ];
  return fields.map(escapeCsvField).join(',');
}

export function toArchidektCsv(entries: CollectionEntry[], opts: CsvOptions = {}): string[] {
  if (entries.length === 0) return [];

  const valueMap = resolveValueMap(opts.valueMap);
  const lineEnding = opts.lineEnding ?? '\n';
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const bomPrefix = opts.bom ? '﻿' : '';

  const headerLine = HEADER + lineEnding;
  const rowLines = entries.map((entry) => toCsvRow(entry, valueMap) + lineEnding);

  const baseBytes = utf8ByteLength(bomPrefix) + utf8ByteLength(headerLine);

  const files: string[] = [];
  let currentRows: string[] = [];
  let currentBytes = baseBytes;

  const flush = (): void => {
    files.push(bomPrefix + headerLine + currentRows.join(''));
    currentRows = [];
    currentBytes = baseBytes;
  };

  for (const rowLine of rowLines) {
    const rowBytes = utf8ByteLength(rowLine);
    if (currentRows.length > 0 && currentBytes + rowBytes > maxBytes) {
      flush();
    }
    currentRows.push(rowLine);
    currentBytes += rowBytes;
  }
  flush();

  return files;
}
