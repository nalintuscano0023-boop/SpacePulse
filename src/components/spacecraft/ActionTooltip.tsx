import React, { useState } from 'react';
import type { ActionVisualState } from '../../services/data/trackingCapability';

interface ActionTooltipProps {
  title?: string;
  description: string;
  state?: ActionVisualState;
  isUnavailable?: boolean;
  children: React.ReactNode;
}

export const ActionTooltip: React.FC<ActionTooltipProps> = ({
  title,
  description,
  state,
  isUnavailable = false,
  children
}) => {
  const [visible, setVisible] = useState(false);

  // Derive visual tint from explicit state or legacy isUnavailable prop
  const resolvedState: ActionVisualState = state || (isUnavailable ? 'UNSUPPORTED' : 'AVAILABLE');

  const getTitleColor = () => {
    switch (resolvedState) {
      case 'LIMITED':
        return '#f59e0b';
      case 'UNSUPPORTED':
        return '#94a3b8';
      case 'AVAILABLE':
      default:
        return 'var(--accent-cyan)';
    }
  };

  return (
    <div
      className="action-tooltip-anchor"
      onClick={() => setVisible(prev => !prev)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="action-tooltip-popover" role="tooltip">
          {title && (
            <div
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: getTitleColor(),
                textTransform: 'uppercase',
                marginBottom: '3px'
              }}
            >
              {title}
            </div>
          )}
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              lineHeight: 1.35,
              fontFamily: 'var(--font-sans)'
            }}
          >
            {description}
          </div>
        </div>
      )}
    </div>
  );
};
