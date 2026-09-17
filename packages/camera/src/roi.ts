export interface NormalizedRoi {
  x: number;
  y: number;
  width: number;
  height: number;
}

// VERIFY: Standard-Mindestgröße für den ROI (10 % der Bildbreite/-höhe) ist eine Annahme —
// keine Vorgabe aus der Spezifikation. Am Gerätetest prüfen, ob ein kleinerer ROI (näher an
// der Kartenecke gezoomt) für die OCR-Genauigkeit trotzdem nötig ist.
const DEFAULT_MIN_ROI_SIZE = 0.1;

function clampNumber(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

export function clampRoi(roi: NormalizedRoi, minSize: number = DEFAULT_MIN_ROI_SIZE): NormalizedRoi {
  const width = clampNumber(roi.width, minSize, 1);
  const height = clampNumber(roi.height, minSize, 1);
  const x = clampNumber(roi.x, 0, 1 - width);
  const y = clampNumber(roi.y, 0, 1 - height);
  return { x, y, width, height };
}

export function toPixelRect(
  roi: NormalizedRoi,
  videoWidth: number,
  videoHeight: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const sx = clampNumber(Math.round(roi.x * videoWidth), 0, videoWidth);
  const sy = clampNumber(Math.round(roi.y * videoHeight), 0, videoHeight);
  const sw = clampNumber(Math.round(roi.width * videoWidth), 0, videoWidth - sx);
  const sh = clampNumber(Math.round(roi.height * videoHeight), 0, videoHeight - sy);
  return { sx, sy, sw, sh };
}

export function moveRoi(roi: NormalizedRoi, dx: number, dy: number): NormalizedRoi {
  const x = clampNumber(roi.x + dx, 0, Math.max(0, 1 - roi.width));
  const y = clampNumber(roi.y + dy, 0, Math.max(0, 1 - roi.height));
  return { ...roi, x, y };
}

export function resizeRoi(
  roi: NormalizedRoi,
  dw: number,
  dh: number,
  anchor: 'center' | 'top-left',
): NormalizedRoi {
  const width = clampNumber(roi.width + dw, 0, 1);
  const height = clampNumber(roi.height + dh, 0, 1);

  if (anchor === 'top-left') {
    const x = clampNumber(roi.x, 0, 1 - width);
    const y = clampNumber(roi.y, 0, 1 - height);
    return { x, y, width, height };
  }

  const centerX = roi.x + roi.width / 2;
  const centerY = roi.y + roi.height / 2;
  const x = clampNumber(centerX - width / 2, 0, 1 - width);
  const y = clampNumber(centerY - height / 2, 0, 1 - height);
  return { x, y, width, height };
}

export function effectivePixels(
  roi: NormalizedRoi,
  videoWidth: number,
  videoHeight: number,
): { width: number; height: number } {
  const { sw, sh } = toPixelRect(roi, videoWidth, videoHeight);
  return { width: sw, height: sh };
}
