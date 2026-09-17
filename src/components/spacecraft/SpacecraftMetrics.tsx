import React from 'react';
import type { SpacecraftObject } from '../../types/space';
import { formatDistanceKm, formatVelocityKmS } from '../../utils/formatters';
import { formatLightTime } from '../../services/calculations/physics';
import { DataMetric } from './DataMetric';

interface SpacecraftMetricsProps {
  craft: SpacecraftObject;
}

export const SpacecraftMetrics: React.FC<SpacecraftMetricsProps> = ({ craft }) => {
  const distanceStr =
    craft.distanceFromEarthKm !== undefined
      ? formatDistanceKm(craft.distanceFromEarthKm, true)
      : 'DATA UNAVAILABLE';

  const speedStr =
    craft.velocityKmS !== undefined
      ? formatVelocityKmS(craft.velocityKmS)
      : 'DATA UNAVAILABLE';

  const delayStr =
    craft.lightTimeToEarthSec !== undefined
      ? formatLightTime(craft.lightTimeToEarthSec)
      : 'N/A';

  const coordStr = craft.coordinateFrame || 'Interstellar / source-dependent';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px 12px',
        background: 'var(--surface-inset)',
        padding: '10px 12px',
        borderRadius: 'var(--radius-xs)',
        margin: '10px 0',
        minHeight: '86px'
      }}
    >
      <DataMetric label="Distance to Earth" value={distanceStr} />
      <DataMetric label="Orbital Speed" value={speedStr} />
      <DataMetric label="Signal Delay (c)" value={delayStr} highlight />
      <DataMetric label="Coordinate System" value={coordStr} truncate />
    </div>
  );
};
