import { SourceMetadata } from './telemetry';

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
  currentPosition?: Vector3D; // AU or km based on context
  currentVelocity?: Vector3D; // km/s
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
  
  // Dynamic or calculated metrics
  distanceFromEarthKm?: number;
  distanceFromSunKm?: number;
  distanceFromMoonKm?: number;
  velocityKmS?: number;
  lightTimeToEarthSec?: number;
  position?: Vector3D;
  
  // Geodetic info if in Earth orbit
  geodetic?: {
    latitude: number;
    longitude: number;
    altitudeKm: number;
  };

  // Orbital parameters if applicable
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
}
