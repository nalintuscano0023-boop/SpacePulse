import { Vector3D } from '../../types/space';
import { KM_PER_AU, calculateDistanceKm } from './physics';
import { calculatePlanetEphemeris } from './kepler';

export function calculateAdityaL1Ephemeris(date: Date = new Date()): {
  positionKm: Vector3D;
  distanceFromEarthKm: number;
  distanceFromSunKm: number;
  velocityKmS: number;
} {
  const earthEphem = calculatePlanetEphemeris('earth', date);
  const ex = earthEphem.positionKm.x;
  const ey = earthEphem.positionKm.y;
  const ez = earthEphem.positionKm.z;
  const rEarthSun = earthEphem.distanceFromSunKm;

  const distEarthL1Km = 1496500.0;
  const fraction = 1.0 - (distEarthL1Km / rEarthSun);

  const l1x = ex * fraction;
  const l1y = ey * fraction;
  const l1z = ez * fraction;

  const insertionEpoch = new Date('2024-01-06T10:30:00Z').getTime();
  const elapsedDays = (date.getTime() - insertionEpoch) / 86400000;
  const haloPeriodDays = 177.8;
  const haloPhase = (elapsedDays / haloPeriodDays) * 2 * Math.PI;

  const Ax = 120000 * Math.sin(haloPhase);
  const Ay = 240000 * Math.cos(haloPhase);
  const Az = 120000 * Math.sin(haloPhase + Math.PI / 4);

  const posX = l1x + Ax;
  const posY = l1y + Ay;
  const posZ = l1z + Az;

  const distEarth = calculateDistanceKm({ x: posX, y: posY, z: posZ }, { x: ex, y: ey, z: ez });
  const distSun = Math.sqrt(posX * posX + posY * posY + posZ * posZ);

  const orbitalSpeed = 29.8 + 0.25 * Math.cos(haloPhase);

  return {
    positionKm: { x: posX, y: posY, z: posZ },
    distanceFromEarthKm: distEarth,
    distanceFromSunKm: distSun,
    velocityKmS: orbitalSpeed
  };
}

export function calculateVoyagerEphemeris(craft: 'voyager1' | 'voyager2', date: Date = new Date()): {
  positionAU: Vector3D;
  positionKm: Vector3D;
  distanceFromEarthKm: number;
  distanceFromSunKm: number;
  distanceFromSunAU: number;
  velocityKmS: number;
} {
  const earthEphem = calculatePlanetEphemeris('earth', date);

  const baseEpoch = new Date('2024-01-01T00:00:00Z').getTime();
  const elapsedYears = (date.getTime() - baseEpoch) / (365.25 * 86400000);

  if (craft === 'voyager1') {
    const rAU = 162.33 + 3.570 * elapsedYears;
    const latRad = 35.6 * (Math.PI / 180.0);
    const lonRad = 255.4 * (Math.PI / 180.0);

    const xAU = rAU * Math.cos(latRad) * Math.cos(lonRad);
    const yAU = rAU * Math.cos(latRad) * Math.sin(lonRad);
    const zAU = rAU * Math.sin(latRad);

    const posAU = { x: xAU, y: yAU, z: zAU };
    const posKm = { x: xAU * KM_PER_AU, y: yAU * KM_PER_AU, z: zAU * KM_PER_AU };
    const distEarth = calculateDistanceKm(posKm, earthEphem.positionKm);

    return {
      positionAU: posAU,
      positionKm: posKm,
      distanceFromEarthKm: distEarth,
      distanceFromSunKm: rAU * KM_PER_AU,
      distanceFromSunAU: rAU,
      velocityKmS: 16.9
    };
  } else {
    const rAU = 135.50 + 3.160 * elapsedYears;
    const latRad = -31.5 * (Math.PI / 180.0);
    const lonRad = 300.9 * (Math.PI / 180.0);

    const xAU = rAU * Math.cos(latRad) * Math.cos(lonRad);
    const yAU = rAU * Math.cos(latRad) * Math.sin(lonRad);
    const zAU = rAU * Math.sin(latRad);

    const posAU = { x: xAU, y: yAU, z: zAU };
    const posKm = { x: xAU * KM_PER_AU, y: yAU * KM_PER_AU, z: zAU * KM_PER_AU };
    const distEarth = calculateDistanceKm(posKm, earthEphem.positionKm);

    return {
      positionAU: posAU,
      positionKm: posKm,
      distanceFromEarthKm: distEarth,
      distanceFromSunKm: rAU * KM_PER_AU,
      distanceFromSunAU: rAU,
      velocityKmS: 15.3
    };
  }
}
