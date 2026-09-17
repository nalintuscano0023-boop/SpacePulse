import React from 'react';
import { Activity, Eye, Orbit, Compass } from 'lucide-react';
import type { SpacecraftObject } from '../../types/space';
import { ActionTooltip } from './ActionTooltip';

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
  const isVoyager = craft.id.includes('voyager');

  // Capability resolution: Focus on 3D Space Map
  let focusEnabled = false;
  let focusReasonTitle = 'FOCUS UNAVAILABLE';
  let focusReason = 'Reliable positional data is unavailable for this object.';

  if (isVoyager) {
    focusEnabled = false;
    focusReasonTitle = 'FOCUS UNAVAILABLE';
    focusReason = 'Reliable positional data is unavailable for this object.';
  } else if (craft.id === 'aditya-l1') {
    focusEnabled = true;
  } else if (craft.noradId !== undefined && craft.position !== undefined) {
    focusEnabled = true;
  } else {
    focusEnabled = false;
    focusReasonTitle = 'FOCUS UNAVAILABLE';
    focusReason = '3D map positioning is unavailable for this coordinate frame.';
  }

  // Capability resolution: Vector Tracking / Analysis
  let trackEnabled = false;
  let trackReasonTitle = 'TRACKING UNAVAILABLE';
  let trackReason = 'No browser-accessible verified ephemeris is currently available.';

  if (isVoyager) {
    trackEnabled = false;
    trackReasonTitle = 'TRACKING UNAVAILABLE';
    trackReason = 'No browser-accessible verified ephemeris is currently available.';
  } else if (craft.id === 'aditya-l1') {
    trackEnabled = true;
  } else if (craft.noradId !== undefined && craft.isOperational) {
    trackEnabled = true;
  } else {
    trackEnabled = false;
    trackReasonTitle = 'TRACKING UNAVAILABLE';
    trackReason = 'Orbital vector propagation is not available for this mission profile.';
  }

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

      {/* 2. Visibility / 3D Spacecraft Architecture */}
      <button
        onClick={() => onView3D(craft)}
        className="btn-icon-action"
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
