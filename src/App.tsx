import React, { useState } from 'react';
import { Navbar, type TabType } from './components/common/Navbar';
import { SpaceEnvironment } from './components/environment/SpaceEnvironment';
import { MissionControl } from './features/mission-control/MissionControl';
import { SpacecraftExplorer } from './features/spacecraft/SpacecraftExplorer';
import { SpaceMap } from './features/space-map/SpaceMap';
import { ScientificAnalysis, type AnalysisType } from './features/analysis/ScientificAnalysis';
import { MissionsExplorer } from './features/missions/MissionsExplorer';
import { ObjectInspector } from './components/inspector/ObjectInspector';
import { ExploreTheSpace } from './features/explore-space/ExploreTheSpace';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import type { InspectableObject, SpacecraftObject } from './types/space';
import { resolveInspectableObject, normalizeSpacecraftObject } from './services/data/objectResolver';
import { Radio } from 'lucide-react';

function AppContent({
  activeTab,
  setActiveTab,
  selectedObject,
  setSelectedObject,
  isInspectorOpen,
  setIsInspectorOpen,
  focusedObjectId,
  setFocusedObjectId,
  isExploringSpace,
  setIsExploringSpace,
  analyzedObjectId,
  setAnalyzedObjectId,
  analysisMode,
  setAnalysisMode
}: {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  selectedObject: InspectableObject | null;
  setSelectedObject: (obj: InspectableObject | null) => void;
  isInspectorOpen: boolean;
  setIsInspectorOpen: (open: boolean) => void;
  focusedObjectId: string | undefined;
  setFocusedObjectId: (id: string | undefined) => void;
  isExploringSpace: boolean;
  setIsExploringSpace: (exploring: boolean) => void;
  analyzedObjectId: string | undefined;
  setAnalyzedObjectId: (id: string | undefined) => void;
  analysisMode: AnalysisType | undefined;
  setAnalysisMode: (mode: AnalysisType | undefined) => void;
}) {
  const handleCloseInspector = () => {
    setIsInspectorOpen(false);
    setSelectedObject(null);
  };

  const handleNavigateTab = (tab: TabType) => {
    setActiveTab(tab);
    setIsInspectorOpen(false);
    setSelectedObject(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectObject = (obj: InspectableObject | SpacecraftObject) => {
    const inspectable = 'category' in obj ? obj : normalizeSpacecraftObject(obj);
    setSelectedObject(inspectable);
  };

  const handleInspectObject = (obj: InspectableObject | SpacecraftObject) => {
    const inspectable = 'category' in obj ? obj : normalizeSpacecraftObject(obj);
    setSelectedObject(inspectable);
    setIsInspectorOpen(true);
  };

  const handleFocusOnMap = async (objectId: string) => {
    setFocusedObjectId(objectId);
    setActiveTab('space-map');
    setIsInspectorOpen(false);
    setSelectedObject(null);
  };

  const handleAnalyzeObject = (objectId: string, mode?: AnalysisType) => {
    setAnalyzedObjectId(objectId);
    setAnalysisMode(mode);
    setActiveTab('analysis');
    setIsInspectorOpen(false);
    setSelectedObject(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 1. Deep Space WebGL Environment (Stars & Milky Way) - Decoupled from Open Repositories tab */}
      {activeTab !== 'missions' && <SpaceEnvironment />}

      {/* 2. Floating Aerospace Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={handleNavigateTab}
      />

      {/* 4. Main Scientific Operations Console */}
      <main style={{ flex: 1, position: 'relative', zIndex: 10, paddingBottom: '32px' }}>
        <ErrorBoundary fallbackTitle="Scientific Component Notice">
          {activeTab === 'mission-control' && (
            <MissionControl
              onNavigateTab={handleNavigateTab}
              onFocusOnMap={handleFocusOnMap}
              onAnalyzeObject={handleAnalyzeObject}
              onExploreSpace={() => setIsExploringSpace(true)}
            />
          )}

          {activeTab === 'spacecraft' && (
            <SpacecraftExplorer
              onSelectObject={handleInspectObject}
              onFocusOnMap={handleFocusOnMap}
              onAnalyzeObject={handleAnalyzeObject}
            />
          )}

          {activeTab === 'space-map' && (
            <SpaceMap
              onSelectObject={handleSelectObject}
              onInspectObject={handleInspectObject}
              selectedObjectId={focusedObjectId}
            />
          )}

          {activeTab === 'analysis' && (
            <ScientificAnalysis
              initialObjectId={analyzedObjectId}
              initialMode={analysisMode}
            />
          )}

          {activeTab === 'missions' && (
            <MissionsExplorer />
          )}
        </ErrorBoundary>
      </main>

      {/* 5. Floating Object Inspector */}
      {selectedObject && isInspectorOpen && activeTab !== 'mission-control' && (
        <ObjectInspector
          key={selectedObject.id}
          object={selectedObject}
          onClose={handleCloseInspector}
          onFocusOnMap={activeTab !== 'space-map' ? handleFocusOnMap : undefined}
          onOpenInAnalysis={activeTab !== 'analysis' ? handleAnalyzeObject : undefined}
        />
      )}

      {/* 6. Authoritative Footer & Celestial Baseline */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '16px 24px',
        fontSize: '11px',
        color: 'var(--text-muted)',
        zIndex: 10
      }}>
        <div style={{
          maxWidth: '1540px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={13} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontFamily: 'var(--font-heading)', letterSpacing: '0.05em' }}>SPACEPULSE</span>
            <span>• Verified Multi-Agency Space Exploration Console</span>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
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

      {/* 7. Full-Screen Immersive "Explore the Space" Experience with Spatial Walkthrough */}
      {isExploringSpace && (
        <ExploreTheSpace
          onExit={(targetTab) => {
            setIsExploringSpace(false);
            if (targetTab) {
              handleNavigateTab(targetTab);
            }
          }}
        />
      )}
    </div>
  );
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('mission-control');
  const [selectedObject, setSelectedObject] = useState<InspectableObject | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [focusedObjectId, setFocusedObjectId] = useState<string | undefined>(undefined);
  const [isExploringSpace, setIsExploringSpace] = useState(false);
  const [analyzedObjectId, setAnalyzedObjectId] = useState<string | undefined>(undefined);
  const [analysisMode, setAnalysisMode] = useState<AnalysisType | undefined>(undefined);

  return (
    <AppContent
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      selectedObject={selectedObject}
      setSelectedObject={setSelectedObject}
      isInspectorOpen={isInspectorOpen}
      setIsInspectorOpen={setIsInspectorOpen}
      focusedObjectId={focusedObjectId}
      setFocusedObjectId={setFocusedObjectId}
      isExploringSpace={isExploringSpace}
      setIsExploringSpace={setIsExploringSpace}
      analyzedObjectId={analyzedObjectId}
      setAnalyzedObjectId={setAnalyzedObjectId}
      analysisMode={analysisMode}
      setAnalysisMode={setAnalysisMode}
    />
  );
}

export default App;
