import React from 'react';
import { Orbit } from 'lucide-react';
import type { SpacecraftObject } from '../../types/space';
import { SpacecraftHeader } from './SpacecraftHeader';
import { SpacecraftActions } from './SpacecraftActions';

export interface SpacecraftCardProps {
  craft: SpacecraftObject;
  onSelect: (obj: SpacecraftObject) => void;
  onView3D: (craft: SpacecraftObject) => void;
  onFocus: (objectId: string) => void;
  onTrack: (objectId: string) => void;
}

export const SpacecraftCard: React.FC<SpacecraftCardProps> = ({
  craft,
  onSelect,
  onView3D,
  onFocus,
  onTrack
}) => {
  const orbitSummary = craft.orbitType || 'Trajectory in propagation';
  const objectType = craft.noradId
    ? 'Orbital Satellite'
    : craft.id.includes('voyager')
    ? 'Interstellar Probe'
    : 'Planetary Spacecraft';

  return (
    <div className="glass-card spacecraft-card">
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <SpacecraftHeader craft={craft} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap',
          margin: '2px 0 4px'
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            background: 'var(--surface-inset)',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-hairline)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--accent-cyan)'
          }}>
            <Orbit size={11} />
            <span>{orbitSummary}</span>
          </span>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 7px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-hairline)',
            fontSize: '10px',
            color: 'var(--text-muted)'
          }}>
            <span>{objectType}</span>
          </span>
        </div>

        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
            marginBottom: '4px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
          title={craft.description}
        >
          {craft.description}
        </div>
      </div>

      <div style={{ marginTop: 'auto', width: '100%' }}>
        <SpacecraftActions
          craft={craft}
          onSelect={onSelect}
          onView3D={onView3D}
          onFocus={onFocus}
          onTrack={onTrack}
        />
      </div>
    </div>
  );
};

