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
  Globe, 
  Sun, 
  Moon, 
  Database 
} from 'lucide-react';
import type { InspectableObject, SpacecraftObject } from '../../types/space';
import { normalizeSpacecraftObject } from '../../services/data/objectResolver';
import { StatusBadge } from '../common/StatusBadge';
import { formatDistanceKm, formatVelocityKmS } from '../../utils/formatters';
import { formatLightTime, kmToAu } from '../../services/calculations/physics';
import { Spacecraft3DViewer } from './Spacecraft3DViewer';
import { ActionTooltip } from '../spacecraft/ActionTooltip';

interface ObjectInspectorProps {
  object: InspectableObject | SpacecraftObject | null;
  onClose: () => void;
  onFocusOnMap?: (objectId: string) => void;
  onOpenInAnalysis?: (objectId: string) => void;
}

export const ObjectInspector: React.FC<ObjectInspectorProps> = ({
  object: rawObject,
  onClose,
  onFocusOnMap,
  onOpenInAnalysis
}) => {
  const [show3DViewer, setShow3DViewer] = useState(false);

  if (!rawObject) return null;

  const object: InspectableObject = 'category' in rawObject ? rawObject : normalizeSpacecraftObject(rawObject);

  const isVoyager = object.id.includes('voyager');
  const isCelestial = object.category === 'planet' || object.category === 'star' || object.category === 'moon';
  const distAu = object.distanceFromEarthKm ? kmToAu(object.distanceFromEarthKm) : undefined;
  const distSunAu = object.distanceFromSunKm ? kmToAu(object.distanceFromSunKm) : undefined;

  const renderObjectIcon = () => {
    if (object.category === 'planet') return <Globe size={19} />;
    if (object.category === 'star') return <Sun size={19} />;
    if (object.category === 'moon') return <Moon size={19} />;
    return <Satellite size={19} />;
  };

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
              {renderObjectIcon()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>{object.name}</h3>
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--accent-cyan)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  border: '1px solid rgba(56, 189, 248, 0.2)'
                }}>
                  {object.agency || (object.category ? object.category.toUpperCase() : 'ASTRONOMICAL')}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {object.mission || object.typeText}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
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
            title="Close Inspector"
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
                Status / Classification
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {object.statusText || 'Active Astronomical Body'}
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
                {isCelestial ? 'Object Category' : 'Catalog ID'}
              </span>
              <div className="mono" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                {object.noradId
                  ? `NORAD ${object.noradId}`
                  : object.jplId
                  ? `JPL ${object.jplId}`
                  : object.typeText || (object.category ? object.category.toUpperCase() : 'DATA UNAVAILABLE')}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Coordinate Frame
              </span>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={object.coordinateFrame}>
                {object.coordinateFrame || 'Heliocentric Ecliptic J2000'}
              </div>
            </div>
          </div>

          {/* Primary Flight / Planetary Telemetry Grid */}
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
              <span>{isCelestial ? 'Planetary & Astronomical Measurements' : 'Flight Telemetry Measurements'}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {/* Distance from Earth / Altitude */}
              <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {object.geodetic?.altitudeKm ? 'Orbital Altitude' : 'Distance from Earth'}
                </div>
                <div className="mono" style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                  {object.isEarthOrigin
                    ? 'REFERENCE ORIGIN'
                    : object.geodetic?.altitudeKm !== undefined
                    ? `${Math.round(object.geodetic.altitudeKm).toLocaleString()} km`
                    : object.distanceFromEarthKm !== undefined
                    ? formatDistanceKm(object.distanceFromEarthKm)
                    : 'DATA UNAVAILABLE'}
                </div>
                {object.isEarthOrigin ? (
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Ground Coordinate Zero
                  </div>
                ) : distAu !== undefined && distAu >= 0.005 ? (
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                    {distAu.toFixed(4)} AU
                  </div>
                ) : null}
              </div>

              {/* Distance from Sun */}
              <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Distance from Sun</div>
                <div className="mono" style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                  {object.id === 'sun'
                    ? 'SOLAR CENTER'
                    : object.distanceFromSunKm !== undefined
                    ? formatDistanceKm(object.distanceFromSunKm, true)
                    : 'DATA UNAVAILABLE'}
                </div>
                {object.id === 'sun' ? (
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    (0.000 AU Coordinate Center)
                  </div>
                ) : distSunAu !== undefined ? (
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                    {distSunAu.toFixed(3)} AU
                  </div>
                ) : null}
              </div>

              {/* Distance from Moon */}
              <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Distance from Moon</div>
                <div className="mono" style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                  {object.id === 'moon'
                    ? 'LUNAR SURFACE'
                    : object.distanceFromMoonKm !== undefined
                    ? formatDistanceKm(object.distanceFromMoonKm)
                    : 'DATA UNAVAILABLE'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {object.id === 'moon' ? 'Selenocentric Center' : object.distanceFromMoonKm !== undefined ? 'Calculated Baseline' : 'DATA UNAVAILABLE'}
                </div>
              </div>

              {/* Velocity */}
              <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Orbital Speed</div>
                <div className="mono" style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                  {object.velocityKmS !== undefined ? formatVelocityKmS(object.velocityKmS) : 'DATA UNAVAILABLE'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {object.velocityKmS !== undefined ? 'Relative to primary center' : 'Calculated vector unavailable'}
                </div>
              </div>

              {/* Light Travel Time */}
              <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>One-Way Light Delay</div>
                <div className="mono" style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-cyan)' }}>
                  {object.lightTimeToEarthSec !== undefined ? formatLightTime(object.lightTimeToEarthSec) : 'DATA UNAVAILABLE'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Speed of Light (c)
                </div>
              </div>

              {/* Physical Radius / Size */}
              <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mean Volumetric Radius</div>
                <div className="mono" style={{ fontSize: '15px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                  {object.radiusKm !== undefined ? `${object.radiusKm.toLocaleString()} km` : 'DATA UNAVAILABLE'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {object.radiusKm !== undefined ? 'IAU Physical Body Radius' : 'Payload Scale Reference'}
                </div>
              </div>
            </div>
          </div>

          {/* Calculated Vector Position (ECI / Heliocentric J2000) */}
          <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Calculated 3D State Coordinates ({object.coordinateFrame || 'J2000'})
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
              <span>{isCelestial ? 'Astronomical Profile & Science' : 'Mission Science & Significance'}</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {object.scientificExplanation || object.significance || object.description}
            </p>
          </div>

          {/* Coordinate Reference & Details */}
          <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Coordinate Frame</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{object.coordinateFrame || 'Heliocentric Ecliptic J2000'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>{isCelestial ? 'Reference Epoch' : 'Launch Date'}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{object.launchDate || 'J2000.0 Standard Epoch'}</span>
              </div>
            </div>
          </div>

          {/* Scientific Payloads or Key Planetary Features */}
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
                <span>{isCelestial ? `Key Planetary Features (${object.payloads.length})` : `Scientific Payloads (${object.payloads.length})`}</span>
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
          {/* 3D Model Architecture Viewer Button (for Spacecraft / Satellites) */}
          {!isCelestial ? (
            <button
              onClick={() => setShow3DViewer(true)}
              className="btn btn-secondary"
              style={{ flex: 1, fontSize: '12px' }}
              title="Inspect 3D Spacecraft Architecture"
            >
              <Eye size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>3D Model</span>
            </button>
          ) : null}

          {onFocusOnMap && (
            !isVoyager ? (
              <button
                onClick={() => onFocusOnMap(object.id)}
                className="btn btn-primary"
                style={{ flex: 1, fontSize: '12px' }}
                title={`Focus ${object.name} on 3D Space Map`}
              >
                <Crosshair size={14} />
                <span>Focus on Map</span>
              </button>
            ) : (
              <ActionTooltip
                title="FOCUS UNAVAILABLE"
                description="Reliable positional data is unavailable for this object."
                isUnavailable
              >
                <button
                  disabled
                  aria-disabled="true"
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '12px', opacity: 0.4, cursor: 'not-allowed' }}
                >
                  <Crosshair size={14} />
                  <span>Focus on Map</span>
                </button>
              </ActionTooltip>
            )
          )}

          {onOpenInAnalysis && (
            !isVoyager ? (
              <button
                onClick={() => onOpenInAnalysis(object.id)}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '8px 10px' }}
                title="Vector Analysis"
                aria-label="Open in Vector Analysis"
              >
                <Compass size={14} />
              </button>
            ) : (
              <ActionTooltip
                title="TRACKING UNAVAILABLE"
                description="No browser-accessible verified ephemeris is currently available."
                isUnavailable
              >
                <button
                  disabled
                  aria-disabled="true"
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '8px 10px', opacity: 0.4, cursor: 'not-allowed' }}
                  aria-label="Vector tracking unavailable"
                >
                  <Compass size={14} />
                </button>
              </ActionTooltip>
            )
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
