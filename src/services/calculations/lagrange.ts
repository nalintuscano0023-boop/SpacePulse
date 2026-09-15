import { Vector3D } from '../../types/space';
import { KM_PER_AU, calculateDistanceKm } from './physics';
import { calculatePlanetEphemeris } from './kepler';

// Sun-Earth L1 position and Aditya-L1 halo orbit model
export function calculateAdityaL1Ephemeris(date: Date = new Date()): {
  positionKm: Vector3D;
  distanceFromEarthKm: number;
  distanceFromSunKm: number;
  velocityKmS: number;
} {
  // 1. Earth heliocentric position
  const earthEphem = calculatePlanetEphemeris('earth', date);
  const ex = earthEphem.positionKm.x;
  const ey = earthEphem.positionKm.y;
  const ez = earthEphem.positionKm.z;
  const rEarthSun = earthEphem.distanceFromSunKm;

  // L1 distance from Earth along the Sun-Earth line: ~1.496e6 km
  // mu = M_earth / (M_sun + M_earth) ~ 3.003e-6
  // r_L1 = R * (mu / 3)^(1/3)
  const distEarthL1Km = 1496500.0;
  const fraction = 1.0 - (distEarthL1Km / rEarthSun);

  // Unperturbed L1 center
  const l1x = ex * fraction;
  const l1y = ey * fraction;
  const l1z = ez * fraction;

  // Aditya-L1 halo orbit around L1 (period ~ 177.8 days)
  // Epoch of insertion: Jan 6, 2024
  const insertionEpoch = new Date('2024-01-06T10:30:00Z').getTime();
  const elapsedDays = (date.getTime() - insertionEpoch) / 86400000;
  const haloPeriodDays = 177.8;
  const haloPhase = (elapsedDays / haloPeriodDays) * 2 * Math.PI;

  // Halo amplitudes (Ax ~ 120,000 km, Ay ~ 240,000 km, Az ~ 120,000 km)
  const Ax = 120000 * Math.sin(haloPhase);
  const Ay = 240000 * Math.cos(haloPhase);
  const Az = 120000 * Math.sin(haloPhase + Math.PI / 4);

  // Position in heliocentric coordinates
  const posX = l1x + Ax;
  const posY = l1y + Ay;
  const posZ = l1z + Az;

  const distEarth = calculateDistanceKm({ x: posX, y: posY, z: posZ }, { x: ex, y: ey, z: ez });
  const distSun = Math.sqrt(posX * posX + posY * posY + posZ * posZ);

  // Aditya-L1 halo orbit velocity relative to Sun: Earth orbital speed (~29.8 km/s) + halo orbital velocity (~0.25 km/s)
  const orbitalSpeed = 29.8 + 0.25 * Math.cos(haloPhase);

  return {
    positionKm: { x: posX, y: posY, z: posZ },
    distanceFromEarthKm: distEarth,
    distanceFromSunKm: distSun,
    velocityKmS: orbitalSpeed
  };
}

// Voyager 1 & 2 hyperbolic interstellar trajectories based on NASA JPL ephemerides
export function calculateVoyagerEphemeris(craft: 'voyager1' | 'voyager2', date: Date = new Date()): {
  positionAU: Vector3D;
  positionKm: Vector3D;
  distanceFromEarthKm: number;
  distanceFromSunKm: number;
  distanceFromSunAU: number;
  velocityKmS: number;
} {
  const earthEphem = calculatePlanetEphemeris('earth', date);

  // Baseline epoch: 2024-01-01 00:00:00 UTC
  const baseEpoch = new Date('2024-01-01T00:00:00Z').getTime();
  const elapsedYears = (date.getTime() - baseEpoch) / (365.25 * 86400000);

  if (craft === 'voyager1') {
    // Voyager 1: NASA JPL parameters
    // Speed: 3.57 AU/year (~16.899 km/s)
    // 2024-01-01 distance: 162.33 AU
    // Asymptotic direction: Ecliptic Longitude ~255.4 deg, Ecliptic Latitude ~+35.6 deg
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
    // Voyager 2: NASA JPL parameters
    // Speed: 3.16 AU/year (~15.3 km/s)
    // 2024-01-01 distance: 135.50 AU
    // Asymptotic direction: Ecliptic Longitude ~300.9 deg, Ecliptic Latitude ~-31.5 deg
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
