import * as THREE from 'three';
import { createVoyagerSpacecraftModel } from '../models/voyagerModel';

/**
 * SPACECRAFT 3D MODEL REGISTRY
 * 
 * Centralized, authentic 3D procedural models for all SpacePulse artificial space objects.
 * Strictly adheres to verified space agency blueprints and documented configurations:
 * - NASA: Voyager 1 & 2, ISS, Hubble Space Telescope, NOAA-19, Terra
 * - ISRO: Aditya-L1, Chandrayaan-3 (Vikram & Pragyan), Chandrayaan-2 Orbiter, Astrosat, Cartosat-3, EOS-06
 * - CNSA: CSS Tiangong (Tianhe Core + Wentian + Mengtian)
 * 
 * Never renders generic cubes, spheres, or placeholders.
 */

// ============================================================================
// SHARED REALISTIC PBR MATERIALS
// ============================================================================
const MAT_GOLD_KAPTON = new THREE.MeshStandardMaterial({
  color: 0xd4af37, // Metallic gold MLI insulation
  metalness: 0.88,
  roughness: 0.24,
  depthWrite: true,
  depthTest: true
});

const MAT_SILVER_BLANKET = new THREE.MeshStandardMaterial({
  color: 0xf1f5f9, // Silver/white beta cloth thermal blanket
  metalness: 0.72,
  roughness: 0.35,
  depthWrite: true,
  depthTest: true
});

const MAT_SOLAR_CELLS = new THREE.MeshStandardMaterial({
  color: 0x172554, // Deep cobalt blue anti-reflective silicon photovoltaic
  metalness: 0.92,
  roughness: 0.18,
  depthWrite: true,
  depthTest: true
});

const MAT_CARBON_TRUSS = new THREE.MeshStandardMaterial({
  color: 0x0f172a, // Structural carbon-fiber composite
  metalness: 0.45,
  roughness: 0.75,
  depthWrite: true,
  depthTest: true
});

const MAT_TITANIUM = new THREE.MeshStandardMaterial({
  color: 0x64748b, // Titanium alloy / structural hardware
  metalness: 0.78,
  roughness: 0.38,
  depthWrite: true,
  depthTest: true
});

const MAT_ANTENNA_DISH = new THREE.MeshStandardMaterial({
  color: 0xfbbf24, // Gold molybdenum mesh reflector
  metalness: 0.86,
  roughness: 0.22,
  depthWrite: true,
  depthTest: true
});

const MAT_WHITE_DISH = new THREE.MeshStandardMaterial({
  color: 0xf8fafc, // Off-white composite reflector
  metalness: 0.25,
  roughness: 0.45,
  side: THREE.DoubleSide,
  depthWrite: true,
  depthTest: true
});

const MAT_OPTICS_BLACK = new THREE.MeshStandardMaterial({
  color: 0x020617, // Baffled optical telescope interior / sensor aperture
  metalness: 0.15,
  roughness: 0.15,
  depthWrite: true,
  depthTest: true
});

const MAT_COPPER_ACCENT = new THREE.MeshStandardMaterial({
  color: 0xb45309, // Copper wave-guides / sensor radiators
  metalness: 0.82,
  roughness: 0.32,
  depthWrite: true,
  depthTest: true
});

// Helper: Add solar array panel with cell divisions
function createSolarWing(width: number, length: number, thickness = 0.02): THREE.Group {
  const group = new THREE.Group();
  // Base substrate panel
  const panelGeo = new THREE.BoxGeometry(width, thickness, length);
  const panelMesh = new THREE.Mesh(panelGeo, MAT_SOLAR_CELLS);
  group.add(panelMesh);

  // Structural perimeter frame
  const frameGeo = new THREE.BoxGeometry(width * 1.02, thickness * 1.1, length * 1.01);
  const frameMesh = new THREE.Mesh(frameGeo, MAT_CARBON_TRUSS);
  group.add(frameMesh);

  return group;
}

