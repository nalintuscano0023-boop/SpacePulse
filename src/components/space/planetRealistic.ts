import * as THREE from 'three';
import { 
  createRealisticEarthShaderMaterial, 
  createRealisticAtmosphereMesh, 
  createRealisticCloudMesh, 
  getRealisticEarthDayTexture 
} from './earthRealistic';


export interface PlanetVisualConfig {
  id: string;
  name: string;
  radiusKm: number;
  baseRadius: number;
  axialTiltDeg: number;
  rotationPeriodHours: number;
  color: string;
  roughness: number;
  metalness: number;
  hasAtmosphere?: boolean;
  atmosphereColor?: number;
  atmosphereOpacity?: number;
  hasRings?: boolean;
}

export const PLANET_VISUAL_CONFIGS: Record<string, PlanetVisualConfig> = {
  mercury: {
    id: 'mercury',
    name: 'Mercury',
    radiusKm: 2439.7,
    baseRadius: 1.1,
    axialTiltDeg: 0.03,
    rotationPeriodHours: 1407.6,
    color: '#8c8a87',
    roughness: 0.94,
    metalness: 0.08
  },
  venus: {
    id: 'venus',
    name: 'Venus',
    radiusKm: 6051.8,
    baseRadius: 1.8,
    axialTiltDeg: 177.3,
    rotationPeriodHours: -5832.5,
    color: '#e2d3b3',
    roughness: 0.55,
    metalness: 0.05,
    hasAtmosphere: true,
    atmosphereColor: 0xf5ecc8,
    atmosphereOpacity: 0.16
  },
  earth: {
    id: 'earth',
    name: 'Earth',
    radiusKm: 6371.0,
    baseRadius: 2.2,
    axialTiltDeg: 23.44,
    rotationPeriodHours: 23.93,
    color: '#38bdf8',
    roughness: 0.45,
    metalness: 0.12,
    hasAtmosphere: true,
    atmosphereColor: 0x38bdf8,
    atmosphereOpacity: 0.22
  },
  mars: {
    id: 'mars',
    name: 'Mars',
    radiusKm: 3389.5,
    baseRadius: 1.5,
    axialTiltDeg: 25.19,
    rotationPeriodHours: 24.62,
    color: '#c1440e',
    roughness: 0.88,
    metalness: 0.05,
    hasAtmosphere: true,
    atmosphereColor: 0xe07a5f,
    atmosphereOpacity: 0.08
  },
  jupiter: {
    id: 'jupiter',
    name: 'Jupiter',
    radiusKm: 69911.0,
    baseRadius: 4.6,
    axialTiltDeg: 3.13,
    rotationPeriodHours: 9.93,
    color: '#c99039',
    roughness: 0.65,
    metalness: 0.02
  },
  saturn: {
    id: 'saturn',
    name: 'Saturn',
    radiusKm: 58232.0,
    baseRadius: 3.8,
    axialTiltDeg: 26.73,
    rotationPeriodHours: 10.7,
    color: '#e2bf7d',
    roughness: 0.70,
    metalness: 0.02,
    hasRings: true
  },
  uranus: {
    id: 'uranus',
    name: 'Uranus',
    radiusKm: 25362.0,
    baseRadius: 2.7,
    axialTiltDeg: 97.77,
    rotationPeriodHours: -17.24,
    color: '#93b8be',
    roughness: 0.60,
    metalness: 0.04,
    hasAtmosphere: true,
    atmosphereColor: 0xa5f3fc,
    atmosphereOpacity: 0.12
  },
  neptune: {
    id: 'neptune',
    name: 'Neptune',
    radiusKm: 24622.0,
    baseRadius: 2.6,
    axialTiltDeg: 28.32,
    rotationPeriodHours: 16.11,
    color: '#2b50aa',
    roughness: 0.55,
    metalness: 0.04,
    hasAtmosphere: true,
    atmosphereColor: 0x38bdf8,
    atmosphereOpacity: 0.15
  }
};

const textureCache: Record<string, THREE.CanvasTexture> = {};

