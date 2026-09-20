import * as THREE from 'three';

/**
 * Deep Space Environment Subsystem
 * 
 * Provides:
 * 1. Procedural Milky Way Panoramic Celestial Background Dome (Galactic core, dust lanes, faint nebulae)
 * 2. Multi-tier Deep Space Starfield (10,000+ stars with authentic astronomical spectral colors and magnitude distribution)
 * 3. Prominent navigational guide stars with subtle optical diffraction spikes
 */

let cachedMilkyWayTexture: THREE.CanvasTexture | null = null;

/**
 * Generates an astronomical equirectangular Milky Way Sky Texture (2048 x 1024)
 * Featuring the dense stellar galactic bulge, dark dust rifts (Great Rift, Coalsack),
 * diffuse star clouds (Cygnus, Carina), and faint cosmic dust emissions.
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

  // 2. Draw Galactic Plane (Sine wave across equirectangular map due to ~60° celestial inclination)
  // The galactic equator crosses the celestial equator at ~lon 0° and 180°
  const getGalacticY = (x: number) => {
    const angle = (x / width) * Math.PI * 2;
    // Galactic center is around x = 1100 (Sagittarius / Scorpius)
    return height * 0.5 + Math.sin(angle - 0.6) * (height * 0.32);
  };

  // 2a. Broad Diffuse Galactic Starlight Halo
  for (let x = 0; x < width; x += 12) {
    const cy = getGalacticY(x);
    const radGrad = ctx.createRadialGradient(x, cy, 0, x, cy, 140);
    radGrad.addColorStop(0, 'rgba(30, 42, 65, 0.45)');
    radGrad.addColorStop(0.4, 'rgba(20, 28, 48, 0.25)');
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
  coreGrad.addColorStop(0, 'rgba(255, 240, 215, 0.65)');  // Incandescent stellar bulge
  coreGrad.addColorStop(0.25, 'rgba(240, 200, 150, 0.4)'); // Warm stellar population II
  coreGrad.addColorStop(0.6, 'rgba(80, 70, 110, 0.22)');   // Faint violet/blue ionizing dust
  coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.ellipse(coreX, coreY, 240, 130, -0.45, 0, Math.PI * 2);
  ctx.fill();

  // 2c. Interstellar Dark Dust Lanes (The Great Rift cutting through the galactic plane)
  // These absorb background starlight and create the characteristic split in the Milky Way
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

  // 2d. Fine Granular Stellar Cloud Texture (Millions of unresolved distant stars)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * width;
    const cy = getGalacticY(x);
    // Higher density closer to the galactic plane
    const spread = (Math.random() - 0.5) * (Math.random() * 120);
    const y = cy + spread;
    if (y >= 0 && y < height) {
      const r = Math.random() * 1.2;
      ctx.fillRect(x, y, r, r);
    }
  }

  // 2e. Subtle Deep Space Nebulosity (Carina, Orion, Cygnus faint emission clouds)
  const drawEmissionNebula = (nx: number, ny: number, rx: number, ry: number, colorRgba: string) => {
    const nebGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, Math.max(rx, ry));
    nebGrad.addColorStop(0, colorRgba);
    nebGrad.addColorStop(0.5, colorRgba.replace(/[\d\.]+\)$/, '0.08)'));
    nebGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebGrad;
    ctx.beginPath();
    ctx.ellipse(nx, ny, rx, ry, Math.random() * 0.5, 0, Math.PI * 2);
    ctx.fill();
  };
  drawEmissionNebula(650, 420, 110, 75, 'rgba(56, 189, 248, 0.16)');  // Cygnus blue rift
  drawEmissionNebula(1520, 680, 130, 85, 'rgba(244, 63, 94, 0.14)');  // Carina magenta emission
  drawEmissionNebula(420, 520, 90, 60, 'rgba(168, 85, 247, 0.12)');  // Orion faint molecular cloud

  cachedMilkyWayTexture = new THREE.CanvasTexture(canvas);
  cachedMilkyWayTexture.wrapS = THREE.RepeatWrapping;
  cachedMilkyWayTexture.wrapT = THREE.ClampToEdgeWrapping;
  return cachedMilkyWayTexture;
}

/**
 * Creates the Milky Way Sky Dome Mesh
 * Placed at the outer boundary (radius 9000), rendered with BackSide and depthWrite: false.
 */
