import type { InspectableObject, SpacecraftObject, Vector3D } from '../../types/space';
import { SPACECRAFT_REGISTRY, resolveSpacecraftState } from './spacecraftCatalog';
import { calculatePlanetEphemeris } from '../calculations/kepler';
import { 
  calculateDistanceKm, 
  calculateLightTimeSeconds, 
  MOON_MEAN_DISTANCE_KM, 
  EARTH_RADIUS_KM, 
  SUN_RADIUS_KM 
} from '../calculations/physics';

const PLANET_RADII_KM: Record<string, number> = {
  sun: SUN_RADIUS_KM,
  mercury: 2439.7,
  venus: 6051.8,
  earth: EARTH_RADIUS_KM,
  moon: 1737.4,
  mars: 3389.5,
  jupiter: 69911.0,
  saturn: 58232.0,
  uranus: 25362.0,
  neptune: 24622.0
};

const CELESTIAL_CLASSIFICATIONS: Record<string, { category: InspectableObject['category']; typeText: string; description: string; significance: string; payloads: string[] }> = {
  sun: {
    category: 'star',
    typeText: 'Yellow Dwarf Star (G2V)',
    description: 'The star at the gravitational and energetic center of our Solar System, comprising 99.86% of the system mass and driving space weather via solar wind and coronal mass ejections.',
    significance: 'Primary energy driver of planetary atmospheres and heliosphere. Monitored continuously by solar observatories like Aditya-L1 and SOHO.',
    payloads: ['Thermonuclear Core (Proton-Proton Chain)', 'Solar Photosphere & Granulation', 'Corona & Solar Wind Magnetosphere Drivers']
  },
  mercury: {
    category: 'planet',
    typeText: 'Terrestrial Planet',
    description: 'The innermost and smallest planet in the Solar System, with an extreme day-night temperature range, high density, and large iron core.',
    significance: 'Target of NASA MESSENGER and ESA/JAXA BepiColombo missions studying planetary crustal formation and magnetospheres.',
    payloads: ['High-Density Metallic Core', 'Impact Basins (Caloris Planitia)', 'Permanently Shadowed Polar Ice Deposits']
  },
  venus: {
    category: 'planet',
    typeText: 'Terrestrial Planet (Runaway Greenhouse)',
    description: 'The second planet from the Sun, enveloped in dense carbon-dioxide clouds with sulfuric acid, creating surface temperatures exceeding 465°C.',
    significance: 'Benchmark for runaway greenhouse climate dynamics; target of historical Soviet Venera probes and upcoming ISRO Shukrayaan & NASA DAVINCI.',
    payloads: ['Dense Super-Rotating CO2 Atmosphere (92 bar)', 'Volcanic Basaltic Plains & Tesserae', 'Sulfuric Acid Cloud Layers']
  },
  earth: {
    category: 'planet',
    typeText: 'Terrestrial Planet (Reference Origin)',
    description: 'The third planet from the Sun and the only astronomical body known to harbor life. Earth establishes the reference coordinate frame for geocentric satellite tracking and space telecommunications.',
    significance: 'Headquarters of global space flight operations and deep space networks (NASA DSN, ISRO ISTRAC/IDSN, ESA ESTRACK).',
    payloads: ['Hydrosphere, Biosphere & Atmosphere', 'Dipolar Geomagnetic Field (Van Allen Belts)', 'Global Ground Antennas (Deep Space Network)']
  },
  moon: {
    category: 'moon',
    typeText: 'Natural Satellite (Lunar Body)',
    description: 'Earth only natural satellite, tidally locked in synchronous rotation. Features ancient impact basins, highland anorthosites, and water-ice-bearing polar cold traps.',
    significance: 'Gateway for deep space exploration, proven water molecules discovered by Chandrayaan-1 and first south-pole landing achieved by Chandrayaan-3.',
    payloads: ['Permanently Shadowed Polar Cold Traps (Water Ice)', 'Lunar Regolith & Ilmenite Deposits', 'Laser Ranging Retroreflector Arrays']
  },
  mars: {
    category: 'planet',
    typeText: 'Terrestrial Planet',
    description: 'The fourth planet from the Sun, a cold, desert world with a thin carbon dioxide atmosphere, colossal volcanoes, and evidence of ancient liquid water flows.',
    significance: 'Most intensely explored planetary body, hosting ISRO Mars Orbiter Mission (MOM), NASA Perseverance, Curiosity, MRO, and ESA orbiters.',
    payloads: ['Olympus Mons Shield Volcano', 'Valles Marineris Chasmata System', 'Subsurface Permafrost & Glacial Ice']
  },
  jupiter: {
    category: 'planet',
    typeText: 'Gas Giant',
    description: 'The largest planet in the Solar System, more than twice as massive as all other planets combined, with iconic atmospheric bands and the Great Red Spot anticyclone.',
    significance: 'Planetary shield deflecting comets and asteroids; explored by NASA Galileo, Juno, Voyager, and upcoming ESA JUICE.',
    payloads: ['Metallic Hydrogen Mantle & Dynamo', 'Great Red Spot Persistent Anticyclone', 'Galilean Moons (Io, Europa, Ganymede, Callisto)']
  },
  saturn: {
    category: 'planet',
    typeText: 'Gas Giant (Ring System)',
    description: 'The sixth planet from the Sun, famous for its magnificent and complex ring system made of water ice particles and rocky debris.',
    significance: 'Target of the transformative NASA/ESA/ASI Cassini-Huygens mission exploring prebiotic environments on Titan and Enceladus.',
    payloads: ['Complex Water-Ice Ring System', 'Hexagonal Polar Jet Stream', 'Hydrocarbon Ocean Moons (Titan, Enceladus)']
  },
  uranus: {
    category: 'planet',
    typeText: 'Ice Giant',
    description: 'The seventh planet from the Sun, an ice giant with an extreme 97.8° axial tilt that causes extreme seasonal variations across its 84-year orbit.',
    significance: 'Unique tilted magnetosphere visited only once in human history by NASA Voyager 2 in January 1986.',
    payloads: ['Water-Methane-Ammonia Mantle', 'Retrograde Ring & Moon System', 'Tilted Off-Axis Planetary Magnetosphere']
  },
  neptune: {
    category: 'planet',
    typeText: 'Ice Giant',
    description: 'The outermost major planet in the Solar System, a vibrant deep-blue ice giant with supersonic atmospheric winds exceeding 2,100 km/h.',
    significance: 'Outermost sentinel of the planetary system, explored up close solely by NASA Voyager 2 in August 1989.',
    payloads: ['Supersonic Atmospheric Storms', 'Cryovolcanic Moon Triton (Retrograde Orbit)', 'Methane-Rich Upper Stratosphere']
  }
};

