/**
 * Central Tracking Capability System
 * Single source of truth for tracking methods, orbital regimes, authoritative sources,
 * and context-aware tracking capability resolution across SpacePulse.
 */

export type TrackingStatus = 
  | 'CURRENT' 
  | 'CALCULATED' 
  | 'LAST_AVAILABLE' 
  | 'HISTORICAL' 
  | 'DATA_UNAVAILABLE' 
  | 'SOURCE_ERROR';

export type TrackingMethod = 
  | 'SGP4_PROPAGATION'          // Earth-orbiting satellites via CelesTrak GP/TLE/OMM + satellite.js
  | 'LAGRANGE_HALO_EPHEMERIS'   // Sun-Earth L1 Halo dynamics (Aditya-L1)
  | 'KEPLERIAN_EPHEMERIS'       // Planetary ephemeris via VSOP87 / Kepler
  | 'LUNAR_ORBIT_BASELINE'      // Selenocentric 100 km polar orbit baseline (Chandrayaan-2)
  | 'LUNAR_SURFACE_FIXED'       // Fixed lunar surface landing site (Chandrayaan-3 Shiv Shakti Point)
  | 'HISTORICAL_ARCHIVE'        // Completed historical mission archives (Chandrayaan-1)
  | 'INTERSTELLAR_BASELINE'     // Deep space probe DSN baseline (Voyager 1 & 2)
  | 'NONE';                     // Unsupported / untracked

export type OrbitalRegime = 
  | 'LEO' 
  | 'SSO' 
  | 'MEO' 
  | 'GEO' 
  | 'HEO' 
  | 'SUN_EARTH_L1' 
  | 'LUNAR_ORBIT' 
  | 'LUNAR_SURFACE' 
  | 'INTERSTELLAR' 
  | 'HELIOCENTRIC';

export interface TrackingCapability {
  objectId: string;
  objectName: string;
  objectType: 'satellite' | 'spacecraft' | 'planet' | 'probe' | 'station' | 'moon' | 'star';
  orbitalRegime: OrbitalRegime;
  supportedTrackingMethod: TrackingMethod;
  source: string;
  sourceUrl?: string;
  noradId?: number;
  jplId?: string;
  hasCurrentGpData: boolean;
  propagationSupport: boolean;
  lastSuccessfulUpdate?: string;
  dataTimestamp?: string;
  status: TrackingStatus;
  statusLabel: string;
  statusDescription: string;
  canFocusOnMap: boolean;
  canTrackVectors: boolean;
  focusReason: string;
  trackReason: string;
}

export interface SatelliteTrackContext {
  noradId: number;
  isLiveGp: boolean;
  epochDate?: Date;
  epochStr?: string;
  orbitClass?: 'LEO' | 'SSO' | 'MEO' | 'GEO' | 'HEO';
  timestamp?: string;
  hasValidState: boolean;
}

/**
 * Derives human-readable status labels and contextual descriptions.
 */
export function getStatusPresentation(
  status: TrackingStatus, 
  method: TrackingMethod, 
  dataTimestamp?: string,
  extraContext?: string
): { statusLabel: string; statusDescription: string } {
  switch (status) {
    case 'CURRENT':
      return {
        statusLabel: 'CURRENT TRACKING',
        statusDescription: 'Position calculated from current GP data'
      };
    case 'CALCULATED':
      if (method === 'SGP4_PROPAGATION') {
        return {
          statusLabel: 'CALCULATED',
          statusDescription: 'Position propagated using SGP4 from verified GP orbital elements'
        };
      }
      if (method === 'LAGRANGE_HALO_EPHEMERIS') {
        return {
          statusLabel: 'CALCULATED',
          statusDescription: 'Position propagated from Sun-Earth L1 Lagrange physics and insertion epoch'
        };
      }
      return {
        statusLabel: 'CALCULATED',
        statusDescription: 'State vectors calculated from authoritative astrodynamical standard models'
      };
    case 'LAST_AVAILABLE':
      return {
        statusLabel: 'LAST AVAILABLE',
        statusDescription: dataTimestamp 
          ? `Latest supported ephemeris available: ${new Date(dataTimestamp).toLocaleDateString()}`
          : extraContext || 'Latest supported orbital ephemeris available'
      };
    case 'HISTORICAL':
      return {
        statusLabel: 'HISTORICAL',
        statusDescription: extraContext || 'No current tracking source is available for this mission'
      };
    case 'DATA_UNAVAILABLE':
      return {
        statusLabel: 'DATA UNAVAILABLE',
        statusDescription: extraContext || 'No supported public ephemeris is currently available'
      };
    case 'SOURCE_ERROR':
      return {
        statusLabel: 'SOURCE ERROR',
        statusDescription: 'Tracking source could not be reached'
      };
  }
}