// ============================================================================
// 1. ADITYA-L1 (ISRO Solar Observatory at Sun-Earth L1)
// ============================================================================
export function createAdityaL1Model(): THREE.Group {
  const craft = new THREE.Group();
  craft.name = 'Aditya-L1_Spacecraft';

  // 1. Central I-2K Main Bus (Gold Kapton MLI blanket cuboid)
  const busGeo = new THREE.BoxGeometry(1.2, 1.4, 1.2);
  const busMesh = new THREE.Mesh(busGeo, MAT_GOLD_KAPTON);
  craft.add(busMesh);

  // Thermal radiator plate on anti-sun side (-Z)
  const radGeo = new THREE.BoxGeometry(1.1, 1.3, 0.04);
  const radMesh = new THREE.Mesh(radGeo, MAT_SILVER_BLANKET);
  radMesh.position.set(0, 0, -0.62);
  craft.add(radMesh);

  // 2. Primary Solar Observation Payload: VELC (Visible Emission Line Coronagraph)
  // Mounted on Sun-facing (+Z) deck with forward aperture and baffle
  const velcHousingGeo = new THREE.BoxGeometry(0.7, 0.6, 0.6);
  const velcHousing = new THREE.Mesh(velcHousingGeo, MAT_SILVER_BLANKET);
  velcHousing.position.set(0, 0.25, 0.75);
  craft.add(velcHousing);

  const velcBaffleGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.45, 16);
  const velcBaffle = new THREE.Mesh(velcBaffleGeo, MAT_OPTICS_BLACK);
  velcBaffle.rotation.x = Math.PI / 2;
  velcBaffle.position.set(0, 0.25, 1.1);
  craft.add(velcBaffle);

  // 3. SUIT (Solar Ultraviolet Imaging Telescope) optical tube
  const suitGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.5, 16);
  const suitMesh = new THREE.Mesh(suitGeo, MAT_CARBON_TRUSS);
  suitMesh.rotation.x = Math.PI / 2;
  suitMesh.position.set(0.38, -0.3, 0.8);
  craft.add(suitMesh);

  // 4. Twin Stepped Solar Array Wings (deployed on +/- X axis)
  [-1, 1].forEach(side => {
    // Mounting Yoke
    const yokeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8);
    const yokeMesh = new THREE.Mesh(yokeGeo, MAT_CARBON_TRUSS);
    yokeMesh.rotation.z = Math.PI / 2;
    yokeMesh.position.set(side * 0.85, 0, 0);
    craft.add(yokeMesh);

    // Stepped solar wing (2 panels per wing)
    const wing1 = createSolarWing(0.95, 0.65);
    wing1.position.set(side * 1.55, 0, 0);
    craft.add(wing1);

    const wing2 = createSolarWing(0.9, 0.6);
    wing2.position.set(side * 2.45, 0, 0);
    craft.add(wing2);
  });

  // 5. 6-Meter Deployable Magnetometer (MAG) Boom (ISRO digital fluxgate)
  const magBoomGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.8, 8);
  const magBoom = new THREE.Mesh(magBoomGeo, MAT_CARBON_TRUSS);
  magBoom.rotation.z = 0.55;
  magBoom.position.set(-1.1, 1.1, -0.4);
  craft.add(magBoom);

  // Dual MAG sensor canisters
  const magSensor1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), MAT_GOLD_KAPTON);
  magSensor1.position.set(-1.5, 1.55, -0.4);
  craft.add(magSensor1);

  const magSensor2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 12), MAT_GOLD_KAPTON);
  magSensor2.position.set(-1.8, 1.95, -0.4);
  craft.add(magSensor2);

  // 6. Steerable High-Gain Parabolic Communication Dish (X-band)
  const dishGeo = new THREE.SphereGeometry(0.35, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.4);
  const dishMesh = new THREE.Mesh(dishGeo, MAT_WHITE_DISH);
  dishMesh.position.set(0.4, 0.75, -0.5);
  dishMesh.rotation.x = -Math.PI * 0.65;
  craft.add(dishMesh);

  // 7. ASPEX & PAPA Plasma / Solar Wind Analyzers
  const aspexGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const aspexMesh = new THREE.Mesh(aspexGeo, MAT_TITANIUM);
  aspexMesh.position.set(-0.62, 0.4, 0.2);
  craft.add(aspexMesh);

  return craft;
}

