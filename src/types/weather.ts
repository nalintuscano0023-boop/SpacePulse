import { SourceMetadata } from './telemetry';

export interface SolarWindData {
  protonSpeedKmS: number; // km/s
  timestamp: string;
  source: SourceMetadata;
}

export interface KpIndexData {
  kp: number; // 0 to 9
  aRunning?: number;
  timestamp: string;
  source: SourceMetadata;
}

export interface GoesXrayData {
  energyBand: string; // e.g. "0.1-0.8nm"
  flux: number; // W/m^2
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
  scaleCategory?: string; // G1-G5, R1-R5, S1-S5
}

export interface SpaceWeatherSummary {
  solarWind: SolarWindData | null;
  kpIndex: KpIndexData | null;
  goesXray: GoesXrayData | null;
  activeAlerts: SpaceWeatherAlert[];
  overallStatus: 'NOMINAL' | 'UNSETTLED' | 'ACTIVE_STORM' | 'DATA_UNAVAILABLE';
  lastUpdated: string;
}
