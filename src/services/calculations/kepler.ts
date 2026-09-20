import { Vector3D } from '../../types/space';
import { KM_PER_AU } from './physics';

export interface KeplerianElements {
  a0: number; aRate: number;
  e0: number; eRate: number;
  i0: number; iRate: number;
  l0: number; lRate: number;
  w0: number; wRate: number;
  o0: number; oRate: number;
}

const PLANETARY_DATA: Record<string, KeplerianElements> = {
  mercury: {
    a0: 0.38709927, aRate: 0.00000037,
    e0: 0.20563593, eRate: 0.00001906,
    i0: 7.00497902, iRate: -0.00594749,
    l0: 252.25032350, lRate: 149472.67411175,
    w0: 77.45779628, wRate: 0.16047689,
    o0: 48.33076593, oRate: -0.12534081
  },
  venus: {
    a0: 0.72333566, aRate: 0.00000490,
    e0: 0.00677672, eRate: -0.00004107,
    i0: 3.39467605, iRate: -0.00078890,
    l0: 181.97909950, lRate: 58517.81538729,
    w0: 131.60246718, wRate: 0.00268329,
    o0: 76.67984255, oRate: -0.27769418
  },
  earth: {
    a0: 1.00000261, aRate: 0.00000562,
    e0: 0.01671123, eRate: -0.00004392,
    i0: -0.00001531, iRate: -0.01294668,
    l0: 100.46457166, lRate: 35999.37244981,
    w0: 102.93768193, wRate: 0.32327364,
    o0: 0.0, oRate: 0.0
  },
  mars: {
    a0: 1.52371034, aRate: 0.00001847,
    e0: 0.09339410, eRate: 0.00007882,
    i0: 1.84969142, iRate: -0.00813131,
    l0: -4.55343205, lRate: 19140.30268499,
    w0: -23.94362959, wRate: 0.44441088,
    o0: 49.55953891, oRate: -0.29257343
  },
  jupiter: {
    a0: 5.20288700, aRate: -0.00011607,
    e0: 0.04838624, eRate: -0.00013253,
    i0: 1.30439695, iRate: -0.00183714,
    l0: 34.39644051, lRate: 3034.74612775,
    w0: 14.72847983, wRate: 0.21252668,
    o0: 100.47390909, oRate: 0.20469106
  },
  saturn: {
    a0: 9.53667594, aRate: -0.00125060,
    e0: 0.05386179, eRate: -0.00050991,
    i0: 2.48599187, iRate: 0.00193609,
    l0: 49.94424215, lRate: 1222.49362201,
    w0: 92.59887831, wRate: -0.41897216,
    o0: 113.66242448, oRate: -0.28867794
  },
  uranus: {
    a0: 19.18916464, aRate: -0.00196176,
    e0: 0.04725744, eRate: -0.00004397,
    i0: 0.77263783, iRate: -0.00242939,
    l0: 313.232180, lRate: 428.48202785,
    w0: 170.96424215, wRate: 0.40805281,
    o0: 74.00595701, oRate: 0.04240589
  },
  neptune: {
    a0: 30.06992276, aRate: 0.00026291,
    e0: 0.00860610, eRate: 0.00005105,
    i0: 1.77004347, iRate: 0.00035372,
    l0: -55.12002969, lRate: 218.45945325,
    w0: 44.96476224, wRate: -0.32241464,
    o0: 131.78061530, oRate: -0.00508664
  }
};

export function dateToJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

export function julianCenturiesSinceJ2000(date: Date): number {
  const jd = dateToJulianDate(date);
  return (jd - 2451545.0) / 36525.0;
}

const DEG2RAD = Math.PI / 180.0;
const RAD2DEG = 180.0 / Math.PI;

function normalizeDeg(deg: number): number {
  let res = deg % 360;
  if (res < 0) res += 360;
  return res;
}

