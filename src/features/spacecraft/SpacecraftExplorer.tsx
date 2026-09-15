import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Satellite, 
  Filter, 
  ArrowUpRight, 
  Orbit, 
  Activity, 
  Compass, 
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { SPACECRAFT_REGISTRY, resolveSpacecraftState } from '../../services/data/spacecraftCatalog';
import { SpacecraftObject } from '../../types/space';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDistanceKm, formatVelocityKmS } from '../../utils/formatters';
import { formatLightTime, kmToAu } from '../../services/calculations/physics';

interface SpacecraftExplorerProps {
  onSelectObject: (obj: SpacecraftObject) => void;
  onFocusOnMap: (objectId: string) => void;
  onAnalyzeObject: (objectId: string) => void;
}

type FilterCategory = 'ALL' | 'ISRO' | 'DEEP_SPACE' | 'LUNAR' | 'EARTH_ORBIT';

export const SpacecraftExplorer: React.FC<SpacecraftExplorerProps> = ({
  onSelectObject,
  onFocusOnMap,
  onAnalyzeObject
}) => {
  const [spacecraftList, setSpacecraftList] = useState<SpacecraftObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');

  useEffect(() => {
    async function resolveAll() {
      setLoading(true);
      try {
        const resolved = await Promise.all(SPACECRAFT_REGISTRY.map(def => resolveSpacecraftState(def)));
        setSpacecraftList(resolved);
      } catch (err) {
        console.error('Failed to resolve spacecraft states:', err);
      } finally {
        setLoading(false);
      }
    }

    resolveAll();
  }, []);

  // Filtering
  const filteredList = spacecraftList.filter(craft => {
    const matchesSearch = craft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      craft.mission.toLowerCase().includes(searchQuery.toLowerCase()) ||
      craft.agency.toLowerCase().includes(searchQuery.toLowerCase()) ||
      craft.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeCategory === 'ISRO') return craft.agency === 'ISRO';
    if (activeCategory === 'DEEP_SPACE') return craft.orbitType.includes('Lagrangian') || craft.orbitType.includes('Interstellar');
    if (activeCategory === 'LUNAR') return craft.orbitType.includes('Lunar');
    if (activeCategory === 'EARTH_ORBIT') return craft.orbitType.includes('Low Earth Orbit') || craft.orbitType.includes('Sun-Synchronous');

    return true;
  });

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ padding: '20px 0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            fontSize: '11px',
            fontFamily: 'var(--font-heading)',
            color: 'var(--accent-cyan)',
            fontWeight: 600,
            textTransform: 'uppercase'
          }}>
            <span>Orbital Fleet Directory</span>
          </div>
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
          Spacecraft & Satellite Explorer
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '800px', lineHeight: 1.5, marginTop: '4px' }}>
          Explore supported deep space probes, lunar exploration assets, and Earth-orbiting satellites with calculated ephemerides and authoritative CelesTrak / JPL data.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        {/* Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 14px',
          width: '100%',
          maxWidth: '360px'
        }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, agency, or mission..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '13px',
              width: '100%',
              fontFamily: 'var(--font-sans)'
            }}
          />
        </div>

        {/* Category Pills */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px'
        }}>
          {(['ALL', 'ISRO', 'DEEP_SPACE', 'LUNAR', 'EARTH_ORBIT'] as FilterCategory[]).map(cat => {
            const labelMap: Record<FilterCategory, string> = {
              ALL: 'All Objects',
              ISRO: 'ISRO Fleet',
              DEEP_SPACE: 'Deep Space & L1',
              LUNAR: 'Lunar Missions',
              EARTH_ORBIT: 'Earth Orbit'
            };
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: isActive ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
                  background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease'
                }}
              >
                {labelMap[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spacecraft Cards Grid */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <RefreshCw size={24} className="radar-sweep" style={{ color: 'var(--accent-cyan)', margin: '0 auto 16px' }} />
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Propagating satellite orbits and computing ephemerides...</div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '16px'
        }}>
          {filteredList.map((craft) => (
            <div
              key={craft.id}
              className="glass-card"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px'
              }}
            >
              <div>
                {/* Top: Name, Agency, Status */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {craft.name}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px',
                        fontWeight: 600,
                        color: 'var(--accent-cyan)'
                      }}>
                        {craft.agency}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {craft.mission}
                    </div>
                  </div>

                  <StatusBadge status={craft.telemetrySource.status} metadata={craft.telemetrySource} compact />
                </div>

                {/* Telemetry 2x2 grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  margin: '10px 0'
                }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Dist. from Earth
                    </span>
                    <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {craft.distanceFromEarthKm !== undefined ? formatDistanceKm(craft.distanceFromEarthKm, true) : 'Unavailable'}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Orbital Speed
                    </span>
                    <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {craft.velocityKmS !== undefined ? formatVelocityKmS(craft.velocityKmS) : 'Unavailable'}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Signal Delay ($c$)
                    </span>
                    <div className="mono" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                      {craft.lightTimeToEarthSec !== undefined ? formatLightTime(craft.lightTimeToEarthSec) : 'N/A'}
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Coordinate Frame
                    </span>
                    <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {craft.coordinateFrame}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {craft.description}
                </p>
              </div>

              {/* Card Footer Actions */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <button
                  onClick={() => onSelectObject(craft)}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '12px' }}
                >
                  <Activity size={13} />
                  <span>Inspect Telemetry</span>
                </button>

                <button
                  onClick={() => onFocusOnMap(craft.id)}
                  className="btn btn-primary"
                  style={{ padding: '8px 12px' }}
                  title="View on 3D Space Map"
                >
                  <Orbit size={14} />
                </button>

                <button
                  onClick={() => onAnalyzeObject(craft.id)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px' }}
                  title="Open in Analysis Workspace"
                >
                  <Compass size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
