export interface CameraFeatures {
  zoom: { min: number; max: number; step: number; current: number } | null;
  focusModes: string[];
  torch: boolean;
  actualResolution: { width: number; height: number };
  requestedResolution: { width: number; height: number };
  resolutionShortfall: boolean;
}

// VERIFY: Schwelle für resolutionShortfall (tatsächliche Breite < 90 % der angeforderten) aus
// dem Prompt übernommen, aber nicht am echten Gerät verifiziert, ob 90 % die richtige Grenze ist.
const RESOLUTION_SHORTFALL_RATIO = 0.9;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readZoom(
  caps: Record<string, unknown>,
  settings: Record<string, unknown>,
): CameraFeatures['zoom'] {
  const zoomCaps = caps.zoom;
  if (!isRecord(zoomCaps)) {
    return null;
  }
  const { min, max, step } = zoomCaps;
  if (typeof min !== 'number' || typeof max !== 'number' || typeof step !== 'number') {
    return null;
  }
  const current = typeof settings.zoom === 'number' ? settings.zoom : min;
  return { min, max, step, current };
}

function readFocusModes(caps: Record<string, unknown>): string[] {
  const modes = caps.focusMode;
  if (!Array.isArray(modes)) {
    return [];
  }
  return modes.filter((mode): mode is string => typeof mode === 'string');
}

function readTorch(caps: Record<string, unknown>): boolean {
  return caps.torch === true;
}

function readActualResolution(
  settings: Record<string, unknown>,
  requested: { width: number; height: number },
): { width: number; height: number } {
  const width = typeof settings.width === 'number' ? settings.width : requested.width;
  const height = typeof settings.height === 'number' ? settings.height : requested.height;
  return { width, height };
}

export function toCameraFeatures(
  caps: unknown,
  settings: unknown,
  requested: { width: number; height: number },
): CameraFeatures {
  const capsRecord = isRecord(caps) ? caps : {};
  const settingsRecord = isRecord(settings) ? settings : {};

  const actualResolution = readActualResolution(settingsRecord, requested);
  const resolutionShortfall = actualResolution.width < requested.width * RESOLUTION_SHORTFALL_RATIO;

  return {
    zoom: readZoom(capsRecord, settingsRecord),
    focusModes: readFocusModes(capsRecord),
    torch: readTorch(capsRecord),
    actualResolution,
    requestedResolution: requested,
    resolutionShortfall,
  };
}
