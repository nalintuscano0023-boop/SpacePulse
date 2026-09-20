import { SpaceWeatherSummary, SpaceWeatherAlert, SolarWindData, KpIndexData, GoesXrayData } from '../../types/weather';
import { CacheService } from '../cache/storage';

export class NoaaService {
  private static BASE_URL = import.meta.env.VITE_NOAA_SWPC_URL || 'https://services.swpc.noaa.gov';

  static async fetchSpaceWeatherSummary(): Promise<SpaceWeatherSummary> {
    const cacheKey = 'noaa_swpc_summary';
    const cached = CacheService.get<SpaceWeatherSummary>(cacheKey, true);

    try {
      const [solarWindRes, kpRes, xrayRes, alertsRes] = await Promise.allSettled([
        fetch(`${this.BASE_URL}/products/summary/solar-wind-speed.json`, { signal: AbortSignal.timeout(6000) }),
        fetch(`${this.BASE_URL}/products/noaa-planetary-k-index.json`, { signal: AbortSignal.timeout(6000) }),
        fetch(`${this.BASE_URL}/json/goes/primary/xrays-6-hour.json`, { signal: AbortSignal.timeout(6000) }),
        fetch(`${this.BASE_URL}/products/alerts.json`, { signal: AbortSignal.timeout(6000) })
      ]);

      // 1. Parse Solar Wind
      let solarWind: SolarWindData | null = null;
      if (solarWindRes.status === 'fulfilled' && solarWindRes.value.ok) {
        const swData = await solarWindRes.value.json();
        if (Array.isArray(swData) && swData.length > 0) {
          const latest = swData[0];
          solarWind = {
            protonSpeedKmS: latest.proton_speed,
            timestamp: latest.time_tag,
            source: {
              sourceName: 'NOAA SWPC (DSCOVR / ACE Satellite)',
              sourceUrl: 'https://www.swpc.noaa.gov/',
              timestamp: latest.time_tag,
              status: 'LIVE',
              statusNote: 'Real-time solar wind plasma proton speed',
              updateFrequency: 'Updated every 1-5 minutes'
            }
          };
        }
      }

      // 2. Parse Planetary Kp Index
      let kpIndex: KpIndexData | null = null;
      if (kpRes.status === 'fulfilled' && kpRes.value.ok) {
        const kpData = await kpRes.value.json();
        if (Array.isArray(kpData) && kpData.length > 0) {
          const latest = kpData[kpData.length - 1];
          kpIndex = {
            kp: latest.Kp,
            aRunning: latest.a_running,
            timestamp: latest.time_tag,
            source: {
              sourceName: 'NOAA SWPC Planetary K-Index Network',
              sourceUrl: 'https://www.swpc.noaa.gov/products/planetary-k-index',
              timestamp: latest.time_tag,
              status: 'LIVE',
              statusNote: 'Real-time geomagnetic activity indicator',
              updateFrequency: '3-hour synoptic period'
            }
          };
        }
      }

      // 3. Parse GOES X-ray Flux
      let goesXray: GoesXrayData | null = null;
      if (xrayRes.status === 'fulfilled' && xrayRes.value.ok) {
        const xrayData = await xrayRes.value.json();
        if (Array.isArray(xrayData) && xrayData.length > 0) {
          // Look for 0.1-0.8 nm band (primary for solar flare classification)
          const primaryEntries = xrayData.filter(x => x.energy === '0.1-0.8nm');
          const latest = primaryEntries.length > 0 ? primaryEntries[primaryEntries.length - 1] : xrayData[xrayData.length - 1];
          
          const flux = latest.flux || latest.observed_flux;
          let flareClass: 'A' | 'B' | 'C' | 'M' | 'X' = 'A';
          if (flux >= 1e-4) flareClass = 'X';
          else if (flux >= 1e-5) flareClass = 'M';
          else if (flux >= 1e-6) flareClass = 'C';
          else if (flux >= 1e-7) flareClass = 'B';

          goesXray = {
            energyBand: latest.energy || '0.1-0.8nm',
            flux,
            flareClass,
            timestamp: latest.time_tag,
            source: {
              sourceName: 'NOAA GOES-18 Primary Solar X-ray Sensor',
              sourceUrl: 'https://www.swpc.noaa.gov/products/goes-x-ray-flux',
              timestamp: latest.time_tag,
              status: 'LIVE',
              statusNote: 'Solar flare monitoring in 0.1-0.8 nm band',
              updateFrequency: '1-minute cadence'
            }
          };
        }
      }

      // 4. Parse Alerts
      const activeAlerts: SpaceWeatherAlert[] = [];
      if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
        const alertsData = await alertsRes.value.json();
        if (Array.isArray(alertsData)) {
          // Take top 8 latest alerts
          for (let i = 0; i < Math.min(8, alertsData.length); i++) {
            const raw = alertsData[i];
            let severity: SpaceWeatherAlert['severity'] = 'INFO';
            if (raw.message?.includes('ALERT')) severity = 'ALERT';
            else if (raw.message?.includes('WARNING')) severity = 'WARNING';
            else if (raw.message?.includes('WATCH')) severity = 'WATCH';

            // Extract first line or headline
            const lines = (raw.message || '').split('\n').map((l: string) => l.trim()).filter(Boolean);
            const summary = lines.find((l: string) => l.startsWith('ALERT:') || l.startsWith('WARNING:') || l.startsWith('WATCH:') || l.startsWith('SUMMARY:')) || lines[0] || 'Space Weather Notice';

            activeAlerts.push({
              id: `${raw.product_id}_${raw.issue_datetime}`,
              issueDateTime: raw.issue_datetime,
              messageCode: raw.product_id,
              summary,
              description: raw.message,
              severity
            });
          }
        }
      }

      // Determine overall status
      let overallStatus: SpaceWeatherSummary['overallStatus'] = 'NOMINAL';
      if (kpIndex && kpIndex.kp >= 5) {
        overallStatus = 'ACTIVE_STORM';
      } else if (kpIndex && kpIndex.kp >= 4) {
        overallStatus = 'UNSETTLED';
      }

      const summary: SpaceWeatherSummary = {
        solarWind,
        kpIndex,
        goesXray,
        activeAlerts,
        overallStatus,
        lastUpdated: new Date().toISOString()
      };

      // Cache for 2 minutes
      CacheService.set(cacheKey, summary, 120);
      return summary;
    } catch (err) {
      if (cached.data) {
        return {
          ...cached.data,
          overallStatus: cached.data.overallStatus,
          lastUpdated: cached.cachedAt || new Date().toISOString()
        };
      }
      return {
        solarWind: null,
        kpIndex: null,
        goesXray: null,
        activeAlerts: [],
        overallStatus: 'DATA_UNAVAILABLE',
        lastUpdated: new Date().toISOString()
      };
    }
  }
}
