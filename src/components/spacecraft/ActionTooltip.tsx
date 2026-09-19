import React, { useState } from 'react';

interface ActionTooltipProps {
  title?: string;
  description: string;
  isUnavailable?: boolean;
  children: React.ReactNode;
}

export const ActionTooltip: React.FC<ActionTooltipProps> = ({
  title,
  description,
  isUnavailable = false,
  children
}) => {
  const [visible, setVisible] = useState(false);

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
                color: isUnavailable ? 'var(--solar-amber)' : 'var(--accent-cyan)',
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
