import React, { useState } from 'react';
import { 
  X, 
  Satellite, 
  Compass, 
  Layers, 
  Activity,
  Zap,
  Crosshair,
  AlertTriangle,
  Eye,
  Calendar,
  Database
} from 'lucide-react';
import type { SpacecraftObject } from '../../types/space';
import { StatusBadge } from '../common/StatusBadge';
import { formatDistanceKm, formatVelocityKmS } from '../../utils/formatters';
import { formatLightTime, kmToAu } from '../../services/calculations/physics';
import { Spacecraft3DViewer } from './Spacecraft3DViewer';

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
  const [show3DViewer, setShow3DViewer] = useState(false);

  if (!object) return null;

  const isVoyager = object.id.includes('voyager');
  const distAu = object.distanceFromEarthKm ? kmToAu(object.distanceFromEarthKm) : undefined;
  const distSunAu = object.distanceFromSunKm ? kmToAu(object.distanceFromSunKm) : undefined;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: '72px',
          right: '20px',
          bottom: '20px',
          width: '430px',
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
          {/* Voyager Ephemeris Transparency Alert */}
          {isVoyager && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-xs)',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '12px', fontWeight: 700 }}>
                <AlertTriangle size={15} />
                <span>POSITION DATA UNAVAILABLE // EPHEMERIS SOURCE UNAVAILABLE</span>
              </div>
              <p style={{ fontSize: '11px', color: '#fef08a', lineHeight: 1.5, margin: 0 }}>
                Reliable browser-accessible positional data is currently unavailable for this object. SpacePulse strictly adheres to verified orbital telemetry and does not invent spacecraft coordinates or render fabricated Solar System locations.
              </p>
            </div>
          )}

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

          {/* Catalog & Orbital Classification */}
          <div style={{
            background: 'var(--surface-inset)',
            padding: '12px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-hairline)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px'
          }}>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Catalog ID
              </span>
              <div className="mono" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {object.noradId ? `NORAD ${object.noradId}` : object.jplId ? `JPL ${object.jplId}` : 'DATA UNAVAILABLE'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Orbit Classification
              </span>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                {object.orbitType || 'DATA UNAVAILABLE'}
              </div>
            </div>
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
              <span>Flight Telemetry Measurements</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {/* Distance from Earth / Altitude */}
              <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {object.geodetic?.altitudeKm ? 'Orbital Altitude' : 'Distance from Earth'}
                </div>
                <div className="mono" style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                  {object.geodetic?.altitudeKm !== undefined
                    ? `${Math.round(object.geodetic.altitudeKm).toLocaleString()} km`
                    : object.distanceFromEarthKm !== undefined
                    ? formatDistanceKm(object.distanceFromEarthKm)
                    : 'DATA UNAVAILABLE'}
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
                  {object.velocityKmS !== undefined ? formatVelocityKmS(object.velocityKmS) : 'DATA UNAVAILABLE'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {object.velocityKmS !== undefined ? 'Relative to center of mass' : 'Calculated vector unavailable'}
                </div>
              </div>

              {/* Distance from Sun */}
              <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Distance from Sun</div>
                <div className="mono" style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                  {object.distanceFromSunKm !== undefined ? formatDistanceKm(object.distanceFromSunKm, true) : 'DATA UNAVAILABLE'}
                </div>
                {distSunAu !== undefined && (
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                    {distSunAu.toFixed(3)} AU
                  </div>
                )}
              </div>

              {/* Light Travel Time */}
              <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>One-Way Radio Latency</div>
                <div className="mono" style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-cyan)' }}>
                  {object.lightTimeToEarthSec !== undefined ? formatLightTime(object.lightTimeToEarthSec) : 'DATA UNAVAILABLE'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Speed of Light ($c$)
                </div>
              </div>
            </div>
          </div>

          {/* Calculated Vector Position (ECI / Geocentric) */}
          <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Calculated 3D State Coordinates
            </div>
            {object.position ? (
              <div className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>X: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(object.position.x).toLocaleString()} km</strong></div>
                <div>Y: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(object.position.y).toLocaleString()} km</strong></div>
                <div>Z: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(object.position.z).toLocaleString()} km</strong></div>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--status-last)', fontStyle: 'italic' }}>
                POSITION DATA UNAVAILABLE
              </div>
            )}
          </div>

          {/* Sub-Satellite Geodetic Track if in Earth Orbit */}
          {object.geodetic && (
            <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Sub-Satellite Ground Track
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

          {/* Plain English Scientific Explanation */}
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
              <span>Mission Science & Significance</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {object.scientificExplanation || object.significance || object.description}
            </p>
          </div>

          {/* Coordinate Reference & Orbit Details */}
          <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Database size={12} />
              <span>Data Provenance & Verification</span>
            </div>
            <div>Source: <strong style={{ color: 'var(--text-primary)' }}>{object.telemetrySource.sourceName}</strong></div>
            {object.telemetrySource.statusNote && (
              <div style={{ marginTop: '3px', color: 'var(--accent-cyan)' }}>
                {object.telemetrySource.statusNote}
              </div>
            )}
            <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
              Last Verified: {new Date(object.telemetrySource.timestamp).toUTCString()}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-hairline)',
          display: 'flex',
          gap: '8px',
          background: 'rgba(3, 5, 10, 0.95)'
        }}>
          {/* 3D Model Architecture Viewer Button */}
          <button
            onClick={() => setShow3DViewer(true)}
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: '12px' }}
            title="Inspect 3D Spacecraft Architecture"
          >
            <Eye size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span>3D Model</span>
          </button>

          {!isVoyager && onFocusOnMap && (
            <button
              onClick={() => onFocusOnMap(object.id)}
              className="btn btn-primary"
              style={{ flex: 1, fontSize: '12px' }}
            >
              <Crosshair size={14} />
              <span>Focus on Map</span>
            </button>
          )}

          {!isVoyager && onOpenInAnalysis && (
            <button
              onClick={() => onOpenInAnalysis(object.id)}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '8px 10px' }}
              title="Vector Analysis"
            >
              <Compass size={14} />
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

      {/* 3D Spacecraft Architecture Modal */}
      {show3DViewer && (
        <Spacecraft3DViewer
          craftId={object.id}
          craftName={object.name}
          onClose={() => setShow3DViewer(false)}
        />
      )}
    </>
  );
};
