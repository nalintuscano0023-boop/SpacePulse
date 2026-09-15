export function formatDistanceKm(km: number, compact = false): string {
  if (isNaN(km)) return 'N/A';
  if (km < 0) km = Math.abs(km);

  if (compact) {
    if (km >= 1e9) {
      return `${(km / 1e9).toFixed(2)}B km`;
    }
    if (km >= 1e6) {
      return `${(km / 1e6).toFixed(2)}M km`;
    }
    if (km >= 1e3) {
      return `${(km / 1e3).toFixed(1)}k km`;
    }
  }

  return `${Math.round(km).toLocaleString()} km`;
}

export function formatAu(au: number): string {
  if (isNaN(au)) return 'N/A';
  return `${au.toFixed(4)} AU`;
}

export function formatVelocityKmS(kmS: number): string {
  if (isNaN(kmS)) return 'N/A';
  return `${kmS.toFixed(2)} km/s`;
}

export function formatCoordinates(x: number, y: number, z: number, unit = 'km'): string {
  return `X: ${x.toFixed(1)} | Y: ${y.toFixed(1)} | Z: ${z.toFixed(1)} ${unit}`;
}

export function formatScientific(val: number, precision = 3): string {
  if (isNaN(val)) return 'N/A';
  if (Math.abs(val) < 0.001 || Math.abs(val) > 1e6) {
    return val.toExponential(precision);
  }
  return val.toFixed(precision);
}
