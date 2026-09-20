import * as THREE from 'three';

/**
 * Deep Space Environment Subsystem
 * 
 * Provides:
 * 1. 4-Tier Spatial Deep Space Starfield (16,000 background micro-stars, 5,000 mid-distance spectral stars, 80 navigational guide stars, micro cosmic dust particles)
 * 2. Volumetric Diffuse Milky Way Galactic Disc (point-based, low-contrast, authentic 60° inclination and Sagittarius galactic core)
 * 3. Earth Upper-Atmosphere Meteor System (rare, fast, subtle ionization streaks restricted strictly to Earth's atmospheric region)
 */

let cachedMilkyWayTexture: THREE.CanvasTexture | null = null;

/**
 * Generates a subtle astronomical equirectangular Milky Way Sky Texture (2048 x 1024)
 * Low-contrast, diffuse, with dark dust lanes and faint starlight density.
 */
export function getMilkyWayTexture(): THREE.CanvasTexture {
  if (cachedMilkyWayTexture) return cachedMilkyWayTexture;

  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep Vacuum of Space Background (Near-black with subtle celestial indigo tint)
  ctx.fillStyle = '#010307';
  ctx.fillRect(0, 0, width, height);

  // 2. Draw Galactic Plane (~60° celestial inclination)
  const getGalacticY = (x: number) => {
    const angle = (x / width) * Math.PI * 2;
    return height * 0.5 + Math.sin(angle - 0.6) * (height * 0.32);
  };

  // 2a. Broad Diffuse Galactic Starlight Halo
  for (let x = 0; x < width; x += 12) {
    const cy = getGalacticY(x);
    const radGrad = ctx.createRadialGradient(x, cy, 0, x, cy, 140);
    radGrad.addColorStop(0, 'rgba(30, 42, 65, 0.25)');
    radGrad.addColorStop(0.5, 'rgba(18, 24, 40, 0.12)');
    radGrad.addColorStop(1, 'rgba(1, 3, 7, 0)');
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.ellipse(x, cy, 50, 140, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2b. Dense Galactic Core (Sagittarius Bulge at ~x = 1120)
  const coreX = 1120;
  const coreY = getGalacticY(coreX);
  const coreGrad = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, 260);
  coreGrad.addColorStop(0, 'rgba(255, 240, 215, 0.40)');
  coreGrad.addColorStop(0.3, 'rgba(230, 195, 145, 0.22)');
  coreGrad.addColorStop(0.7, 'rgba(60, 55, 85, 0.10)');
  coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.ellipse(coreX, coreY, 240, 130, -0.45, 0, Math.PI * 2);
  ctx.fill();

  // 2c. Interstellar Dark Dust Lanes (The Great Rift cutting through the galactic plane)
  ctx.fillStyle = '#010307';
  for (let s = 0; s < 180; s++) {
    const x = 700 + (s / 180) * 800;
    const baseCy = getGalacticY(x);
    const dustOffset = (Math.sin(s * 0.1) * 16) + (Math.cos(s * 0.25) * 8);
    const dustR = 8 + Math.random() * 22;
    ctx.beginPath();
    ctx.arc(x, baseCy + dustOffset, dustR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2d. Granular Unresolved Stellar Cloud Texture
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * width;
    const cy = getGalacticY(x);
    const spread = (Math.random() - 0.5) * (Math.random() * 120);
    const y = cy + spread;
    if (y >= 0 && y < height) {
      const r = Math.random() * 1.1;
      ctx.fillRect(x, y, r, r);
    }
  }

  cachedMilkyWayTexture = new THREE.CanvasTexture(canvas);
  cachedMilkyWayTexture.wrapS = THREE.RepeatWrapping;
  cachedMilkyWayTexture.wrapT = THREE.ClampToEdgeWrapping;
  return cachedMilkyWayTexture;
}

/**
 * Creates the Milky Way Sky Dome Mesh (very subtle backdrop)
 */
export function createMilkyWayDome(): THREE.Mesh {
  const mwTex = getMilkyWayTexture();
  const domeGeo = new THREE.SphereGeometry(9000, 48, 48);
  const domeMat = new THREE.MeshBasicMaterial({
    map: mwTex,
    side: THREE.BackSide,
    depthWrite: false,
    transparent: true,
    opacity: 0.25
  });
  const domeMesh = new THREE.Mesh(domeGeo, domeMat);
  domeMesh.rotation.x = 0.42;
  domeMesh.rotation.z = -0.25;
  return domeMesh;
}

/**
 * 4-Tier Spatial Deep Space Starfield with Volumetric Milky Way Band & Dust Parallax
 */
export function createRealisticStarfield(): THREE.Group {
  const starfieldGroup = new THREE.Group();
  starfieldGroup.name = 'DeepSpace_Starfield';

  // -------------------------------------------------------------
  // TIER 1: 16,000 Pinpoint Distant Micro-Stars (Infinite depth canopy)
  // -------------------------------------------------------------
  const microCount = 16000;
  const microGeo = new THREE.BufferGeometry();
  const microPos = new Float32Array(microCount * 3);
  const microColors = new Float32Array(microCount * 3);

  for (let i = 0; i < microCount; i++) {
    const dist = 8000 + Math.random() * 2000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);

    microPos[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
    microPos[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
    microPos[i * 3 + 2] = dist * Math.cos(phi);

    // Natural magnitude power-law distribution
    const brightness = 0.28 + Math.pow(Math.random(), 3.2) * 0.72;
    microColors[i * 3] = brightness * 0.94;
    microColors[i * 3 + 1] = brightness * 0.96;
    microColors[i * 3 + 2] = brightness * 1.0;
  }
  microGeo.setAttribute('position', new THREE.BufferAttribute(microPos, 3));
  microGeo.setAttribute('color', new THREE.BufferAttribute(microColors, 3));

  const microMat = new THREE.PointsMaterial({
    size: 1.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: false,
    depthWrite: false
  });
  const microStars = new THREE.Points(microGeo, microMat);
  starfieldGroup.add(microStars);

  // -------------------------------------------------------------
  // TIER 2: 5,000 Mid-Distance Astronomical Spectral Classification Stars
  // Authentic B-V Colors: O/B (Blue), A (White), G (Solar Yellow), K (Orange), M (Red)
  // -------------------------------------------------------------
  const spectralCount = 5000;
  const spectralGeo = new THREE.BufferGeometry();
  const spectralPos = new Float32Array(spectralCount * 3);
  const spectralColors = new Float32Array(spectralCount * 3);

  for (let i = 0; i < spectralCount; i++) {
    const dist = 6000 + Math.random() * 2200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);

    spectralPos[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
    spectralPos[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
    spectralPos[i * 3 + 2] = dist * Math.cos(phi);

    const spectralRoll = Math.random();
    if (spectralRoll < 0.14) {
      // O/B Class: Hot Blue-White (e.g. Rigel, Spica)
      spectralColors[i * 3] = 0.68;
      spectralColors[i * 3 + 1] = 0.82;
      spectralColors[i * 3 + 2] = 1.0;
    } else if (spectralRoll < 0.42) {
      // A/F Class: Pure White / Crisp Ivory (e.g. Sirius, Vega, Procyon)
      spectralColors[i * 3] = 0.96;
      spectralColors[i * 3 + 1] = 0.97;
      spectralColors[i * 3 + 2] = 1.0;
    } else if (spectralRoll < 0.72) {
      // G Class: Solar Yellow (e.g. Sun, Alpha Centauri A, Capella)
      spectralColors[i * 3] = 1.0;
      spectralColors[i * 3 + 1] = 0.94;
      spectralColors[i * 3 + 2] = 0.82;
    } else if (spectralRoll < 0.89) {
      // K Class: Orange Giant (e.g. Arcturus, Aldebaran)
      spectralColors[i * 3] = 1.0;
      spectralColors[i * 3 + 1] = 0.78;
      spectralColors[i * 3 + 2] = 0.58;
    } else {
      // M Class: Red Supergiant (e.g. Betelgeuse, Antares)
      spectralColors[i * 3] = 1.0;
      spectralColors[i * 3 + 1] = 0.55;
      spectralColors[i * 3 + 2] = 0.48;
    }
  }
  spectralGeo.setAttribute('position', new THREE.BufferAttribute(spectralPos, 3));
  spectralGeo.setAttribute('color', new THREE.BufferAttribute(spectralColors, 3));

  const spectralMat = new THREE.PointsMaterial({
    size: 2.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.90,
    sizeAttenuation: false,
    depthWrite: false
  });
  const spectralStars = new THREE.Points(spectralGeo, spectralMat);
  starfieldGroup.add(spectralStars);

  // -------------------------------------------------------------
  // TIER 3: 80 Prominent Navigational Guide Stars (with soft halos)
  // -------------------------------------------------------------
  const guideCount = 80;
  const guideGeo = new THREE.BufferGeometry();
  const guidePos = new Float32Array(guideCount * 3);
  const guideColors = new Float32Array(guideCount * 3);

  for (let i = 0; i < guideCount; i++) {
    const dist = 5200 + Math.random() * 1800;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);

    guidePos[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
    guidePos[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
    guidePos[i * 3 + 2] = dist * Math.cos(phi);

    guideColors[i * 3] = 1.0;
    guideColors[i * 3 + 1] = 0.98;
    guideColors[i * 3 + 2] = 0.95;
  }
  guideGeo.setAttribute('position', new THREE.BufferAttribute(guidePos, 3));
  guideGeo.setAttribute('color', new THREE.BufferAttribute(guideColors, 3));

  const guideMat = new THREE.PointsMaterial({
    size: 3.6,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    sizeAttenuation: false,
    depthWrite: false
  });
  const guideStars = new THREE.Points(guideGeo, guideMat);
  starfieldGroup.add(guideStars);

  // -------------------------------------------------------------
  // TIER 4: Volumetric Point-Based Diffuse Milky Way Disc (6,500 particles)
  // -------------------------------------------------------------
  const mwCount = 6500;
  const mwGeo = new THREE.BufferGeometry();
  const mwPos = new Float32Array(mwCount * 3);
  const mwColors = new Float32Array(mwCount * 3);

  // Galactic plane orientation: tilted ~60°
  const galRot = new THREE.Euler(0.42, 0, -0.25);
  const vTemp = new THREE.Vector3();

  for (let i = 0; i < mwCount; i++) {
    // Angular distribution along the galactic circle
    const theta = Math.random() * Math.PI * 2;
    const radius = 6800 + Math.random() * 1400;
    // Gaussian thickness perpendicular to galactic plane
    const zThickness = (Math.random() + Math.random() + Math.random() - 1.5) * 550;

    vTemp.set(
      radius * Math.cos(theta),
      radius * Math.sin(theta),
      zThickness
    ).applyEuler(galRot);

    mwPos[i * 3] = vTemp.x;
    mwPos[i * 3 + 1] = vTemp.y;
    mwPos[i * 3 + 2] = vTemp.z;

    // Density modulation: Sagittarius core is warmer and denser
    const distToCore = Math.abs(theta - 2.8);
    const isCore = distToCore < 0.6;
    const alpha = (0.2 + Math.random() * 0.4) * (isCore ? 1.4 : 0.85);

    if (isCore) {
      mwColors[i * 3] = 1.0 * alpha;
      mwColors[i * 3 + 1] = 0.92 * alpha;
      mwColors[i * 3 + 2] = 0.80 * alpha;
    } else {
      mwColors[i * 3] = 0.70 * alpha;
      mwColors[i * 3 + 1] = 0.80 * alpha;
      mwColors[i * 3 + 2] = 0.98 * alpha;
    }
  }
  mwGeo.setAttribute('position', new THREE.BufferAttribute(mwPos, 3));
  mwGeo.setAttribute('color', new THREE.BufferAttribute(mwColors, 3));

  const mwMat = new THREE.PointsMaterial({
    size: 2.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.38,
    sizeAttenuation: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const mwStars = new THREE.Points(mwGeo, mwMat);
  starfieldGroup.add(mwStars);

  // -------------------------------------------------------------
  // TIER 5: Foreground Micro Cosmic Velocity Particles (350 points)
  // Drift providing genuine 3D parallax cues when camera moves
  // -------------------------------------------------------------
  const dustCount = 350;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);

  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 600;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 400;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 600;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));

  const dustMat = new THREE.PointsMaterial({
    size: 1.4,
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.40,
    sizeAttenuation: true,
    depthWrite: false
  });
  const dustParticles = new THREE.Points(dustGeo, dustMat);
  starfieldGroup.add(dustParticles);

  return starfieldGroup;
}

/**
 * Earth Upper-Atmosphere Meteor System
 * 
 * Spawns rare, subtle, fast ionization streaks strictly in Earth's atmospheric limb region.
 * Never placed in deep space.
 */
export interface AtmosphericMeteorSystem {
  group: THREE.Group;
  update: (deltaSeconds: number, earthPos: THREE.Vector3, isEarthFocused: boolean) => void;
  dispose: () => void;
}

export function createEarthAtmosphericMeteorSystem(): AtmosphericMeteorSystem {
  const group = new THREE.Group();
  group.name = 'Earth_Atmospheric_Meteors';

  const MAX_METEORS = 2;
  const meteorLines: THREE.Line[] = [];
  const meteorStates: Array<{
    active: boolean;
    start: THREE.Vector3;
    end: THREE.Vector3;
    progress: number;
    duration: number;
  }> = [];

  for (let i = 0; i < MAX_METEORS; i++) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const line = new THREE.Line(geo, mat);
    line.visible = false;
    group.add(line);
    meteorLines.push(line);

    meteorStates.push({
      active: false,
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
      progress: 0,
      duration: 0.22
    });
  }

  let timeSinceLastSpawn = 0;
  const SPAWN_INTERVAL = 12.0; // Rare interval ~12 seconds

  const update = (deltaSeconds: number, earthPos: THREE.Vector3, isEarthFocused: boolean) => {
    if (!isEarthFocused) {
      // Hide all meteors if not in Earth view
      meteorLines.forEach(l => { l.visible = false; });
      return;
    }

    timeSinceLastSpawn += deltaSeconds;

    // Check for rare meteor entry in Earth upper atmosphere (~10.2 to 10.4 units radius)
    if (timeSinceLastSpawn > SPAWN_INTERVAL && Math.random() < 0.35) {
      const freeIdx = meteorStates.findIndex(m => !m.active);
      if (freeIdx !== -1) {
        timeSinceLastSpawn = 0;
        const state = meteorStates[freeIdx];
        state.active = true;
        state.progress = 0;
        state.duration = 0.18 + Math.random() * 0.12; // Fast: 180-300ms

        // Random point on upper atmospheric sphere around Earth (~10.2 visual radius)
        const phi = Math.acos((Math.random() * 2) - 1);
        const theta = Math.random() * Math.PI * 2;
        const rAtmo = 10.25;

        state.start.set(
          earthPos.x + rAtmo * Math.sin(phi) * Math.cos(theta),
          earthPos.y + rAtmo * Math.sin(phi) * Math.sin(theta),
          earthPos.z + rAtmo * Math.cos(phi)
        );

        // Grazing trajectory (downward tangent into upper atmosphere)
        const tangent = new THREE.Vector3(-Math.sin(theta), Math.cos(theta), 0.2).normalize();
        const streakLen = 0.8 + Math.random() * 0.6;
        state.end.copy(state.start).add(tangent.multiplyScalar(streakLen));
      }
    }

    // Update active meteors
    meteorStates.forEach((state, idx) => {
      const line = meteorLines[idx];
      if (!state.active) {
        line.visible = false;
        return;
      }

      state.progress += deltaSeconds / state.duration;
      if (state.progress >= 1.0) {
        state.active = false;
        line.visible = false;
        return;
      }

      line.visible = true;
      const currentHead = new THREE.Vector3().lerpVectors(state.start, state.end, state.progress);
      const tailProgress = Math.max(0, state.progress - 0.35);
      const currentTail = new THREE.Vector3().lerpVectors(state.start, state.end, tailProgress);

      line.geometry.setFromPoints([currentTail, currentHead]);
      line.geometry.attributes.position.needsUpdate = true;

      // Bell-curve fade in and out
      const opacity = Math.sin(state.progress * Math.PI) * 0.75;
      (line.material as THREE.LineBasicMaterial).opacity = opacity;
    });
  };

  const dispose = () => {
    meteorLines.forEach(l => {
      l.geometry.dispose();
      (l.material as THREE.Material).dispose();
    });
  };

  return { group, update, dispose };
}
