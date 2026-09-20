import React, { createContext, useContext, useState, useCallback } from 'react';

export interface WalkthroughStepConfig {
  id: string;
  stepNumber: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  description: string;
  targetSelector: string;
  targetTab?: 'mission-control' | 'spacecraft' | 'space-map' | 'analysis' | 'missions';
  preferredPlacement?: 'top' | 'bottom' | 'left' | 'right';
  actionLabel?: string;
  canTryAction?: boolean;
}

export const WALKTHROUGH_STEPS: WalkthroughStepConfig[] = [
  {
    id: 'step-mission-control-nav',
    stepNumber: 1,
    totalSteps: 9,
    title: 'Mission Control',
    subtitle: 'Primary Command Deck',
    description: 'Your starting point for understanding real-time celestial events, data integrity health, and active mission telemetry.',
    targetSelector: '#nav-tab-mission-control',
    targetTab: 'mission-control',
    preferredPlacement: 'bottom'
  },
  {
    id: 'step-command-overview',
    stepNumber: 2,
    totalSteps: 9,
    title: 'Command Overview',
    subtitle: 'Global Fleet Telemetry',
    description: 'Get an instant overview of tracked spacecraft, space environment conditions from NOAA SWPC, and celestial ephemerides.',
    targetSelector: '#mission-control-overview',
    targetTab: 'mission-control',
    preferredPlacement: 'bottom'
  },
  {
    id: 'step-active-fleet',
    stepNumber: 3,
    totalSteps: 9,
    title: 'Active Fleet Highlights',
    subtitle: 'Real-Time Spacecraft Roster',
    description: 'Inspect verified spacecraft and orbital satellites. Click any spacecraft card or select Try Inspect to explore telemetry.',
    targetSelector: '#active-fleet-section',
    targetTab: 'mission-control',
    preferredPlacement: 'top',
    canTryAction: true,
    actionLabel: 'Try Inspect'
  },
  {
    id: 'step-object-inspector',
    stepNumber: 4,
    totalSteps: 9,
    title: 'Object Inspector',
    subtitle: 'Deep Telemetry & Dossier',
    description: 'Deep-dive into spacecraft overview, verified position metrics, orbital mechanics, physical payloads, and authoritative data sources.',
    targetSelector: '#object-inspector-panel',
    targetTab: 'mission-control',
    preferredPlacement: 'left'
  },
  {
    id: 'step-space-map-nav',
    stepNumber: 5,
    totalSteps: 9,
    title: 'Space Map',
    subtitle: 'Interactive 3D Universe',
    description: 'Explore verified objects visually in a scientifically accurate Three.js 3D environment with J2000 Keplerian orbits.',
    targetSelector: '#nav-tab-space-map',
    targetTab: 'space-map',
    preferredPlacement: 'bottom',
    actionLabel: 'Open Space Map'
  },
  {
    id: 'step-space-map-controls',
    stepNumber: 6,
    totalSteps: 9,
    title: '3D Space Map Navigation',
    subtitle: 'Search, Focus & Orbit Projections',
    description: 'Search for any body, focus the camera on deep-space probes or Earth satellites, toggle Keplerian orbit lines, and inspect live 3D models.',
    targetSelector: '#space-map-controls-panel',
    targetTab: 'space-map',
    preferredPlacement: 'right'
  },
  {
    id: 'step-analysis-nav',
    stepNumber: 7,
    totalSteps: 9,
    title: 'Scientific Analysis',
    subtitle: 'Astronomical Vector Calculator',
    description: 'Convert verified telemetry into exact geometric distance matrices, signal latency light-times, and relative velocity vectors.',
    targetSelector: '#nav-tab-analysis',
    targetTab: 'analysis',
    preferredPlacement: 'bottom'
  },
  {
    id: 'step-missions-nav',
    stepNumber: 8,
    totalSteps: 9,
    title: 'Missions & Data Directory',
    subtitle: 'Verified Ephemeris Sources',
    description: 'Access complete ISRO, NASA, and ESA mission archives with transparency into authoritative telemetry sources (NOAA, CelesTrak, JPL).',
    targetSelector: '#nav-tab-missions',
    targetTab: 'missions',
    preferredPlacement: 'bottom'
  },
  {
    id: 'step-explore-space-cta',
    stepNumber: 9,
    totalSteps: 9,
    title: 'Explore the Space',
    subtitle: 'Pure Cinematic Cosmic Odyssey',
    description: 'Ready to leave the telemetry console? Enter an emotional, visual journey through deep space, galaxies, and nebulae with zero data overlays.',
    targetSelector: '#explore-space-cta-card',
    targetTab: 'mission-control',
    preferredPlacement: 'top',
    actionLabel: 'Enter Explore the Space'
  }
];

interface WalkthroughContextType {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: WalkthroughStepConfig | null;
  startWalkthrough: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipWalkthrough: () => void;
  finishWalkthrough: (launchExploreSpace?: boolean) => void;
}

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(undefined);

interface WalkthroughProviderProps {
  children: React.ReactNode;
  onNavigateTab: (tab: 'mission-control' | 'spacecraft' | 'space-map' | 'analysis' | 'missions') => void;
  onInspectSampleObject?: () => void;
  onExploreSpace?: () => void;
}

export const WalkthroughProvider: React.FC<WalkthroughProviderProps> = ({
  children,
  onNavigateTab,
  onInspectSampleObject,
  onExploreSpace
}) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const currentStep = isActive ? WALKTHROUGH_STEPS[currentStepIndex] || null : null;

  const startWalkthrough = useCallback(() => {
    setIsActive(true);
    setCurrentStepIndex(0);
    const firstStep = WALKTHROUGH_STEPS[0];
    if (firstStep.targetTab) {
      onNavigateTab(firstStep.targetTab);
    }
  }, [onNavigateTab]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < WALKTHROUGH_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1;
      const nextConfig = WALKTHROUGH_STEPS[nextIdx];
      setCurrentStepIndex(nextIdx);

      if (nextConfig.id === 'step-object-inspector' && onInspectSampleObject) {
        onInspectSampleObject();
      }

      if (nextConfig.targetTab) {
        onNavigateTab(nextConfig.targetTab);
      }
    } else {
      setIsActive(false);
    }
  }, [currentStepIndex, onNavigateTab, onInspectSampleObject]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      const prevConfig = WALKTHROUGH_STEPS[prevIdx];
      setCurrentStepIndex(prevIdx);
      if (prevConfig.targetTab) {
        onNavigateTab(prevConfig.targetTab);
      }
    }
  }, [currentStepIndex, onNavigateTab]);

  const skipWalkthrough = useCallback(() => {
    setIsActive(false);
  }, []);

  const finishWalkthrough = useCallback((launchExploreSpace = false) => {
    setIsActive(false);
    if (launchExploreSpace && onExploreSpace) {
      onExploreSpace();
    }
  }, [onExploreSpace]);

  return (
    <WalkthroughContext.Provider
      value={{
        isActive,
        currentStepIndex,
        currentStep,
        startWalkthrough,
        nextStep,
        prevStep,
        skipWalkthrough,
        finishWalkthrough
      }}
    >
      {children}
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = (): WalkthroughContextType => {
  const context = useContext(WalkthroughContext);
  if (!context) {
    throw new Error('useWalkthrough must be used within a WalkthroughProvider');
  }
  return context;
};
