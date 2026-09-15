export type DataStatus = 
  | 'LIVE' 
  | 'CALCULATED' 
  | 'LAST_AVAILABLE' 
  | 'UNAVAILABLE' 
  | 'SOURCE_ERROR';

export interface SourceMetadata {
  sourceName: string;
  sourceUrl?: string;
  timestamp: string; // ISO string or UTC string
  status: DataStatus;
  statusNote?: string;
  updateFrequency?: string;
  calculationMethod?: string;
}

export interface TelemetryValue<T> {
  value: T;
  unit?: string;
  source: SourceMetadata;
}
