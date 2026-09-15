import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Check, 
  Sigma, 
  Divide,
  Activity,
  ArrowRightLeft
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

interface AnalyzableObject {
  id: string;
  name: string;
  category: string;
  positionKm: { x: number; y: number; z: number };
  velocityKmS: { x: number; y: number; z: number };
  speedKmS: number;
}

export const ScientificAnalysis: React.FC = () => {
  const [availableObjects, setAvailableObjects] = useState<AnalyzableObject[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(['earth', 'aditya-l1', 'mars', 'iss']);
  const [loading, setLoading] = useState(true);

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
        speedKmS: 0
      });

      // 2. Planets
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
            speedKmS: spd
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
          category: 'Solar Observatory (L1)',
          positionKm: l1.positionKm,
          velocityKmS: { x: 0, y: 0, z: 0 },
          speedKmS: l1.velocityKmS
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
                category: `Earth Orbit (${sat.orbitClass})`,
                positionKm: {
                  x: earthObj.positionKm.x + eci.x,
                  y: earthObj.positionKm.y + eci.y,
                  z: earthObj.positionKm.z + eci.z
                },
                velocityKmS: sat.state.velocityVectorKmS,
                speedKmS: sat.state.velocityKmS
              });
            }
          });
        }
      } catch (e) {
        console.error(e);
      }

      setAvailableObjects(list);
      setLoading(false);
    }

    computeAllPositions();
  }, []);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) {
        setSelectedIds(selectedIds.filter(x => x !== id));
      }
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedObjects = availableObjects.filter(o => selectedIds.includes(o.id));

  // Compute pairwise comparisons
  interface ComparisonPair {
    objA: AnalyzableObject;
    objB: AnalyzableObject;
    distKm: number;
    distAu: number;
    lightTimeSec: number;
    relVelocityKmS: number;
  }

  const pairs: ComparisonPair[] = [];
  for (let i = 0; i < selectedObjects.length; i++) {
    for (let j = i + 1; j < selectedObjects.length; j++) {
      const a = selectedObjects[i];
      const b = selectedObjects[j];
      const distKm = calculateDistanceKm(a.positionKm, b.positionKm);
      const distAu = distKm / KM_PER_AU;
      const lightTimeSec = calculateLightTimeSeconds(distKm);
      const relVelocityKmS = calculateRelativeVelocity(a.velocityKmS, b.velocityKmS);

      pairs.push({
        objA: a,
        objB: b,
        distKm,
        distAu,
        lightTimeSec,
        relVelocityKmS
      });
    }
  }

  const sortedPairs = [...pairs].sort((a, b) => a.distKm - b.distKm);
  const closestPair = sortedPairs.length > 0 ? sortedPairs[0] : null;
  const farthestPair = sortedPairs.length > 0 ? sortedPairs[sortedPairs.length - 1] : null;

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ padding: '16px 0 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            borderRadius: 'var(--radius-xs)',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: '#818cf8',
            fontWeight: 600,
            textTransform: 'uppercase'
          }}>
            <Sigma size={12} />
            <span>SCIENTIFIC WORKSTATION // VECTOR ENGINE</span>
          </div>
          <StatusBadge status="CALCULATED" />
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
          Orbital Mechanics & Vector Workspace
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '850px', lineHeight: 1.5, marginTop: '4px' }}>
          Calculate exact relative distance matrices, radio propagation latencies, and velocity differentials between celestial bodies and active spacecraft using real astronomical coordinates and physical laws.
        </p>
      </div>

      {/* Multi-Object Selector Drawer */}
      <div className="glass-panel" style={{ padding: '18px 20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Active Target Selection</h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Select 2 or more bodies to compute pairwise vector metrics
            </div>
          </div>

          <span className="mono" style={{
            fontSize: '11px',
            padding: '3px 8px',
            background: 'rgba(56, 189, 248, 0.1)',
            borderRadius: 'var(--radius-xs)',
            color: 'var(--accent-cyan)',
            fontWeight: 600
          }}>
            {selectedIds.length} Targets Active
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {availableObjects.map(obj => {
            const isSelected = selectedIds.includes(obj.id);
            return (
              <button
                key={obj.id}
                onClick={() => toggleSelect(obj.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--border-focus)' : '1px solid var(--border-hairline)',
                  background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'var(--surface-inset)',
                  color: isSelected ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  width: '13px',
                  height: '13px',
                  borderRadius: '2px',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isSelected ? 'var(--accent-cyan)' : 'transparent'
                }}>
                  {isSelected && <Check size={9} style={{ color: '#000' }} />}
                </div>
                <span>{obj.name}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({obj.category})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Highlights: Closest & Farthest */}
      {closestPair && farthestPair && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '14px'
        }}>
          <div className="glass-card" style={{ padding: '16px 18px', borderLeft: '3px solid var(--status-live)' }}>
            <div style={{ fontSize: '10px', color: 'var(--status-live)', fontWeight: 600, textTransform: 'uppercase' }}>
              Closest Measured Pair
            </div>
            <div style={{ fontSize: '17px', fontWeight: 700, margin: '4px 0 2px', color: '#ffffff' }}>
              {closestPair.objA.name} ↔ {closestPair.objB.name}
            </div>
            <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              {formatDistanceKm(closestPair.distKm)} ({closestPair.distAu.toFixed(4)} AU)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Signal Delay: <span className="mono" style={{ color: 'var(--text-primary)' }}>{formatLightTime(closestPair.lightTimeSec)}</span>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '16px 18px', borderLeft: '3px solid var(--status-error)' }}>
            <div style={{ fontSize: '10px', color: 'var(--status-error)', fontWeight: 600, textTransform: 'uppercase' }}>
              Farthest Measured Pair
            </div>
            <div style={{ fontSize: '17px', fontWeight: 700, margin: '4px 0 2px', color: '#ffffff' }}>
              {farthestPair.objA.name} ↔ {farthestPair.objB.name}
            </div>
            <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--status-error)' }}>
              {formatDistanceKm(farthestPair.distKm, true)} ({farthestPair.distAu.toFixed(2)} AU)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Signal Delay: <span className="mono" style={{ color: 'var(--text-primary)' }}>{formatLightTime(farthestPair.lightTimeSec)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Pairwise Comparison Matrix Table */}
      <div className="glass-panel" style={{ padding: '18px 20px', overflowX: 'auto' }}>
        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Pairwise Separation & Signal Latency Matrix</h3>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Straight-line geometric Euclidean vectors calculated live from J2000 state vectors
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-hairline)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
              <th style={{ padding: '8px 10px' }}>Body A</th>
              <th style={{ padding: '8px 10px' }}>Body B</th>
              <th style={{ padding: '8px 10px' }}>Separation (km)</th>
              <th style={{ padding: '8px 10px' }}>Distance (AU)</th>
              <th style={{ padding: '8px 10px' }}>Signal Delay ($t = d/c$)</th>
              <th style={{ padding: '8px 10px' }}>Relative Velocity</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                  fontSize: '13px'
                }}
              >
                <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {pair.objA.name}
                </td>
                <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {pair.objB.name}
                </td>
                <td className="mono" style={{ padding: '10px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatDistanceKm(pair.distKm, true)}
                </td>
                <td className="mono" style={{ padding: '10px', color: 'var(--accent-cyan)' }}>
                  {pair.distAu.toFixed(4)} AU
                </td>
                <td className="mono" style={{ padding: '10px', fontWeight: 600, color: 'var(--status-live)' }}>
                  {formatLightTime(pair.lightTimeSec)}
                </td>
                <td className="mono" style={{ padding: '10px', color: 'var(--text-secondary)' }}>
                  {pair.relVelocityKmS > 0 ? formatVelocityKmS(pair.relVelocityKmS) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Physics & Methodology Reference */}
      <div className="glass-panel" style={{ padding: '18px 20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--accent-cyan)',
          fontWeight: 600,
          fontSize: '13px',
          marginBottom: '12px'
        }}>
          <Divide size={15} />
          <span>Physical Methodology & Formulas</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '14px'
        }}>
          <div style={{ padding: '12px', background: 'var(--surface-inset)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-xs)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              1. 3D Euclidean Separation
            </div>
            <div className="mono" style={{ fontSize: '12px', padding: '6px 8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '3px', margin: '6px 0', color: 'var(--accent-cyan)' }}>
              d = √[(x₂ - x₁)² + (y₂ - y₁)² + (z₂ - z₁)²]
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Computed in the Heliocentric Ecliptic J2000 reference frame.
            </p>
          </div>

          <div style={{ padding: '12px', background: 'var(--surface-inset)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-xs)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              2. Radio / Signal Travel Delay
            </div>
            <div className="mono" style={{ fontSize: '12px', padding: '6px 8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '3px', margin: '6px 0', color: 'var(--accent-cyan)' }}>
              t = d / c
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              One-way Newtonian signal delay using IAU constant c = 299,792.458 km/s.
            </p>
          </div>

          <div style={{ padding: '12px', background: 'var(--surface-inset)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-xs)' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              3. Relative Velocity Differential
            </div>
            <div className="mono" style={{ fontSize: '12px', padding: '6px 8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '3px', margin: '6px 0', color: 'var(--accent-cyan)' }}>
              Δv = ‖v₂ - v₁‖
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Magnitude of vector difference between velocity states in heliocentric coordinates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