/**
 * Base capability definitions for all known spacecraft in the catalog.
 * Guarantees every spacecraft is cataloged with its real physical regime and supported tracking method.
 */
interface BaseSpacecraftCapabilityDef {
  id: string;
  name: string;
  objectType: TrackingCapability['objectType'];
  orbitalRegime: OrbitalRegime;
  supportedTrackingMethod: TrackingMethod;
  source: string;
  sourceUrl?: string;
  noradId?: number;
  jplId?: string;
  canFocusOnMap: boolean;
  canTrackVectors: boolean;
  focusReason: string;
  trackReason: string;
  defaultStatus: TrackingStatus;
  statusContext?: string;
}

const SPACECRAFT_CAPABILITY_REGISTRY: Record<string, BaseSpacecraftCapabilityDef> = {
  'aditya-l1': {
    id: 'aditya-l1',
    name: 'Aditya-L1',
    objectType: 'spacecraft',
    orbitalRegime: 'SUN_EARTH_L1',
    supportedTrackingMethod: 'LAGRANGE_HALO_EPHEMERIS',
    source: 'ISRO / NASA Sun-Earth L1 Halo Model',
    sourceUrl: 'https://www.isro.gov.in/Aditya_L1.html',
    jplId: '-164',
    canFocusOnMap: true,
    canTrackVectors: true,
    focusReason: 'Focus Aditya-L1 in 3D Space Map at Sun-Earth L1',
    trackReason: 'Compute real-time heliocentric vectors and Lagrange halo dynamics in Analysis',
    defaultStatus: 'CALCULATED',
    statusContext: 'Position propagated from Sun-Earth L1 Lagrange physics and insertion epoch'
  },
  'voyager-1': {
    id: 'voyager-1',
    name: 'Voyager 1',
    objectType: 'probe',
    orbitalRegime: 'INTERSTELLAR',
    supportedTrackingMethod: 'INTERSTELLAR_BASELINE',
    source: 'NASA JPL Deep Space Network',
    sourceUrl: 'https://voyager.jpl.nasa.gov/',
    jplId: '-31',
    canFocusOnMap: true,
    canTrackVectors: true,
    focusReason: 'Focus Voyager 1 in 3D Space Map (Interstellar trajectory at ~164 AU)',
    trackReason: 'Track Voyager 1 interstellar escape vectors (~17.0 km/s relative to Sun)',
    defaultStatus: 'CALCULATED',
    statusContext: 'State vector propagated from NASA JPL DSN interstellar ephemeris baseline'
  },
  'voyager-2': {
    id: 'voyager-2',
    name: 'Voyager 2',
    objectType: 'probe',
    orbitalRegime: 'INTERSTELLAR',
    supportedTrackingMethod: 'INTERSTELLAR_BASELINE',
    source: 'NASA JPL Deep Space Network',
    sourceUrl: 'https://voyager.jpl.nasa.gov/',
    jplId: '-32',
    canFocusOnMap: true,
    canTrackVectors: true,
    focusReason: 'Focus Voyager 2 in 3D Space Map (Interstellar trajectory at ~138 AU)',
    trackReason: 'Track Voyager 2 interstellar escape vectors (~15.4 km/s relative to Sun)',
    defaultStatus: 'CALCULATED',
    statusContext: 'State vector propagated from NASA JPL DSN interstellar ephemeris baseline'
  },
  'chandrayaan-2-orbiter': {
    id: 'chandrayaan-2-orbiter',
    name: 'Chandrayaan-2 Orbiter',
    objectType: 'spacecraft',
    orbitalRegime: 'LUNAR_ORBIT',
    supportedTrackingMethod: 'LUNAR_ORBIT_BASELINE',
    source: 'ISRO ISSDC / Flight Operations',
    sourceUrl: 'https://www.issdc.gov.in/',
    canFocusOnMap: true,
    canTrackVectors: true,
    focusReason: 'Focus lunar orbital system in 3D Space Map',
    trackReason: 'Track Chandrayaan-2 polar lunar orbit vectors (~1.63 km/s at ~100 km altitude)',
    defaultStatus: 'LAST_AVAILABLE',
    statusContext: 'Latest supported ephemeris available: 100 km polar lunar orbit baseline (ISRO ISSDC)'
  },
  'chandrayaan-3-surface': {
    id: 'chandrayaan-3-surface',
    name: 'Chandrayaan-3 (Vikram & Pragyan)',
    objectType: 'spacecraft',
    orbitalRegime: 'LUNAR_SURFACE',
    supportedTrackingMethod: 'LUNAR_SURFACE_FIXED',
    source: 'ISRO ISSDC PRADAN Records',
    sourceUrl: 'https://pradan.issdc.gov.in/',
    canFocusOnMap: true,
    canTrackVectors: false,
    focusReason: 'Focus lunar landing coordinates in 3D Space Map',
    trackReason: 'Surface mission accomplished — stationary at Shiv Shakti Point (69.373° S, 32.319° E)',
    defaultStatus: 'HISTORICAL',
    statusContext: 'Mission accomplished: Shiv Shakti Point (69.373° S, 32.319° E)'
  },
  'chandrayaan-1': {
    id: 'chandrayaan-1',
    name: 'Chandrayaan-1',
    objectType: 'spacecraft',
    orbitalRegime: 'LUNAR_ORBIT',
    supportedTrackingMethod: 'HISTORICAL_ARCHIVE',
    source: 'ISRO / NASA PDS Archive',
    sourceUrl: 'https://www.issdc.gov.in/',
    canFocusOnMap: false,
    canTrackVectors: false,
    focusReason: 'Historical mission: primary science completed in August 2009',
    trackReason: 'Historical completed mission (2008–2009). No current tracking source is available for this mission',
    defaultStatus: 'HISTORICAL',
    statusContext: 'Mission completed in August 2009. Historic discovery of lunar water molecules'
  },
  'iss': {
    id: 'iss',
    name: 'ISS (International Space Station)',
    objectType: 'station',
    orbitalRegime: 'LEO',
    supportedTrackingMethod: 'SGP4_PROPAGATION',
    source: 'CelesTrak (18th Space Defense Squadron GP Data)',
    sourceUrl: 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544',
    noradId: 25544,
    canFocusOnMap: true,
    canTrackVectors: true,
    focusReason: 'Focus ISS in Earth Orbit on 3D Space Map',
    trackReason: 'Propagate real-time SGP4 orbital vectors and ground track in Analysis',
    defaultStatus: 'CALCULATED'
  },
  'css-tiangong': {
    id: 'css-tiangong',
    name: 'CSS Tiangong (Tianhe Core)',
    objectType: 'station',
    orbitalRegime: 'LEO',
    supportedTrackingMethod: 'SGP4_PROPAGATION',
    source: 'CelesTrak (18th Space Defense Squadron GP Data)',
    sourceUrl: 'https://celestrak.org/NORAD/elements/gp.php?CATNR=48274',
    noradId: 48274,
    canFocusOnMap: true,
    canTrackVectors: true,
    focusReason: 'Focus CSS Tiangong in Earth Orbit on 3D Space Map',
    trackReason: 'Propagate real-time SGP4 orbital vectors and ground track in Analysis',
    defaultStatus: 'CALCULATED'
  },
  'astrosat': {
    id: 'astrosat',
    name: 'Astrosat',
    objectType: 'satellite',
    orbitalRegime: 'LEO',
    supportedTrackingMethod: 'SGP4_PROPAGATION',
    source: 'CelesTrak (18th Space Defense Squadron GP Data)',
    sourceUrl: 'https://celestrak.org/NORAD/elements/gp.php?CATNR=40930',
    noradId: 40930,
    canFocusOnMap: true,
    canTrackVectors: true,
    focusReason: 'Focus Astrosat in Earth Orbit on 3D Space Map',
    trackReason: 'Propagate real-time SGP4 orbital vectors and ground track in Analysis',
    defaultStatus: 'CALCULATED'
  },
  'cartosat-3': {
    id: 'cartosat-3',
    name: 'Cartosat-3',
    objectType: 'satellite',
    orbitalRegime: 'SSO',
    supportedTrackingMethod: 'SGP4_PROPAGATION',
    source: 'CelesTrak (18th Space Defense Squadron GP Data)',
    sourceUrl: 'https://celestrak.org/NORAD/elements/gp.php?CATNR=44804',
    noradId: 44804,
    canFocusOnMap: true,
    canTrackVectors: true,
    focusReason: 'Focus Cartosat-3 in Earth Sun-Synchronous Orbit on 3D Space Map',
    trackReason: 'Propagate real-time SGP4 orbital vectors and ground track in Analysis',
    defaultStatus: 'CALCULATED'
  },
  'eos-06': {
    id: 'eos-06',
    name: 'EOS-06 (Oceansat-3)',
    objectType: 'satellite',
    orbitalRegime: 'SSO',
    supportedTrackingMethod: 'SGP4_PROPAGATION',
    source: 'CelesTrak (18th Space Defense Squadron GP Data)',
    sourceUrl: 'https://celestrak.org/NORAD/elements/gp.php?CATNR=54361',
    noradId: 54361,
    canFocusOnMap: true,
    canTrackVectors: true,
    focusReason: 'Focus EOS-06 in Earth Sun-Synchronous Orbit on 3D Space Map',
    trackReason: 'Propagate real-time SGP4 orbital vectors and ground track in Analysis',
    defaultStatus: 'CALCULATED'
  },
  'hubble': {
    id: 'hubble',
    name: 'Hubble Space Telescope',
    objectType: 'satellite',
    orbitalRegime: 'LEO',
    supportedTrackingMethod: 'SGP4_PROPAGATION',
    source: 'CelesTrak (18th Space Defense Squadron GP Data)',
    sourceUrl: 'https://celestrak.org/NORAD/elements/gp.php?CATNR=20580',
    noradId: 20580,
    canFocusOnMap: true,
    canTrackVectors: true,
    focusReason: 'Focus Hubble Space Telescope in Earth Orbit on 3D Space Map',
    trackReason: 'Propagate real-time SGP4 orbital vectors and ground track in Analysis',
    defaultStatus: 'CALCULATED'
  },
  'noaa-19': {
    id: 'noaa-19',
    name: 'NOAA-19 (POES)',
    objectType: 'satellite',
    orbitalRegime: 'SSO',
    supportedTrackingMethod: 'SGP4_PROPAGATION',
    source: 'CelesTrak (18th Space Defense Squadron GP Data)',
    sourceUrl: 'https://celestrak.org/NORAD/elements/gp.php?CATNR=33591',
    noradId: 33591,
    canFocusOnMap: true,
    canTrackVectors: true,
    focusReason: 'Focus NOAA-19 in Earth Sun-Synchronous Orbit on 3D Space Map',
    trackReason: 'Propagate real-time SGP4 orbital vectors and ground track in Analysis',
    defaultStatus: 'CALCULATED'
  },
  'terra': {
    id: 'terra',
    name: 'Terra (EOS AM-1)',
    objectType: 'satellite',
    orbitalRegime: 'SSO',
    supportedTrackingMethod: 'SGP4_PROPAGATION',
    source: 'CelesTrak (18th Space Defense Squadron GP Data)',
    sourceUrl: 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25994',
    noradId: 25994,
    canFocusOnMap: true,
    canTrackVectors: true,
    focusReason: 'Focus Terra in Earth Sun-Synchronous Orbit on 3D Space Map',
    trackReason: 'Propagate real-time SGP4 orbital vectors and ground track in Analysis',
    defaultStatus: 'CALCULATED'
  }
};

