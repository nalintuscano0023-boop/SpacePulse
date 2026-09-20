export type DataStatus = 
  | 'CURRENT'
  | 'LIVE' 
  | 'CALCULATED' 
  | 'LAST_AVAILABLE' 
  | 'HISTORICAL'
  | 'DATA_UNAVAILABLE'
  | 'UNAVAILABLE' 
  | 'SOURCE_ERROR';

export interface SourceMetadata {
  sourceName: string;
  sourceUrl?: string;
  timestamp: string;
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
