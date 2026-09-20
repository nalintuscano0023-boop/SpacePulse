export interface PayloadInstrument {
  name: string;
  acronym: string;
  leadInstitution: string;
  description: string;
  scientificObjective: string;
  dataType: string;
}

export interface ArchiveDataset {
  id: string;
  title: string;
  mission: string;
  agency: 'ISRO' | 'NASA' | 'ESA' | 'International';
  archiveHost: string;
  officialUrl: string;
  dataLevel: string;
  formats: string[];
  accessType: 'Open Public Access' | 'Open Registered Access';
  description: string;
}

export interface MissionRecord {
  id: string;
  name: string;
  agency: 'ISRO' | 'NASA' | 'ESA' | 'CNSA' | 'JAXA';
  launchVehicle: string;
  launchDate: string;
  target: string;
  missionType: string;
  status: 'Active' | 'Success' | 'Extended Mission' | 'Completed' | 'En Route';
  overview: string;
  keyAchievements: string[];
  payloads: PayloadInstrument[];
  officialSourceUrl: string;
  officialCatalogId: string;
}

export interface AstronautCrewMember {
  name: string;
  craft: string;
  role?: string;
  agency?: string;
  launchMission?: string;
}

export interface CrewReport {
  timestamp: string;
  totalInOrbit: number;
  crafts: {
    craftName: string;
    astronauts: AstronautCrewMember[];
  }[];
  sourceName: string;
  sourceUrl: string;
  status: 'LIVE' | 'LAST_AVAILABLE' | 'UNAVAILABLE';
}