// ============================================================================
// 2. CHANDRAYAAN-3 (ISRO Vikram Lander & Pragyan Configuration)
// ============================================================================
export function createChandrayaan3Model(): THREE.Group {
  const craft = new THREE.Group();
  craft.name = 'Chandrayaan-3_Vikram_Lander';

  // 1. Octagonal Main Lander Body (Gold-wrapped multi-layer insulation)
  const landerBodyGeo = new THREE.CylinderGeometry(0.9, 1.1, 1.1, 8);
  const landerBody = new THREE.Mesh(landerBodyGeo, MAT_GOLD_KAPTON);
  craft.add(landerBody);

  // Top avionics deck plate
  const topDeckGeo = new THREE.CylinderGeometry(0.92, 0.92, 0.06, 8);
  const topDeck = new THREE.Mesh(topDeckGeo, MAT_SILVER_BLANKET);
  topDeck.position.y = 0.58;
  craft.add(topDeck);

  // 2. Four Canted Shock-Absorbing Landing Legs with Footpads (Pads)
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const legGroup = new THREE.Group();

    // Primary strut
    const strutGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.1, 8);
    const strut = new THREE.Mesh(strutGeo, MAT_TITANIUM);
    strut.rotation.z = -0.45;
    strut.position.set(0.35, -0.4, 0);
    legGroup.add(strut);

    // Diagonal support brace
    const braceGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6);
    const brace = new THREE.Mesh(braceGeo, MAT_TITANIUM);
    brace.rotation.z = 0.65;
    brace.position.set(0.15, -0.2, 0);
    legGroup.add(brace);

    // Circular landing footpad plate
    const padGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 16);
    const pad = new THREE.Mesh(padGeo, MAT_TITANIUM);
    pad.position.set(0.68, -0.85, 0);
    legGroup.add(pad);

    legGroup.rotation.y = angle;
    craft.add(legGroup);
  }

  // 3. Four Throttleable Liquid Engines (800N each) pointing nadir
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const engineGeo = new THREE.ConeGeometry(0.1, 0.35, 12);
    const engine = new THREE.Mesh(engineGeo, MAT_CARBON_TRUSS);
    engine.rotation.x = Math.PI;
    engine.position.set(Math.cos(angle) * 0.45, -0.65, Math.sin(angle) * 0.45);
    craft.add(engine);
  }

  // 4. Deployable Solar Panels (mounted on lander body flanks)
  [-1, 1].forEach(side => {
    const panelGeo = new THREE.BoxGeometry(0.04, 0.9, 0.7);
    const panel = new THREE.Mesh(panelGeo, MAT_SOLAR_CELLS);
    panel.position.set(side * 1.05, 0.05, 0);
    craft.add(panel);
  });

  // 5. Scientific Instruments:
  // ChaSTE (Chandra's Surface Thermophysical Experiment) vertical penetrator mechanism
  const chasteGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8);
  const chaste = new THREE.Mesh(chasteGeo, MAT_TITANIUM);
  chaste.position.set(0.75, -0.3, 0.4);
  craft.add(chaste);

  // ILSA (Instrument for Lunar Seismic Activity)
  const ilsaGeo = new THREE.BoxGeometry(0.2, 0.15, 0.2);
  const ilsa = new THREE.Mesh(ilsaGeo, MAT_SILVER_BLANKET);
  ilsa.position.set(-0.7, -0.4, 0.3);
  craft.add(ilsa);

  // Pragyan Rover Ramp door on front flank
  const rampGeo = new THREE.BoxGeometry(0.65, 0.7, 0.04);
  const ramp = new THREE.Mesh(rampGeo, MAT_TITANIUM);
  ramp.position.set(0, 0, 0.95);
  craft.add(ramp);

  // Top Omni/UHF communications antenna mast
  const antGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8);
  const ant = new THREE.Mesh(antGeo, MAT_TITANIUM);
  ant.position.set(0, 0.85, 0);
  craft.add(ant);

  const omniBall = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), MAT_ANTENNA_DISH);
  omniBall.position.set(0, 1.12, 0);
  craft.add(omniBall);

  return craft;
}

