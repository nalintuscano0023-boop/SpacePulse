import React from 'react';
import { StatusBadge } from './StatusBadge';
import { SourceMetadata } from '../../types/telemetry';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon?: React.ReactNode;
  metadata?: SourceMetadata;
  onClick?: () => void;
  highlight?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subtext,
  icon,
  metadata,
  onClick,
  highlight = false
}) => {
  return (
    <div
      onClick={onClick}
      className="glass-card"
      style={{
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        border: highlight ? '1px solid var(--border-active)' : undefined,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top row: Label & Icon / Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon && (
            <span style={{ color: 'var(--accent-cyan)', opacity: 0.9 }}>
              {icon}
            </span>
          )}
          <span style={{
            fontSize: '12px',
            fontFamily: 'var(--font-heading)',
            color: 'var(--text-secondary)',
            fontWeight: 500,
            letterSpacing: '0.02em',
            textTransform: 'uppercase'
          }}>
            {label}
          </span>
        </div>

        {metadata && (
          <StatusBadge status={metadata.status} metadata={metadata} compact />
        )}
      </div>

      {/* Middle row: Primary Value & Unit */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '6px',
        margin: '4px 0'
      }}>
        <span className="mono" style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em'
        }}>
          {value}
        </span>
        {unit && (
          <span style={{
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)'
          }}>
            {unit}
          </span>
        )}
      </div>

      {/* Bottom row: Subtext or Source footnote */}
      {(subtext || metadata) && (
        <div style={{
          marginTop: '8px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          paddingTop: '8px'
        }}>
          <span>{subtext || metadata?.sourceName}</span>
          {metadata?.timestamp && (
            <span className="mono" style={{ opacity: 0.8 }}>
              {new Date(metadata.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' })} UTC
            </span>
          )}
        </div>
      )}
    </div>
  );
};
