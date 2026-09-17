import type { CameraFeatures } from '@pesel512/archivar-camera';
import type { JSX } from 'react';

export interface ResolutionBadgeProps {
  features: CameraFeatures | null;
  effectivePixels?: { width: number; height: number };
  className?: string;
}

/** Angeforderte vs. tatsächliche Auflösung, Warnzustand bei Unterschreitung, ROI-Pixelgröße. */
export function ResolutionBadge({
  features,
  effectivePixels,
  className,
}: ResolutionBadgeProps): JSX.Element | null {
  if (!features) return null;
  const { requestedResolution, actualResolution, resolutionShortfall } = features;

  return (
    <dl
      className={className}
      data-resolution-badge=""
      data-resolution-shortfall={resolutionShortfall ? '' : undefined}
    >
      <dt>Angefordert</dt>
      <dd>
        {requestedResolution.width} × {requestedResolution.height}
      </dd>
      <dt>Tatsächlich</dt>
      <dd>
        {actualResolution.width} × {actualResolution.height}
      </dd>
      {resolutionShortfall && <dd role="alert">Die Kamera liefert weniger als angefordert.</dd>}
      {effectivePixels && (
        <>
          <dt>ROI-Pixel</dt>
          <dd>
            {effectivePixels.width} × {effectivePixels.height}
          </dd>
        </>
      )}
    </dl>
  );
}
