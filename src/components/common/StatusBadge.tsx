import React from 'react';
import { DataStatus, SourceMetadata } from '../../types/telemetry';

interface StatusBadgeProps {
  status: DataStatus;
  metadata?: SourceMetadata;
  compact?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, metadata, compact = false }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'LIVE':
        return {
          label: 'CURRENT',
          color: 'var(--status-live)',
          bg: 'rgba(16, 185, 129, 0.12)',
          border: 'rgba(16, 185, 129, 0.3)',
          indicatorClass: 'live-pulse'
        };
      case 'CALCULATED':
        return {
          label: 'CALCULATED',
          color: 'var(--status-calculated)',
          bg: 'rgba(14, 165, 233, 0.12)',
          border: 'rgba(14, 165, 233, 0.3)',
          indicatorClass: ''
        };
      case 'LAST_AVAILABLE':
        return {
          label: 'LAST AVAILABLE',
          color: 'var(--status-last)',
          bg: 'rgba(245, 158, 11, 0.12)',
          border: 'rgba(245, 158, 11, 0.3)',
          indicatorClass: ''
        };
      case 'UNAVAILABLE':
        return {
          label: 'DATA UNAVAILABLE',
          color: 'var(--status-unavailable)',
          bg: 'rgba(100, 116, 139, 0.12)',
          border: 'rgba(100, 116, 139, 0.3)',
          indicatorClass: ''
        };
      case 'SOURCE_ERROR':
        return {
          label: 'SOURCE ERROR',
          color: 'var(--status-error)',
          bg: 'rgba(239, 68, 68, 0.12)',
          border: 'rgba(239, 68, 68, 0.3)',
          indicatorClass: ''
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: compact ? '2px 6px' : '4px 8px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        fontSize: compact ? '10px' : '11px',
        fontFamily: 'var(--font-heading)',
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        userSelect: 'none',
        lineHeight: 1.2
      }}
      title={metadata ? `${metadata.sourceName}: ${metadata.statusNote || ''}` : config.label}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: config.color,
          display: 'inline-block'
        }}
      />
      <span>{config.label}</span>
    </div>
  );
};