export function getSunPhotosphereTexture(): THREE.CanvasTexture {
  if (textureCache['sun']) return textureCache['sun'];

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0.0, '#fffbeb');
  grad.addColorStop(0.2, '#fef08a');
  grad.addColorStop(0.5, '#f59e0b');
  grad.addColorStop(0.8, '#d97706');
  grad.addColorStop(1.0, '#b45309');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 2800; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = 1.5 + Math.random() * 4.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.45 ? 'rgba(255, 255, 255, 0.32)' : 'rgba(180, 83, 9, 0.22)';
    ctx.fill();
  }

  for (let p = 0; p < 18; p++) {
    const px = Math.random() * width;
    const py = 120 + Math.random() * 272;
    const radG = ctx.createRadialGradient(px, py, 0, px, py, 16 + Math.random() * 32);
    radG.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
    radG.addColorStop(0.4, 'rgba(254, 240, 138, 0.4)');
    radG.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = radG;
    ctx.beginPath();
    ctx.arc(px, py, 45, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  textureCache['sun'] = tex;
  return tex;
}

export function getMercuryTexture(): THREE.CanvasTexture {
  if (textureCache['mercury']) return textureCache['mercury'];

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#656360';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 35; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = 25 + Math.random() * 80;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(60, 58, 55, 0.55)');
    grad.addColorStop(0.7, 'rgba(85, 82, 78, 0.3)');
    grad.addColorStop(1, 'rgba(101, 99, 96, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let c = 0; c < 350; c++) {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const cr = 2 + Math.random() * 12;

    ctx.strokeStyle = 'rgba(195, 190, 185, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(38, 36, 34, 0.75)';
    ctx.beginPath();
    ctx.arc(cx + cr * 0.2, cy, cr * 0.85, 0, Math.PI * 2);
    ctx.fill();

    if (cr > 8) {
      ctx.strokeStyle = 'rgba(215, 210, 205, 0.18)';
      ctx.lineWidth = 0.8;
      for (let ray = 0; ray < 6; ray++) {
        const ang = ray * (Math.PI / 3) + Math.random() * 0.2;
        const len = cr * (3 + Math.random() * 4);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  textureCache['mercury'] = tex;
  return tex;
}

export function getVenusTexture(): THREE.CanvasTexture {
  if (textureCache['venus']) return textureCache['venus'];

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e8dcb8';
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += 4) {
    const normY = (y / height) * 2 - 1;
    const bandIntensity = 0.08 + Math.cos(normY * Math.PI * 2.2) * 0.07;
    ctx.fillStyle = `rgba(202, 178, 128, ${bandIntensity.toFixed(3)})`;
    ctx.fillRect(0, y, width, 4);
  }

  for (let s = 0; s < 45; s++) {
    const sx = Math.random() * width;
    const sy = 80 + Math.random() * 350;
    const sw = 60 + Math.random() * 180;
    const sh = 10 + Math.random() * 30;
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sw);
    grad.addColorStop(0, 'rgba(255, 248, 225, 0.45)');
    grad.addColorStop(0.6, 'rgba(235, 215, 170, 0.2)');
    grad.addColorStop(1, 'rgba(232, 220, 184, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(sx, sy, sw, sh, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  textureCache['venus'] = tex;
  return tex;
}

export function getMarsTexture(): THREE.CanvasTexture {
  if (textureCache['mars']) return textureCache['mars'];

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b7471d';
  ctx.fillRect(0, 0, width, height);

  const drawAlbedoRegion = (x: number, y: number, rx: number, ry: number) => {
    const radG = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    radG.addColorStop(0, 'rgba(74, 38, 26, 0.85)');
    radG.addColorStop(0.6, 'rgba(105, 48, 30, 0.5)');
    radG.addColorStop(1, 'rgba(183, 71, 29, 0)');
    ctx.fillStyle = radG;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.25, 0, Math.PI * 2);
    ctx.fill();
  };

  drawAlbedoRegion(580, 240, 75, 55);
  drawAlbedoRegion(320, 190, 85, 45);
  drawAlbedoRegion(480, 280, 95, 40);
  drawAlbedoRegion(820, 260, 60, 50);
  drawAlbedoRegion(180, 290, 70, 45);

  for (let i = 0; i < 400; i++) {
    const cx = Math.random() * width;
    const cy = 40 + Math.random() * 430;
    const cr = 1.5 + Math.random() * 6;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(70, 32, 20, 0.45)' : 'rgba(215, 120, 70, 0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  const northGrad = ctx.createLinearGradient(0, 0, 0, 38);
  northGrad.addColorStop(0, '#ffffff');
  northGrad.addColorStop(0.7, '#f8fafc');
  northGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = northGrad;
  ctx.fillRect(0, 0, width, 38);

  const southGrad = ctx.createLinearGradient(0, height - 32, 0, height);
  southGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  southGrad.addColorStop(0.3, '#f8fafc');
  southGrad.addColorStop(1, '#ffffff');
  ctx.fillStyle = southGrad;
  ctx.fillRect(0, height - 32, width, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  textureCache['mars'] = tex;
  return tex;
}

export function getJupiterTexture(): THREE.CanvasTexture {
  if (textureCache['jupiter']) return textureCache['jupiter'];

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f3e5c8';
  ctx.fillRect(0, 0, width, height);

  const bands = [
    { y: 0, h: 55, col: '#7d6148' },
    { y: 55, h: 40, col: '#ba8756' },
    { y: 95, h: 45, col: '#e8d2ad' },
    { y: 140, h: 60, col: '#8c4822' },
    { y: 200, h: 50, col: '#f7eed7' },
    { y: 250, h: 65, col: '#9c532b' },
    { y: 315, h: 45, col: '#dfc79b' },
    { y: 360, h: 45, col: '#a36d42' },
    { y: 405, h: 107, col: '#6d543e' }
  ];

  bands.forEach(b => {
    ctx.fillStyle = b.col;
    ctx.fillRect(0, b.y, width, b.h);
  });

  for (let x = 0; x < width; x += 8) {
    const wave1 = Math.sin(x * 0.04) * 6 + Math.cos(x * 0.1) * 3;
    const wave2 = Math.sin(x * 0.035 + 1.2) * 8 + Math.cos(x * 0.08) * 4;

    ctx.fillStyle = 'rgba(140, 72, 34, 0.45)';
    ctx.fillRect(x, 140 + wave1, 10, 8);

    ctx.fillStyle = 'rgba(247, 238, 215, 0.55)';
    ctx.fillRect(x, 200 + wave2, 10, 8);

    ctx.fillStyle = 'rgba(156, 83, 43, 0.45)';
    ctx.fillRect(x, 250 + wave1, 10, 8);
  }

  const grsX = 640;
  const grsY = 285;
  const grsW = 54;
  const grsH = 32;

  const hollowGrad = ctx.createRadialGradient(grsX, grsY, 0, grsX, grsY, grsW * 1.2);
  hollowGrad.addColorStop(0, 'rgba(250, 245, 235, 0.85)');
  hollowGrad.addColorStop(0.7, 'rgba(250, 245, 235, 0.4)');
  hollowGrad.addColorStop(1, 'rgba(250, 245, 235, 0)');
  ctx.fillStyle = hollowGrad;
  ctx.beginPath();
  ctx.ellipse(grsX, grsY, grsW * 1.15, grsH * 1.35, 0, 0, Math.PI * 2);
  ctx.fill();

  const grsGrad = ctx.createRadialGradient(grsX, grsY, 0, grsX, grsY, grsW);
  grsGrad.addColorStop(0, '#c2410c');
  grsGrad.addColorStop(0.5, '#ea580c');
  grsGrad.addColorStop(0.85, '#f97316');
  grsGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
  ctx.fillStyle = grsGrad;
  ctx.beginPath();
  ctx.ellipse(grsX, grsY, grsW, grsH, 0.05, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  textureCache['jupiter'] = tex;
  return tex;
}

export function getSaturnTexture(): THREE.CanvasTexture {
  if (textureCache['saturn']) return textureCache['saturn'];

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e2bf7d';
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += 4) {
    const ny = (y / height) * 2 - 1;
    const band = 0.08 + Math.cos(ny * Math.PI * 3.5) * 0.06;
    ctx.fillStyle = ny > 0 ? `rgba(180, 140, 80, ${band.toFixed(3)})` : `rgba(215, 185, 130, ${band.toFixed(3)})`;
    ctx.fillRect(0, y, width, 4);
  }

  const northCap = ctx.createLinearGradient(0, 0, 0, 45);
  northCap.addColorStop(0, '#7c8b78');
  northCap.addColorStop(1, 'rgba(124, 139, 120, 0)');
  ctx.fillStyle = northCap;
  ctx.fillRect(0, 0, width, 45);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  textureCache['saturn'] = tex;
  return tex;
}

export function getSaturnRingTexture(): THREE.CanvasTexture {
  if (textureCache['saturn_rings']) return textureCache['saturn_rings'];

  const width = 512;
  const height = 1;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0.00, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.12, 'rgba(0, 0, 0, 0)');

  grad.addColorStop(0.14, 'rgba(140, 115, 80, 0.15)');
  grad.addColorStop(0.30, 'rgba(165, 140, 100, 0.35)');

  grad.addColorStop(0.32, 'rgba(195, 170, 125, 0.65)');
  grad.addColorStop(0.48, 'rgba(235, 215, 175, 0.95)');
  grad.addColorStop(0.63, 'rgba(220, 200, 160, 0.90)');

  grad.addColorStop(0.64, 'rgba(15, 12, 10, 0.08)');
  grad.addColorStop(0.67, 'rgba(0, 0, 0, 0.03)');
  grad.addColorStop(0.70, 'rgba(20, 18, 15, 0.12)');

  grad.addColorStop(0.71, 'rgba(195, 175, 140, 0.68)');
  grad.addColorStop(0.84, 'rgba(180, 160, 125, 0.62)');
  grad.addColorStop(0.86, 'rgba(40, 35, 30, 0.15)');
  grad.addColorStop(0.88, 'rgba(175, 155, 120, 0.58)');
  grad.addColorStop(0.93, 'rgba(150, 130, 100, 0.35)');

  grad.addColorStop(0.95, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.98, 'rgba(160, 140, 110, 0.22)');
  grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  textureCache['saturn_rings'] = tex;
  return tex;
}

export function getUranusTexture(): THREE.CanvasTexture {
  if (textureCache['uranus']) return textureCache['uranus'];

  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8ce4e8';
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += 4) {
    const ny = (y / height) * 2 - 1;
    const band = 0.05 + Math.cos(ny * Math.PI * 2.0) * 0.04;
    ctx.fillStyle = `rgba(100, 195, 205, ${band.toFixed(3)})`;
    ctx.fillRect(0, y, width, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  textureCache['uranus'] = tex;
  return tex;
}

export function getNeptuneTexture(): THREE.CanvasTexture {
  if (textureCache['neptune']) return textureCache['neptune'];

  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#274b9f';
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += 4) {
    const ny = (y / height) * 2 - 1;
    const band = 0.07 + Math.cos(ny * Math.PI * 2.5) * 0.05;
    ctx.fillStyle = `rgba(28, 55, 125, ${band.toFixed(3)})`;
    ctx.fillRect(0, y, width, 4);
  }

  for (let c = 0; c < 12; c++) {
    const cx = Math.random() * width;
    const cy = 80 + Math.random() * 100;
    const cw = 25 + Math.random() * 60;
    const ch = 2 + Math.random() * 4;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cw);
    grad.addColorStop(0, 'rgba(240, 248, 255, 0.65)');
    grad.addColorStop(0.7, 'rgba(200, 230, 255, 0.25)');
    grad.addColorStop(1, 'rgba(39, 75, 159, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, ch, -0.05, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  textureCache['neptune'] = tex;
  return tex;
}

export function createRealisticSun(sunRadius: number = 4.5): {
  mesh: THREE.Mesh;
  pointLight: THREE.PointLight;
  coronaInner: THREE.Mesh;
  coronaOuter: THREE.Mesh;
  flareSprite: THREE.Sprite;
} {
  const sunGeo = new THREE.SphereGeometry(sunRadius, 48, 48);
  const sunTex = getSunPhotosphereTexture();
  const sunMat = new THREE.MeshBasicMaterial({
    map: sunTex,
    color: 0xfffdf0
  });
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunMesh.userData = { bodyId: 'sun' };

  const pointLight = new THREE.PointLight(0xfffaec, 4.2, 8000, 0.06);
  pointLight.position.set(0, 0, 0);
  sunMesh.add(pointLight);

  const innerGeo = new THREE.SphereGeometry(sunRadius * 1.04, 32, 32);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.35,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const coronaInner = new THREE.Mesh(innerGeo, innerMat);
  sunMesh.add(coronaInner);

  const outerGeo = new THREE.SphereGeometry(sunRadius * 1.25, 32, 32);
  const outerMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.14,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const coronaOuter = new THREE.Mesh(outerGeo, outerMat);
  sunMesh.add(coronaOuter);

  const flareCanvas = document.createElement('canvas');
  flareCanvas.width = 128;
  flareCanvas.height = 128;
  const fCtx = flareCanvas.getContext('2d')!;
  const fGrad = fCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  fGrad.addColorStop(0, 'rgba(255, 253, 230, 0.90)');
  fGrad.addColorStop(0.18, 'rgba(254, 240, 138, 0.55)');
  fGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.18)');
  fGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  fCtx.fillStyle = fGrad;
  fCtx.fillRect(0, 0, 128, 128);

  const flareMat = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(flareCanvas),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.85
  });
  const flareSprite = new THREE.Sprite(flareMat);
  flareSprite.scale.set(sunRadius * 6.5, sunRadius * 6.5, 1);
  sunMesh.add(flareSprite);

  return {
    mesh: sunMesh,
    pointLight,
    coronaInner,
    coronaOuter,
    flareSprite
  };
}

export function createSaturnRingMesh(planetRadius: number): THREE.Mesh {
  const innerR = planetRadius * 1.28;
  const outerR = planetRadius * 2.38;
  const ringGeo = new THREE.RingGeometry(innerR, outerR, 96);

  const pos = ringGeo.attributes.position;
  const uv = ringGeo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i);
    const dist = Math.sqrt(x * x + z * z);
    const u = (dist - innerR) / (outerR - innerR);
    uv.setXY(i, Math.max(0, Math.min(1, u)), 0.5);
  }
  uv.needsUpdate = true;

  const ringTex = getSaturnRingTexture();
  const ringMat = new THREE.MeshStandardMaterial({
    map: ringTex,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    roughness: 0.8,
    metalness: 0.05
  });

  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = Math.PI / 2;
  return ringMesh;
}

export function createRealisticPlanet(
  planetId: string,
  visualRadius: number
): {
  group: THREE.Group;
  planetMesh: THREE.Mesh;
  cloudsMesh?: THREE.Mesh;
  ringsMesh?: THREE.Mesh;
  atmosphereMesh?: THREE.Mesh;
  config: PlanetVisualConfig;
} {
  const config = PLANET_VISUAL_CONFIGS[planetId] || {
    id: planetId,
    name: planetId.toUpperCase(),
    radiusKm: 5000,
    baseRadius: visualRadius,
    axialTiltDeg: 0,
    rotationPeriodHours: 24,
    color: '#94a3b8',
    roughness: 0.7,
    metalness: 0.05
  };

  const planetGroup = new THREE.Group();
  planetGroup.name = `PlanetGroup_${planetId}`;

  const tiltRad = (config.axialTiltDeg * Math.PI) / 180.0;
  planetGroup.rotation.z = -tiltRad;

  const geo = new THREE.SphereGeometry(visualRadius, 64, 64);
  let mat: THREE.Material;
  let cloudsMesh: THREE.Mesh | undefined;
  let ringsMesh: THREE.Mesh | undefined;
  let atmosphereMesh: THREE.Mesh | undefined;

  switch (planetId) {
    case 'mercury': {
      const tex = getMercuryTexture();
      mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: config.roughness,
        metalness: config.metalness
      });
      break;
    }
    case 'venus': {
      const tex = getVenusTexture();
      mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: config.roughness,
        metalness: config.metalness
      });
      break;
    }
    case 'earth': {
      const tex = getRealisticEarthDayTexture();
      mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: config.roughness,
        metalness: config.metalness
      });
      cloudsMesh = createRealisticCloudMesh(visualRadius);
      planetGroup.add(cloudsMesh);
      break;
    }
    case 'mars': {
      const tex = getMarsTexture();
      mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: config.roughness,
        metalness: config.metalness
      });
      break;
    }
    case 'jupiter': {
      const tex = getJupiterTexture();
      mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: config.roughness,
        metalness: config.metalness
      });
      break;
    }
    case 'saturn': {
      const tex = getSaturnTexture();
      mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: config.roughness,
        metalness: config.metalness
      });
      ringsMesh = createSaturnRingMesh(visualRadius);
      planetGroup.add(ringsMesh);
      break;
    }
    case 'uranus': {
      const tex = getUranusTexture();
      mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: config.roughness,
        metalness: config.metalness
      });
      break;
    }
    case 'neptune': {
      const tex = getNeptuneTexture();
      mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: config.roughness,
        metalness: config.metalness
      });
      break;
    }
    default: {
      mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(config.color),
        roughness: config.roughness,
        metalness: config.metalness
      });
    }
  }

  const planetMesh = new THREE.Mesh(geo, mat);
  planetMesh.userData = { bodyId: planetId };
  planetGroup.add(planetMesh);

  if (config.hasAtmosphere && config.atmosphereColor !== undefined) {
    const atmoGeo = new THREE.SphereGeometry(visualRadius * 1.025, 48, 48);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: config.atmosphereColor,
      transparent: true,
      opacity: config.atmosphereOpacity || 0.15,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    atmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
    planetGroup.add(atmosphereMesh);
  }

  return {
    group: planetGroup,
    planetMesh,
    cloudsMesh,
    ringsMesh,
    atmosphereMesh,
    config
  };
}
