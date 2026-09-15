import React from 'react';
import { 
  X, 
  Satellite, 
  Radio, 
  Compass, 
  Layers, 
  Activity,
  Zap,
  Crosshair
} from 'lucide-react';
import type { SpacecraftObject } from '../../types/space';
import { StatusBadge } from '../common/StatusBadge';
import { formatDistanceKm, formatVelocityKmS } from '../../utils/formatters';
import { formatLightTime, kmToAu } from '../../services/calculations/physics';

interface ObjectInspectorProps {
  object: SpacecraftObject | null;
  onClose: () => void;
  onFocusOnMap?: (objectId: string) => void;
  onOpenInAnalysis?: (objectId: string) => void;
}

export const ObjectInspector: React.FC<ObjectInspectorProps> = ({
  object,
  onClose,
  onFocusOnMap,
  onOpenInAnalysis
}) => {
  if (!object) return null;

  const distAu = object.distanceFromEarthKm ? kmToAu(object.distanceFromEarthKm) : undefined;
  const distSunAu = object.distanceFromSunKm ? kmToAu(object.distanceFromSunKm) : undefined;

  return (
    <div
      style={{
        position: 'fixed',
        top: '72px',
        right: '20px',
        bottom: '20px',
        width: '420px',
        maxWidth: 'calc(100vw - 40px)',
        zIndex: 150,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      className="glass-panel tech-corner"
    >
      {/* Panel Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-hairline)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        background: 'rgba(255, 255, 255, 0.015)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-xs)',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan)'
          }}>
            <Satellite size={19} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>{object.name}</h3>
              <span style={{
                fontSize: '10px',
                padding: '2px 5px',
                borderRadius: '3px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--accent-cyan)',
                fontWeight: 600
              }}>
                {object.agency}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {object.mission}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Close Inspector"
        >
          <X size={17} />
        </button>
      </div>

      {/* Panel Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Status & Provenance Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-inset)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-xs)',
          border: '1px solid var(--border-hairline)'
        }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Mission Flight Status
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
              {object.statusText}
            </div>
          </div>
          <StatusBadge status={object.telemetrySource.status} metadata={object.telemetrySource} />
        </div>

        {/* Primary Flight Telemetry Grid */}
        <div>
          <div style={{
            fontSize: '11px',
            fontFamily: 'var(--font-heading)',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Activity size={12} style={{ color: 'var(--accent-cyan)' }} />
            <span>Flight Measurements</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {/* Distance from Earth */}
            <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Distance from Earth</div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                {object.distanceFromEarthKm !== undefined ? formatDistanceKm(object.distanceFromEarthKm) : 'Unavailable'}
              </div>
              {distAu !== undefined && distAu >= 0.005 && (
                <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                  {distAu.toFixed(4)} AU
                </div>
              )}
            </div>

            {/* Velocity */}
            <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Orbital Velocity</div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                {object.velocityKmS !== undefined ? formatVelocityKmS(object.velocityKmS) : 'Unavailable'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Relative to coordinate center
              </div>
            </div>

            {/* Distance from Sun */}
            <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Distance from Sun</div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                {object.distanceFromSunKm !== undefined ? formatDistanceKm(object.distanceFromSunKm, true) : 'Unavailable'}
              </div>
              {distSunAu !== undefined && (
                <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                  {distSunAu.toFixed(3)} AU
                </div>
              )}
            </div>

            {/* Light Travel Time */}
            <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>One-Way Light Delay</div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-cyan)' }}>
                {object.lightTimeToEarthSec !== undefined ? formatLightTime(object.lightTimeToEarthSec) : 'N/A'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Speed of Light ($c$)
              </div>
            </div>
          </div>
        </div>

        {/* Geodetic Coordinates if in Earth Orbit */}
        {object.geodetic && (
          <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Sub-Satellite Geodetic Track
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Latitude</span>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>
                  {object.geodetic.latitude.toFixed(2)}°
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Longitude</span>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>
                  {object.geodetic.longitude.toFixed(2)}°
                </div>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Altitude</span>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>
                  {Math.round(object.geodetic.altitudeKm)} km
                </div>
              </div>
            </div>
          </div>
        )}

        {/* What does this mean? - Plain English Explanation */}
        <div style={{
          background: 'rgba(56, 189, 248, 0.04)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: 'var(--radius-xs)',
          padding: '14px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--accent-cyan)',
            fontWeight: 600,
            fontSize: '12px',
            marginBottom: '6px'
          }}>
            <Zap size={14} />
            <span>What does this mean?</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {object.scientificExplanation}
          </p>
        </div>

        {/* Coordinate Reference & Orbit Type */}
        <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Orbit Class</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{object.orbitType}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Coordinate Frame</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{object.coordinateFrame}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Launch Date</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{object.launchDate}</span>
            </div>
          </div>
        </div>

        {/* Scientific Payloads */}
        {object.payloads && object.payloads.length > 0 && (
          <div>
            <div style={{
              fontSize: '10px',
              fontFamily: 'var(--font-heading)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Layers size={12} style={{ color: 'var(--accent-cyan)' }} />
              <span>Scientific Payloads ({object.payloads.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {object.payloads.map((payload, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: '11px',
                    padding: '6px 10px',
                    background: 'var(--surface-inset)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {payload}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Provenance Footnote */}
        <div style={{
          padding: '10px 12px',
          background: 'rgba(3, 5, 10, 0.5)',
          borderRadius: 'var(--radius-xs)',
          border: '1px solid var(--border-hairline)',
          fontSize: '11px',
          color: 'var(--text-muted)'
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px' }}>
            Data Source Verification
          </div>
          <div>Source: {object.telemetrySource.sourceName}</div>
          {object.telemetrySource.statusNote && (
            <div style={{ marginTop: '2px', color: 'var(--accent-cyan)' }}>
              Note: {object.telemetrySource.statusNote}
            </div>
          )}
          <div style={{ marginTop: '4px', fontSize: '10px' }}>
            Updated: {new Date(object.telemetrySource.timestamp).toUTCString()}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--border-hairline)',
        display: 'flex',
        gap: '10px',
        background: 'rgba(3, 5, 10, 0.95)'
      }}>
        {onFocusOnMap && (
          <button
            onClick={() => onFocusOnMap(object.id)}
            className="btn btn-primary"
            style={{ flex: 1, fontSize: '12px' }}
          >
            <Crosshair size={14} />
            <span>Focus on 3D Map</span>
          </button>
        )}
        {onOpenInAnalysis && (
          <button
            onClick={() => onOpenInAnalysis(object.id)}
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: '12px' }}
          >
            <Compass size={14} />
            <span>Vector Analysis</span>
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
