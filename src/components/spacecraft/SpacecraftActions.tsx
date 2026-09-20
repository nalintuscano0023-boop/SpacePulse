import React from 'react';
import { Activity, Eye, Orbit, Compass } from 'lucide-react';
import type { SpacecraftObject } from '../../types/space';
import { ActionTooltip } from './ActionTooltip';

import { resolveTrackingCapability } from '../../services/data/trackingCapability';

interface SpacecraftActionsProps {
  craft: SpacecraftObject;
  onSelect: (obj: SpacecraftObject) => void;
  onView3D: (craft: SpacecraftObject) => void;
  onFocus: (objectId: string) => void;
  onTrack: (objectId: string) => void;
}

export const SpacecraftActions: React.FC<SpacecraftActionsProps> = ({
  craft,
  onSelect,
  onView3D,
  onFocus,
  onTrack
}) => {
  // Authoritative tracking capability resolved from central source of truth
  const cap = craft.trackingCapability || resolveTrackingCapability(craft.id, craft.name);

  const focusEnabled = cap.canFocusOnMap;
  const focusReasonTitle = focusEnabled ? 'FOCUS 3D MAP' : cap.statusLabel;
  const focusReason = cap.focusReason;

  const trackEnabled = cap.canTrackVectors;
  const trackReasonTitle = trackEnabled ? 'TRACK VECTORS' : cap.statusLabel;
  const trackReason = cap.trackReason;

  return (
    <div className="action-bar-container">
      {/* 1. Primary Inspect Button */}
      <button
        onClick={() => onSelect(craft)}
        className="btn btn-secondary"
        style={{
          flex: 1,
          height: '34px',
          fontSize: '12px',
          padding: '0 10px',
          gap: '6px'
        }}
        aria-label={`Inspect telemetry and mission profile for ${craft.name}`}
        title={`Inspect telemetry and mission profile for ${craft.name}`}
      >
        <Activity size={13} style={{ color: 'var(--accent-cyan)' }} />
        <span>Inspect</span>
      </button>

      {/* 2. Visibility / 3D Spacecraft Architecture - Always visible by default without hover */}
      <button
        onClick={() => onView3D(craft)}
        className="btn-icon-action btn-eye-view"
        style={{
          opacity: 1,
          visibility: 'visible',
          display: 'inline-flex'
        }}
        aria-label={`Show 3D architecture for ${craft.name}`}
        title={`Show 3D architecture for ${craft.name}`}
      >
        <Eye size={14} style={{ color: 'var(--accent-cyan)' }} />
      </button>

      {/* 3. Focus on 3D Space Map */}
      {focusEnabled ? (
        <button
          onClick={() => onFocus(craft.id)}
          className="btn-icon-action btn-action-primary"
          aria-label={`Focus ${craft.name} in 3D Space Map`}
          title={`Focus ${craft.name} in 3D Space Map`}
        >
          <Orbit size={14} />
        </button>
      ) : (
        <ActionTooltip
          title={focusReasonTitle}
          description={focusReason}
          isUnavailable
        >
          <button
            disabled
            aria-disabled="true"
            className="btn-icon-action"
            aria-label={`Focus unavailable for ${craft.name}: ${focusReason}`}
          >
            <Orbit size={14} />
          </button>
        </ActionTooltip>
      )}

      {/* 4. Track Vectors in Workspace */}
      {trackEnabled ? (
        <button
          onClick={() => onTrack(craft.id)}
          className="btn-icon-action"
          aria-label={`Track orbital vectors for ${craft.name}`}
          title={`Track orbital vectors for ${craft.name}`}
        >
          <Compass size={14} />
        </button>
      ) : (
        <ActionTooltip
          title={trackReasonTitle}
          description={trackReason}
          isUnavailable
        >
          <button
            disabled
            aria-disabled="true"
            className="btn-icon-action"
            aria-label={`Tracking unavailable for ${craft.name}: ${trackReason}`}
          >
            <Compass size={14} />
          </button>
        </ActionTooltip>
      )}
    </div>
  );
};