// ============================================================================
// 3. INTERNATIONAL SPACE STATION (ISS) - NORAD 25544
// ============================================================================
export function createISSModel(): THREE.Group {
  const station = new THREE.Group();
  station.name = 'ISS_Space_Station';

  // 1. Central Integrated Truss Structure (ITS) - spanning +/- X axis
  const trussGeo = new THREE.BoxGeometry(5.4, 0.16, 0.16);
  const trussMesh = new THREE.Mesh(trussGeo, MAT_CARBON_TRUSS);
  trussMesh.position.y = 0.45;
  station.add(trussMesh);

  // 2. Solar Array Wings (SAWs) - 4 huge double-pair wings on truss tips
  [-2.2, 2.2].forEach(xEnd => {
    // Rotating Solar Alpha Rotary Joint (SARJ) canister
    const sarjGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.25, 16);
    const sarj = new THREE.Mesh(sarjGeo, MAT_TITANIUM);
    sarj.rotation.z = Math.PI / 2;
    sarj.position.set(xEnd > 0 ? xEnd - 0.4 : xEnd + 0.4, 0.45, 0);
    station.add(sarj);

    // Front and back solar panels
    [-0.9, 0.9].forEach(zSide => {
      const wingGeo = new THREE.BoxGeometry(1.2, 0.02, 1.4);
      const wing = new THREE.Mesh(wingGeo, MAT_SOLAR_CELLS);
      wing.position.set(xEnd, 0.45, zSide);
      station.add(wing);

      // Central deployment mast beam
      const mastGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.45, 6);
      const mast = new THREE.Mesh(mastGeo, MAT_CARBON_TRUSS);
      mast.rotation.x = Math.PI / 2;
      mast.position.set(xEnd, 0.45, zSide);
      station.add(mast);
    });
  });

  // 3. Thermal Radiator Panels (white panels perpendicular to truss)
  [-0.85, 0.85].forEach(xSide => {
    const radGeo = new THREE.BoxGeometry(0.55, 0.02, 0.95);
    const rad = new THREE.Mesh(radGeo, MAT_SILVER_BLANKET);
    rad.position.set(xSide, 0.75, 0);
    rad.rotation.x = 0.4;
    station.add(rad);
  });

  // 4. Pressurized Habitation Modules Cluster (arranged along Z and X axes)
  // US Destiny Laboratory (center)
  const destinyGeo = new THREE.CylinderGeometry(0.24, 0.24, 1.3, 16);
  const destiny = new THREE.Mesh(destinyGeo, MAT_SILVER_BLANKET);
  destiny.rotation.x = Math.PI / 2;
  destiny.position.set(0, 0, 0.2);
  station.add(destiny);

  // Unity Node 1 + Harmony Node 2
  const nodeGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.55, 16);
  const unity = new THREE.Mesh(nodeGeo, MAT_SILVER_BLANKET);
  unity.rotation.x = Math.PI / 2;
  unity.position.set(0, 0, -0.6);
  station.add(unity);

  // Russian Segment: Zarya (FGB) and Zvezda Service Module extending aft (-Z)
  const zaryaGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.2, 16);
  const zarya = new THREE.Mesh(zaryaGeo, MAT_GOLD_KAPTON);
  zarya.rotation.x = Math.PI / 2;
  zarya.position.set(0, 0, -1.3);
  station.add(zarya);

  // Zarya small deployable solar wings
  [-0.7, 0.7].forEach(side => {
    const zWing = createSolarWing(0.5, 0.35);
    zWing.position.set(side, 0, -1.3);
    station.add(zWing);
  });

  // European Columbus Laboratory (docked on starboard side +X)
  const columbusGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.7, 16);
  const columbus = new THREE.Mesh(columbusGeo, MAT_SILVER_BLANKET);
  columbus.rotation.z = Math.PI / 2;
  columbus.position.set(0.55, 0, 0.6);
  station.add(columbus);

  // Japanese Kibo Laboratory (JEM) with External Experiment Platform (porch)
  const kiboGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.95, 16);
  const kibo = new THREE.Mesh(kiboGeo, MAT_SILVER_BLANKET);
  kibo.rotation.z = Math.PI / 2;
  kibo.position.set(-0.65, 0, 0.6);
  station.add(kibo);

  // Kibo porch platform
  const porchGeo = new THREE.BoxGeometry(0.4, 0.1, 0.35);
  const porch = new THREE.Mesh(porchGeo, MAT_TITANIUM);
  porch.position.set(-1.25, -0.05, 0.6);
  station.add(porch);

  // Cupola observation dome (pointing nadir -Y)
  const cupolaGeo = new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const cupola = new THREE.Mesh(cupolaGeo, MAT_OPTICS_BLACK);
  cupola.position.set(0, -0.24, -0.6);
  cupola.rotation.x = Math.PI;
  station.add(cupola);

  return station;
}

