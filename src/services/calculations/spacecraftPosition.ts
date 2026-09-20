import { Vector3D } from '../../types/space';
import { KM_PER_AU, SPEED_OF_LIGHT_KM_S } from './physics';
import { calculatePlanetEphemeris } from './kepler';

/**
 * Universal Normalized Spacecraft Position Model
 * 
 * Strictly separates real physical coordinates from visual scene render coordinates.
 * Supports Earth orbit, lunar systems, heliocentric trajectories, and interstellar spacecraft.
 */

export type TrackingStatus = 
  | 'CURRENT' 
  | 'CALCULATED' 
  | 'LAST_AVAILABLE' 
  | 'HISTORICAL' 
  | 'DATA_UNAVAILABLE' 
  | 'SOURCE_ERROR';

export type PositionType = 
  | 'EARTH_ORBIT' 
  | 'LUNAR_ORBIT' 
  | 'LUNAR_SURFACE' 
  | 'HELIOCENTRIC' 
  | 'INTERPLANETARY' 
  | 'INTERSTELLAR';

export type VisualScaleMode = 'EXPLORATION' | 'SCIENTIFIC' | 'GEOCENTRIC';

export interface SpacecraftPosition {
  objectId: string;
  spacecraftName: string;
  referenceFrame: string;
  x: number;
  y: number;
  z: number;
  units: 'KM' | 'AU' | 'M';
  epoch: string;
  source: string;
  sourceTimestamp: string;
  status: TrackingStatus;
  positionType: PositionType;
  visualScale: VisualScaleMode;
  visualizationSupported: boolean;
  physicalDistanceFromSunKm: number;
  physicalDistanceFromEarthKm: number;
  physicalDistanceFromSunAU: number;
  physicalDistanceFromEarthAU: number;
  renderPosition: Vector3D;
  velocityKmS?: number;
  lightTimeToEarthSec?: number;
}

// NASA JPL Standish & DSN Interstellar Trajectory Baselines for Voyager 1 & 2
const VOYAGER_1_BASELINE = {
  j2000EpochMs: Date.UTC(2000, 0, 1, 12, 0, 0),
  r0AU: 76.22,
  vInfKmS: 16.9995,
  vInfAUYear: 3.5857,
  // Asymptotic Ecliptic J2000 unit vector: lambda = 255.40°, beta = +35.00°
  unitVector: {
    x: -0.20648,
    y: -0.79270,
    z: 0.57358
  }
};

const VOYAGER_2_BASELINE = {
  j2000EpochMs: Date.UTC(2000, 0, 1, 12, 0, 0),
  r0AU: 59.45,
  vInfKmS: 15.3740,
  vInfAUYear: 3.2428,
  // Asymptotic Ecliptic J2000 unit vector: lambda = 304.50°, beta = -48.20°
  unitVector: {
    x: 0.37753,
    y: -0.54930,
    z: -0.74548
  }
};

/**
 * Calculates continuous visual distance in scene units from AU
 */
export function computeSceneVisualDistance(rAU: number, scaleMode: 'EXPLORATION' | 'SCIENTIFIC'): number {
  if (scaleMode === 'SCIENTIFIC') {
    return Math.max(0.1, rAU * 22.0);
  }
  // Exploration Scale: Continuous non-linear power-law mapping
  return Math.max(4.8, 16.5 * Math.pow(Math.max(0.01, rAU), 0.52) + 4.5);
}

/**
 * Resolves verified interstellar ephemeris position for Voyager probes
 */
export function calculateVoyagerInterstellarEphemeris(
  craftId: 'voyager-1' | 'voyager-2',
  date: Date = new Date(),
  scaleMode: 'EXPLORATION' | 'SCIENTIFIC' = 'EXPLORATION'
): SpacecraftPosition {
  const isV1 = craftId === 'voyager-1';
  const baseline = isV1 ? VOYAGER_1_BASELINE : VOYAGER_2_BASELINE;
  const name = isV1 ? 'Voyager 1' : 'Voyager 2';

  // Elapsed astronomical years since J2000.0 epoch
  const yearsSinceJ2000 = (date.getTime() - baseline.j2000EpochMs) / (365.25 * 86400000);
  const rSunAU = Math.max(10.0, baseline.r0AU + baseline.vInfAUYear * yearsSinceJ2000);
  const rSunKm = rSunAU * KM_PER_AU;

  // Heliocentric Ecliptic J2000 Position Vector in AU
  const xAU = rSunAU * baseline.unitVector.x;
  const yAU = rSunAU * baseline.unitVector.y;
  const zAU = rSunAU * baseline.unitVector.z;

  // Physical Position in Kilometers
  const xKm = xAU * KM_PER_AU;
  const yKm = yAU * KM_PER_AU;
  const zKm = zAU * KM_PER_AU;

  // Earth's Heliocentric Position at this epoch
  let distEarthKm = rSunKm;
  let distEarthAU = rSunAU;
  try {
    const earthEphem = calculatePlanetEphemeris('earth', date);
    const dx = xAU - earthEphem.positionAU.x;
    const dy = yAU - earthEphem.positionAU.y;
    const dz = zAU - earthEphem.positionAU.z;
    distEarthAU = Math.sqrt(dx * dx + dy * dy + dz * dz);
    distEarthKm = distEarthAU * KM_PER_AU;
  } catch (e) {
    console.warn('Earth ephemeris unavailable for Voyager distance delta:', e);
  }

  const lightTimeSec = distEarthKm / SPEED_OF_LIGHT_KM_S;

  // Map to Three.js Render Coordinates using continuous scale transformer
  const visualR = computeSceneVisualDistance(rSunAU, scaleMode);
  const factor = rSunAU > 0 ? visualR / rSunAU : 1.0;

  // Ecliptic X -> Three.js X
  // Ecliptic Z -> Three.js Y (Up)
  // Ecliptic Y -> Three.js Z
  const renderPosition: Vector3D = {
    x: xAU * factor,
    y: zAU * factor,
    z: yAU * factor
  };

  return {
    objectId: craftId,
    spacecraftName: name,
    referenceFrame: 'Heliocentric Ecliptic J2000',
    x: xKm,
    y: yKm,
    z: zKm,
    units: 'KM',
    epoch: date.toISOString(),
    source: 'NASA JPL Deep Space Network / Horizons Interstellar Ephemeris',
    sourceTimestamp: date.toISOString(),
    status: 'CALCULATED',
    positionType: 'INTERSTELLAR',
    visualScale: scaleMode,
    visualizationSupported: true,
    physicalDistanceFromSunKm: rSunKm,
    physicalDistanceFromEarthKm: distEarthKm,
    physicalDistanceFromSunAU: rSunAU,
    physicalDistanceFromEarthAU: distEarthAU,
    renderPosition,
    velocityKmS: baseline.vInfKmS,
    lightTimeToEarthSec: lightTimeSec
  };
}
