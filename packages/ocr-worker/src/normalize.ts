// Entfernt typische Tesseract-Artefakte am Zeilenanfang (z. B. ein Rahmen-/Randstrich,
// der als '|' gelesen wird), bevor die Zeile weiterverarbeitet wird.
function stripLeadingArtifacts(line: string): string {
  return line.replace(/^\s*\|+/, '');
}

/**
 * Bereinigt Tesseract-Rohtext rein strukturell (Mehrfach-Leerzeichen, leere Zeilen,
 * Rand-Artefakte) — keine inhaltlichen Korrekturen, die übernimmt `parseCorner`.
 */
export function normalize(rawText: string): string {
  return rawText
    .split(/\r?\n/)
    .map(stripLeadingArtifacts)
    .map((line) => line.trim().replace(/[ \t]+/g, ' '))
    .filter((line) => line.length > 0)
    .join('\n');
}
