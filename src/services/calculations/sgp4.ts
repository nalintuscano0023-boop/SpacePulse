import * as satellite from 'satellite.js';
import type { Vector3D } from '../../types/space';
import { EARTH_RADIUS_KM } from './physics';

export interface PropagatedSatelliteState {
  positionEciKm: Vector3D;
  velocityKmS: number;
  velocityVectorKmS: Vector3D;
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeKm: number;
  distanceFromEarthCenterKm: number;
  distanceFromEarthSurfaceKm: number;
}

export function propagateTle(line1: string, line2: string, date: Date = new Date()): PropagatedSatelliteState | null {
  try {
    const satrec = satellite.twoline2satrec(line1.trim(), line2.trim());
    const positionAndVelocity = satellite.propagate(satrec, date);

    if (!positionAndVelocity || typeof positionAndVelocity !== 'object') {
      return null;
    }

    const pos = positionAndVelocity.position;
    const vel = positionAndVelocity.velocity;

    if (!pos || typeof pos !== 'object' || !('x' in pos)) {
      return null;
    }

    const posEci: Vector3D = {
      x: pos.x,
      y: pos.y,
      z: pos.z
    };

    let velVector: Vector3D = { x: 0, y: 0, z: 0 };
    let speed = 0;

    if (vel && typeof vel === 'object' && 'x' in vel) {
      velVector = { x: vel.x, y: vel.y, z: vel.z };
      speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
    }

    const gmst = satellite.gstime(date);
    const geodetic = satellite.eciToGeodetic(pos as satellite.EciVec3<number>, gmst);

    const latDeg = satellite.degreesLat(geodetic.latitude);
    const lonDeg = satellite.degreesLong(geodetic.longitude);
    const altKm = geodetic.height;

    const rDist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);

    return {
      positionEciKm: posEci,
      velocityKmS: speed,
      velocityVectorKmS: velVector,
      latitudeDeg: latDeg,
      longitudeDeg: lonDeg,
      altitudeKm: altKm,
      distanceFromEarthCenterKm: rDist,
      distanceFromEarthSurfaceKm: Math.max(0, rDist - EARTH_RADIUS_KM)
    };
  } catch {
    return null;
  }
}

export function generateOrbitPath(line1: string, line2: string, date: Date = new Date(), samples = 120): Vector3D[] {
  const points: Vector3D[] = [];
  try {
    const satrec = satellite.twoline2satrec(line1.trim(), line2.trim());
    const meanMotionRadMin = satrec.no;
    const periodMinutes = (2 * Math.PI) / meanMotionRadMin;
    const stepMin = periodMinutes / samples;

    const baseTime = date.getTime();
    for (let i = 0; i <= samples; i++) {
      const sampleDate = new Date(baseTime + (i * stepMin * 60000));
      const pv = satellite.propagate(satrec, sampleDate);
      if (pv && typeof pv === 'object' && pv.position && typeof pv.position === 'object' && 'x' in pv.position) {
        points.push({
          x: pv.position.x,
          y: pv.position.y,
          z: pv.position.z
        });
      }
    }
  } catch {
  }
  return points;
}