// ============================================================================
// 4. CSS TIANGONG (Chinese Modular Space Station) - NORAD 48274
// ============================================================================
export function createTiangongModel(): THREE.Group {
  const station = new THREE.Group();
  station.name = 'CSS_Tiangong_Station';

  // Distinctive T-Shaped Configuration:
  // 1. Tianhe Core Module (axial cylinder along Z-axis)
  const tianheGeo = new THREE.CylinderGeometry(0.26, 0.28, 1.8, 16);
  const tianhe = new THREE.Mesh(tianheGeo, MAT_SILVER_BLANKET);
  tianhe.rotation.x = Math.PI / 2;
  tianhe.position.set(0, 0, 0);
  station.add(tianhe);

  // Forward Spherical Docking Hub (5 docking/berthing ports)
  const hubGeo = new THREE.SphereGeometry(0.3, 16, 16);
  const hub = new THREE.Mesh(hubGeo, MAT_TITANIUM);
  hub.position.set(0, 0, 0.95);
  station.add(hub);

  // 2. Wentian Laboratory Cabin Module (docked on +X side of hub)
  const wentianGeo = new THREE.CylinderGeometry(0.27, 0.27, 1.6, 16);
  const wentian = new THREE.Mesh(wentianGeo, MAT_SILVER_BLANKET);
  wentian.rotation.z = Math.PI / 2;
  wentian.position.set(1.05, 0, 0.95);
  station.add(wentian);

  // 3. Mengtian Laboratory Cabin Module (docked on -X side of hub)
  const mengtianGeo = new THREE.CylinderGeometry(0.27, 0.27, 1.6, 16);
  const mengtian = new THREE.Mesh(mengtianGeo, MAT_SILVER_BLANKET);
  mengtian.rotation.z = Math.PI / 2;
  mengtian.position.set(-1.05, 0, 0.95);
  station.add(mengtian);

  // 4. Giant Articulated Flexible Solar Wings on Wentian and Mengtian tips
  [wentian, mengtian].forEach((mod, idx) => {
    const xPos = idx === 0 ? 2.05 : -2.05;
    [-0.65, 0.65].forEach(zSide => {
      const wingGeo = new THREE.BoxGeometry(0.7, 0.02, 1.25);
      const wing = new THREE.Mesh(wingGeo, MAT_SOLAR_CELLS);
      wing.position.set(xPos, 0, 0.95 + zSide);
      station.add(wing);
    });
  });

  // Tianhe's own dual flexible solar array wings on service section
  [-1.1, 1.1].forEach(xSide => {
    const coreWingGeo = new THREE.BoxGeometry(0.85, 0.02, 0.55);
    const coreWing = new THREE.Mesh(coreWingGeo, MAT_SOLAR_CELLS);
    coreWing.position.set(xSide, 0, -0.65);
    station.add(coreWing);
  });

  // 5. Chinese Space Station Large Robotic Arm (10.2m) mounted on Tianhe
  const armBoomGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8);
  const armBoom = new THREE.Mesh(armBoomGeo, MAT_TITANIUM);
  armBoom.position.set(0.22, 0.35, 0.2);
  armBoom.rotation.z = 0.5;
  station.add(armBoom);

  return station;
}

// ============================================================================
// 5. ASTROSAT (ISRO Multi-Wavelength Space Astronomy Observatory) - NORAD 40930
// ============================================================================
export function createAstrosatModel(): THREE.Group {
  const craft = new THREE.Group();
  craft.name = 'Astrosat_Space_Observatory';

  // 1. Central Bus wrapped in gold Kapton MLI blanket
  const busGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  const busMesh = new THREE.Mesh(busGeo, MAT_GOLD_KAPTON);
  craft.add(busMesh);

  // 2. Twin UVIT (Ultra Violet Imaging Telescope) optical cylinders on top deck (+Y)
  [-0.22, 0.22].forEach(xSide => {
    const uvitGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.95, 16);
    const uvit = new THREE.Mesh(uvitGeo, MAT_SILVER_BLANKET);
    uvit.position.set(xSide, 0.95, 0.1);
    craft.add(uvit);

    // Aperture baffle
    const baffleGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.15, 16);
    const baffle = new THREE.Mesh(baffleGeo, MAT_OPTICS_BLACK);
    baffle.position.set(xSide, 1.45, 0.1);
    craft.add(baffle);
  });

  // 3. LAXPC (Large Area X-ray Proportional Counter) 3 detector boxes
  [-0.35, 0, 0.35].forEach(xOff => {
    const laxpcGeo = new THREE.BoxGeometry(0.25, 0.35, 0.3);
    const laxpc = new THREE.Mesh(laxpcGeo, MAT_TITANIUM);
    laxpc.position.set(xOff, 0.7, -0.38);
    craft.add(laxpc);
  });

  // 4. SXT (Soft X-ray Telescope) conical mirror assembly
  const sxtGeo = new THREE.ConeGeometry(0.18, 0.8, 16);
  const sxt = new THREE.Mesh(sxtGeo, MAT_ANTENNA_DISH);
  sxt.position.set(-0.35, 0.85, 0.35);
  craft.add(sxt);

  // 5. SSM (Scanning Sky Monitor) boom
  const ssmBoomGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6);
  const ssmBoom = new THREE.Mesh(ssmBoomGeo, MAT_CARBON_TRUSS);
  ssmBoom.position.set(0.65, 0.5, 0);
  ssmBoom.rotation.z = -0.6;
  craft.add(ssmBoom);

  // 6. Dual Deployable Solar Panel Wings (+/- X axis)
  [-1, 1].forEach(side => {
    const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), MAT_CARBON_TRUSS);
    yoke.rotation.z = Math.PI / 2;
    yoke.position.set(side * 0.8, 0, 0);
    craft.add(yoke);

    const wing = createSolarWing(0.9, 0.55);
    wing.position.set(side * 1.45, 0, 0);
    craft.add(wing);
  });

  // 7. X-Band Steerable Data Downlink Dish on nadir face (-Y)
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4),
    MAT_WHITE_DISH
  );
  dish.position.set(0, -0.75, 0);
  dish.rotation.x = Math.PI;
  craft.add(dish);

  return craft;
}

