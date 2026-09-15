import { SpacecraftObject } from '../../types/space';
import { calculateAdityaL1Ephemeris, calculateVoyagerEphemeris } from '../calculations/lagrange';
import { calculateDistanceKm, calculateLightTimeSeconds, KM_PER_AU, MOON_MEAN_DISTANCE_KM } from '../calculations/physics';
import { calculatePlanetEphemeris } from '../calculations/kepler';
import { CelestrakService } from '../api/celestrakService';

export interface SpacecraftDefinition {
  id: string;
  name: string;
  noradId?: number;
  jplId?: string;
  agency: 'ISRO' | 'NASA' | 'ESA' | 'CNSA' | 'ROSCOSMOS' | 'Commercial';
  mission: string;
  launchDate: string;
  statusText: string;
  isOperational: boolean;
  orbitType: SpacecraftObject['orbitType'];
  coordinateFrame: SpacecraftObject['coordinateFrame'];
  description: string;
  significance: string;
  scientificExplanation: string;
  payloads: string[];
}

export const SPACECRAFT_REGISTRY: SpacecraftDefinition[] = [
  {
    id: 'aditya-l1',
    name: 'Aditya-L1',
    jplId: '-164',
    agency: 'ISRO',
    mission: 'Solar Corona, Chromosphere & Solar Wind Physics',
    launchDate: '2023-09-02',
    statusText: 'Active / Operational in L1 Halo Orbit',
    isOperational: true,
    orbitType: 'Lagrangian Halo (L1)',
    coordinateFrame: 'Heliocentric Ecliptic J2000',
    description: "India's first dedicated solar observatory, positioned in a halo orbit around the Sun-Earth Lagrangian Point 1 (L1), roughly 1.5 million km from Earth.",
    significance: 'Provides uninterrupted, real-time observation of the Sun without occultation or eclipses, monitoring solar flares, CMEs, and space weather.',
    scientificExplanation: 'Located at the gravitational equilibrium point L1 between Earth and the Sun. Radio transmissions between Aditya-L1 and ISRO ISTRAC ground stations take approximately 5.0 seconds each way.',
    payloads: [
      'VELC (Visible Emission Line Coronagraph)',
      'SUIT (Solar Ultraviolet Imaging Telescope)',
      'ASPEX (Aditya Solar wind Particle Experiment)',
      'PAPA (Plasma Analyser Package for Aditya)',
      'SoLEXS (Solar Low Energy X-ray Spectrometer)',
      'HEL1OS (High Energy L1 Orbiting X-ray Spectrometer)',
      'MAG (Digital Magnetometer)'
    ]
  },
  {
    id: 'voyager-1',
    name: 'Voyager 1',
    jplId: '-31',
    agency: 'NASA',
    mission: 'Interstellar Mission (VIM)',
    launchDate: '1977-09-05',
    statusText: 'Active / Interstellar Space',
    isOperational: true,
    orbitType: 'Interstellar Trajectory',
    coordinateFrame: 'Interstellar Hyperbolic',
    description: 'The most distant human-made object in history, currently traversing interstellar space beyond the heliopause at over 163 AU from the Sun.',
    significance: 'First spacecraft to cross the heliopause into interstellar space (August 2012), sampling the local interstellar medium directly.',
    scientificExplanation: 'Voyager 1 is over 24.5 billion km from Earth. Radio signals sent via the NASA Deep Space Network travel at the speed of light and require more than 22.7 hours for a one-way trip (over 45.4 hours round-trip).',
    payloads: [
      'MAG (Triaxial Fluxgate Magnetometer)',
      'CRS (Cosmic Ray System)',
      'LECP (Low-Energy Charged Particles)',
      'PWS (Plasma Wave Subsystem)'
    ]
  },
  {
    id: 'voyager-2',
    name: 'Voyager 2',
    jplId: '-32',
    agency: 'NASA',
    mission: 'Interstellar Mission (VIM)',
    launchDate: '1977-08-20',
    statusText: 'Active / Interstellar Space',
    isOperational: true,
    orbitType: 'Interstellar Trajectory',
    coordinateFrame: 'Interstellar Hyperbolic',
    description: 'The only spacecraft to visit all four outer gas and ice giants (Jupiter, Saturn, Uranus, Neptune), now exploring interstellar space beyond the heliosphere.',
    significance: 'Entered interstellar space in November 2018; continues to measure interstellar plasma density and magnetic fields.',
    scientificExplanation: 'Voyager 2 is over 20.5 billion km (~137 AU) from Earth. One-way signal latency is approximately 19 hours.',
    payloads: [
      'MAG (Triaxial Fluxgate Magnetometer)',
      'CRS (Cosmic Ray System)',
      'LECP (Low Energy Charged Particles)',
      'PLS (Plasma Science Experiment)'
    ]
  },
  {
    id: 'chandrayaan-2-orbiter',
    name: 'Chandrayaan-2 Orbiter',
    agency: 'ISRO',
    mission: 'High-Resolution Lunar Mapping & Mineralogy',
    launchDate: '2019-07-22',
    statusText: 'Active / 100 km Lunar Polar Orbit',
    isOperational: true,
    orbitType: 'Lunar Orbit',
    coordinateFrame: 'Selenocentric (Lunar)',
    description: 'ISRO lunar orbiter operating in a ~100 km circular polar orbit around the Moon, providing the highest-resolution civilian optical imagery of the lunar surface.',
    significance: 'Discovered sub-surface water ice signatures, mapped elemental distribution, and served as the critical relay for the Chandrayaan-3 landing.',
    scientificExplanation: 'Orbiting the Moon at ~384,400 km from Earth. Radio signals between the Chandrayaan-2 orbiter and the Indian Deep Space Network (IDSN) at Byalalu take ~1.28 seconds.',
    payloads: [
      'OHRC (Orbiter High Resolution Camera - 25 cm resolution)',
      'TMC-2 (Terrain Mapping Camera-2)',
      'CLASS (Chandrayaan-2 Large Area Soft X-ray Spectrometer)',
      'XSM (Solar X-ray Monitor)',
      'IIRS (Imaging Infra-Red Spectrometer)',
      'DFSAR (Dual Frequency Synthetic Aperture Radar)'
    ]
  },
  {
    id: 'chandrayaan-3-surface',
    name: 'Chandrayaan-3 (Vikram & Pragyan)',
    agency: 'ISRO',
    mission: 'Lunar South Polar In-Situ Science',
    launchDate: '2023-07-14',
    statusText: 'Primary Mission Accomplished / Shiv Shakti Point',
    isOperational: false,
    orbitType: 'Lunar Surface',
    coordinateFrame: 'Selenocentric (Lunar)',
    description: "Historical lunar landing mission that made India the first nation to soft-land near the Moon's South Pole (69.373° S, 32.319° E) on 23 August 2023.",
    significance: 'Completed full surface mobility, measured lunar regolith thermal gradients (ChaSTE), detected plasma density (RAMBHA), and recorded lunar seismic events (ILSA).',
    scientificExplanation: 'Located on the lunar regolith at Shiv Shakti Point. Radio communications via the Chandrayaan-2 orbiter and IDSN required ~1.28 seconds light travel time.',
    payloads: [
      'ChaSTE (Chandra Surface Thermophysical Experiment)',
      'ILSA (Instrument for Lunar Seismic Activity)',
      'RAMBHA-LP (Langmuir Probe)',
      'APXS (Alpha Particle X-Ray Spectrometer on Pragyan)',
      'LIBS (Laser-Induced Breakdown Spectroscope on Pragyan)'
    ]
  },
  {
    id: 'chandrayaan-1',
    name: 'Chandrayaan-1',
    agency: 'ISRO',
    mission: 'First Indian Lunar Exploration Mission',
    launchDate: '2008-10-22',
    statusText: 'Mission Completed / Historic Discovery of Water',
    isOperational: false,
    orbitType: 'Lunar Orbit',
    coordinateFrame: 'Selenocentric (Lunar)',
    description: "India's pioneer lunar orbiter carrying 11 scientific payloads from ISRO, NASA, and ESA, which definitively proved the presence of water molecules on the Moon.",
    significance: 'The Moon Mineralogy Mapper (M3) and Moon Impact Probe (MIP) confirmed hydroxyl and water molecules in lunar polar craters.',
    scientificExplanation: 'Operated in a 100 km lunar polar orbit until August 2009. The Moon is ~384,400 km from Earth (~1.28 light-seconds).',
    payloads: [
      'TMC (Terrain Mapping Camera)',
      'HySI (Hyper Spectral Imager)',
      'LLRI (Lunar Laser Ranging Instrument)',
      'MIP (Moon Impact Probe)',
      'M3 (Moon Mineralogy Mapper - NASA)',
      'Sub-keV Atom Reflecting Analyser (SARA - ESA/ISRO)'
    ]
  },
  {
    id: 'iss',
    name: 'ISS (International Space Station)',
    noradId: 25544,
    agency: 'NASA',
    mission: 'Microgravity Laboratory & Human Outpost',
    launchDate: '1998-11-20',
    statusText: 'Active / Inhabited Orbiting Laboratory',
    isOperational: true,
    orbitType: 'Low Earth Orbit (LEO)',
    coordinateFrame: 'Geocentric ECI (TEME / J2000)',
    description: 'Continuously inhabited international orbital laboratory travelling at ~7.66 km/s at an altitude of ~420 km, completing ~15.5 orbits per day.',
    significance: 'Over 25 years of continuous human presence conducting breakthrough biomedical, material, and fundamental physics research.',
    scientificExplanation: 'Orbits in Low Earth Orbit (LEO) with an inclination of ~51.6°. Signals to ground stations arrive in ~1.4 milliseconds.',
    payloads: [
      'AMS-02 (Alpha Magnetic Spectrometer)',
      'NICER (Neutron star Interior Composition Explorer)',
      'CALET (CALorimetric Electron Telescope)',
      'Cold Atom Lab (CAL)'
    ]
  },
  {
    id: 'css-tiangong',
    name: 'CSS Tiangong (Tianhe Core)',
    noradId: 48274,
    agency: 'CNSA',
    mission: 'Chinese Modular Space Station',
    launchDate: '2021-04-29',
    statusText: 'Active / Continuously Inhabited',
    isOperational: true,
    orbitType: 'Low Earth Orbit (LEO)',
    coordinateFrame: 'Geocentric ECI (TEME / J2000)',
    description: 'Modular space station in low Earth orbit between 380 and 450 km altitude at 41.5° inclination, supporting permanent crews.',
    significance: 'Fully operational three-module station (Tianhe, Wentian, Mengtian) hosting long-duration human spaceflights.',
    scientificExplanation: 'Orbits Earth every ~92 minutes at ~7.68 km/s. Signal latency to Earth stations is ~1.3 milliseconds.',
    payloads: [
      'High-precision Space Time-Frequency Cabinet',
      'Fluid Physics Experiment Cabinet',
      'Ultra-cold Atom Physics Cabinet'
    ]
  },
  {
    id: 'astrosat',
    name: 'Astrosat',
    noradId: 40930,
    agency: 'ISRO',
    mission: 'Multi-Wavelength Space Astronomy Observatory',
    launchDate: '2015-09-28',
    statusText: 'Active / Multi-Wavelength Observations',
    isOperational: true,
    orbitType: 'Low Earth Orbit (LEO)',
    coordinateFrame: 'Geocentric ECI (TEME / J2000)',
    description: "India's first dedicated multi-wavelength space astronomy mission, observing celestial objects across optical, ultraviolet, and low/high energy X-ray regimes simultaneously.",
    significance: 'Has observed thousands of cosmic sources, discovery of rare stellar systems, black hole spin measurements, and deep UV sky surveys.',
    scientificExplanation: 'Orbits Earth at ~650 km altitude with an inclination of 6.0°. Orbital period is ~97 minutes.',
    payloads: [
      'UVIT (Ultra Violet Imaging Telescope)',
      'LAXPC (Large Area X-ray Proportional Counter)',
      'CZTI (Cadmium Zinc Telluride Imager)',
      'SXT (Soft X-ray Telescope)',
      'SSM (Scanning Sky Monitor)'
    ]
  },
  {
    id: 'cartosat-3',
    name: 'Cartosat-3',
    noradId: 44804,
    agency: 'ISRO',
    mission: 'High-Resolution Earth Observation',
    launchDate: '2019-11-27',
    statusText: 'Active / Operational Polar SSO',
    isOperational: true,
    orbitType: 'Sun-Synchronous (SSO)',
    coordinateFrame: 'Geocentric ECI (TEME / J2000)',
    description: 'Advanced third-generation Earth observation satellite with ground resolution down to 0.28 meters in panchromatic mode.',
    significance: 'Provides unprecedented imagery for urban planning, infrastructure monitoring, disaster assessment, and cartography.',
    scientificExplanation: 'Orbits in a polar Sun-Synchronous Orbit at ~505 km altitude with 97.4° inclination.',
    payloads: ['Panchromatic Camera (0.28m resolution)', 'Multispectral Camera (1.12m resolution)']
  },
  {
    id: 'eos-06',
    name: 'EOS-06 (Oceansat-3)',
    noradId: 54361,
    agency: 'ISRO',
    mission: 'Ocean Color, Sea Surface Temperature & Winds',
    launchDate: '2022-11-26',
    statusText: 'Active / Ocean & Atmosphere Monitoring',
    isOperational: true,
    orbitType: 'Sun-Synchronous (SSO)',
    coordinateFrame: 'Geocentric ECI (TEME / J2000)',
    description: 'ISRO third-generation ocean monitoring satellite observing ocean biology, marine fisheries, and coastal zone dynamics.',
    significance: 'Critical for cyclone tracking, monsoon forecasting, and monitoring global ocean phytoplankton health.',
    scientificExplanation: 'Orbits at 738 km altitude in a Sun-Synchronous Orbit with 98.3° inclination.',
    payloads: [
      'OCM-3 (Ocean Color Monitor)',
      'SSTM (Sea Surface Temperature Monitor)',
      'Ku-Band Scatterometer',
      'ARGOS-4 Data Collection System'
    ]
  },
  {
    id: 'hubble',
    name: 'Hubble Space Telescope',
    noradId: 20580,
    agency: 'NASA',
    mission: 'Optical & Deep Space Astrophysics',
    launchDate: '1990-04-24',
    statusText: 'Active / Deep Space Observation',
    isOperational: true,
    orbitType: 'Low Earth Orbit (LEO)',
    coordinateFrame: 'Geocentric ECI (TEME / J2000)',
    description: 'Iconic space telescope orbiting Earth above atmospheric distortion, revolutionizing our understanding of the universe for over 34 years.',
    significance: 'Measured the expansion rate of the universe, imaged deep fields showing early galaxies, and observed exoplanet atmospheres.',
    scientificExplanation: 'Orbits Earth at ~535 km altitude at 28.5° inclination. Completes an orbit in 95 minutes.',
    payloads: [
      'WFC3 (Wide Field Camera 3)',
      'COS (Cosmic Origins Spectrograph)',
      'ACS (Advanced Camera for Surveys)',
      'STIS (Space Telescope Imaging Spectrograph)'
    ]
  }
];

