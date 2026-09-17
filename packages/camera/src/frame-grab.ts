import { toPixelRect, type NormalizedRoi } from './roi.js';

export type FrameCanvas = OffscreenCanvas | HTMLCanvasElement;

// readyState-Schwelle aus der HTMLMediaElement-Spezifikation: HAVE_CURRENT_DATA (2) ist erreicht,
// sobald ein aktuelles Bild zum Zeichnen vorliegt.
const HAVE_CURRENT_DATA = 2;

function createCanvas(width: number, height: number): FrameCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function grabRoi(
  video: HTMLVideoElement,
  roi: NormalizedRoi,
  target?: FrameCanvas,
): FrameCanvas | null {
  if (video.readyState < HAVE_CURRENT_DATA) {
    return null;
  }

  const { sx, sy, sw, sh } = toPixelRect(roi, video.videoWidth, video.videoHeight);
  if (sw === 0 || sh === 0) {
    return null;
  }

  const canvas = target ?? createCanvas(sw, sh);
  canvas.width = sw;
  canvas.height = sh;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas;
}