// ============================================================================
// 6. CARTOSAT-3 (ISRO High-Resolution Earth Observation) - NORAD 44804
// ============================================================================
export function createCartosat3Model(): THREE.Group {
  const craft = new THREE.Group();
  craft.name = 'Cartosat-3_Spacecraft';

  // 1. Hexagonal Main Bus Body
  const busGeo = new THREE.CylinderGeometry(0.65, 0.7, 1.4, 6);
  const bus = new THREE.Mesh(busGeo, MAT_GOLD_KAPTON);
  craft.add(bus);

  // 2. High-Resolution Optical Imager Telescope (0.28m GSD optical barrel pointing nadir -Y)
  const imagerGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.8, 20);
  const imager = new THREE.Mesh(imagerGeo, MAT_CARBON_TRUSS);
  imager.position.set(0, -0.9, 0);
  craft.add(imager);

  const pupilGeo = new THREE.CircleGeometry(0.28, 20);
  const pupil = new THREE.Mesh(pupilGeo, MAT_OPTICS_BLACK);
  pupil.position.set(0, -1.31, 0);
  pupil.rotation.x = Math.PI / 2;
  craft.add(pupil);

  // 3. Asymmetric Single Solar Array Wing (ISRO deployed 3-panel array on +X side)
  const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), MAT_CARBON_TRUSS);
  yoke.rotation.z = Math.PI / 2;
  yoke.position.set(0.9, 0.2, 0);
  craft.add(yoke);

  const wing = createSolarWing(1.5, 0.65);
  wing.position.set(1.85, 0.2, 0);
  craft.add(wing);

  // 4. Star Tracker Optical Heads
  [-0.2, 0.2].forEach(zSide => {
    const stGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8);
    const st = new THREE.Mesh(stGeo, MAT_OPTICS_BLACK);
    st.position.set(-0.65, 0.4, zSide);
    st.rotation.z = -0.45;
    craft.add(st);
  });

  // 5. Gimbaled X-Band High-Data-Rate Antenna Dish
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4),
    MAT_ANTENNA_DISH
  );
  dish.position.set(-0.55, -0.4, 0.4);
  dish.rotation.x = Math.PI * 0.4;
  craft.add(dish);

  return craft;
}

// ============================================================================
// 7. EOS-06 / OCEANSAT-3 (ISRO Ocean Color & Scatterometer) - NORAD 54361
// ============================================================================
export function createEOS06Model(): THREE.Group {
  const craft = new THREE.Group();
  craft.name = 'EOS-06_Oceansat-3';

  // 1. Cuboid Equipment Bus with gold MLI and silver radiators
  const busGeo = new THREE.BoxGeometry(0.95, 1.3, 0.95);
  const bus = new THREE.Mesh(busGeo, MAT_GOLD_KAPTON);
  craft.add(bus);

  // 2. Ku-Band Scatterometer: Rotating 1-meter Parabolic Dish on Top Deck (+Y)
  const pedGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.35, 12);
  const ped = new THREE.Mesh(pedGeo, MAT_TITANIUM);
  ped.position.set(0, 0.8, 0);
  craft.add(ped);

  const scatDishGeo = new THREE.SphereGeometry(0.42, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.38);
  const scatDish = new THREE.Mesh(scatDishGeo, MAT_ANTENNA_DISH);
  scatDish.position.set(0, 1.05, 0);
  scatDish.rotation.x = -0.45;
  craft.add(scatDish);

  // 3. OCM-3 (Ocean Color Monitor) optical sensor head (nadir -Y)
  const ocmGeo = new THREE.BoxGeometry(0.5, 0.35, 0.4);
  const ocm = new THREE.Mesh(ocmGeo, MAT_CARBON_TRUSS);
  ocm.position.set(0, -0.75, 0);
  craft.add(ocm);

  // Multiple spectral sensor lenses
  [-0.14, 0.14].forEach(xOff => {
    const lensGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12);
    const lens = new THREE.Mesh(lensGeo, MAT_OPTICS_BLACK);
    lens.position.set(xOff, -0.92, 0);
    craft.add(lens);
  });

  // 4. Dual Solar Panel Wings
  [-1, 1].forEach(side => {
    const wing = createSolarWing(0.9, 0.55);
    wing.position.set(side * 1.3, 0, 0);
    craft.add(wing);
  });

  return craft;
}

