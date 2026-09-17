import { useEffect, useState, type RefObject } from 'react';

export interface DisplayedRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Reine Geometrie für object-fit: contain — der Bereich, in dem das Video tatsächlich
// gezeichnet wird, wenn es unbeschnitten in den Container eingepasst wird.
export function computeContainRect(
  containerWidth: number,
  containerHeight: number,
  mediaWidth: number,
  mediaHeight: number,
): DisplayedRect {
  if (containerWidth <= 0 || containerHeight <= 0 || mediaWidth <= 0 || mediaHeight <= 0) {
    return { left: 0, top: 0, width: containerWidth, height: containerHeight };
  }
  const scale = Math.min(containerWidth / mediaWidth, containerHeight / mediaHeight);
  const width = mediaWidth * scale;
  const height = mediaHeight * scale;
  return { left: (containerWidth - width) / 2, top: (containerHeight - height) / 2, width, height };
}

/**
 * Verfolgt den tatsächlich dargestellten Bereich eines per `object-fit: contain`
 * eingepassten Videos innerhalb seines Containers — Grundlage für die ROI-Overlay-Position in
 * `CameraPreview`/`RoiEditor`. Reagiert auf Größenänderungen des Containers sowie auf
 * `loadedmetadata`/`resize` des Videos (manche Browser legen die tatsächliche Stream-Auflösung
 * erst danach fest). Setzt voraus, dass `videoRef`/`containerRef` beim ersten Render dieses
 * Hooks bereits an ein gemountetes Element gebunden sind (beide Komponenten rendern ihr Video
 * unbedingt, nicht abhängig vom Stream).
 */
export function useVideoRect(
  containerRef: RefObject<HTMLElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
): DisplayedRect | null {
  const [rect, setRect] = useState<DisplayedRect | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    function update(): void {
      if (!video || !container || video.videoWidth === 0 || video.videoHeight === 0) return;
      setRect(
        computeContainRect(
          container.clientWidth,
          container.clientHeight,
          video.videoWidth,
          video.videoHeight,
        ),
      );
    }

    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(container);
    video.addEventListener('loadedmetadata', update);
    video.addEventListener('resize', update);
    return () => {
      resizeObserver.disconnect();
      video.removeEventListener('loadedmetadata', update);
      video.removeEventListener('resize', update);
    };
  }, [containerRef, videoRef]);

  return rect;
}
