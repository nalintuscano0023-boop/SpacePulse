import { SourceMetadata } from './telemetry';

export interface SolarWindData {
  protonSpeedKmS: number;
  timestamp: string;
  source: SourceMetadata;
}

export interface KpIndexData {
  kp: number;
  aRunning?: number;
  timestamp: string;
  source: SourceMetadata;
}

export interface GoesXrayData {
  energyBand: string;
  flux: number;
  flareClass: 'A' | 'B' | 'C' | 'M' | 'X';
  timestamp: string;
  source: SourceMetadata;
}

export interface SpaceWeatherAlert {
  id: string;
  issueDateTime: string;
  messageCode: string;
  summary: string;
  description: string;
  severity: 'INFO' | 'WATCH' | 'WARNING' | 'ALERT';
  scaleCategory?: string;
}

export interface SpaceWeatherSummary {
  solarWind: SolarWindData | null;
  kpIndex: KpIndexData | null;
  goesXray: GoesXrayData | null;
  activeAlerts: SpaceWeatherAlert[];
  overallStatus: 'NOMINAL' | 'UNSETTLED' | 'ACTIVE_STORM' | 'DATA_UNAVAILABLE';
  lastUpdated: string;
}
