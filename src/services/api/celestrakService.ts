import { PropagatedSatelliteState, propagateTle, generateOrbitPath } from '../calculations/sgp4';
import { CacheService } from '../cache/storage';
import { Vector3D } from '../../types/space';
import { SourceMetadata } from '../../types/telemetry';

export interface SatelliteTrackData {
  noradId: number;
  name: string;
  line1: string;
  line2: string;
  epochStr: string;
  state: PropagatedSatelliteState | null;
  orbitPath: Vector3D[];
  telemetrySource: SourceMetadata;
}

export class CelestrakService {
  private static BASE_URL = 'https://celestrak.org/NORAD/elements/gp.php';

  static async fetchSatelliteTle(noradId: number): Promise<{ name: string; line1: string; line2: string } | null> {
    const cacheKey = `tle_${noradId}`;
    const cached = CacheService.get<{ name: string; line1: string; line2: string }>(cacheKey, true);

    // If cache is fresh (less than 2 hours old), use it
    if (cached.data && !cached.isStale) {
      return cached.data;
    }

    try {
      const url = `${this.BASE_URL}?CATNR=${noradId}&FORMAT=TLE`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);

      if (lines.length >= 3) {
        const data = {
          name: lines[0],
          line1: lines[1],
          line2: lines[2]
        };
        // Cache for 3 hours
        CacheService.set(cacheKey, data, 10800);
        return data;
      } else if (lines.length === 2) {
        const data = {
          name: `NORAD ${noradId}`,
          line1: lines[0],
          line2: lines[1]
        };
        CacheService.set(cacheKey, data, 10800);
        return data;
      }
      return cached.data || null;
    } catch {
      return cached.data || null;
    }
  }

  static async getPropagatedSatellite(noradId: number, date: Date = new Date()): Promise<SatelliteTrackData | null> {
    const tle = await this.fetchSatelliteTle(noradId);
    if (!tle) return null;

    const state = propagateTle(tle.line1, tle.line2, date);
    const orbitPath = generateOrbitPath(tle.line1, tle.line2, date, 90);

    // Parse epoch from TLE line 1 (columns 19-32)
    // Format: yyddd.ffffffff
    const epochPart = tle.line1.substring(18, 32).trim();

    return {
      noradId,
      name: tle.name,
      line1: tle.line1,
      line2: tle.line2,
      epochStr: epochPart ? `20${epochPart.substring(0, 2)} Day ${epochPart.substring(2)}` : 'Current Epoch',
      state,
      orbitPath,
      telemetrySource: {
        sourceName: 'CelesTrak (NORAD GP OMM Elements)',
        sourceUrl: `https://celestrak.org/NORAD/elements/gp.php?CATNR=${noradId}`,
        timestamp: date.toISOString(),
        status: 'CALCULATED',
        statusNote: 'Propagated using SGP4/SDP4 from latest authoritative CelesTrak orbital elements',
        updateFrequency: 'Updated multiple times daily by 18th Space Defense Squadron'
      }
    };
  }
}
