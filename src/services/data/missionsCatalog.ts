import { MissionRecord, ArchiveDataset } from '../../types/missions';

export const MISSIONS_DATABASE: MissionRecord[] = [
  {
    id: 'isro-aditya-l1',
    name: 'Aditya-L1',
    agency: 'ISRO',
    launchVehicle: 'PSLV-C57 (XL Configuration)',
    launchDate: '2023-09-02',
    target: 'Sun-Earth L1 Halo Orbit (~1.5M km from Earth)',
    missionType: 'Solar & Space Weather Observatory',
    status: 'Active',
    overview: "India's dedicated solar observatory placed into a halo orbit around the Sun-Earth L1 Lagrangian point, observing the Sun continuously without eclipses.",
    keyAchievements: [
      'Successful insertion into Sun-Earth L1 halo orbit on January 6, 2024',
      'Continuous 24/7 solar corona and disk imagery captured by SUIT and VELC',
      'Real-time solar wind plasma sampling during the May 2024 severe geomagnetic storms by ASPEX and PAPA'
    ],
    officialCatalogId: 'ISRO-2023-0902',
    officialSourceUrl: 'https://www.isro.gov.in/Aditya_L1.html',
    payloads: [
      {
        name: 'Visible Emission Line Coronagraph',
        acronym: 'VELC',
        leadInstitution: 'Indian Institute of Astrophysics (IIA), Bengaluru',
        description: 'Internally occulted coronagraph observing the solar corona in green emission line (5303 Å) down to 1.05 solar radii.',
        scientificObjective: 'Investigate coronal heating mechanisms and coronal mass ejection (CME) acceleration dynamics.',
        dataType: 'Calibrated CCD FITS images and coronal spectro-polarimetry'
      },
      {
        name: 'Solar Ultraviolet Imaging Telescope',
        acronym: 'SUIT',
        leadInstitution: 'Inter-University Centre for Astronomy and Astrophysics (IUCAA), Pune',
        description: 'UV telescope imaging the solar photosphere and chromosphere in 200–400 nm wavelength band.',
        scientificObjective: 'Map solar irradiance variations, solar flares, and chromospheric magnetic topology.',
        dataType: 'Full-disk UV narrowband imagery (2048x2048)'
      },
      {
        name: 'Aditya Solar wind Particle Experiment',
        acronym: 'ASPEX',
        leadInstitution: 'Physical Research Laboratory (PRL), Ahmedabad',
        description: 'Two sensor subsystems (SWIS and STEPS) measuring solar wind ions, proton-alpha ratios, and suprathermal particles.',
        scientificObjective: 'Understand solar wind acceleration and energetic particle propagation.',
        dataType: 'Energy spectra and ion velocity distribution functions'
      },
      {
        name: 'Plasma Analyser Package for Aditya',
        acronym: 'PAPA',
        leadInstitution: 'Space Physics Laboratory (SPL/VSSC), Thiruvananthapuram',
        description: 'Sensors measuring solar wind electron and ion temperature, velocity, and composition.',
        scientificObjective: 'Continuous monitoring of space weather plasma environment at L1.',
        dataType: 'Plasma bulk speed, density, and thermal temperature time-series'
      }
    ]
  },
  {
    id: 'isro-chandrayaan-3',
    name: 'Chandrayaan-3',
    agency: 'ISRO',
    launchVehicle: 'LVM3-M4',
    launchDate: '2023-07-14',
    target: 'Lunar South Polar Region (Shiv Shakti Point)',
    missionType: 'Lunar Lander & Rover In-Situ Exploration',
    status: 'Success',
    overview: "Landmark mission achieving humanity's first successful soft-landing near the Moon's South Pole on 23 August 2023.",
    keyAchievements: [
      'Historic soft-landing at 69.373° S, 32.319° E (Shiv Shakti Point)',
      'First direct thermal conductivity and temperature gradient measurement of polar lunar regolith down to 10 cm depth',
      'Unambiguous in-situ detection of Sulphur (S) on the lunar surface by LIBS and APXS',
      'Successful hop experiment of Vikram lander, elevating 40 cm and firing thrusters'
    ],
    officialCatalogId: 'ISRO-2023-0714',
    officialSourceUrl: 'https://www.isro.gov.in/Chandrayaan3.html',
    payloads: [
      {
        name: "Chandra's Surface Thermophysical Experiment",
        acronym: 'ChaSTE',
        leadInstitution: 'Space Physics Laboratory (SPL/VSSC), Thiruvananthapuram',
        description: 'Probe equipped with 10 precision thermal sensors driven 10 cm into lunar regolith.',
        scientificObjective: 'Measure vertical temperature gradient and thermal conductivity of lunar soil.',
        dataType: 'Depth-temperature profiles (°C vs depth in mm)'
      },
      {
        name: 'Instrument for Lunar Seismic Activity',
        acronym: 'ILSA',
        leadInstitution: 'Laboratory for Electro-Optics Systems (LEOS), Bengaluru',
        description: 'MEMS-based triaxial seismometer recording ground vibrations on the lunar surface.',
        scientificObjective: 'Characterize lunar seismicity, micrometeorite impacts, and rover movement vibrations.',
        dataType: 'Triaxial acceleration waveforms (gal vs time)'
      },
      {
        name: 'Laser-Induced Breakdown Spectroscope',
        acronym: 'LIBS',
        leadInstitution: 'LEOS, Bengaluru',
        description: 'Pulsed laser firing at surface rock/soil to generate micro-plasma, analyzed via spectrograph.',
        scientificObjective: 'Determine elemental composition: Al, Ca, Fe, Cr, Ti, and Sulphur (S).',
        dataType: 'Calibrated optical emission spectra (200–800 nm)'
      },
      {
        name: 'Alpha Particle X-Ray Spectrometer',
        acronym: 'APXS',
        leadInstitution: 'PRL, Ahmedabad',
        description: 'Curium-244 radioactive source exciting X-ray fluorescence in lunar soil.',
        scientificObjective: 'Elemental abundance quantification in rover path.',
        dataType: 'X-ray fluorescence energy spectra'
      }
    ]
  },
  {
    id: 'isro-chandrayaan-2',
    name: 'Chandrayaan-2 Orbiter',
    agency: 'ISRO',
    launchVehicle: 'GSLV Mk III-M1',
    launchDate: '2019-07-22',
    target: 'Moon (100 km Circular Polar Orbit)',
    missionType: 'High-Resolution Lunar Science Orbiter',
    status: 'Active',
    overview: 'Advanced lunar orbiter conducting multi-spectral remote sensing of the Moon, with fuel reserves enabling over 7 years of extended science operations.',
    keyAchievements: [
      'Highest spatial resolution optical imaging of the lunar surface ever achieved (25 cm/pixel via OHRC)',
      'Sub-surface water ice detection in permanently shadowed regions (PSRs) using DFSAR radar',
      'Global mapping of sodium (Na), magnesium (Mg), and silicon (Si) via CLASS X-ray spectrometer'
    ],
    officialCatalogId: 'ISRO-2019-0722',
    officialSourceUrl: 'https://www.isro.gov.in/Chandrayaan2.html',
    payloads: [
      {
        name: 'Orbiter High Resolution Camera',
        acronym: 'OHRC',
        leadInstitution: 'Space Applications Centre (SAC), Ahmedabad',
        description: 'Telescopic camera providing 0.25 m ground resolution from 100 km orbit.',
        scientificObjective: 'Detailed topography, boulder distribution, and landing site evaluation.',
        dataType: 'PDS4 formatted orthorectified imagery'
      },
      {
        name: 'Dual Frequency Synthetic Aperture Radar',
        acronym: 'DFSAR',
        leadInstitution: 'SAC, Ahmedabad',
        description: 'L-band and S-band radar capable of penetrating lunar regolith up to several meters.',
        scientificObjective: 'Detect water-ice deposits and map dielectric properties of lunar regolith.',
        dataType: 'Full polarimetric radar backscatter matrices'
      },
      {
        name: 'Chandrayaan-2 Large Area Soft X-ray Spectrometer',
        acronym: 'CLASS',
        leadInstitution: 'UR Rao Satellite Centre (URSC), Bengaluru',
        description: 'Soft X-ray spectrometer detecting solar X-ray induced fluorescence from the lunar surface.',
        scientificObjective: 'Direct elemental mapping of major rock-forming elements.',
        dataType: 'Calibrated X-ray photon count spectra'
      }
    ]
  },
  {
    id: 'isro-astrosat',
    name: 'Astrosat',
    agency: 'ISRO',
    launchVehicle: 'PSLV-C30',
    launchDate: '2015-09-28',
    target: 'Low Earth Orbit (650 km, 6° Inclination)',
    missionType: 'Space Astronomy Multi-Wavelength Observatory',
    status: 'Active',
    overview: "India's premier space astronomy satellite observing cosmic phenomena simultaneously across Ultraviolet, Optical, and X-ray bands.",
    keyAchievements: [
      'Discovered ultra-violet bright stars in globular clusters using UVIT',
      'Measured relativistic spin of intermediate and stellar-mass black holes using LAXPC',
      'Continuous operation surpassing 8 years in orbit with open guest observer proposals'
    ],
    officialCatalogId: 'ISRO-2015-0928',
    officialSourceUrl: 'https://www.isro.gov.in/Astrosat.html',
    payloads: [
      {
        name: 'Ultra Violet Imaging Telescope',
        acronym: 'UVIT',
        leadInstitution: 'IIA / IUCAA / ISRO',
        description: 'Twin 37.5 cm telescopes observing Far-UV (130–180 nm), Near-UV (200–300 nm), and Visible (320–550 nm).',
        scientificObjective: 'High-resolution UV imaging of galaxies, stellar populations, and starburst regions.',
        dataType: 'Photon-counting event lists and calibrated FITS images'
      },
      {
        name: 'Large Area X-ray Proportional Counter',
        acronym: 'LAXPC',
        leadInstitution: 'Tata Institute of Fundamental Research (TIFR), Mumbai',
        description: 'Three identical xenon-filled proportional counters covering 3–80 keV.',
        scientificObjective: 'High time-resolution (10 microsecond) study of rapid X-ray variability and quasi-periodic oscillations.',
        dataType: 'Event-mode photon time-series and energy spectra'
      }
    ]
  },
  {
    id: 'nasa-voyager-1',
    name: 'Voyager 1',
    agency: 'NASA',
    launchVehicle: 'Titan IIIE / Centaur',
    launchDate: '1977-09-05',
    target: 'Interstellar Space (Ophiuchus constellation direction)',
    missionType: 'Interstellar Medium Exploration',
    status: 'Extended Mission',
    overview: 'The furthest human artifact from Earth, transmitting scientific measurements of the interstellar medium beyond the reach of solar wind.',
    keyAchievements: [
      'First close-up discovery of active volcanoes on Jupiter’s moon Io',
      'Detailed exploration of Saturn’s rings and atmosphere',
      'Historic crossing of the Heliopause into Interstellar Space on August 25, 2012'
    ],
    officialCatalogId: 'NASA-1977-084A',
    officialSourceUrl: 'https://voyager.jpl.nasa.gov/',
    payloads: [
      {
        name: 'Magnetometer',
        acronym: 'MAG',
        leadInstitution: 'NASA Goddard Space Flight Center',
        description: 'Dual high-field and low-field fluxgate magnetometers on a 13-meter boom.',
        scientificObjective: 'Measure interstellar magnetic field magnitude and vector direction.',
        dataType: 'Magnetic field vectors (nT)'
      },
      {
        name: 'Cosmic Ray Subsystem',
        acronym: 'CRS',
        leadInstitution: 'California Institute of Technology (Caltech)',
        description: 'Telescopes measuring energetic electrons and nuclei from galactic cosmic rays.',
        scientificObjective: 'Determine energy spectra and composition of pristine interstellar galactic cosmic rays.',
        dataType: 'Particle flux vs kinetic energy'
      }
    ]
  }
];

