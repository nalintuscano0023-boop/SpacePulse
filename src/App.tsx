import React, { useState } from 'react';
import { Navbar, TabType } from './components/common/Navbar';
import { MissionControl } from './features/mission-control/MissionControl';
import { SpacecraftExplorer } from './features/spacecraft/SpacecraftExplorer';
import { SpaceMap } from './features/space-map/SpaceMap';
import { ScientificAnalysis } from './features/analysis/ScientificAnalysis';
import { MissionsExplorer } from './features/missions/MissionsExplorer';
import { ObjectInspector } from './components/inspector/ObjectInspector';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SpacecraftObject } from './types/space';
import { SPACECRAFT_REGISTRY, resolveSpacecraftState } from './services/data/spacecraftCatalog';
import { Shield, ExternalLink, Radio } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('mission-control');
  const [selectedObject, setSelectedObject] = useState<SpacecraftObject | null>(null);
  const [focusedObjectId, setFocusedObjectId] = useState<string | undefined>(undefined);

  const handleSelectObject = (obj: SpacecraftObject) => {
    setSelectedObject(obj);
  };

  const handleFocusOnMap = async (objectId: string) => {
    setFocusedObjectId(objectId);
    setActiveTab('space-map');
    // If not already resolved as selectedObject, resolve it
    if (!selectedObject || selectedObject.id !== objectId) {
      const def = SPACECRAFT_REGISTRY.find(s => s.id === objectId);
      if (def) {
        const state = await resolveSpacecraftState(def);
        setSelectedObject(state);
      }
    }
  };

  const handleAnalyzeObject = (objectId: string) => {
    setActiveTab('analysis');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 5-Section Header Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, paddingBottom: '48px' }}>
        <ErrorBoundary fallbackTitle="Scientific Component Notice">
          {activeTab === 'mission-control' && (
            <MissionControl
              onSelectObject={handleSelectObject}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {activeTab === 'spacecraft' && (
            <SpacecraftExplorer
              onSelectObject={handleSelectObject}
              onFocusOnMap={handleFocusOnMap}
              onAnalyzeObject={handleAnalyzeObject}
            />
          )}

          {activeTab === 'space-map' && (
            <SpaceMap
              onSelectObject={handleSelectObject}
              selectedObjectId={focusedObjectId}
            />
          )}

          {activeTab === 'analysis' && (
            <ScientificAnalysis />
          )}

          {activeTab === 'missions' && (
            <MissionsExplorer />
          )}
        </ErrorBoundary>
      </main>

      {/* Slide-out Object Inspector */}
      {selectedObject && (
        <ObjectInspector
          object={selectedObject}
          onClose={() => setSelectedObject(null)}
          onFocusOnMap={activeTab !== 'space-map' ? handleFocusOnMap : undefined}
          onOpenInAnalysis={activeTab !== 'analysis' ? handleAnalyzeObject : undefined}
        />
      )}

      {/* Aerospace Scientific Footer */}
      <footer style={{
        background: 'rgba(5, 7, 13, 0.95)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '24px',
        color: 'var(--text-muted)',
        fontSize: '12px'
      }}>
        <div style={{
          maxWidth: '1600px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Radio size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              SpacePulse Space Intelligence & Visualization
            </span>
            <span>•</span>
            <span style={{ color: 'var(--status-live)', fontWeight: 500 }}>
              Authentic Public Space Data Only Policy
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <span>Authoritative Sources:</span>
            <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              NOAA SWPC
            </a>
            <a href="https://celestrak.org/" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              CelesTrak
            </a>
            <a href="https://ssd.jpl.nasa.gov/" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              NASA JPL
            </a>
            <a href="https://www.isro.gov.in/" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              ISRO
            </a>
            <a href="https://pradan.issdc.gov.in/" target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              ISSDC PRADAN
            </a>
          </div>
        </div>

        <div style={{
          maxWidth: '1600px',
          margin: '12px auto 0',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px'
        }}>
          <span>100% Frontend Architecture • Zero Synthetic Or Invented Telemetry</span>
          <span>Standard Reference Frame: Ecliptic of J2000.0 / TEME Geocentric</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
