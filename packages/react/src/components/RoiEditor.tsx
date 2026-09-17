import { moveRoi, resizeRoi, type NormalizedRoi } from '@pesel512/archivar-camera';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { useVideoRect } from '../use-video-rect.js';

export interface RoiEditorProps {
  stream: MediaStream | null;
  roi: NormalizedRoi;
  onChange: (roi: NormalizedRoi) => void;
  className?: string;
  step?: number;
}

type DragMode = 'move' | 'resize';
interface DragStart {
  mode: DragMode;
  pointerX: number;
  pointerY: number;
  roi: NormalizedRoi;
}

// Schrittweite für Pfeiltasten in normierten Koordinaten (2 % der Bildbreite/-höhe je Druck).
const DEFAULT_STEP = 0.02;

const ARROW_DIRECTIONS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * ROI verschieben/skalieren per Zeiger (Maus und Touch über Pointer Events) und per
 * Pfeiltasten (mit Umschalt: Größe statt Position, Anker `center`). Rendert Video und Overlay
 * selbst statt `CameraPreview` zu verschachteln, damit die per `useVideoRect` berechnete
 * Overlay-Position und die Zeiger-Erfassung auf demselben Element sitzen.
 */
export function RoiEditor({
  stream,
  roi,
  onChange,
  className,
  step = DEFAULT_STEP,
}: RoiEditorProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rect = useVideoRect(containerRef, videoRef);
  const dragRef = useRef<DragStart | null>(null);
  const [dragging, setDragging] = useState<DragMode | null>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  const startDrag = useCallback(
    (mode: DragMode) => (event: PointerEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = { mode, pointerX: event.clientX, pointerY: event.clientY, roi };
      setDragging(mode);
    },
    [roi],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || !rect || rect.width === 0 || rect.height === 0) return;
      const dx = (event.clientX - drag.pointerX) / rect.width;
      const dy = (event.clientY - drag.pointerY) / rect.height;
      onChange(drag.mode === 'move' ? moveRoi(drag.roi, dx, dy) : resizeRoi(drag.roi, dx, dy, 'top-left'));
    },
    [rect, onChange],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDragging(null);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const direction = ARROW_DIRECTIONS[event.key];
      if (!direction) return;
      event.preventDefault();
      const [dx, dy] = direction;
      onChange(
        event.shiftKey ? resizeRoi(roi, dx * step, dy * step, 'center') : moveRoi(roi, dx * step, dy * step),
      );
    },
    [roi, onChange, step],
  );

  return (
    <div
      ref={containerRef}
      className={className}
      data-roi-editor=""
      data-dragging={dragging ?? undefined}
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
      />
      {rect && (
        <div
          role="slider"
          aria-label="Ausschnitt"
          aria-valuenow={Math.round(roi.width * 100)}
          tabIndex={0}
          onPointerDown={startDrag('move')}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={handleKeyDown}
          style={{
            position: 'absolute',
            left: rect.left + roi.x * rect.width,
            top: rect.top + roi.y * rect.height,
            width: roi.width * rect.width,
            height: roi.height * rect.height,
            border: '2px solid currentColor',
            boxSizing: 'border-box',
            touchAction: 'none',
            cursor: 'move',
          }}
        >
          <div
            data-resize-handle=""
            onPointerDown={startDrag('resize')}
            style={{
              position: 'absolute',
              right: -8,
              bottom: -8,
              width: 16,
              height: 16,
              cursor: 'nwse-resize',
              touchAction: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}
