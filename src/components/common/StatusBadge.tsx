import React from 'react';
import type { DataStatus, SourceMetadata } from '../../types/telemetry';

interface StatusBadgeProps {
  status: DataStatus;
  metadata?: SourceMetadata;
  compact?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, metadata, compact = false }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'CURRENT':
      case 'LIVE':
        return {
          label: 'CURRENT',
          symbol: '●',
          color: 'var(--status-live)',
          bg: 'var(--status-live-bg)',
          border: 'var(--status-live-border)'
        };
      case 'CALCULATED':
        return {
          label: 'CALCULATED',
          symbol: '●',
          color: 'var(--status-calculated)',
          bg: 'var(--status-calculated-bg)',
          border: 'var(--status-calculated-border)'
        };
      case 'LAST_AVAILABLE':
        return {
          label: 'LAST AVAILABLE',
          symbol: '●',
          color: 'var(--status-last)',
          bg: 'var(--status-last-bg)',
          border: 'var(--status-last-border)'
        };
      case 'HISTORICAL':
        return {
          label: 'HISTORICAL',
          symbol: '●',
          color: 'var(--status-historical)',
          bg: 'var(--status-historical-bg)',
          border: 'var(--status-historical-border)'
        };
      case 'DATA_UNAVAILABLE':
      case 'UNAVAILABLE':
        return {
          label: 'DATA UNAVAILABLE',
          symbol: '○',
          color: 'var(--status-unavailable)',
          bg: 'var(--status-unavailable-bg)',
          border: 'var(--status-unavailable-border)'
        };
      case 'SOURCE_ERROR':
        return {
          label: 'SOURCE ERROR',
          symbol: '●',
          color: 'var(--status-error)',
          bg: 'var(--status-error-bg)',
          border: 'var(--status-error-border)'
        };
      default:
        return {
          label: 'DATA UNAVAILABLE',
          symbol: '○',
          color: 'var(--status-unavailable)',
          bg: 'var(--status-unavailable-bg)',
          border: 'var(--status-unavailable-border)'
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
        padding: compact ? '2px 7px' : '3px 9px',
        borderRadius: 'var(--radius-xs)',
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        fontSize: compact ? '10px' : '11px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        letterSpacing: '0.04em',
        userSelect: 'none',
        lineHeight: 1.2
      }}
      title={metadata ? `${metadata.sourceName} • ${metadata.statusNote || ''}` : config.label}
    >
      <span style={{ fontSize: '10px', lineHeight: 1 }}>{config.symbol}</span>
      <span>{config.label}</span>
    </div>
  );
};