export function calculatePlanetEphemeris(planetId: string, date: Date = new Date()): {
  positionAU: Vector3D;
  positionKm: Vector3D;
  velocityKmS: Vector3D;
  distanceFromSunKm: number;
} {
  const elements = PLANETARY_DATA[planetId.toLowerCase()];
  if (!elements) {
    throw new Error(`Unsupported planet ephemeris: ${planetId}`);
  }

  const T = julianCenturiesSinceJ2000(date);

  const a = elements.a0 + elements.aRate * T;
  const e = elements.e0 + elements.eRate * T;
  const I = (elements.i0 + elements.iRate * T) * DEG2RAD;
  const L = normalizeDeg(elements.l0 + elements.lRate * T);
  const wBar = normalizeDeg(elements.w0 + elements.wRate * T);
  const omegaNode = normalizeDeg(elements.o0 + elements.oRate * T) * DEG2RAD;

  const w = normalizeDeg(wBar - (elements.o0 + elements.oRate * T)) * DEG2RAD;
  const M = normalizeDeg(L - wBar) * DEG2RAD;

  let E = M;
  for (let iter = 0; iter < 10; iter++) {
    const dE = (E - e * Math.sin(E) - M) / (1.0 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }

  const xPrime = a * (Math.cos(E) - e);
  const yPrime = a * Math.sqrt(Math.max(0, 1.0 - e * e)) * Math.sin(E);

  const cosW = Math.cos(w);
  const sinW = Math.sin(w);
  const cosNode = Math.cos(omegaNode);
  const sinNode = Math.sin(omegaNode);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);

  const x = (cosW * cosNode - sinW * sinNode * cosI) * xPrime +
            (-sinW * cosNode - cosW * sinNode * cosI) * yPrime;
  const y = (cosW * sinNode + sinW * cosNode * cosI) * xPrime +
            (-sinW * sinNode + cosW * cosNode * cosI) * yPrime;
  const z = (sinW * sinI) * xPrime + (cosW * sinI) * yPrime;

  const rAU = Math.sqrt(x * x + y * y + z * z);
  const rKm = rAU * KM_PER_AU;

  const GM_SUN = 1.32712440018e11;
  const aKm = a * KM_PER_AU;
  const speed = Math.sqrt(Math.max(0, GM_SUN * (2.0 / rKm - 1.0 / aKm)));

  const vxPrime = -speed * Math.sin(E) / (1 - e * Math.cos(E));
  const vyPrime = speed * Math.sqrt(1 - e * e) * Math.cos(E) / (1 - e * Math.cos(E));
  const vx = (cosW * cosNode - sinW * sinNode * cosI) * vxPrime +
             (-sinW * cosNode - cosW * sinNode * cosI) * vyPrime;
  const vy = (cosW * sinNode + sinW * cosNode * cosI) * vxPrime +
             (-sinW * sinNode + cosW * cosNode * cosI) * vyPrime;
  const vz = (sinW * sinI) * vxPrime + (cosW * sinI) * vyPrime;

  return {
    positionAU: { x, y, z },
    positionKm: { x: x * KM_PER_AU, y: y * KM_PER_AU, z: z * KM_PER_AU },
    velocityKmS: { x: vx, y: vy, z: vz },
    distanceFromSunKm: rKm
  };
}

export function calculateMoonGeocentric(date: Date = new Date()): {
  positionKm: Vector3D;
  distanceKm: number;
} {
  const T = julianCenturiesSinceJ2000(date);

  const LPrime = (218.3164477 + 481267.88123421 * T) * DEG2RAD;
  const D = (297.8501921 + 445267.1114034 * T) * DEG2RAD;
  const M = (357.5291092 + 35999.0502909 * T) * DEG2RAD;
  const MPrime = (134.9633964 + 477198.8675055 * T) * DEG2RAD;
  const F = (93.2720950 + 483202.0175233 * T) * DEG2RAD;

  const l = LPrime +
    (6.288774 * Math.sin(MPrime) +
     1.274027 * Math.sin(2 * D - MPrime) +
     0.658314 * Math.sin(2 * D) +
     0.213618 * Math.sin(2 * MPrime) -
     0.185116 * Math.sin(M) -
     0.114332 * Math.sin(2 * F)) * DEG2RAD;

  const b = (5.128122 * Math.sin(F) +
             0.280602 * Math.sin(MPrime + F) +
             0.277693 * Math.sin(MPrime - F) +
             0.173237 * Math.sin(2 * D - F)) * DEG2RAD;

  const distKm = 385000.56 -
    20905.355 * Math.cos(MPrime) -
    3699.111 * Math.cos(2 * D - MPrime) -
    2955.968 * Math.cos(2 * D) -
    569.925 * Math.cos(2 * MPrime);

  const x = distKm * Math.cos(b) * Math.cos(l);
  const y = distKm * Math.cos(b) * Math.sin(l);
  const z = distKm * Math.sin(b);

  return {
    positionKm: { x, y, z },
    distanceKm: distKm
  };
}
