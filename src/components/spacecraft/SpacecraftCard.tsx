import React from 'react';
import type { SpacecraftObject } from '../../types/space';
import { SpacecraftHeader } from './SpacecraftHeader';
import { SpacecraftMetrics } from './SpacecraftMetrics';
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
  return (
    <div className="glass-card spacecraft-card">
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* 1. Header (Title, Organization Badge, Mission Subtitle, Status Badge) */}
        <SpacecraftHeader craft={craft} />

        {/* 2. Standardized 2x2 Telemetry Metrics Grid */}
        <SpacecraftMetrics craft={craft} />

        {/* 3. Description Area with Uniform Alignment */}
        <div
          style={{
            flex: 1,
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: '4px 0 10px',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minHeight: '54px'
          }}
          title={craft.description}
        >
          {craft.description}
        </div>
      </div>

      {/* 4. Unified Action Bar: [ Inspect ] [ Visibility ] [ Focus ] [ Track ] */}
      <SpacecraftActions
        craft={craft}
        onSelect={onSelect}
        onView3D={onView3D}
        onFocus={onFocus}
        onTrack={onTrack}
      />
    </div>
  );
};
