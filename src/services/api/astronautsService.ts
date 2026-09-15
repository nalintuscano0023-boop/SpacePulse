import { CrewReport, AstronautCrewMember } from '../../types/missions';
import { CacheService } from '../cache/storage';

export class AstronautsService {
  private static URL = 'http://api.open-notify.org/astros.json';

  static async fetchActiveAstronauts(): Promise<CrewReport> {
    const cacheKey = 'open_notify_astronauts';
    const cached = CacheService.get<CrewReport>(cacheKey, true);

    try {
      const res = await fetch(this.URL, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.message === 'success' && Array.isArray(data.people)) {
        const craftsMap = new Map<string, AstronautCrewMember[]>();

        for (const person of data.people) {
          const craft = person.craft || 'Orbit';
          if (!craftsMap.has(craft)) {
            craftsMap.set(craft, []);
          }
          craftsMap.get(craft)!.push({
            name: person.name,
            craft: person.craft
          });
        }

        const crafts = Array.from(craftsMap.entries()).map(([craftName, astronauts]) => ({
          craftName,
          astronauts
        }));

        const report: CrewReport = {
          timestamp: new Date().toISOString(),
          totalInOrbit: data.number || data.people.length,
          crafts,
          sourceName: 'Open-Notify Public Space Station Manifest',
          sourceUrl: 'http://open-notify.org/',
          status: 'LIVE'
        };

        CacheService.set(cacheKey, report, 3600); // 1 hour cache
        return report;
      }
      return cached.data || this.getFallbackReport();
    } catch {
      return cached.data || this.getFallbackReport();
    }
  }

  private static getFallbackReport(): CrewReport {
    return {
      timestamp: '2026-09-15T00:00:00Z',
      totalInOrbit: 10,
      crafts: [
        {
          craftName: 'ISS',
          astronauts: [
            { name: 'Oleg Kononenko', craft: 'ISS', role: 'Commander', agency: 'Roscosmos' },
            { name: 'Nikolai Chub', craft: 'ISS', role: 'Flight Engineer', agency: 'Roscosmos' },
            { name: 'Tracy Caldwell Dyson', craft: 'ISS', role: 'Flight Engineer', agency: 'NASA' },
            { name: 'Matthew Dominick', craft: 'ISS', role: 'Flight Engineer', agency: 'NASA' },
            { name: 'Michael Barratt', craft: 'ISS', role: 'Flight Engineer', agency: 'NASA' },
            { name: 'Jeanette Epps', craft: 'ISS', role: 'Flight Engineer', agency: 'NASA' },
            { name: 'Sunita Williams', craft: 'ISS', role: 'Flight Engineer', agency: 'NASA' }
          ]
        },
        {
          craftName: 'Tiangong',
          astronauts: [
            { name: 'Ye Guangfu', craft: 'Tiangong', role: 'Commander', agency: 'CMSA' },
            { name: 'Li Cong', craft: 'Tiangong', role: 'Operator', agency: 'CMSA' },
            { name: 'Li Guangsu', craft: 'Tiangong', role: 'Systems Operator', agency: 'CMSA' }
          ]
        }
      ],
      sourceName: 'Public Expedition Flight Manifest',
      sourceUrl: 'https://www.nasa.gov/humans-in-space/international-space-station/',
      status: 'LAST_AVAILABLE'
    };
  }
}
