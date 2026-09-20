import React, { useState, useEffect } from 'react';
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
  Database,
  ChevronRight
} from 'lucide-react';
import type { InspectableObject, SpacecraftObject } from '../../types/space';
import { normalizeSpacecraftObject } from '../../services/data/objectResolver';
import { StatusBadge } from '../common/StatusBadge';
import { formatDistanceKm, formatVelocityKmS } from '../../utils/formatters';
import { formatLightTime, kmToAu } from '../../services/calculations/physics';
import { Spacecraft3DViewer } from './Spacecraft3DViewer';
import { ActionTooltip } from '../spacecraft/ActionTooltip';
import { resolveTrackingCapability } from '../../services/data/trackingCapability';

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
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set());

  const objectId = rawObject ? ('id' in rawObject ? rawObject.id : (rawObject as any).id) : null;
  useEffect(() => {
    setExpandedSections(new Set());
  }, [objectId]);

  useEffect(() => {
    return () => {
      setExpandedSections(new Set());
    };
  }, []);

  const handleClose = () => {
    setExpandedSections(new Set());
    onClose();
  };

  const isExpanded = (section: string) => expandedSections.has(section);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  if (!rawObject) return null;

  const object: InspectableObject = 'category' in rawObject ? rawObject : normalizeSpacecraftObject(rawObject);
  const cap = object.trackingCapability || resolveTrackingCapability(object.id, object.name);

  const isVoyager = object.id.includes('voyager');
  const isCelestial = object.category === 'planet' || object.category === 'star' || object.category === 'moon';
  const distAu = object.distanceFromEarthKm ? kmToAu(object.distanceFromEarthKm) : undefined;
  const distSunAu = object.distanceFromSunKm ? kmToAu(object.distanceFromSunKm) : undefined;

  const renderObjectIcon = () => {
    if (object.category === 'planet') return <Globe size={18} />;
    if (object.category === 'star') return <Sun size={18} />;
    if (object.category === 'moon') return <Moon size={18} />;
    return <Satellite size={18} />;
  };

  return (
    <>
      <div 
        className="object-inspector-backdrop" 
        onClick={handleClose} 
        aria-hidden="true"
      />

      <div
        id="object-inspector-panel"
        className="glass-panel tech-corner object-inspector-panel"
      >
        <div className="object-inspector-handle" />

        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
              flexShrink: 0
            }}>
              {renderObjectIcon()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', lineHeight: 1.25 }}>{object.name}</h2>
                <span style={{
                  fontSize: '9px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: 'rgba(56, 189, 248, 0.08)',
                  color: 'var(--accent-cyan)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  border: '1px solid rgba(56, 189, 248, 0.2)'
                }}>
                  {object.agency || (object.category ? object.category.toUpperCase() : 'ASTRONOMICAL')}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {object.mission || object.typeText}
              </div>
            </div>
          </div>

          <button
            onClick={handleClose}
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '10px',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              touchAction: 'manipulation'
            }}
            aria-label="Close Inspector"
            title="Close Inspector"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{
          flex: '1 1 0%',
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>

          <div className="inspector-accordion">
            <button
              type="button"
              className="inspector-accordion-header"
              onClick={() => toggleSection('overview')}
              aria-expanded={isExpanded('overview')}
              aria-controls="inspector-section-overview"
              id="inspector-header-overview"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>Executive Overview</span>
              </div>
              <ChevronRight
                size={14}
                style={{
                  transform: isExpanded('overview') ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                  color: isExpanded('overview') ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  flexShrink: 0
                }}
              />
            </button>

            <div
              id="inspector-section-overview"
              role="region"
              aria-labelledby="inspector-header-overview"
              className={`inspector-accordion-body ${isExpanded('overview') ? 'open' : ''}`}
            >
              <div className="inspector-accordion-inner">
                <div className="inspector-accordion-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Operating Status</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {object.statusText || (object.isOperational ? 'Active Flight State' : 'Mission Completed')}
                      </div>
                    </div>
                    <StatusBadge status={object.telemetrySource.status} metadata={object.telemetrySource} />
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                    {object.scientificExplanation || object.significance || object.description}
                  </p>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    paddingTop: '6px'
                  }}>
                    <div style={{ background: 'var(--surface-inset)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {isCelestial ? 'Object Class' : 'Catalog Reference'}
                      </div>
                      <div className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {object.noradId
                          ? `NORAD ${object.noradId}`
                          : object.jplId
                          ? `JPL ${object.jplId}`
                          : object.typeText || (object.category ? object.category.toUpperCase() : 'ASTRONOMICAL')}
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface-inset)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {isCelestial ? 'Reference Orbit' : 'Orbit Regime'}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {object.orbitType || 'Heliocentric'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="inspector-accordion">
            <button
              type="button"
              className="inspector-accordion-header"
              onClick={() => toggleSection('position')}
              aria-expanded={isExpanded('position')}
              aria-controls="inspector-section-position"
              id="inspector-header-position"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>Position & Distance Metrics</span>
              </div>
              <ChevronRight
                size={14}
                style={{
                  transform: isExpanded('position') ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                  color: isExpanded('position') ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  flexShrink: 0
                }}
              />
            </button>

            <div
              id="inspector-section-position"
              role="region"
              aria-labelledby="inspector-header-position"
              className={`inspector-accordion-body ${isExpanded('position') ? 'open' : ''}`}
            >
              <div className="inspector-accordion-inner">
                <div className="inspector-accordion-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {!object.position && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      background: 'rgba(245, 158, 11, 0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      color: '#f59e0b',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      width: 'fit-content'
                    }}>
                      <span style={{ fontSize: '7px' }}>●</span> POSITION DATA UNAVAILABLE
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: 'var(--surface-inset)', padding: '10px', borderRadius: 'var(--radius-xs)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {object.geodetic?.altitudeKm ? 'Orbital Altitude' : 'Distance to Earth'}
                      </div>
                      <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '3px' }}>
                        {object.isEarthOrigin
                          ? 'REFERENCE ORIGIN'
                          : object.geodetic?.altitudeKm !== undefined
                          ? `${Math.round(object.geodetic.altitudeKm).toLocaleString()} km`
                          : object.distanceFromEarthKm !== undefined
                          ? formatDistanceKm(object.distanceFromEarthKm, true)
                          : 'DATA UNAVAILABLE'}
                      </div>
                      {distAu !== undefined && distAu >= 0.005 && !object.isEarthOrigin && (
                        <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                          {distAu.toFixed(4)} AU
                        </div>
                      )}
                    </div>

                    <div style={{ background: 'var(--surface-inset)', padding: '10px', borderRadius: 'var(--radius-xs)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Distance to Sun</div>
                      <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '3px' }}>
                        {object.id === 'sun'
                          ? 'SOLAR CENTER'
                          : object.distanceFromSunKm !== undefined
                          ? formatDistanceKm(object.distanceFromSunKm, true)
                          : 'DATA UNAVAILABLE'}
                      </div>
                      {distSunAu !== undefined && object.id !== 'sun' && (
                        <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                          {distSunAu.toFixed(3)} AU
                        </div>
                      )}
                    </div>

                    <div style={{ background: 'var(--surface-inset)', padding: '10px', borderRadius: 'var(--radius-xs)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Signal Delay (c)</div>
                      <div className="mono" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '3px' }}>
                        {object.lightTimeToEarthSec !== undefined ? formatLightTime(object.lightTimeToEarthSec) : 'DATA UNAVAILABLE'}
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface-inset)', padding: '10px', borderRadius: 'var(--radius-xs)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Distance to Moon</div>
                      <div className="mono" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '3px' }}>
                        {object.id === 'moon'
                          ? 'LUNAR SURFACE'
                          : object.distanceFromMoonKm !== undefined
                          ? formatDistanceKm(object.distanceFromMoonKm, true)
                          : 'DATA UNAVAILABLE'}
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--surface-inset)', padding: '10px', borderRadius: 'var(--radius-xs)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Calculated State Coordinates ({object.coordinateFrame || 'J2000'})
                      </div>
                      {!object.position && (
                        <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '7px' }}>●</span> Unavailable
                        </span>
                      )}
                    </div>
                    {object.position ? (
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <div>X: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(object.position.x).toLocaleString()} km</strong></div>
                        <div>Y: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(object.position.y).toLocaleString()} km</strong></div>
                        <div>Z: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(object.position.z).toLocaleString()} km</strong></div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>Position</span>
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>Unavailable</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>Distance</span>
                          <span style={{ color: object.distanceFromEarthKm !== undefined ? 'var(--text-primary)' : '#f59e0b' }}>
                            {object.distanceFromEarthKm !== undefined ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>Source</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{object.telemetrySource.sourceName}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="inspector-accordion">
            <button
              type="button"
              className="inspector-accordion-header"
              onClick={() => toggleSection('orbit')}
              aria-expanded={isExpanded('orbit')}
              aria-controls="inspector-section-orbit"
              id="inspector-header-orbit"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>Orbit & Dynamic Motion</span>
              </div>
              <ChevronRight
                size={14}
                style={{
                  transform: isExpanded('orbit') ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                  color: isExpanded('orbit') ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  flexShrink: 0
                }}
              />
            </button>

            <div
              id="inspector-section-orbit"
              role="region"
              aria-labelledby="inspector-header-orbit"
              className={`inspector-accordion-body ${isExpanded('orbit') ? 'open' : ''}`}
            >
              <div className="inspector-accordion-inner">
                <div className="inspector-accordion-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: 'var(--surface-inset)', padding: '10px', borderRadius: 'var(--radius-xs)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Orbital Velocity</div>
                      <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '3px' }}>
                        {object.velocityKmS !== undefined ? formatVelocityKmS(object.velocityKmS) : 'DATA UNAVAILABLE'}
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface-inset)', padding: '10px', borderRadius: 'var(--radius-xs)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Coordinate Frame</div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '3px' }}>
                        {object.coordinateFrame || 'Heliocentric J2000'}
                      </div>
                    </div>
                  </div>

                  {object.geodetic && (
                    <div style={{ background: 'var(--surface-inset)', padding: '10px', borderRadius: 'var(--radius-xs)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                        SGP4 Geodetic Sub-Satellite Track
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                        <div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>LATITUDE</span>
                          <div className="mono" style={{ fontSize: '12px', fontWeight: 600 }}>{object.geodetic.latitude.toFixed(2)}°</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>LONGITUDE</span>
                          <div className="mono" style={{ fontSize: '12px', fontWeight: 600 }}>{object.geodetic.longitude.toFixed(2)}°</div>
                        </div>
                        <div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>ALTITUDE</span>
                          <div className="mono" style={{ fontSize: '12px', fontWeight: 600 }}>{Math.round(object.geodetic.altitudeKm)} km</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {object.orbitalElements && (
                    <div style={{ background: 'var(--surface-inset)', padding: '10px', borderRadius: 'var(--radius-xs)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Keplerian Orbital Elements (SGP4 Model)
                        </div>
                        <span style={{ fontSize: '9px', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                          CALCULATED
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>ORBITAL PERIOD</span>
                          <div className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {object.orbitalElements.periodMinutes ? `${object.orbitalElements.periodMinutes.toFixed(1)} min` : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>INCLINATION</span>
                          <div className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {object.orbitalElements.inclinationDeg.toFixed(2)}°
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>ECCENTRICITY</span>
                          <div className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {object.orbitalElements.eccentricity.toFixed(5)}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>SEMI-MAJOR AXIS</span>
                          <div className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {object.orbitalElements.semiMajorAxisKm ? `${Math.round(object.orbitalElements.semiMajorAxisKm).toLocaleString()} km` : 'N/A'}
                          </div>
                        </div>
                      </div>
                      {object.orbitalElements.epoch && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-hairline)', paddingTop: '4px' }}>
                          Epoch: <span style={{ color: 'var(--text-secondary)' }}>{object.orbitalElements.epoch}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="inspector-accordion">
            <button
              type="button"
              className="inspector-accordion-header"
              onClick={() => toggleSection('mission')}
              aria-expanded={isExpanded('mission')}
              aria-controls="inspector-section-mission"
              id="inspector-header-mission"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>Mission & Payloads ({object.payloads?.length || 0})</span>
              </div>
              <ChevronRight
                size={14}
                style={{
                  transform: isExpanded('mission') ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                  color: isExpanded('mission') ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  flexShrink: 0
                }}
              />
            </button>

            <div
              id="inspector-section-mission"
              role="region"
              aria-labelledby="inspector-header-mission"
              className={`inspector-accordion-body ${isExpanded('mission') ? 'open' : ''}`}
            >
              <div className="inspector-accordion-inner">
                <div className="inspector-accordion-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', paddingBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Launch Date / Epoch</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{object.launchDate || 'Astronomical Epoch'}</span>
                  </div>

                  {object.payloads && object.payloads.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
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
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No discrete instrumentation payloads cataloged.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="inspector-accordion">
            <button
              type="button"
              className="inspector-accordion-header"
              onClick={() => toggleSection('data')}
              aria-expanded={isExpanded('data')}
              aria-controls="inspector-section-data"
              id="inspector-header-data"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={14} style={{ color: 'var(--accent-cyan)' }} />
                <span>Data Source & Health</span>
              </div>
              <ChevronRight
                size={14}
                style={{
                  transform: isExpanded('data') ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                  color: isExpanded('data') ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  flexShrink: 0
                }}
              />
            </button>

            <div
              id="inspector-section-data"
              role="region"
              aria-labelledby="inspector-header-data"
              className={`inspector-accordion-body ${isExpanded('data') ? 'open' : ''}`}
            >
              <div className="inspector-accordion-inner">
                <div className="inspector-accordion-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
                  <div>Primary Stream: <strong style={{ color: 'var(--text-primary)' }}>{object.telemetrySource.sourceName}</strong></div>
                  <div style={{ color: 'var(--accent-cyan)' }}>{cap.statusLabel} — {cap.statusDescription}</div>
                  {object.telemetrySource.statusNote && object.telemetrySource.statusNote !== cap.statusDescription && (
                    <div style={{ color: 'var(--text-secondary)' }}>{object.telemetrySource.statusNote}</div>
                  )}
                  {object.telemetrySource.calculationMethod && (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Method: <span style={{ color: 'var(--text-secondary)' }}>{object.telemetrySource.calculationMethod}</span>
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-hairline)', paddingTop: '4px' }}>
                    Data Timestamp: {new Date(cap.dataTimestamp || object.telemetrySource.timestamp).toUTCString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          padding: '12px 20px',
          paddingBottom: 'calc(12px + var(--sab, 0px))',
          borderTop: '1px solid var(--border-hairline)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          background: 'rgba(3, 5, 10, 0.95)',
          flexShrink: 0
        }}>
          {!isCelestial ? (
            <button
              onClick={() => setShow3DViewer(true)}
              className="btn btn-secondary"
              style={{ flex: '1 1 110px', minHeight: '38px', fontSize: '12px' }}
              title="Inspect 3D Spacecraft Architecture"
            >
              <Eye size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span>3D Model</span>
            </button>
          ) : null}

          {onFocusOnMap && (
            cap.canFocusOnMap ? (
              <button
                onClick={() => onFocusOnMap(object.id)}
                className="btn btn-primary"
                style={{ flex: '1 1 130px', minHeight: '38px', fontSize: '12px' }}
                title={`Focus ${object.name} on 3D Space Map`}
              >
                <Crosshair size={14} />
                <span>Focus on Map</span>
              </button>
            ) : (
              <ActionTooltip
                title={cap.statusLabel}
                description={cap.focusReason}
                state="UNSUPPORTED"
              >
                <button
                  disabled
                  aria-disabled="true"
                  className="btn btn-secondary"
                  style={{ flex: '1 1 130px', minHeight: '38px', fontSize: '12px', opacity: 0.75, cursor: 'not-allowed', border: '1px solid rgba(255, 255, 255, 0.14)', color: '#94a3b8' }}
                >
                  <Crosshair size={14} />
                  <span>Focus on Map</span>
                </button>
              </ActionTooltip>
            )
          )}

          {onOpenInAnalysis && (
            cap.canTrackVectors ? (
              <button
                onClick={() => onOpenInAnalysis(object.id)}
                className="btn btn-secondary"
                style={{ minHeight: '38px', fontSize: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={`Track vectors for ${object.name}`}
                aria-label={`Open ${object.name} in Vector Analysis`}
              >
                <Compass size={14} />
              </button>
            ) : (
              <ActionTooltip
                title={cap.statusLabel}
                description={cap.trackReason}
                state="UNSUPPORTED"
              >
                <button
                  disabled
                  aria-disabled="true"
                  className="btn btn-secondary"
                  style={{ minHeight: '38px', fontSize: '12px', padding: '8px 12px', opacity: 0.75, cursor: 'not-allowed', border: '1px solid rgba(255, 255, 255, 0.14)', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label={`Vector tracking unavailable: ${cap.trackReason}`}
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
