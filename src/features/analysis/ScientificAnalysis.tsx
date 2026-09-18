import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Activity, 
  Orbit, 
  ArrowRightLeft, 
  Clock, 
  Radio, 
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { calculatePlanetEphemeris } from '../../services/calculations/kepler';
import { calculateAdityaL1Ephemeris } from '../../services/calculations/lagrange';
import { CelestrakService } from '../../services/api/celestrakService';
import { 
  KM_PER_AU, 
  calculateDistanceKm, 
  calculateLightTimeSeconds, 
  formatLightTime,
  calculateRelativeVelocity
} from '../../services/calculations/physics';
import { formatDistanceKm, formatVelocityKmS } from '../../utils/formatters';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SPACECRAFT_REGISTRY } from '../../services/data/spacecraftCatalog';

interface AnalyzableObject {
  id: string;
  name: string;
  category: string;
  positionKm: { x: number; y: number; z: number };
  velocityKmS: { x: number; y: number; z: number };
  speedKmS: number;
  orbitType?: string;
  altitudeKm?: number;
}

export type AnalysisType = 'distance' | 'motion' | 'orbit' | 'comparison';

interface ScientificAnalysisProps {
  initialObjectId?: string;
  initialMode?: AnalysisType;
}

export const ScientificAnalysis: React.FC<ScientificAnalysisProps> = ({ initialObjectId, initialMode }) => {
  const [availableObjects, setAvailableObjects] = useState<AnalyzableObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string>(initialObjectId || 'aditya-l1');
  const [analysisType, setAnalysisType] = useState<AnalysisType>(initialMode || 'distance');
  const [comparisonObjectId, setComparisonObjectId] = useState<string>('earth');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialObjectId) {
      setSelectedObjectId(initialObjectId);
    }
  }, [initialObjectId]);

  useEffect(() => {
    if (initialMode) {
      setAnalysisType(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    async function computeAllPositions() {
      setLoading(true);
      const now = new Date();
      const list: AnalyzableObject[] = [];

      // 1. Sun
      list.push({
        id: 'sun',
        name: 'Sun (Sol)',
        category: 'Star',
        positionKm: { x: 0, y: 0, z: 0 },
        velocityKmS: { x: 0, y: 0, z: 0 },
        speedKmS: 0,
        orbitType: 'Solar System Barycentric Origin'
      });

      // 2. Major Planets
      ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].forEach(p => {
        try {
          const ephem = calculatePlanetEphemeris(p, now);
          const spd = Math.sqrt(
            ephem.velocityKmS.x * ephem.velocityKmS.x +
            ephem.velocityKmS.y * ephem.velocityKmS.y +
            ephem.velocityKmS.z * ephem.velocityKmS.z
          );
          list.push({
            id: p,
            name: p.charAt(0).toUpperCase() + p.slice(1),
            category: 'Major Planet',
            positionKm: ephem.positionKm,
            velocityKmS: ephem.velocityKmS,
            speedKmS: spd,
            orbitType: 'Heliocentric Keplerian Orbit'
          });
        } catch (e) {
          console.error(e);
        }
      });

      // 3. Aditya-L1 at L1
      try {
        const l1 = calculateAdityaL1Ephemeris(now);
        list.push({
          id: 'aditya-l1',
          name: 'Aditya-L1 (ISRO)',
          category: 'Solar Observatory',
          positionKm: l1.positionKm,
          velocityKmS: { x: 0, y: 0, z: 0 },
          speedKmS: l1.velocityKmS,
          orbitType: 'Sun-Earth L1 Halo Orbit'
        });
      } catch (e) {
        console.error(e);
      }

      // 4. Real Earth-Orbiting Satellites from CelesTrak SGP4
      try {
        const satellites = await CelestrakService.getSupportedEarthSatellites(now);
        const earthObj = list.find(o => o.id === 'earth');
        if (earthObj) {
          satellites.forEach(sat => {
            if (sat.state) {
              const eci = sat.state.positionEciKm;
              list.push({
                id: sat.noradId === 25544 ? 'iss' : `norad-${sat.noradId}`,
                name: `${sat.name} [NORAD ${sat.noradId}]`,
                category: `Earth Satellite (${sat.orbitClass})`,
                positionKm: {
                  x: earthObj.positionKm.x + eci.x,
                  y: earthObj.positionKm.y + eci.y,
                  z: earthObj.positionKm.z + eci.z
                },
                velocityKmS: sat.state.velocityVectorKmS,
                speedKmS: sat.state.velocityKmS,
                orbitType: sat.orbitClass,
                altitudeKm: sat.state.altitudeKm
              });
            }
          });
        }
      } catch (e) {
        console.error(e);
      }

      // 5. Voyager 1 & 2 (Interstellar Baseline)
      list.push({
        id: 'voyager-1',
        name: 'Voyager 1 (NASA)',
        category: 'Interstellar Probe',
        positionKm: { x: 0, y: 0, z: 0 },
        velocityKmS: { x: 0, y: 0, z: 0 },
        speedKmS: 16.9,
        orbitType: 'Hyperbolic Interstellar Escape'
      });

      setAvailableObjects(list);
      setLoading(false);
    }

    computeAllPositions();
  }, []);

  // Sync initial selection
  useEffect(() => {
    if (initialObjectId && availableObjects.some(o => o.id === initialObjectId)) {
      setSelectedObjectId(initialObjectId);
    }
  }, [initialObjectId, availableObjects]);

  const primaryObj = availableObjects.find(o => o.id === selectedObjectId) || availableObjects[0];
  const compareObj = availableObjects.find(o => o.id === comparisonObjectId) || availableObjects.find(o => o.id === 'earth') || availableObjects[1];

  // Distances to celestial benchmarks
  const earthObj = availableObjects.find(o => o.id === 'earth');
  const sunObj = availableObjects.find(o => o.id === 'sun');

  const distToEarthKm = (primaryObj && earthObj && primaryObj.id !== 'voyager-1')
    ? (primaryObj.id === 'earth' ? 0 : calculateDistanceKm(primaryObj.positionKm, earthObj.positionKm))
    : (primaryObj?.id === 'voyager-1' ? 24500000000 : undefined);

  const distToSunKm = (primaryObj && sunObj && primaryObj.id !== 'voyager-1')
    ? (primaryObj.id === 'sun' ? 0 : calculateDistanceKm(primaryObj.positionKm, sunObj.positionKm))
    : (primaryObj?.id === 'voyager-1' ? 24650000000 : undefined);

  const lightDelayToEarthSec = distToEarthKm !== undefined ? calculateLightTimeSeconds(distToEarthKm) : undefined;

  // Comparison metrics
  let compDistanceKm: number | undefined;
  let compRelSpeedKmS: number | undefined;
  let compLightDelaySec: number | undefined;

  if (primaryObj && compareObj && primaryObj.id !== 'voyager-1' && compareObj.id !== 'voyager-1') {
    compDistanceKm = calculateDistanceKm(primaryObj.positionKm, compareObj.positionKm);
    compRelSpeedKmS = calculateRelativeVelocity(primaryObj.velocityKmS, compareObj.velocityKmS);
    compLightDelaySec = calculateLightTimeSeconds(compDistanceKm);
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header */}
      <div style={{ padding: '12px 0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            borderRadius: 'var(--radius-xs)',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-cyan)',
            fontWeight: 600,
            textTransform: 'uppercase'
          }}>
            <Compass size={12} />
            <span>SCIENTIFIC COMPUTATION WORKSPACE</span>
          </div>
          <StatusBadge status="CALCULATED" compact />
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
          Scientific Analysis Workspace
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '800px', lineHeight: 1.5, marginTop: '4px' }}>
          Dedicated multi-body orbital mechanics engine. Select any object, choose an analysis type, and compute real-world vectors, speed-of-light latencies, and orbital dynamics.
        </p>
      </div>

      {/* 3-Step Guided Workflow Bar */}
      <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          alignItems: 'flex-start'
        }}>
          {/* STEP 1: SELECT OBJECT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Step 1: Target Object
            </div>
            <select
              value={selectedObjectId}
              onChange={(e) => setSelectedObjectId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--surface-inset)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <optgroup label="Solar & Planetary Bodies">
                {availableObjects.filter(o => o.category === 'Star' || o.category === 'Major Planet').map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </optgroup>
              <optgroup label="Spacecraft & Satellites">
                {availableObjects.filter(o => o.category !== 'Star' && o.category !== 'Major Planet').map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* STEP 2: CHOOSE ANALYSIS MODE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Step 2: Choose Analysis Mode
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'distance', label: 'Distance & Latency', icon: <Compass size={13} /> },
                { id: 'motion', label: 'Kinetic & Velocity', icon: <Activity size={13} /> },
                { id: 'orbit', label: 'Orbital Geometry', icon: <Orbit size={13} /> },
                { id: 'comparison', label: 'Vector Comparison', icon: <ArrowRightLeft size={13} /> }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setAnalysisType(mode.id as AnalysisType)}
                  className={`btn ${analysisType === mode.id ? 'btn-active' : 'btn-secondary'}`}
                  style={{ fontSize: '12px', padding: '6px 10px', gap: '6px' }}
                >
                  {mode.icon}
                  <span>{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 2B (If Comparison): SELECT SECONDARY OBJECT */}
          {analysisType === 'comparison' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
              <div style={{ fontSize: '11px', color: 'var(--solar-amber)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Reference Benchmark Object
              </div>
              <select
                value={comparisonObjectId}
                onChange={(e) => setComparisonObjectId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--surface-inset)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-xs)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {availableObjects.filter(o => o.id !== selectedObjectId).map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* STEP 3: FOCUSED RESULTS VIEW */}
      {primaryObj && (
        <div className="glass-panel tech-corner" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Analysis Card Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-hairline)',
            paddingBottom: '14px',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Profile</span>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>{primaryObj.name}</h2>
                <span className="agency-badge">{primaryObj.category}</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                {primaryObj.orbitType || 'Propagated Orbit'}
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              MODE: {analysisType.toUpperCase()}
            </div>
          </div>

          {/* MODE A: DISTANCE & LATENCY */}
          {analysisType === 'distance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px'
              }}>
                <div style={{ padding: '14px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Geocentric Distance</div>
                  <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {primaryObj.id === 'earth' ? 'REFERENCE ORIGIN' : distToEarthKm !== undefined ? formatDistanceKm(distToEarthKm, true) : 'DATA UNAVAILABLE'}
                  </div>
                  {distToEarthKm !== undefined && distToEarthKm > 1000000 && (
                    <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                      {(distToEarthKm / KM_PER_AU).toFixed(4)} AU
                    </div>
                  )}
                </div>

                <div style={{ padding: '14px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Heliocentric Distance</div>
                  <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {primaryObj.id === 'sun' ? 'SOLAR CENTER' : distToSunKm !== undefined ? formatDistanceKm(distToSunKm, true) : 'DATA UNAVAILABLE'}
                  </div>
                  {distToSunKm !== undefined && distToSunKm > 1000000 && (
                    <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                      {(distToSunKm / KM_PER_AU).toFixed(4)} AU
                    </div>
                  )}
                </div>

                <div style={{ padding: '14px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Signal Latency ($t = d/c$)</div>
                  <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '4px' }}>
                    {primaryObj.id === 'earth' ? 'Instantaneous (0s)' : lightDelayToEarthSec !== undefined ? formatLightTime(lightDelayToEarthSec) : 'N/A'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Vacuum Speed of Light (299,792 km/s)
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: 'rgba(56, 189, 248, 0.04)', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(56, 189, 248, 0.15)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <strong>Scientific Context:</strong> Calculated using Standish Keplerian orbital secular elements and instantaneous light propagation formulas. Latency indicates the exact one-way communication lag for telemetry packets sent from ground tracking stations.
              </div>
            </div>
          )}

          {/* MODE B: KINETIC & MOTION */}
          {analysisType === 'motion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px'
              }}>
                <div style={{ padding: '14px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Orbital Speed</div>
                  <div className="mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {primaryObj.speedKmS > 0 ? formatVelocityKmS(primaryObj.speedKmS) : 'DATA UNAVAILABLE'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Magnitude |v| in orbital frame
                  </div>
                </div>

                <div style={{ padding: '14px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>3D Velocity Vector ($v_x, v_y, v_z$)</div>
                  <div className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.6 }}>
                    <div>Vx: <strong style={{ color: 'var(--accent-cyan)' }}>{primaryObj.velocityKmS.x.toFixed(3)} km/s</strong></div>
                    <div>Vy: <strong style={{ color: 'var(--accent-cyan)' }}>{primaryObj.velocityKmS.y.toFixed(3)} km/s</strong></div>
                    <div>Vz: <strong style={{ color: 'var(--accent-cyan)' }}>{primaryObj.velocityKmS.z.toFixed(3)} km/s</strong></div>
                  </div>
                </div>

                <div style={{ padding: '14px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Specific Kinetic Energy</div>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--status-live)', marginTop: '4px' }}>
                    {primaryObj.speedKmS > 0 ? `${(0.5 * Math.pow(primaryObj.speedKmS * 1000, 2) / 1e6).toFixed(2)} MJ/kg` : 'N/A'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    $\epsilon = \frac{1}{2}v^2$ orbital energy density
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: 'rgba(56, 189, 248, 0.04)', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(56, 189, 248, 0.15)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <strong>Dynamic Analysis:</strong> State vector propagated along instantaneous tangential velocity components in the standard J2000 celestial coordinate frame.
              </div>
            </div>
          )}

          {/* MODE C: ORBITAL GEOMETRY */}
          {analysisType === 'orbit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px'
              }}>
                <div style={{ padding: '14px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Orbital Regime</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {primaryObj.orbitType || 'Interplanetary / Heliocentric'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Gravitational Dominance Sphere
                  </div>
                </div>

                {primaryObj.altitudeKm !== undefined && (
                  <div style={{ padding: '14px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Geodetic Altitude</div>
                    <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '4px' }}>
                      {Math.round(primaryObj.altitudeKm).toLocaleString()} km
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Above WGS84 Earth Reference Ellipsoid
                    </div>
                  </div>
                )}

                <div style={{ padding: '14px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Coordinate Frame</div>
                  <div className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {primaryObj.category.includes('Earth') ? 'Geocentric ECI (TEME)' : 'Heliocentric Ecliptic J2000'}
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: 'rgba(56, 189, 248, 0.04)', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(56, 189, 248, 0.15)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <strong>Orbital Mechanics:</strong> Elements derived via SGP4 high-precision analytical propagation for satellites or Keplerian osculating elements for planetary bodies.
              </div>
            </div>
          )}

          {/* MODE D: VECTOR COMPARISON */}
          {analysisType === 'comparison' && compareObj && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px'
              }}>
                <div style={{ padding: '14px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Relative Vector Distance ($\Delta r$)</div>
                  <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '4px' }}>
                    {compDistanceKm !== undefined ? formatDistanceKm(compDistanceKm, true) : 'DATA UNAVAILABLE'}
                  </div>
                  {compDistanceKm !== undefined && compDistanceKm > 1000000 && (
                    <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {(compDistanceKm / KM_PER_AU).toFixed(4)} AU
                    </div>
                  )}
                </div>

                <div style={{ padding: '14px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Relative Velocity ($\Delta v$)</div>
                  <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {compRelSpeedKmS !== undefined ? `${compRelSpeedKmS.toFixed(2)} km/s` : 'DATA UNAVAILABLE'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    |v_A - v_B| Vector Magnitude
                  </div>
                </div>

                <div style={{ padding: '14px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inter-Object Signal Delay</div>
                  <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--status-live)', marginTop: '4px' }}>
                    {compLightDelaySec !== undefined ? formatLightTime(compLightDelaySec) : 'N/A'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Direct RF Line-of-Sight Time
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: 'rgba(56, 189, 248, 0.04)', borderRadius: 'var(--radius-xs)', border: '1px solid rgba(56, 189, 248, 0.15)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <strong>Pairwise Relativity:</strong> Comparing <strong>{primaryObj.name}</strong> against <strong>{compareObj.name}</strong>. Euclidean 3D displacement resolved instantaneously in J2000 inertial frame.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