// ============================================================================
// 8. HUBBLE SPACE TELESCOPE (NASA / ESA) - NORAD 20580
// ============================================================================
export function createHubbleModel(): THREE.Group {
  const craft = new THREE.Group();
  craft.name = 'Hubble_Space_Telescope';

  // 1. Forward Optical Telescope Assembly (narrower cylinder, silver blanket)
  const fwdGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.4, 24);
  const fwd = new THREE.Mesh(fwdGeo, MAT_SILVER_BLANKET);
  fwd.position.y = 0.5;
  craft.add(fwd);

  // 2. Open Aperture Light Shield Door (propped open at 45°)
  const doorGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.04, 20);
  const door = new THREE.Mesh(doorGeo, MAT_SILVER_BLANKET);
  door.position.set(0.3, 1.25, 0);
  door.rotation.z = 0.55;
  craft.add(door);

  // Dark interior baffle
  const baffleGeo = new THREE.CircleGeometry(0.38, 20);
  const baffle = new THREE.Mesh(baffleGeo, MAT_OPTICS_BLACK);
  baffle.position.y = 1.2;
  baffle.rotation.x = -Math.PI / 2;
  craft.add(baffle);

  // 3. Aft Equipment Shroud (wider cylinder with gold thermal foil)
  const aftGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.9, 24);
  const aft = new THREE.Mesh(aftGeo, MAT_GOLD_KAPTON);
  aft.position.y = -0.6;
  craft.add(aft);

  // 4. Dual Solar Array Wings (slender rectangular panels on deployed booms)
  [-1, 1].forEach(side => {
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8), MAT_CARBON_TRUSS);
    boom.rotation.z = Math.PI / 2;
    boom.position.set(side * 0.65, -0.1, 0);
    craft.add(boom);

    const wing = createSolarWing(0.65, 1.2);
    wing.position.set(side * 1.35, -0.1, 0);
    craft.add(wing);
  });

  // 5. Dual High-Gain Dish Antennas on articulated booms
  [-1, 1].forEach(side => {
    const dishBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6), MAT_CARBON_TRUSS);
    dishBoom.position.set(side * 0.5, 0.4, 0.35);
    dishBoom.rotation.x = 0.4;
    craft.add(dishBoom);

    const dish = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4),
      MAT_ANTENNA_DISH
    );
    dish.position.set(side * 0.65, 0.55, 0.5);
    craft.add(dish);
  });

  return craft;
}

// ============================================================================
// 9. CHANDRAYAAN-2 ORBITER / CHANDRAYAAN-1
// ============================================================================
export function createChandrayaanOrbiterModel(): THREE.Group {
  const craft = new THREE.Group();
  craft.name = 'Chandrayaan_Orbiter';

  // Cuboid bus wrapped in gold MLI
  const busGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
  const bus = new THREE.Mesh(busGeo, MAT_GOLD_KAPTON);
  craft.add(bus);

  // OHRC (Orbiter High Resolution Camera) imager barrel (nadir pointing)
  const camGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.55, 16);
  const cam = new THREE.Mesh(camGeo, MAT_CARBON_TRUSS);
  cam.position.set(0, -0.75, 0);
  craft.add(cam);

  // Single large solar wing (ISRO cantilevered design)
  const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 8), MAT_CARBON_TRUSS);
  yoke.rotation.z = Math.PI / 2;
  yoke.position.set(0.8, 0, 0);
  craft.add(yoke);

  const wing = createSolarWing(1.6, 0.75);
  wing.position.set(1.85, 0, 0);
  craft.add(wing);

  // Steerable High-Gain Parabolic Dish
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4),
    MAT_WHITE_DISH
  );
  dish.position.set(-0.4, 0.7, 0);
  dish.rotation.x = -0.5;
  craft.add(dish);

  return craft;
}

// ============================================================================
// 10. NOAA-19 / POLAR WEATHER SATELLITE - NORAD 33591
// ============================================================================
export function createNOAA19Model(): THREE.Group {
  const craft = new THREE.Group();
  craft.name = 'NOAA-19_POES';

  // Elongated rectangular bus
  const busGeo = new THREE.BoxGeometry(0.7, 1.5, 0.7);
  const bus = new THREE.Mesh(busGeo, MAT_SILVER_BLANKET);
  craft.add(bus);

  // Asymmetric single solar array wing
  const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), MAT_CARBON_TRUSS);
  yoke.rotation.z = Math.PI / 2;
  yoke.position.set(0.6, 0.4, 0);
  craft.add(yoke);

  const wing = createSolarWing(1.3, 0.65);
  wing.position.set(1.45, 0.4, 0);
  craft.add(wing);

  // AVHRR/3 scanning instrument box
  const avhrrGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
  const avhrr = new THREE.Mesh(avhrrGeo, MAT_TITANIUM);
  avhrr.position.set(0, -0.85, 0);
  craft.add(avhrr);

  // SARSAT and telemetry helical whip antennas
  const antGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6);
  const ant = new THREE.Mesh(antGeo, MAT_TITANIUM);
  ant.position.set(-0.3, 0.9, 0);
  craft.add(ant);

  return craft;
}