export function normalizeSpacecraftObject(craft: SpacecraftObject): InspectableObject {
  const isSatellite = craft.noradId !== undefined;
  return {
    id: craft.id,
    name: craft.name,
    category: isSatellite ? 'satellite' : 'spacecraft',
    typeText: craft.orbitType,
    agency: craft.agency,
    mission: craft.mission,
    launchDate: craft.launchDate,
    statusText: craft.statusText,
    isOperational: craft.isOperational,
    orbitType: craft.orbitType,
    coordinateFrame: craft.coordinateFrame,
    description: craft.description,
    significance: craft.significance,
    scientificExplanation: craft.scientificExplanation,
    payloads: craft.payloads,
    distanceFromEarthKm: craft.distanceFromEarthKm,
    distanceFromSunKm: craft.distanceFromSunKm,
    distanceFromMoonKm: craft.distanceFromMoonKm,
    velocityKmS: craft.velocityKmS,
    lightTimeToEarthSec: craft.lightTimeToEarthSec,
    position: craft.position,
    geodetic: craft.geodetic,
    orbitalElements: craft.orbitalElements,
    noradId: craft.noradId,
    jplId: craft.jplId,
    telemetrySource: craft.telemetrySource,
    trackingCapability: craft.trackingCapability,
    rawSpacecraft: craft
  };
}

