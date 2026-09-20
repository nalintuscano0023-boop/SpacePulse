import { SourceMetadata } from './telemetry';
import type { TrackingCapability } from '../services/data/trackingCapability';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type CoordinateFrame = 
  | 'Heliocentric Ecliptic J2000'
  | 'Geocentric ECI (TEME / J2000)'
  | 'Selenocentric (Lunar)'
  | 'Interstellar Hyperbolic';

export type OrbitType = 
  | 'Heliocentric'
  | 'Low Earth Orbit (LEO)'
  | 'Medium Earth Orbit (MEO)'
  | 'Geostationary (GEO)'
  | 'Sun-Synchronous (SSO)'
  | 'Highly Elliptical Orbit (HEO)'
  | 'Lagrangian Halo (L1)'
  | 'Lagrangian Halo (L2)'
  | 'Lunar Orbit'
  | 'Lunar Surface'
  | 'Interstellar Trajectory';

export interface CelestialBody {
  id: string;
  name: string;
  type: 'star' | 'planet' | 'moon';
  radiusKm: number;
  color: string;
  texture?: string;
  orbitalPeriodDays?: number;
  semiMajorAxisAU?: number;
  eccentricity?: number;
  inclinationDeg?: number;
  currentPosition?: Vector3D;
  currentVelocity?: Vector3D;
  distanceFromEarthKm?: number;
  distanceFromSunKm?: number;
  lightTimeToEarthSec?: number;
  metadata?: SourceMetadata;
}

export interface SpacecraftObject {
  id: string;
  name: string;
  noradId?: number;
  jplId?: string;
  agency: 'ISRO' | 'NASA' | 'ESA' | 'CNSA' | 'ROSCOSMOS' | 'Commercial';
  mission: string;
  launchDate: string;
  statusText: string;
  isOperational: boolean;
  orbitType: OrbitType;
  coordinateFrame: CoordinateFrame;
  description: string;
  significance: string;
  scientificExplanation: string;
  payloads: string[];
  
  distanceFromEarthKm?: number;
  distanceFromSunKm?: number;
  distanceFromMoonKm?: number;
  velocityKmS?: number;
  lightTimeToEarthSec?: number;
  position?: Vector3D;
  
  geodetic?: {
    latitude: number;
    longitude: number;
    altitudeKm: number;
  };

  orbitalElements?: {
    epoch: string;
    semiMajorAxisKm?: number;
    inclinationDeg: number;
    eccentricity: number;
    periodMinutes?: number;
    raanDeg?: number;
    argPericenterDeg?: number;
    meanAnomalyDeg?: number;
  };

  telemetrySource: SourceMetadata;
  trackingCapability?: TrackingCapability;
}

export type ObjectCategory = 'spacecraft' | 'satellite' | 'planet' | 'moon' | 'star';

export interface InspectableObject {
  id: string;
  name: string;
  category: ObjectCategory;
  typeText: string;
  agency?: string;
  mission?: string;
  launchDate?: string;
  statusText: string;
  isOperational?: boolean;
  orbitType?: string;
  coordinateFrame?: string;
  description: string;
  significance?: string;
  scientificExplanation?: string;
  payloads?: string[];

  distanceFromEarthKm?: number;
  distanceFromSunKm?: number;
  distanceFromMoonKm?: number;
  velocityKmS?: number;
  lightTimeToEarthSec?: number;
  position?: Vector3D;
  radiusKm?: number;

  isEarthOrigin?: boolean;

  geodetic?: {
    latitude: number;
    longitude: number;
    altitudeKm: number;
  };

  orbitalElements?: {
    epoch: string;
    semiMajorAxisKm?: number;
    inclinationDeg: number;
    eccentricity: number;
    periodMinutes?: number;
    raanDeg?: number;
    argPericenterDeg?: number;
    meanAnomalyDeg?: number;
  };

  noradId?: number;
  jplId?: string;
  telemetrySource: SourceMetadata;
  trackingCapability?: TrackingCapability;

  rawSpacecraft?: SpacecraftObject;
}
