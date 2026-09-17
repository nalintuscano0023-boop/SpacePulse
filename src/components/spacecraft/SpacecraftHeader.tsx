import React from 'react';
import type { SpacecraftObject } from '../../types/space';
import { StatusBadge } from '../common/StatusBadge';

interface SpacecraftHeaderProps {
  craft: SpacecraftObject;
}

export const SpacecraftHeader: React.FC<SpacecraftHeaderProps> = ({ craft }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '10px',
        marginBottom: '6px'
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.25,
              letterSpacing: '-0.01em'
            }}
          >
            {craft.name}
          </span>
          <span className="agency-badge">{craft.agency}</span>
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginTop: '3px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
          title={craft.mission}
        >
          {craft.mission}
        </div>
      </div>

      <div style={{ flexShrink: 0, marginTop: '1px' }}>
        <StatusBadge
          status={craft.telemetrySource.status}
          metadata={craft.telemetrySource}
          compact
        />
      </div>
    </div>
  );
};
