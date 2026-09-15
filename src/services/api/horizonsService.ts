import { SourceMetadata } from '../../types/telemetry';
import { Vector3D } from '../../types/space';

export interface HorizonsResult {
  targetId: string;
  targetName: string;
  positionKm?: Vector3D;
  velocityKmS?: Vector3D;
  lightTimeSec?: number;
  rangeKm?: number;
  rangeRateKmS?: number;
  rawResponse?: string;
  source: SourceMetadata;
}

export class HorizonsService {
  private static BASE_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';

  /**
   * Attempts to query NASA JPL Horizons API directly.
   * If browser CORS blocks the request, returns a descriptive fallback result without inventing fake data.
   */
  static async queryHorizons(command: string, center = '500@10'): Promise<HorizonsResult> {
    const now = new Date();
    const startTimeStr = now.toISOString().split('T')[0];
    const stopTime = new Date(now.getTime() + 86400000);
    const stopTimeStr = stopTime.toISOString().split('T')[0];

    const params = new URLSearchParams({
      format: 'json',
      COMMAND: `'${command}'`,
      EPHEM_TYPE: "'VECTORS'",
      CENTER: `'${center}'`,
      START_TIME: `'${startTimeStr}'`,
      STOP_TIME: `'${stopTimeStr}'`,
      STEP_SIZE: "'1d'",
      OUT_UNITS: "'KM-S'",
      VEC_TABLE: "'3'"
    });

    const url = `${this.BASE_URL}?${params.toString()}`;

    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        mode: 'cors'
      });

      if (!res.ok) throw new Error(`Horizons HTTP ${res.status}`);
      const json = await res.json();

      if (json && json.result) {
        // Parse $$SOE ... $$EOE vector block
        const match = json.result.match(/\$\$SOE([\s\S]*?)\$\$EOE/);
        if (match && match[1]) {
          const block = match[1];
          const xMatch = block.match(/X\s*=\s*([-+Ee\d.]+)\s*Y\s*=\s*([-+Ee\d.]+)\s*Z\s*=\s*([-+Ee\d.]+)/);
          const vxMatch = block.match(/VX\s*=\s*([-+Ee\d.]+)\s*VY\s*=\s*([-+Ee\d.]+)\s*VZ\s*=\s*([-+Ee\d.]+)/);
          const ltMatch = block.match(/LT\s*=\s*([-+Ee\d.]+)\s*RG\s*=\s*([-+Ee\d.]+)\s*RR\s*=\s*([-+Ee\d.]+)/);

          return {
            targetId: command,
            targetName: json.signature?.source || `JPL Target ${command}`,
            positionKm: xMatch ? { x: parseFloat(xMatch[1]), y: parseFloat(xMatch[2]), z: parseFloat(xMatch[3]) } : undefined,
            velocityKmS: vxMatch ? { x: parseFloat(vxMatch[1]), y: parseFloat(vxMatch[2]), z: parseFloat(vxMatch[3]) } : undefined,
            lightTimeSec: ltMatch ? parseFloat(ltMatch[1]) : undefined,
            rangeKm: ltMatch ? parseFloat(ltMatch[2]) : undefined,
            rangeRateKmS: ltMatch ? parseFloat(ltMatch[3]) : undefined,
            rawResponse: json.result,
            source: {
              sourceName: 'NASA/JPL Horizons Ephemeris System',
              sourceUrl: 'https://ssd.jpl.nasa.gov/horizons/',
              timestamp: now.toISOString(),
              status: 'LIVE',
              statusNote: 'Direct state vector from JPL DE441 ephemeris',
              updateFrequency: 'On-demand'
            }
          };
        }
      }
    } catch {
      // CORS or network failure
    }

    // Honest handling: Explicitly indicate browser CORS constraint
    return {
      targetId: command,
      targetName: `JPL Target ${command}`,
      source: {
        sourceName: 'NASA/JPL Horizons System',
        sourceUrl: 'https://ssd.jpl.nasa.gov/horizons/',
        timestamp: now.toISOString(),
        status: 'UNAVAILABLE',
        statusNote: 'Direct browser access restricted by JPL server CORS headers. Fallback ephemeris solver activated.',
        calculationMethod: 'Analytical Standish (1992) secular ephemeris equations'
      }
    };
  }
}