/**
 * Dynamically resolves the authentic tracking capability for any spacecraft object.
 * Checks satellite track context, epoch age, and calculation status.
 */
export function resolveTrackingCapability(
  craftId: string,
  craftName: string,
  satContext?: SatelliteTrackContext | null,
  customDate: Date = new Date()
): TrackingCapability {
  const base = SPACECRAFT_CAPABILITY_REGISTRY[craftId];

  // 1. If it is an Earth satellite with real-time GP/SGP4 context
  if (base && base.supportedTrackingMethod === 'SGP4_PROPAGATION') {
    const noradId = satContext?.noradId ?? base.noradId;
    const hasValidState = satContext?.hasValidState ?? false;
    const isLiveGp = satContext?.isLiveGp ?? false;
    const dataTimestamp = satContext?.timestamp ?? customDate.toISOString();

    let status: TrackingStatus = 'CALCULATED';
    if (!hasValidState && satContext === null) {
      status = 'DATA_UNAVAILABLE';
    } else if (isLiveGp) {
      status = 'CURRENT';
    } else if (hasValidState) {
      status = 'CALCULATED';
    } else {
      status = 'LAST_AVAILABLE';
    }

    const presentation = getStatusPresentation(status, 'SGP4_PROPAGATION', dataTimestamp);

    return {
      objectId: craftId,
      objectName: craftName || base.name,
      objectType: base.objectType,
      orbitalRegime: (satContext?.orbitClass as OrbitalRegime) || base.orbitalRegime,
      supportedTrackingMethod: 'SGP4_PROPAGATION',
      source: base.source,
      sourceUrl: base.sourceUrl,
      noradId,
      hasCurrentGpData: isLiveGp,
      propagationSupport: true,
      lastSuccessfulUpdate: customDate.toISOString(),
      dataTimestamp,
      status,
      statusLabel: presentation.statusLabel,
      statusDescription: presentation.statusDescription,
      canFocusOnMap: hasValidState || base.canFocusOnMap,
      canTrackVectors: hasValidState || base.canTrackVectors,
      focusReason: base.focusReason,
      trackReason: base.trackReason
    };
  }

  // 2. If it is a registered deep-space, solar, or lunar mission
  if (base) {
    const dataTimestamp = customDate.toISOString();
    const presentation = getStatusPresentation(base.defaultStatus, base.supportedTrackingMethod, dataTimestamp, base.statusContext);

    return {
      objectId: craftId,
      objectName: craftName || base.name,
      objectType: base.objectType,
      orbitalRegime: base.orbitalRegime,
      supportedTrackingMethod: base.supportedTrackingMethod,
      source: base.source,
      sourceUrl: base.sourceUrl,
      jplId: base.jplId,
      hasCurrentGpData: false,
      propagationSupport: base.supportedTrackingMethod === 'LAGRANGE_HALO_EPHEMERIS' || base.supportedTrackingMethod === 'KEPLERIAN_EPHEMERIS',
      lastSuccessfulUpdate: dataTimestamp,
      dataTimestamp,
      status: base.defaultStatus,
      statusLabel: presentation.statusLabel,
      statusDescription: presentation.statusDescription,
      canFocusOnMap: base.canFocusOnMap,
      canTrackVectors: base.canTrackVectors,
      focusReason: base.focusReason,
      trackReason: base.trackReason
    };
  }

  // 3. Dynamic fallback for any uncataloged or dynamically loaded Earth satellite by NORAD ID
  if (satContext && satContext.noradId) {
    const dataTimestamp = satContext.timestamp || customDate.toISOString();
    const status: TrackingStatus = satContext.isLiveGp ? 'CURRENT' : satContext.hasValidState ? 'CALCULATED' : 'LAST_AVAILABLE';
    const presentation = getStatusPresentation(status, 'SGP4_PROPAGATION', dataTimestamp);

    return {
      objectId: craftId,
      objectName: craftName || `NORAD ${satContext.noradId}`,
      objectType: 'satellite',
      orbitalRegime: (satContext.orbitClass as OrbitalRegime) || 'LEO',
      supportedTrackingMethod: 'SGP4_PROPAGATION',
      source: 'CelesTrak (18th Space Defense Squadron GP Data)',
      sourceUrl: `https://celestrak.org/NORAD/elements/gp.php?CATNR=${satContext.noradId}`,
      noradId: satContext.noradId,
      hasCurrentGpData: satContext.isLiveGp,
      propagationSupport: true,
      lastSuccessfulUpdate: customDate.toISOString(),
      dataTimestamp,
      status,
      statusLabel: presentation.statusLabel,
      statusDescription: presentation.statusDescription,
      canFocusOnMap: satContext.hasValidState,
      canTrackVectors: satContext.hasValidState,
      focusReason: `Focus satellite in 3D Space Map`,
      trackReason: `Propagate real-time SGP4 orbital vectors in Analysis`
    };
  }

  // 4. Default safe fallback for unknown objects (truthful DATA_UNAVAILABLE, zero invented vectors)
  const presentation = getStatusPresentation('DATA_UNAVAILABLE', 'NONE', undefined, 'No supported public ephemeris is currently available');
  return {
    objectId: craftId,
    objectName: craftName || craftId,
    objectType: 'spacecraft',
    orbitalRegime: 'HELIOCENTRIC',
    supportedTrackingMethod: 'NONE',
    source: 'Telemetry Registry',
    hasCurrentGpData: false,
    propagationSupport: false,
    status: 'DATA_UNAVAILABLE',
    statusLabel: presentation.statusLabel,
    statusDescription: presentation.statusDescription,
    canFocusOnMap: false,
    canTrackVectors: false,
    focusReason: '3D map positioning is unavailable for this object profile',
    trackReason: 'No browser-accessible verified ephemeris is currently available'
  };
}

/**
 * Returns the capability audit matrix for all registered spacecraft in SpacePulse.
 */
export function getAllRegisteredTrackingCapabilities(): TrackingCapability[] {
  return Object.keys(SPACECRAFT_CAPABILITY_REGISTRY).map(id => {
    const base = SPACECRAFT_CAPABILITY_REGISTRY[id];
    return resolveTrackingCapability(id, base.name);
  });
}