export function createMilkyWayDome(): THREE.Mesh {
  const mwTex = getMilkyWayTexture();
  const domeGeo = new THREE.SphereGeometry(9000, 48, 48);
  const domeMat = new THREE.MeshBasicMaterial({
    map: mwTex,
    side: THREE.BackSide,
    depthWrite: false,
    transparent: true,
    opacity: 0.92  // Richer galactic backdrop for deeper immersion
  });
  const domeMesh = new THREE.Mesh(domeGeo, domeMat);
  // Orient galactic plane authentically
  domeMesh.rotation.x = 0.42;
  domeMesh.rotation.z = -0.25;
  return domeMesh;
}


/**
 * Multi-Tier High-Fidelity Deep Space Starfield
 * 
 * Returns a Group containing:
 * 1. 10,000 Distant pinpoint micro-stars (size 1.2px) with astronomical magnitude scaling
 * 2. 3,500 Spectral classification stars (O, B, A, F, G, K, M colors)
 * 3. 50 Prominent navigational guide stars with subtle 4-point optical diffraction spikes
 */
export function createRealisticStarfield(): THREE.Group {
  const starfieldGroup = new THREE.Group();
  starfieldGroup.name = 'DeepSpace_Starfield';

  // -------------------------------------------------------------
  // TIER 1: 14,000 Pinpoint Distant Micro-Stars
  // -------------------------------------------------------------
  const microCount = 14000;
  const microGeo = new THREE.BufferGeometry();
  const microPos = new Float32Array(microCount * 3);
  const microColors = new Float32Array(microCount * 3);

  for (let i = 0; i < microCount; i++) {
    const dist = 7500 + Math.random() * 1200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);

    microPos[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
    microPos[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
    microPos[i * 3 + 2] = dist * Math.cos(phi);

    // Subtle magnitude brightness variation (most stars are faint)
    const brightness = 0.35 + Math.pow(Math.random(), 2.8) * 0.65;
    microColors[i * 3] = brightness * 0.95;
    microColors[i * 3 + 1] = brightness * 0.97;
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
  // TIER 2: 4,500 Astronomical Spectral Classification Stars
  // Authentic B-V Colors: O/B (Blue), A (White), G (Solar Yellow), K (Orange), M (Red)
  // -------------------------------------------------------------
  const spectralCount = 4500;
  const spectralGeo = new THREE.BufferGeometry();
  const spectralPos = new Float32Array(spectralCount * 3);
  const spectralColors = new Float32Array(spectralCount * 3);

  for (let i = 0; i < spectralCount; i++) {
    const dist = 6000 + Math.random() * 2000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);

    spectralPos[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
    spectralPos[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
    spectralPos[i * 3 + 2] = dist * Math.cos(phi);

    const spectralRoll = Math.random();
    if (spectralRoll < 0.12) {
      // O/B Class: Hot Blue-White (e.g. Rigel, Spica)
      spectralColors[i * 3] = 0.68;
      spectralColors[i * 3 + 1] = 0.82;
      spectralColors[i * 3 + 2] = 1.0;
    } else if (spectralRoll < 0.40) {
      // A/F Class: Pure White / Crisp Ivory (e.g. Sirius, Vega, Procyon)
      spectralColors[i * 3] = 0.96;
      spectralColors[i * 3 + 1] = 0.97;
      spectralColors[i * 3 + 2] = 1.0;
    } else if (spectralRoll < 0.70) {
      // G Class: Solar Yellow (e.g. Sun, Alpha Centauri A, Capella)
      spectralColors[i * 3] = 1.0;
      spectralColors[i * 3 + 1] = 0.94;
      spectralColors[i * 3 + 2] = 0.82;
    } else if (spectralRoll < 0.88) {
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
    size: 2.0,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    sizeAttenuation: false,
    depthWrite: false
  });
  const spectralStars = new THREE.Points(spectralGeo, spectralMat);
  starfieldGroup.add(spectralStars);

  // -------------------------------------------------------------
  // TIER 3: Prominent Navigational Guide Stars (with soft halos)
  // -------------------------------------------------------------
  const guideCount = 55;
  const guideGeo = new THREE.BufferGeometry();
  const guidePos = new Float32Array(guideCount * 3);
  const guideColors = new Float32Array(guideCount * 3);

  for (let i = 0; i < guideCount; i++) {
    const dist = 5500 + Math.random() * 1500;
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
    size: 3.8,  // Larger for prominent navigational stars
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    sizeAttenuation: false,
    depthWrite: false
  });
  const guideStars = new THREE.Points(guideGeo, guideMat);
  starfieldGroup.add(guideStars);

  return starfieldGroup;
}