export async function resolveInspectableObject(
  objectId: string,
  simDate: Date = new Date()
): Promise<InspectableObject | null> {
  const normalizedId = objectId.toLowerCase().trim();

  const craftDef = SPACECRAFT_REGISTRY.find(s => s.id === normalizedId || s.id === objectId);
  if (craftDef) {
    const resolvedState = await resolveSpacecraftState(craftDef, simDate);
    return normalizeSpacecraftObject(resolvedState);
  }

  const meta = CELESTIAL_CLASSIFICATIONS[normalizedId];
  if (meta) {
    const earthEphem = calculatePlanetEphemeris('earth', simDate);
    const isEarth = normalizedId === 'earth';
    const isSun = normalizedId === 'sun';
    const isMoon = normalizedId === 'moon';

    let posKm: Vector3D | undefined;
    let distSunKm: number | undefined;
    let distEarthKm: number | undefined;
    let distMoonKm: number | undefined;
    let velocityKmS: number | undefined;
    let lightTimeSec: number | undefined;

    if (isSun) {
      posKm = { x: 0, y: 0, z: 0 };
      distSunKm = 0;
      distEarthKm = earthEphem.distanceFromSunKm;
      distMoonKm = earthEphem.distanceFromSunKm;
      velocityKmS = 0;
      lightTimeSec = calculateLightTimeSeconds(distEarthKm);
    } else if (isEarth) {
      posKm = earthEphem.positionKm;
      distSunKm = earthEphem.distanceFromSunKm;
      distEarthKm = undefined;
      distMoonKm = MOON_MEAN_DISTANCE_KM;
      const v = earthEphem.velocityKmS;
      velocityKmS = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      lightTimeSec = 0;
    } else if (isMoon) {
      distEarthKm = MOON_MEAN_DISTANCE_KM;
      distSunKm = earthEphem.distanceFromSunKm;
      distMoonKm = 0;
      velocityKmS = 1.022;
      lightTimeSec = calculateLightTimeSeconds(MOON_MEAN_DISTANCE_KM);
      posKm = {
        x: earthEphem.positionKm.x + MOON_MEAN_DISTANCE_KM,
        y: earthEphem.positionKm.y,
        z: earthEphem.positionKm.z
      };
    } else {
      try {
        const ephem = calculatePlanetEphemeris(normalizedId, simDate);
        posKm = ephem.positionKm;
        distSunKm = ephem.distanceFromSunKm;
        distEarthKm = calculateDistanceKm(ephem.positionKm, earthEphem.positionKm);
        distMoonKm = undefined;
        const v = ephem.velocityKmS;
        velocityKmS = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        lightTimeSec = calculateLightTimeSeconds(distEarthKm);
      } catch (err) {
        console.error('Planetary ephemeris resolution error:', err);
      }
    }

    const titleCaseName = normalizedId === 'sun'
      ? 'Sun (Sol)'
      : normalizedId === 'moon'
      ? 'Moon (Luna)'
      : normalizedId.charAt(0).toUpperCase() + normalizedId.slice(1);

    return {
      id: normalizedId,
      name: titleCaseName,
      category: meta.category,
      typeText: meta.typeText,
      agency: isSun ? 'Solar System Core' : isMoon ? 'Earth-Moon System' : `Sol System`,
      mission: `Planetary Body // Orbiting at ${distSunKm ? (distSunKm / 149597870.7).toFixed(3) : '1.000'} AU`,
      statusText: 'Active Astronomical Body',
      isOperational: true,
      coordinateFrame: 'Heliocentric Ecliptic J2000',
      orbitType: isSun ? 'Solar Center' : isMoon ? 'Selenocentric Orbit' : 'Heliocentric Orbit',
      description: meta.description,
      significance: meta.significance,
      scientificExplanation: `Calculated from IAU J2000 astrodynamical standard models and VSOP87 planetary theory. Light travel time to Earth is ${
        lightTimeSec !== undefined ? (lightTimeSec < 60 ? `${lightTimeSec.toFixed(2)}s` : `${(lightTimeSec / 60).toFixed(1)}m`) : 'variable'
      }.`,
      payloads: meta.payloads,
      radiusKm: PLANET_RADII_KM[normalizedId],
      distanceFromEarthKm: distEarthKm,
      distanceFromSunKm: distSunKm,
      distanceFromMoonKm: distMoonKm,
      velocityKmS: velocityKmS,
      lightTimeToEarthSec: lightTimeSec,
      position: posKm,
      isEarthOrigin: isEarth,
      telemetrySource: {
        sourceName: isSun ? 'IAU Standard Solar Ephemeris' : isMoon ? 'NASA JPL Horizons / Lunar Mean Orbit' : 'VSOP87 / NASA JPL Planetary Ephemeris',
        sourceUrl: 'https://ssd.jpl.nasa.gov/',
        timestamp: simDate.toISOString(),
        status: isEarth || isSun ? 'CURRENT' : 'CALCULATED',
        statusNote: 'Keplerian state vectors propagated from authoritative epoch coordinates',
        calculationMethod: 'Analytical VSOP87 Keplerian planetary theory'
      },
      trackingCapability: {
        objectId: normalizedId,
        objectName: titleCaseName,
        objectType: meta.category,
        orbitalRegime: isMoon ? 'LUNAR_ORBIT' : 'HELIOCENTRIC',
        supportedTrackingMethod: 'KEPLERIAN_EPHEMERIS',
        source: isSun ? 'IAU Standard Solar Ephemeris' : isMoon ? 'NASA JPL Horizons / Lunar Mean Orbit' : 'VSOP87 / NASA JPL Planetary Ephemeris',
        sourceUrl: 'https://ssd.jpl.nasa.gov/',
        hasCurrentGpData: false,
        propagationSupport: !isSun,
        lastSuccessfulUpdate: simDate.toISOString(),
        dataTimestamp: simDate.toISOString(),
        status: isEarth || isSun ? 'CURRENT' : 'CALCULATED',
        statusLabel: isEarth || isSun ? 'CURRENT' : 'CALCULATED',
        statusDescription: isSun 
          ? 'Solar System origin coordinate (0,0,0)' 
          : isEarth 
          ? 'Geocentric baseline reference origin' 
          : 'Keplerian state vectors calculated from VSOP87 analytical theory',
        canFocusOnMap: true,
        canTrackVectors: !isSun,
        focusReason: `Focus ${titleCaseName} on 3D Space Map`,
        trackReason: isSun ? 'Origin coordinate frame' : `Compute heliocentric vectors and orbital distance in Analysis`
      }
    };
  }

  return null;
}