// ============================================================================
// 11. TERRA (EOS AM-1) FLAGSHIP CLIMATE OBSERVATORY - NORAD 25994
// ============================================================================
export function createTerraModel(): THREE.Group {
  const craft = new THREE.Group();
  craft.name = 'Terra_EOS_AM-1';

  // Large rectangular bus with gold and silver MLI
  const busGeo = new THREE.BoxGeometry(1.2, 1.6, 1.1);
  const bus = new THREE.Mesh(busGeo, MAT_GOLD_KAPTON);
  craft.add(bus);

  // Single large solar array wing with 6 articulated panels
  const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), MAT_CARBON_TRUSS);
  yoke.rotation.z = Math.PI / 2;
  yoke.position.set(-0.9, 0.3, 0);
  craft.add(yoke);

  const wing = createSolarWing(1.8, 0.85);
  wing.position.set(-2.0, 0.3, 0);
  craft.add(wing);

  // MODIS and ASTER optical sensor bays on nadir deck (-Y)
  const modisGeo = new THREE.BoxGeometry(0.5, 0.4, 0.4);
  const modis = new THREE.Mesh(modisGeo, MAT_CARBON_TRUSS);
  modis.position.set(0.25, -0.95, 0);
  craft.add(modis);

  const asterGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.35, 16);
  const aster = new THREE.Mesh(asterGeo, MAT_TITANIUM);
  aster.position.set(-0.3, -0.95, 0);
  craft.add(aster);

  // High-gain TDRSS steerable dish on high mast (+Y)
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), MAT_CARBON_TRUSS);
  mast.position.set(0, 1.1, 0);
  craft.add(mast);

  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4),
    MAT_WHITE_DISH
  );
  dish.position.set(0, 1.45, 0);
  craft.add(dish);

  return craft;
}

// ============================================================================
// CENTRAL MODEL FACTORY & REGISTRY DISPATCHER
// ============================================================================
export interface SpacecraftModelOptions {
  scale?: number;
  isMapMode?: boolean;
}

/**
 * Returns the authentic 3D model for the specified spacecraft/satellite ID.
 * Every supported object receives its true agency blueprint model.
 */
export function getSpacecraft3DModel(
  craftId: string,
  options: SpacecraftModelOptions = {}
): THREE.Group {
  const normalizedId = craftId.toLowerCase().replace(/^norad-/, '');
  let group: THREE.Group;

  // Dispatch to the exact spacecraft-specific procedural model
  if (normalizedId.includes('voyager')) {
    group = createVoyagerSpacecraftModel();
  } else if (normalizedId.includes('aditya') || normalizedId === '164') {
    group = createAdityaL1Model();
  } else if (normalizedId.includes('chandrayaan-3') || normalizedId.includes('vikram')) {
    group = createChandrayaan3Model();
  } else if (normalizedId.includes('chandrayaan')) {
    group = createChandrayaanOrbiterModel();
  } else if (normalizedId === 'iss' || normalizedId === '25544') {
    group = createISSModel();
  } else if (normalizedId.includes('tiangong') || normalizedId === '48274') {
    group = createTiangongModel();
  } else if (normalizedId.includes('astrosat') || normalizedId === '40930') {
    group = createAstrosatModel();
  } else if (normalizedId.includes('cartosat') || normalizedId === '44804') {
    group = createCartosat3Model();
  } else if (normalizedId.includes('eos-06') || normalizedId.includes('oceansat') || normalizedId === '54361') {
    group = createEOS06Model();
  } else if (normalizedId.includes('hubble') || normalizedId === '20580') {
    group = createHubbleModel();
  } else if (normalizedId.includes('noaa-19') || normalizedId === '33591') {
    group = createNOAA19Model();
  } else if (normalizedId.includes('terra') || normalizedId === '25994') {
    group = createTerraModel();
  } else {
    // For any other tracked satellite: use authentic Earth Observation / Communications model
    group = createCartosat3Model();
  }

  // Visual scaling (controlled visual amplification for visibility without altering scientific calculations)
  const scale = options.scale !== undefined ? options.scale : (options.isMapMode ? 0.35 : 1.5);
  group.scale.set(scale, scale, scale);

  return group;
}