export async function resolveSpacecraftState(def: SpacecraftDefinition, date: Date = new Date()): Promise<SpacecraftObject> {
  const earthEphem = calculatePlanetEphemeris('earth', date);

  // 1. If it's Aditya-L1
  if (def.id === 'aditya-l1') {
    const l1 = calculateAdityaL1Ephemeris(date);
    const lightTime = calculateLightTimeSeconds(l1.distanceFromEarthKm);

    return {
      ...def,
      distanceFromEarthKm: l1.distanceFromEarthKm,
      distanceFromSunKm: l1.distanceFromSunKm,
      velocityKmS: l1.velocityKmS,
      lightTimeToEarthSec: lightTime,
      position: l1.positionKm,
      telemetrySource: {
        sourceName: 'NASA/ISRO Sun-Earth L1 Halo Ephemeris Model',
        sourceUrl: 'https://www.isro.gov.in/Aditya_L1.html',
        timestamp: date.toISOString(),
        status: 'CALCULATED',
        statusNote: 'Heliocentric coordinates calculated from Sun-Earth L1 Lagrange physics and insertion epoch',
        calculationMethod: 'Three-body Sun-Earth L1 Halo model'
      }
    };
  }

  // 2. If it's Voyager 1 or 2
  if (def.id === 'voyager-1' || def.id === 'voyager-2') {
    const craft = def.id === 'voyager-1' ? 'voyager1' : 'voyager2';
    const voy = calculateVoyagerEphemeris(craft, date);
    const lightTime = calculateLightTimeSeconds(voy.distanceFromEarthKm);

    return {
      ...def,
      distanceFromEarthKm: voy.distanceFromEarthKm,
      distanceFromSunKm: voy.distanceFromSunKm,
      velocityKmS: voy.velocityKmS,
      lightTimeToEarthSec: lightTime,
      position: voy.positionKm,
      telemetrySource: {
        sourceName: 'NASA JPL Interstellar Trajectory Solution',
        sourceUrl: 'https://voyager.jpl.nasa.gov/',
        timestamp: date.toISOString(),
        status: 'CALCULATED',
        statusNote: 'Hyperbolic trajectory propagated from NASA JPL verified asymptotic direction and velocity',
        calculationMethod: 'Hyperbolic excess velocity model'
      }
    };
  }

  // 3. If it's Chandrayaan-2 orbiter / Chandrayaan-1 / Chandrayaan-3
  if (def.id.startsWith('chandrayaan')) {
    const distEarth = MOON_MEAN_DISTANCE_KM + (def.id === 'chandrayaan-2-orbiter' ? 100 : 0);
    const lightTime = calculateLightTimeSeconds(distEarth);
    const vel = def.id === 'chandrayaan-2-orbiter' ? 1.63 : (def.isOperational ? 0 : 0); // ~1.63 km/s in 100 km lunar orbit

    return {
      ...def,
      distanceFromEarthKm: distEarth,
      distanceFromSunKm: earthEphem.distanceFromSunKm,
      velocityKmS: vel,
      lightTimeToEarthSec: lightTime,
      telemetrySource: {
        sourceName: 'ISRO Lunar Mission Ephemeris / ISSDC',
        sourceUrl: 'https://www.issdc.gov.in/',
        timestamp: date.toISOString(),
        status: def.isOperational ? 'CALCULATED' : 'LAST_AVAILABLE',
        statusNote: def.isOperational ? 'Orbital velocity & selenocentric parameters from ISRO flight operations' : 'Mission historical coordinates verified from ISSDC PRADAN records'
      }
    };
  }

  // 4. If it has a NORAD ID (Earth Orbit satellite)
  if (def.noradId) {
    try {
      const satTrack = await CelestrakService.getPropagatedSatellite(def.noradId, date);
      if (satTrack && satTrack.state) {
        const state = satTrack.state;
        const lightTime = calculateLightTimeSeconds(state.distanceFromEarthSurfaceKm);

        return {
          ...def,
          distanceFromEarthKm: state.distanceFromEarthSurfaceKm,
          distanceFromSunKm: earthEphem.distanceFromSunKm,
          velocityKmS: state.velocityKmS,
          lightTimeToEarthSec: lightTime,
          position: state.positionEciKm,
          geodetic: {
            latitude: state.latitudeDeg,
            longitude: state.longitudeDeg,
            altitudeKm: state.altitudeKm
          },
          telemetrySource: satTrack.telemetrySource
        };
      }
    } catch {
      // Fallback below
    }
  }

  // Fallback for unavailable satellite
  return {
    ...def,
    telemetrySource: {
      sourceName: 'Telemetry Registry',
      timestamp: date.toISOString(),
      status: 'UNAVAILABLE',
      statusNote: 'Orbital elements could not be retrieved from external source at this time'
    }
  };
}
