import type { CameraFeatures } from '@pesel512/archivar-camera';
import type { JSX } from 'react';

export interface ZoomControlProps {
  features: CameraFeatures | null;
  onChange: (value: number) => void;
  className?: string;
}

/** Schieberegler nur, wenn die Kamera Zoom unterstützt — sonst kein Rendering. */
export function ZoomControl({ features, onChange, className }: ZoomControlProps): JSX.Element | null {
  if (!features?.zoom) return null;
  const { min, max, step, current } = features.zoom;

  return (
    <label className={className} data-zoom-control="">
      Zoom ({current.toFixed(1)})
      <input
        type="range"
        min={min}
        max={max}
        step={step || 0.1}
        value={current}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
