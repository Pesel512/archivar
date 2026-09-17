import { toCameraFeatures, type CameraFeatures } from './capabilities.js';

export type CameraErrorReason =
  | 'permission_denied'
  | 'no_camera'
  | 'in_use'
  | 'insecure_context'
  | 'unknown';

export interface OpenCameraOptions {
  deviceId?: string;
  facingMode?: 'user' | 'environment';
  resolution?: { width: number; height: number };
}

export type OpenCameraResult =
  | { ok: true; stream: MediaStream; track: MediaStreamTrack }
  | { ok: false; reason: CameraErrorReason };

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface ListCamerasResult {
  cameras: CameraDevice[];
  labelsAvailable: boolean;
}

export type ApplyZoomResult = { ok: true } | { ok: false; reason: 'not_supported' | 'unknown' };

const DEFAULT_RESOLUTION = { width: 3840, height: 2160 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// VERIFY: Zuordnung von getUserMedia-Fehlernamen zu unseren Reason-Codes ist aus der
// MDN-/Spec-Dokumentation abgeleitet, nicht an echten Browsern (v. a. mobil) verifiziert.
function mapGetUserMediaError(error: unknown): CameraErrorReason {
  const name = isRecord(error) && typeof error.name === 'string' ? error.name : null;
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'permission_denied';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'no_camera';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'in_use';
    default:
      return 'unknown';
  }
}

export async function openCamera(options: OpenCameraOptions = {}): Promise<OpenCameraResult> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: 'insecure_context' };
  }

  const resolution = options.resolution ?? DEFAULT_RESOLUTION;
  const video: MediaTrackConstraints = {
    width: { ideal: resolution.width },
    height: { ideal: resolution.height },
  };
  if (options.deviceId) {
    video.deviceId = { exact: options.deviceId };
  } else {
    video.facingMode = { ideal: options.facingMode ?? 'environment' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    const [track] = stream.getVideoTracks();
    if (!track) {
      return { ok: false, reason: 'no_camera' };
    }
    return { ok: true, stream, track };
  } catch (error) {
    return { ok: false, reason: mapGetUserMediaError(error) };
  }
}

export async function listCameras(): Promise<ListCamerasResult> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices
    .filter((device) => device.kind === 'videoinput')
    .map((device) => ({ deviceId: device.deviceId, label: device.label }));
  const labelsAvailable = cameras.some((camera) => camera.label !== '');
  return { cameras, labelsAvailable };
}

export function readFeatures(
  track: MediaStreamTrack,
  requested: { width: number; height: number },
): CameraFeatures {
  const caps = typeof track.getCapabilities === 'function' ? track.getCapabilities() : undefined;
  const settings = typeof track.getSettings === 'function' ? track.getSettings() : undefined;
  return toCameraFeatures(caps, settings, requested);
}

function getCapabilitiesSafe(track: MediaStreamTrack): Record<string, unknown> {
  if (typeof track.getCapabilities !== 'function') {
    return {};
  }
  const caps: unknown = track.getCapabilities();
  return isRecord(caps) ? caps : {};
}

function hasZoomCapability(track: MediaStreamTrack): boolean {
  return isRecord(getCapabilitiesSafe(track).zoom);
}

function getSupportedFocusModes(track: MediaStreamTrack): string[] {
  const modes = getCapabilitiesSafe(track).focusMode;
  return Array.isArray(modes) ? modes.filter((mode): mode is string => typeof mode === 'string') : [];
}

export async function applyZoom(track: MediaStreamTrack, value: number): Promise<ApplyZoomResult> {
  if (!hasZoomCapability(track)) {
    return { ok: false, reason: 'not_supported' };
  }
  try {
    await track.applyConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unknown' };
  }
}

export async function setContinuousFocus(track: MediaStreamTrack): Promise<void> {
  if (!getSupportedFocusModes(track).includes('continuous')) {
    return;
  }
  try {
    await track.applyConstraints({
      advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet],
    });
  } catch {
    // Nicht unterstützt oder von der Kamera abgelehnt — laut Spezifikation stillschweigend
    // überspringen.
  }
}

export function closeCamera(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}
