import React from 'react';
import { Activity, Eye, Orbit, Compass } from 'lucide-react';
import type { SpacecraftObject } from '../../types/space';
import { ActionTooltip } from './ActionTooltip';
import { resolveSpacecraftActionSet } from '../../services/data/trackingCapability';

export interface SpacecraftActionsProps {
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
  const actions = resolveSpacecraftActionSet(craft);

  const handleTrackClick = () => {
    if (craft.id === 'chandrayaan-1' || craft.id === 'chandrayaan-3-surface') {
      onSelect(craft);
    } else if (actions.track.isClickable) {
      onTrack(craft.id);
    }
  };

  return (
    <div className="action-bar-container">
      <div className="action-slot action-slot-primary">
        <ActionTooltip
          title={actions.inspect.tooltipTitle}
          description={actions.inspect.tooltipDescription}
          state={actions.inspect.state}
        >
          <button
            onClick={() => onSelect(craft)}
            className="btn btn-secondary action-btn-inspect state-available"
            aria-label={`Inspect telemetry and mission profile for ${craft.name}`}
            title={`Inspect telemetry and mission profile for ${craft.name}`}
          >
            <Activity size={13} style={{ color: 'var(--accent-cyan)' }} />
            <span>Inspect</span>
          </button>
        </ActionTooltip>
      </div>

      <div className="action-slot">
        <ActionTooltip
          title={actions.view3D.tooltipTitle}
          description={actions.view3D.tooltipDescription}
          state={actions.view3D.state}
        >
          <button
            onClick={() => onView3D(craft)}
            className="btn-icon-action btn-eye-view state-available"
            aria-label={`Show 3D architecture for ${craft.name}`}
            title={actions.view3D.tooltipTitle}
          >
            <Eye size={14} style={{ color: 'var(--accent-cyan)' }} />
          </button>
        </ActionTooltip>
      </div>

      <div className="action-slot">
        <ActionTooltip
          title={actions.focus.tooltipTitle}
          description={actions.focus.tooltipDescription}
          state={actions.focus.state}
        >
          <button
            onClick={actions.focus.isClickable ? () => onFocus(craft.id) : undefined}
            disabled={!actions.focus.isClickable}
            aria-disabled={!actions.focus.isClickable}
            className={`btn-icon-action state-${actions.focus.state.toLowerCase()}`}
            aria-label={`${actions.focus.label} for ${craft.name}`}
            title={actions.focus.tooltipTitle}
          >
            <Orbit size={14} />
          </button>
        </ActionTooltip>
      </div>

      <div className="action-slot">
        <ActionTooltip
          title={actions.track.tooltipTitle}
          description={actions.track.tooltipDescription}
          state={actions.track.state}
        >
          <button
            onClick={actions.track.isClickable ? handleTrackClick : undefined}
            disabled={!actions.track.isClickable}
            aria-disabled={!actions.track.isClickable}
            className={`btn-icon-action state-${actions.track.state.toLowerCase()}`}
            aria-label={`${actions.track.label} for ${craft.name}`}
            title={actions.track.tooltipTitle}
          >
            <Compass size={14} />
          </button>
        </ActionTooltip>
      </div>
    </div>
  );
};

