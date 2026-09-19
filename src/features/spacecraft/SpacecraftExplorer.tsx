import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw 
} from 'lucide-react';
import { SPACECRAFT_REGISTRY, resolveSpacecraftState } from '../../services/data/spacecraftCatalog';
import type { SpacecraftObject, InspectableObject } from '../../types/space';
import { SpacecraftCard } from '../../components/spacecraft';
import { Spacecraft3DViewer } from '../../components/inspector/Spacecraft3DViewer';
import { ObjectInspector } from '../../components/inspector/ObjectInspector';

interface SpacecraftExplorerProps {
  onSelectObject: (obj: SpacecraftObject) => void;
  onFocusOnMap: (objectId: string) => void;
  onAnalyzeObject: (objectId: string) => void;
  selectedObject?: InspectableObject | SpacecraftObject | null;
  isInspectorOpen?: boolean;
  onCloseInspector?: () => void;
}

type FilterCategory = 'ALL' | 'ISRO' | 'DEEP_SPACE' | 'LUNAR' | 'EARTH_ORBIT';

export const SpacecraftExplorer: React.FC<SpacecraftExplorerProps> = ({
  onSelectObject,
  onFocusOnMap,
  onAnalyzeObject,
  selectedObject,
  isInspectorOpen = false,
  onCloseInspector = () => {}
}) => {
  const [spacecraftList, setSpacecraftList] = useState<SpacecraftObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const [viewing3DCraft, setViewing3DCraft] = useState<{ id: string; name: string } | null>(null);

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

  const hasActiveInspector = Boolean(isInspectorOpen && selectedObject);

  return (
    <div className={`container spacecraft-explorer-layout ${hasActiveInspector ? 'has-inspector' : ''}`}>
      <div className="spacecraft-catalog-pane">
        {/* Header */}
        <div style={{ padding: '16px 0 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
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
              <span>ASTRONOMICAL CATALOG // VERIFIED FLEET</span>
            </div>
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Spacecraft & Orbital Fleet Catalog
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '800px', lineHeight: 1.5, marginTop: '4px' }}>
            Authoritative directory of active planetary orbiters, solar observatories, deep-space probes, and Earth-orbiting satellites with calculated ephemerides and real-time CelesTrak SGP4 tracking.
          </p>

          {/* Quick Interaction Guide for First-Time Judges */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '10px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            background: 'rgba(56, 189, 248, 0.05)',
            border: '1px solid rgba(56, 189, 248, 0.15)',
            padding: '6px 12px',
            borderRadius: 'var(--radius-xs)'
          }}>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>HOW TO EXPLORE:</span>
            <span>Click <strong>Inspect</strong> for full telemetry dossier</span>
            <span>•</span>
            <span>Click <strong>3D eye icon</strong> for structural model</span>
            <span>•</span>
            <span>Click <strong>Orbit icon</strong> to focus on 3D Space Map</span>
            <span>•</span>
            <span>Click <strong>Compass icon</strong> to compute vectors in Analysis</span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
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
            background: 'var(--surface-inset)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-xs)',
            padding: '8px 12px',
            width: '100%',
            maxWidth: '360px'
          }}>
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search catalog by name, agency, or payload..."
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
            gap: '6px',
            maxWidth: '100%'
          }}>
            {(['ALL', 'ISRO', 'DEEP_SPACE', 'LUNAR', 'EARTH_ORBIT'] as FilterCategory[]).map(cat => {
              const labelMap: Record<FilterCategory, string> = {
                ALL: 'All Objects',
                ISRO: 'ISRO Fleet',
                DEEP_SPACE: 'Deep Space & L1',
                LUNAR: 'Lunar Missions',
                EARTH_ORBIT: 'Earth Orbit (LEO/SSO)'
              };
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: isActive ? '1px solid var(--border-focus)' : '1px solid var(--border-hairline)',
                    background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'var(--surface-inset)',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                    touchAction: 'manipulation',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {labelMap[cat]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Catalog Cards Grid */}
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <RefreshCw size={24} className="radar-sweep" style={{ color: 'var(--accent-cyan)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Propagating real-time orbital elements and resolving J2000 state vectors...</div>
          </div>
        ) : (
          <div className="spacecraft-cards-grid">
            {filteredList.map((craft) => (
              <SpacecraftCard
                key={craft.id}
                craft={craft}
                onSelect={onSelectObject}
                onView3D={(c) => setViewing3DCraft({ id: c.id, name: c.name })}
                onFocus={onFocusOnMap}
                onTrack={onAnalyzeObject}
              />
            ))}
          </div>
        )}
      </div>

      {/* Embedded Inspector Pane (Docked on desktop, bottom sheet on mobile) */}
      {hasActiveInspector && selectedObject && (
        <aside className="spacecraft-inspector-pane">
          <ObjectInspector
            object={selectedObject}
            onClose={onCloseInspector}
            onFocusOnMap={onFocusOnMap}
            onOpenInAnalysis={onAnalyzeObject}
            embedded
          />
        </aside>
      )}

      {/* 3D Spacecraft Architecture Modal */}
      {viewing3DCraft && (
        <Spacecraft3DViewer
          craftId={viewing3DCraft.id}
          craftName={viewing3DCraft.name}
          onClose={() => setViewing3DCraft(null)}
        />
      )}
    </div>
  );
};

