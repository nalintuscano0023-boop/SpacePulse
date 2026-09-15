import { Vector3D } from '../../types/space';

// Authoritative astronomical constants (IAU / IERS standard)
export const SPEED_OF_LIGHT_KM_S = 299792.458;
export const KM_PER_AU = 149597870.7;
export const EARTH_RADIUS_KM = 6371.0;
export const SUN_RADIUS_KM = 696340.0;
export const MOON_MEAN_DISTANCE_KM = 384400.0;

export function calculateDistanceKm(p1: Vector3D, p2: Vector3D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function calculateLightTimeSeconds(distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  return distanceKm / SPEED_OF_LIGHT_KM_S;
}

export function formatLightTime(seconds: number): string {
  if (seconds < 0.001) return '< 1 ms';
  if (seconds < 1) return `${(seconds * 1000).toFixed(1)} ms`;
  if (seconds < 60) return `${seconds.toFixed(2)} sec`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const remainingMins = Math.floor((seconds % 3600) / 60);
  const remainingSecs = Math.round(seconds % 60);
  return `${hours}h ${remainingMins}m ${remainingSecs}s`;
}

export function auToKm(au: number): number {
  return au * KM_PER_AU;
}

export function kmToAu(km: number): number {
  return km / KM_PER_AU;
}

export function calculateRelativeVelocity(v1: Vector3D, v2: Vector3D): number {
  const dvx = v1.x - v2.x;
  const dvy = v1.y - v2.y;
  const dvz = v1.z - v2.z;
  return Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
}

export function vectorMagnitude(v: Vector3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}
