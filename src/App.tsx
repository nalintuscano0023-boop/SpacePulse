import React, { useState, useEffect } from 'react';
import { Navbar, type TabType } from './components/common/Navbar';
import { SpaceEnvironment } from './components/environment/SpaceEnvironment';
import { OpeningExperience } from './components/common/OpeningExperience';
import { MissionControl } from './features/mission-control/MissionControl';
import { SpacecraftExplorer } from './features/spacecraft/SpacecraftExplorer';
import { SpaceMap } from './features/space-map/SpaceMap';
import { ScientificAnalysis } from './features/analysis/ScientificAnalysis';
import { MissionsExplorer } from './features/missions/MissionsExplorer';
import { ObjectInspector } from './components/inspector/ObjectInspector';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import type { SpacecraftObject } from './types/space';
import { SPACECRAFT_REGISTRY, resolveSpacecraftState } from './services/data/spacecraftCatalog';
import { Radio } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('mission-control');
  const [selectedObject, setSelectedObject] = useState<SpacecraftObject | null>(null);
  const [focusedObjectId, setFocusedObjectId] = useState<string | undefined>(undefined);
  
  // Opening Experience State: check sessionStorage so it plays once on initial session entry
  const [showOpening, setShowOpening] = useState(() => {
    return !sessionStorage.getItem('spacepulse_intro_shown');
  });

  const handleCompleteOpening = () => {
    sessionStorage.setItem('spacepulse_intro_shown', 'true');
    setShowOpening(false);
  };

  const handleSelectObject = (obj: SpacecraftObject) => {
    setSelectedObject(obj);
  };

  const handleFocusOnMap = async (objectId: string) => {
    setFocusedObjectId(objectId);
    setActiveTab('space-map');
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 1. Deep Space WebGL Environment (Stars & Milky Way) */}
      <SpaceEnvironment />

      {/* 2. Opening Experience Transition */}
      {showOpening && (
        <OpeningExperience onComplete={handleCompleteOpening} />
      )}

      {/* 3. Floating Aerospace Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* 4. Main Scientific Operations Console */}
      <main style={{ flex: 1, position: 'relative', zIndex: 10, paddingBottom: '32px' }}>
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

      {/* 5. Floating Object Inspector */}
      {selectedObject && (
        <ObjectInspector
          object={selectedObject}
          onClose={() => setSelectedObject(null)}
          onFocusOnMap={activeTab !== 'space-map' ? handleFocusOnMap : undefined}
          onOpenInAnalysis={activeTab !== 'analysis' ? handleAnalyzeObject : undefined}
        />
      )}

      {/* 6. Precision Aerospace Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        background: 'rgba(3, 5, 10, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border-hairline)',
        padding: '20px 24px',
        color: 'var(--text-muted)',
        fontSize: '11px'
      }}>
        <div style={{
          maxWidth: '1540px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              SpacePulse Space Intelligence Platform
            </span>
            <span>•</span>
            <span style={{ color: 'var(--status-live)' }}>
              100% Authentic Data Policy
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
            <span>Authoritative Telemetry:</span>
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
          maxWidth: '1540px',
          margin: '10px auto 0',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px'
        }}>
          <span>Standard Celestial Reference Frame: Heliocentric Ecliptic J2000.0 / TEME Geocentric</span>
          <span>Zero Synthetic Or Mock Numbers</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
