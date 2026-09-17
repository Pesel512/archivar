import type { NormalizedRoi } from '@pesel512/archivar-camera';
import { useEffect, useRef, type JSX, type RefObject } from 'react';
import { useVideoRect } from '../use-video-rect.js';

export interface CameraPreviewProps {
  stream: MediaStream | null;
  roi?: NormalizedRoi;
  videoRef?: RefObject<HTMLVideoElement | null>;
  className?: string;
}

/**
 * Videoelement plus optionaler ROI-Rahmen als passives Overlay. Die Overlay-Position wird aus
 * dem normierten ROI und der tatsächlich dargestellten Videofläche berechnet (`object-fit:
 * contain`, damit beim Kalibrieren immer das vollständige Bild sichtbar bleibt — kein
 * Beschnitt, der Teile des ROI verdeckt). `videoRef` kann von außen übergeben werden, damit ein
 * Aufrufer (z. B. `CalibrationWizard` für den Probescan) direkt auf das Videoelement zugreifen
 * kann, etwa um Frames per `grabRoi` zu greifen.
 */
export function CameraPreview({ stream, roi, videoRef, className }: CameraPreviewProps): JSX.Element {
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const video = videoRef ?? internalVideoRef;
  const rect = useVideoRect(containerRef, video);

  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
  }, [stream, video]);

  return (
    <div
      ref={containerRef}
      className={className}
      data-camera-preview=""
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <video
        ref={video}
        autoPlay
        muted
        playsInline
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
      />
      {roi && rect && (
        <div
          data-roi-overlay=""
          style={{
            position: 'absolute',
            left: rect.left + roi.x * rect.width,
            top: rect.top + roi.y * rect.height,
            width: roi.width * rect.width,
            height: roi.height * rect.height,
            border: '2px solid currentColor',
            boxSizing: 'border-box',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