export const ARCHIVE_DATASETS: ArchiveDataset[] = [
  {
    id: 'pradan-ch3',
    title: 'Chandrayaan-3 Lunar South Pole Surface Science Archive',
    mission: 'Chandrayaan-3',
    agency: 'ISRO',
    archiveHost: 'ISRO ISSDC / PRADAN',
    officialUrl: 'https://pradan.issdc.gov.in/ch3/',
    dataLevel: 'Level 1B (Calibrated) & Level 2 (Derived)',
    formats: ['PDS4', 'XML Labels', 'GeoTIFF', 'CSV'],
    accessType: 'Open Public Access',
    description: 'Calibrated in-situ physical measurements from ChaSTE thermal probe, ILSA seismometer, and LIBS/APXS elemental spectrometry datasets.'
  },
  {
    id: 'pradan-ch2',
    title: 'Chandrayaan-2 High-Resolution Orbiter Science Archive',
    mission: 'Chandrayaan-2',
    agency: 'ISRO',
    archiveHost: 'ISRO ISSDC / PRADAN',
    officialUrl: 'https://pradan.issdc.gov.in/ch2/',
    dataLevel: 'Level 0, 1B, and 2',
    formats: ['PDS4', 'FITS', 'HDF5', 'GeoTIFF'],
    accessType: 'Open Public Access',
    description: 'Sub-meter lunar imagery from OHRC, dual-frequency polarimetric radar backscatter from DFSAR, and lunar surface elemental maps from CLASS.'
  },
  {
    id: 'mosdac-eos06',
    title: 'EOS-06 Ocean Color & Scatterometer Geophysical Products',
    mission: 'EOS-06 (Oceansat-3)',
    agency: 'ISRO',
    archiveHost: 'ISRO MOSDAC',
    officialUrl: 'https://www.mosdac.gov.in/',
    dataLevel: 'Level 2 & Level 3 Global Gridded',
    formats: ['HDF5', 'NetCDF-4', 'GeoTIFF'],
    accessType: 'Open Public Access',
    description: 'Global chlorophyll concentration, diffuse attenuation coefficients, ocean surface wind vectors, and sea surface temperatures.'
  },
  {
    id: 'issdc-astrosat',
    title: 'Astrosat Multi-Wavelength Astronomical Science Data Archive',
    mission: 'Astrosat',
    agency: 'ISRO',
    archiveHost: 'ISSDC Astrosat Data Archive',
    officialUrl: 'https://astrobrowse.issdc.gov.in/astro_archive/archive/Home.jsp',
    dataLevel: 'Level 1 (Pipeline Processed) & Level 2 (Science Ready)',
    formats: ['FITS', 'ASCII Event Files'],
    accessType: 'Open Public Access',
    description: 'Calibrated UVIT sky images, LAXPC X-ray event lists with microsecond time tags, and CZTI hard X-ray polarimetric data.'
  },
  {
    id: 'nasa-pds-voyager',
    title: 'NASA PDS Voyager Interstellar Mission Archive',
    mission: 'Voyager 1 & 2',
    agency: 'NASA',
    archiveHost: 'NASA Planetary Data System (PDS) Planetary Plasma Interactions Node',
    officialUrl: 'https://pds-ppi.igpp.ucla.edu/',
    dataLevel: 'Calibrated Science Time Series',
    formats: ['PDS3 / PDS4', 'ASCII', 'CSV'],
    accessType: 'Open Public Access',
    description: 'In-situ interstellar magnetic field measurements from MAG, plasma wave frequency spectra from PWS, and cosmic ray intensities from CRS.'
  },
  {
    id: 'celestrak-gp',
    title: 'CelesTrak General Perturbations (GP) Orbital Elements Repository',
    mission: 'All Active Earth Satellites & Space Stations',
    agency: 'International',
    archiveHost: 'CelesTrak / 18th Space Defense Squadron',
    officialUrl: 'https://celestrak.org/',
    dataLevel: 'Ephemeris OMM / TLE Ephemerides',
    formats: ['JSON (OMM)', 'TLE (Two-Line Elements)', 'XML (VCM)'],
    accessType: 'Open Public Access',
    description: 'Authoritative, continuously updated orbital element sets for ISS, CSS, Astrosat, Cartosat, Hubble, and thousands of orbital objects.'
  }
];
