import React from 'react';

interface DataMetricProps {
  label: string;
  value: string;
  highlight?: boolean;
  truncate?: boolean;
}

export const DataMetric: React.FC<DataMetricProps> = ({
  label,
  value,
  highlight = false,
  truncate = false
}) => {
  const isUnavailable = value === 'DATA UNAVAILABLE' || value === 'N/A' || value === 'UNAVAILABLE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <span
        style={{
          fontSize: '10px',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontFamily: 'var(--font-heading)',
          fontWeight: 500
        }}
      >
        {label}
      </span>
      <div
        className="mono"
        style={{
          fontSize: truncate ? '11px' : '13px',
          fontWeight: isUnavailable ? 600 : 700,
          color: isUnavailable
            ? 'var(--text-muted)'
            : highlight
            ? 'var(--accent-cyan)'
            : 'var(--text-primary)',
          marginTop: '2px',
          whiteSpace: 'nowrap',
          overflow: truncate ? 'hidden' : 'visible',
          textOverflow: truncate ? 'ellipsis' : 'clip',
          lineHeight: 1.3
        }}
        title={truncate ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
};
