import React from 'react';
import { 
  X, 
  Satellite, 
  Radio, 
  ExternalLink, 
  Compass, 
  Layers, 
  Activity,
  Zap,
  Clock,
  Crosshair
} from 'lucide-react';
import { SpacecraftObject } from '../../types/space';
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
        top: '80px',
        right: '24px',
        bottom: '24px',
        width: '420px',
        maxWidth: 'calc(100vw - 48px)',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      className="glass-panel"
    >
      {/* Panel Header */}
      <div style={{
        padding: '18px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        background: 'rgba(255, 255, 255, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-cyan)'
          }}>
            <Satellite size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{object.name}</h3>
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--text-secondary)',
                fontWeight: 600
              }}>
                {object.agency}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
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
          <X size={18} />
        </button>
      </div>

      {/* Panel Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Status & Provenance Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Mission Status
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
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Activity size={13} style={{ color: 'var(--accent-cyan)' }} />
            <span>Flight Telemetry</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* Distance from Earth */}
            <div className="glass-card" style={{ padding: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Distance from Earth</div>
              <div className="mono" style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                {object.distanceFromEarthKm !== undefined ? formatDistanceKm(object.distanceFromEarthKm) : 'Unavailable'}
              </div>
              {distAu !== undefined && distAu >= 0.01 && (
                <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                  {distAu.toFixed(4)} AU
                </div>
              )}
            </div>

            {/* Velocity */}
            <div className="glass-card" style={{ padding: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Orbital Velocity</div>
              <div className="mono" style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                {object.velocityKmS !== undefined ? formatVelocityKmS(object.velocityKmS) : 'Unavailable'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Relative to coordinate center
              </div>
            </div>

            {/* Distance from Sun */}
            <div className="glass-card" style={{ padding: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Distance from Sun</div>
              <div className="mono" style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                {object.distanceFromSunKm !== undefined ? formatDistanceKm(object.distanceFromSunKm) : 'Unavailable'}
              </div>
              {distSunAu !== undefined && (
                <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                  {distSunAu.toFixed(3)} AU
                </div>
              )}
            </div>

            {/* Light Travel Time */}
            <div className="glass-card" style={{ padding: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>One-Way Light Delay</div>
              <div className="mono" style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-cyan)' }}>
                {object.lightTimeToEarthSec !== undefined ? formatLightTime(object.lightTimeToEarthSec) : 'N/A'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Speed of Light ($c$)
              </div>
            </div>
          </div>
        </div>

        {/* Geodetic Coordinates if in Earth Orbit */}
        {object.geodetic && (
          <div className="glass-card" style={{ padding: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Sub-Satellite Geodetic Track
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Latitude</span>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>
                  {object.geodetic.latitude.toFixed(2)}°
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Longitude</span>
                <div className="mono" style={{ fontSize: '13px', fontWeight: 600 }}>
                  {object.geodetic.longitude.toFixed(2)}°
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Altitude</span>
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
          borderRadius: 'var(--radius-md)',
          padding: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--accent-cyan)',
            fontWeight: 600,
            fontSize: '13px',
            marginBottom: '8px'
          }}>
            <Zap size={15} />
            <span>What does this mean?</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {object.scientificExplanation}
          </p>
        </div>

        {/* Coordinate Reference & Orbit Type */}
        <div className="glass-card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
              <Layers size={13} style={{ color: 'var(--accent-cyan)' }} />
              <span>Scientific Instrumentation ({object.payloads.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {object.payloads.map((payload, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: '12px',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
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
          padding: '12px',
          background: 'rgba(0, 0, 0, 0.25)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-muted)'
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Data Source Verification
          </div>
          <div>Source: {object.telemetrySource.sourceName}</div>
          {object.telemetrySource.statusNote && (
            <div style={{ marginTop: '2px', color: 'var(--accent-cyan)' }}>
              Note: {object.telemetrySource.statusNote}
            </div>
          )}
          <div style={{ marginTop: '4px', fontSize: '10px' }}>
            Calculated / Updated: {new Date(object.telemetrySource.timestamp).toUTCString()}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        gap: '10px',
        background: 'rgba(7, 10, 18, 0.95)'
      }}>
        {onFocusOnMap && (
          <button
            onClick={() => onFocusOnMap(object.id)}
            className="btn btn-primary"
            style={{ flex: 1 }}
          >
            <Crosshair size={15} />
            <span>Focus on 3D Map</span>
          </button>
        )}
        {onOpenInAnalysis && (
          <button
            onClick={() => onOpenInAnalysis(object.id)}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            <Compass size={15} />
            <span>Analyze</span>
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
