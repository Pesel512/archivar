import {
  applyZoom,
  closeCamera,
  openCamera,
  readFeatures,
  setContinuousFocus,
  type ApplyZoomResult,
  type CameraErrorReason,
  type CameraFeatures,
  type OpenCameraOptions,
} from '@pesel512/archivar-camera';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseCameraState {
  status: 'idle' | 'opening' | 'ready' | 'error';
  stream: MediaStream | null;
  track: MediaStreamTrack | null;
  features: CameraFeatures | null;
  error: CameraErrorReason | null;
}

export interface UseCameraResult extends UseCameraState {
  open(options?: OpenCameraOptions): Promise<void>;
  close(): void;
  applyZoom(value: number): Promise<ApplyZoomResult>;
}

const IDLE_STATE: UseCameraState = {
  status: 'idle',
  stream: null,
  track: null,
  features: null,
  error: null,
};

const DEFAULT_RESOLUTION = { width: 3840, height: 2160 };

/** Dünner Hook um `stream.ts` — hält den zuletzt geöffneten Stream/Track als Zustand. */
export function useCamera(): UseCameraResult {
  const [state, setState] = useState<UseCameraState>(IDLE_STATE);
  const streamRef = useRef<MediaStream | null>(null);
  const requestedRef = useRef(DEFAULT_RESOLUTION);

  const close = useCallback((): void => {
    if (streamRef.current) {
      closeCamera(streamRef.current);
      streamRef.current = null;
    }
    setState(IDLE_STATE);
  }, []);

  const open = useCallback(async (options?: OpenCameraOptions): Promise<void> => {
    setState((prev) => ({ ...prev, status: 'opening', error: null }));
    const requested = options?.resolution ?? requestedRef.current;
    requestedRef.current = requested;

    // Ein vorheriger Stream (z. B. beim Wechsel der Kamera im Kalibrier-Wizard) muss vor dem
    // Öffnen eines neuen geschlossen werden, sonst bleibt die alte Kamera-Kontrollleuchte an.
    if (streamRef.current) {
      closeCamera(streamRef.current);
      streamRef.current = null;
    }

    const result = await openCamera(options);
    if (!result.ok) {
      setState({ status: 'error', stream: null, track: null, features: null, error: result.reason });
      return;
    }

    streamRef.current = result.stream;
    await setContinuousFocus(result.track);
    setState({
      status: 'ready',
      stream: result.stream,
      track: result.track,
      features: readFeatures(result.track, requested),
      error: null,
    });
  }, []);

  const applyZoomValue = useCallback(async (value: number): Promise<ApplyZoomResult> => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) {
      return { ok: false, reason: 'not_supported' };
    }
    const result = await applyZoom(track, value);
    if (result.ok) {
      setState((prev) => ({ ...prev, features: readFeatures(track, requestedRef.current) }));
    }
    return result;
  }, []);

  // Beim Unmount alle Kamera-Tracks beenden, auch wenn niemand vorher close() aufgerufen hat.
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        closeCamera(streamRef.current);
        streamRef.current = null;
      }
    };
  }, []);

  return { ...state, open, close, applyZoom: applyZoomValue };
}
