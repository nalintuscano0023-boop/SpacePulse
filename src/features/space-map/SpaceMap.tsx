import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Orbit,
  Layers, 
  Clock, 
  RotateCcw, 
  ChevronRight,
  Crosshair,
  Search,
  Eye,
  Check
} from 'lucide-react';
import { calculatePlanetEphemeris } from '../../services/calculations/kepler';
import { calculateAdityaL1Ephemeris, calculateVoyagerEphemeris } from '../../services/calculations/lagrange';
import { CelestrakService } from '../../services/api/celestrakService';
import { SPACECRAFT_REGISTRY, resolveSpacecraftState } from '../../services/data/spacecraftCatalog';
import type { SpacecraftObject } from '../../types/space';
import { formatDistanceKm } from '../../utils/formatters';
import { kmToAu, formatLightTime, calculateLightTimeSeconds } from '../../services/calculations/physics';
import { StatusBadge } from '../../components/common/StatusBadge';

interface SpaceMapProps {
  onSelectObject: (obj: SpacecraftObject) => void;
  selectedObjectId?: string;
}

interface VisualBody {
  id: string;
  name: string;
  type: 'star' | 'planet' | 'moon' | 'spacecraft';
  mesh: THREE.Object3D;
  position: THREE.Vector3; // Visual units
  realKm: { x: number; y: number; z: number };
  radiusKm: number;
  orbitLine?: THREE.Line;
  labelSprite?: THREE.Sprite;
  color: string;
  craftData?: SpacecraftObject;
}

// Procedural Astronomical Textures Generator
function createSunTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  const grad = ctx.createLinearGradient(0, 0, 512, 256);
  grad.addColorStop(0, '#fffbeb');
  grad.addColorStop(0.3, '#fef08a');
  grad.addColorStop(0.7, '#f59e0b');
  grad.addColorStop(1, '#d97706');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  // Solar turbulence granulation
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const r = 2 + Math.random() * 6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(180, 83, 9, 0.25)';
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Deep ocean blue
  ctx.fillStyle = '#0f3a68';
  ctx.fillRect(0, 0, 512, 256);

  // Continents (procedural earth landmasses)
  ctx.fillStyle = '#22543d';
  const drawLand = (x: number, y: number, w: number, h: number) => {
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, Math.random() * 0.4, 0, Math.PI * 2);
    ctx.fill();
  };
  
  // Eurasia / Africa
  drawLand(280, 100, 70, 50);
  drawLand(260, 140, 45, 60);
  // Americas
  drawLand(120, 95, 45, 50);
  drawLand(150, 160, 35, 65);
  // Australia
  drawLand(390, 180, 30, 25);
  
  // Polar Ice Caps
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 20);
  ctx.fillRect(0, 236, 512, 20);

  return new THREE.CanvasTexture(canvas);
}

function createCloudsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 256);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 512;
    const y = 40 + Math.random() * 176;
    ctx.beginPath();
    ctx.ellipse(x, y, 20 + Math.random() * 40, 8 + Math.random() * 14, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

function createJupiterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const colors = ['#fde68a', '#d97706', '#fef3c7', '#b45309', '#fef08a', '#92400e', '#fef3c7'];
  const bandHeight = 256 / colors.length;
  colors.forEach((c, idx) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, idx * bandHeight, 512, bandHeight);
  });

  // Great Red Spot
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.ellipse(320, 165, 30, 16, 0.1, 0, Math.PI * 2);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}

function createSaturnRingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, 'rgba(214, 211, 209, 0)');
  grad.addColorStop(0.2, 'rgba(231, 229, 228, 0.85)');
  grad.addColorStop(0.55, 'rgba(214, 211, 209, 0.9)');
  grad.addColorStop(0.65, 'rgba(120, 113, 108, 0.1)'); // Cassini Division
  grad.addColorStop(0.75, 'rgba(231, 229, 228, 0.7)');
  grad.addColorStop(1.0, 'rgba(214, 211, 209, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 1);

  return new THREE.CanvasTexture(canvas);
}

export const SpaceMap: React.FC<SpaceMapProps> = ({ onSelectObject, selectedObjectId }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // UI state
  const [showOrbits, setShowOrbits] = useState(true);
  const [showSpacecraft, setShowSpacecraft] = useState(true);
  const [showPlanets, setShowPlanets] = useState(true);
  const [simDate, setSimDate] = useState<Date>(new Date());
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(selectedObjectId || 'earth');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [hudData, setHudData] = useState<{
    name: string;
    distEarthKm: number;
    distSunKm: number;
    lightTimeStr: string;
    type: string;
  } | null>(null);

  // Internal Three.js references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bodiesRef = useRef<Map<string, VisualBody>>(new Map());
  const distanceLineRef = useRef<THREE.Line | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Target Camera Transition State
  const targetCamPos = useRef<THREE.Vector3 | null>(null);
  const targetLookAt = useRef<THREE.Vector3 | null>(null);

  // Visual scaling helpers
  const mapAuToVisual = (au: number) => {
    if (au <= 1.8) return au * 34.0;
    if (au <= 6.0) return 1.8 * 34.0 + Math.pow(au - 1.8, 0.75) * 22.0;
    return 1.8 * 34.0 + Math.pow(6.0 - 1.8, 0.75) * 22.0 + Math.pow(au - 6.0, 0.65) * 16.0;
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#03050a');
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 8000);
    camera.position.set(0, 150, 240);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 2000;
    controls.minDistance = 4;
    controlsRef.current = controls;

    // 5. Lighting
    const sunLight = new THREE.PointLight(0xfffbeb, 3.0, 3500, 0.2);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x1e293b, 0.85);
    scene.add(ambientLight);

    // 6. Deep Starfield Background
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 3800;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 1400 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.4 + Math.random() * 0.6;
      starColors[i * 3] = brightness;
      starColors[i * 3 + 1] = brightness * (0.85 + Math.random() * 0.15);
      starColors[i * 3 + 2] = brightness * (0.95 + Math.random() * 0.05);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMaterial = new THREE.PointsMaterial({ size: 1.5, vertexColors: true, transparent: true, opacity: 0.85 });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // 7. Ecliptic Grid (Fine hairline guide)
    const grid = new THREE.GridHelper(500, 50, 0x1e293b, 0x0a101f);
    grid.position.y = -0.5;
    scene.add(grid);

    // 8. Distance Line Raycast
    const distLineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)]);
    const distLineMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 3,
      gapSize: 2,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.8
    });
    const distanceLine = new THREE.Line(distLineGeo, distLineMat);
    distanceLine.computeLineDistances();
    distanceLine.visible = false;
    scene.add(distanceLine);
    distanceLineRef.current = distanceLine;

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Raycaster for object clicking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes: THREE.Object3D[] = [];
      bodiesRef.current.forEach(body => {
        meshes.push(body.mesh);
      });

      const intersects = raycaster.intersectObjects(meshes, true);
      if (intersects.length > 0) {
        let hitObject: THREE.Object3D | null = intersects[0].object;
        while (hitObject && !hitObject.userData.bodyId && hitObject.parent) {
          hitObject = hitObject.parent;
        }
        if (hitObject && hitObject.userData.bodyId) {
          const bodyId = hitObject.userData.bodyId;
          setSelectedBodyId(bodyId);
          focusCameraOnObject(bodyId);
          const body = bodiesRef.current.get(bodyId);
          if (body && body.craftData) {
            onSelectObject(body.craftData);
          }
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // Animation Loop with smooth camera interpolation
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Rotate planet meshes on their axes
      bodiesRef.current.forEach(body => {
        if (body.mesh) {
          body.mesh.rotation.y += 0.003;
        }
      });

      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += 0.0045;
      }

      // Smooth camera transition toward selected target
      if (targetCamPos.current && targetLookAt.current) {
        camera.position.lerp(targetCamPos.current, 0.05);
        controls.target.lerp(targetLookAt.current, 0.05);

        if (camera.position.distanceTo(targetCamPos.current) < 0.2) {
          targetCamPos.current = null;
          targetLookAt.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
    };
  }, []);

  // Update bodies whenever date or toggles change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear existing bodies
    bodiesRef.current.forEach(body => {
      scene.remove(body.mesh);
      if (body.orbitLine) scene.remove(body.orbitLine);
    });
    bodiesRef.current.clear();

    const planetDefs = [
      { id: 'mercury', name: 'Mercury', color: '#94a3b8', radius: 1.0 },
      { id: 'venus', name: 'Venus', color: '#fde68a', radius: 1.6 },
      { id: 'earth', name: 'Earth', color: '#38bdf8', radius: 1.8, isEarth: true },
      { id: 'mars', name: 'Mars', color: '#ef4444', radius: 1.3 },
      { id: 'jupiter', name: 'Jupiter', color: '#f59e0b', radius: 4.2, isJupiter: true },
      { id: 'saturn', name: 'Saturn', color: '#fef08a', radius: 3.5, hasRings: true },
      { id: 'uranus', name: 'Uranus', color: '#67e8f9', radius: 2.6 },
      { id: 'neptune', name: 'Neptune', color: '#6366f1', radius: 2.5 }
    ];

    // 1. Create Sun with Atmospheric Corona
    const sunTex = createSunTexture();
    const sunGeo = new THREE.SphereGeometry(6.5, 36, 36);
    const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.userData = { bodyId: 'sun' };

    // Sun Solar Corona Glow
    const haloGeo = new THREE.SphereGeometry(8.2, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.28,
      side: THREE.BackSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    sunMesh.add(halo);
    scene.add(sunMesh);

    bodiesRef.current.set('sun', {
      id: 'sun',
      name: 'Sun',
      type: 'star',
      mesh: sunMesh,
      position: new THREE.Vector3(0, 0, 0),
      realKm: { x: 0, y: 0, z: 0 },
      radiusKm: 696340,
      color: '#f59e0b'
    });

    // 2. Planets
    planetDefs.forEach(p => {
      try {
        const ephem = calculatePlanetEphemeris(p.id, simDate);

        const rAU = Math.sqrt(ephem.positionAU.x * ephem.positionAU.x + ephem.positionAU.y * ephem.positionAU.y + ephem.positionAU.z * ephem.positionAU.z);
        const visualR = mapAuToVisual(rAU);
        const factor = rAU > 0 ? visualR / rAU : 1;

        const posX = ephem.positionAU.x * factor;
        const posZ = ephem.positionAU.y * factor;
        const posY = ephem.positionAU.z * factor;

        // Custom Textured Mesh
        let mat: THREE.Material;
        const geo = new THREE.SphereGeometry(p.radius, 32, 32);

        if (p.isEarth) {
          const earthTex = createEarthTexture();
          mat = new THREE.MeshStandardMaterial({
            map: earthTex,
            roughness: 0.6,
            metalness: 0.1
          });
        } else if (p.isJupiter) {
          const jupTex = createJupiterTexture();
          mat = new THREE.MeshStandardMaterial({
            map: jupTex,
            roughness: 0.8
          });
        } else {
          mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(p.color),
            roughness: 0.7,
            metalness: 0.1
          });
        }

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(posX, posY, posZ);
        mesh.userData = { bodyId: p.id };

        // Earth Atmospheric & Cloud Layer
        if (p.isEarth) {
          const cloudsTex = createCloudsTexture();
          const cloudGeo = new THREE.SphereGeometry(p.radius * 1.025, 32, 32);
          const cloudMat = new THREE.MeshStandardMaterial({
            map: cloudsTex,
            transparent: true,
            opacity: 0.8,
            blending: THREE.NormalBlending
          });
          const cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
          mesh.add(cloudsMesh);
          cloudsMeshRef.current = cloudsMesh;

          // Atmospheric Rayleigh Rim
          const atmoGeo = new THREE.SphereGeometry(p.radius * 1.08, 32, 32);
          const atmoMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
          });
          const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
          mesh.add(atmoMesh);
        }

        // Saturn Rings with Realistic Cassini Division
        if (p.hasRings) {
          const ringTex = createSaturnRingTexture();
          const ringGeo = new THREE.RingGeometry(p.radius * 1.4, p.radius * 2.5, 64);
          const ringMat = new THREE.MeshBasicMaterial({
            map: ringTex,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI / 2.35;
          mesh.add(ring);
        }

        // Orbit Line Loop
        let orbitLine: THREE.Line | undefined;
        if (showOrbits) {
          const orbitPts: THREE.Vector3[] = [];
          const samples = 100;
          for (let s = 0; s <= samples; s++) {
            const sampleDate = new Date(simDate.getTime() + (s / samples) * (p.id === 'mercury' ? 88 : p.id === 'earth' ? 365.25 : 687) * 86400000);
            const sEphem = calculatePlanetEphemeris(p.id, sampleDate);
            const srAU = Math.sqrt(sEphem.positionAU.x * sEphem.positionAU.x + sEphem.positionAU.y * sEphem.positionAU.y + sEphem.positionAU.z * sEphem.positionAU.z);
            const sVisR = mapAuToVisual(srAU);
            const sFactor = srAU > 0 ? sVisR / srAU : 1;
            orbitPts.push(new THREE.Vector3(sEphem.positionAU.x * sFactor, sEphem.positionAU.z * sFactor, sEphem.positionAU.y * sFactor));
          }
          const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
          const orbitMat = new THREE.LineBasicMaterial({
            color: new THREE.Color(p.color),
            transparent: true,
            opacity: 0.22
          });
          orbitLine = new THREE.Line(orbitGeo, orbitMat);
          scene.add(orbitLine);
        }

        mesh.visible = showPlanets;
        scene.add(mesh);

        bodiesRef.current.set(p.id, {
          id: p.id,
          name: p.name,
          type: 'planet',
          mesh,
          position: new THREE.Vector3(posX, posY, posZ),
          realKm: ephem.positionKm,
          radiusKm: p.radius * 2000,
          orbitLine,
          color: p.color
        });
      } catch (e) {
        console.error('Ephemeris render error:', p.id, e);
      }
    });

    // 3. Spacecraft: Aditya-L1 at L1 Halo Orbit
    try {
      const l1 = calculateAdityaL1Ephemeris(simDate);
      const earthBody = bodiesRef.current.get('earth');
      if (earthBody) {
        const dir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), earthBody.position).normalize();
        const l1VisualPos = earthBody.position.clone().add(dir.multiplyScalar(4.5));

        const l1Geo = new THREE.OctahedronGeometry(0.75);
        const l1Mat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.6
        });
        const l1Mesh = new THREE.Mesh(l1Geo, l1Mat);
        l1Mesh.position.copy(l1VisualPos);
        l1Mesh.userData = { bodyId: 'aditya-l1' };
        l1Mesh.visible = showSpacecraft;
        scene.add(l1Mesh);

        // Halo Orbit Ring
        let haloLine: THREE.Line | undefined;
        if (showOrbits) {
          const haloPts: THREE.Vector3[] = [];
          for (let a = 0; a <= 32; a++) {
            const th = (a / 32) * Math.PI * 2;
            haloPts.push(l1VisualPos.clone().add(new THREE.Vector3(1.2 * Math.cos(th), 0.8 * Math.sin(th), 0)));
          }
          const hGeo = new THREE.BufferGeometry().setFromPoints(haloPts);
          const hMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
          haloLine = new THREE.Line(hGeo, hMat);
          scene.add(haloLine);
        }

        const adityaDef = SPACECRAFT_REGISTRY.find(s => s.id === 'aditya-l1');
        if (adityaDef) {
          resolveSpacecraftState(adityaDef, simDate).then(craftState => {
            bodiesRef.current.set('aditya-l1', {
              id: 'aditya-l1',
              name: 'Aditya-L1',
              type: 'spacecraft',
              mesh: l1Mesh,
              position: l1VisualPos,
              realKm: l1.positionKm,
              radiusKm: 2,
              orbitLine: haloLine,
              color: '#38bdf8',
              craftData: craftState
            });
          });
        }
      }
    } catch (e) {
      console.error('L1 visual error:', e);
    }

    // 4. Spacecraft: Voyager 1 & Voyager 2 (Interstellar Trajectories)
    ['voyager1', 'voyager2'].forEach(v => {
      try {
        const voy = calculateVoyagerEphemeris(v as 'voyager1' | 'voyager2', simDate);
        const id = v === 'voyager1' ? 'voyager-1' : 'voyager-2';
        const name = v === 'voyager1' ? 'Voyager 1' : 'Voyager 2';

        const visualR = mapAuToVisual(voy.distanceFromSunAU);
        const dirNorm = new THREE.Vector3(voy.positionAU.x, voy.positionAU.z, voy.positionAU.y).normalize();
        const vPos = dirNorm.multiplyScalar(visualR);

        const vGeo = new THREE.ConeGeometry(0.7, 1.5, 4);
        const vMat = new THREE.MeshStandardMaterial({
          color: v === 'voyager1' ? 0xf43f5e : 0xec4899,
          emissive: v === 'voyager1' ? 0x9f1239 : 0x831843,
          emissiveIntensity: 0.6
        });
        const vMesh = new THREE.Mesh(vGeo, vMat);
        vMesh.position.copy(vPos);
        vMesh.lookAt(vPos.clone().multiplyScalar(2));
        vMesh.userData = { bodyId: id };
        vMesh.visible = showSpacecraft;
        scene.add(vMesh);

        // Hyperbolic Trajectory Line
        let trajLine: THREE.Line | undefined;
        if (showOrbits) {
          const trajPts = [new THREE.Vector3(0, 0, 0), vPos];
          const tGeo = new THREE.BufferGeometry().setFromPoints(trajPts);
          const tMat = new THREE.LineDashedMaterial({
            color: v === 'voyager1' ? 0xf43f5e : 0xec4899,
            dashSize: 4,
            gapSize: 3,
            transparent: true,
            opacity: 0.35
          });
          trajLine = new THREE.Line(tGeo, tMat);
          trajLine.computeLineDistances();
          scene.add(trajLine);
        }

        const voyDef = SPACECRAFT_REGISTRY.find(s => s.id === id);
        if (voyDef) {
          resolveSpacecraftState(voyDef, simDate).then(craftState => {
            bodiesRef.current.set(id, {
              id,
              name,
              type: 'spacecraft',
              mesh: vMesh,
              position: vPos,
              realKm: voy.positionKm,
              radiusKm: 2,
              orbitLine: trajLine,
              color: v === 'voyager1' ? '#f43f5e' : '#ec4899',
              craftData: craftState
            });
          });
        }
      } catch (e) {
        console.error('Voyager visual error:', e);
      }
    });

  }, [simDate, showOrbits, showPlanets, showSpacecraft]);

  // Update HUD and Distance Line when selection changes
  useEffect(() => {
    const earth = bodiesRef.current.get('earth');
    const selected = selectedBodyId ? bodiesRef.current.get(selectedBodyId) : null;
    const distLine = distanceLineRef.current;

    if (selected && earth && selected.id !== 'earth' && distLine) {
      distLine.geometry.setFromPoints([earth.position, selected.position]);
      distLine.computeLineDistances();
      distLine.visible = true;

      const dx = selected.realKm.x - earth.realKm.x;
      const dy = selected.realKm.y - earth.realKm.y;
      const dz = selected.realKm.z - earth.realKm.z;
      const distEarthKm = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const distSunKm = Math.sqrt(
        selected.realKm.x * selected.realKm.x +
        selected.realKm.y * selected.realKm.y +
        selected.realKm.z * selected.realKm.z
      );
      const ltSec = calculateLightTimeSeconds(distEarthKm);

      setHudData({
        name: selected.name,
        distEarthKm,
        distSunKm,
        lightTimeStr: formatLightTime(ltSec),
        type: selected.type
      });
    } else {
      if (distLine) distLine.visible = false;
      if (selected && selected.id === 'earth' && earth) {
        const distSunKm = Math.sqrt(
          earth.realKm.x * earth.realKm.x +
          earth.realKm.y * earth.realKm.y +
          earth.realKm.z * earth.realKm.z
        );
        setHudData({
          name: 'Earth',
          distEarthKm: 0,
          distSunKm,
          lightTimeStr: '0.0 ms',
          type: 'planet'
        });
      } else {
        setHudData(null);
      }
    }
  }, [selectedBodyId, simDate]);

  // Smooth Camera Focusing on Object
  const focusCameraOnObject = (id: string) => {
    const body = bodiesRef.current.get(id);
    if (!body || !cameraRef.current) return;

    const targetPos = body.position;
    targetLookAt.current = targetPos.clone();
    
    // Position camera offset depending on object type
    const offset = body.id === 'sun' ? new THREE.Vector3(25, 18, 32) : new THREE.Vector3(12, 8, 16);
    targetCamPos.current = targetPos.clone().add(offset);
  };

  const resetView = () => {
    if (!cameraRef.current) return;
    targetLookAt.current = new THREE.Vector3(0, 0, 0);
    targetCamPos.current = new THREE.Vector3(0, 150, 240);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 110px)', minHeight: '620px', overflow: 'hidden' }}>
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', outline: 'none' }} />

      {/* Top Floating Scientific Tool Strip */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        {/* Left: Scientific Mode Badge & Quick Object Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto', flexWrap: 'wrap' }}>
          <div className="glass-panel" style={{
            padding: '5px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: 'var(--radius-xs)'
          }}>
            <Orbit size={15} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
              SOLAR SYSTEM EPHEMERIS
            </span>
            <StatusBadge status="CALCULATED" compact />
          </div>

          {/* Quick Focus Object Tabs */}
          {['sun', 'earth', 'mars', 'jupiter', 'aditya-l1', 'voyager-1'].map(id => {
            const isSel = selectedBodyId === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setSelectedBodyId(id);
                  focusCameraOnObject(id);
                }}
                className={`btn ${isSel ? 'btn-active' : 'btn-secondary'}`}
                style={{ fontSize: '11px', padding: '5px 10px', pointerEvents: 'auto' }}
              >
                {id === 'aditya-l1' ? 'Aditya-L1' : id === 'voyager-1' ? 'Voyager 1' : id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Right: Layer Toggles & View Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto' }}>
          <button
            onClick={() => setShowOrbits(!showOrbits)}
            className={`btn ${showOrbits ? 'btn-active' : 'btn-secondary'}`}
            title="Toggle Orbital Paths"
            style={{ fontSize: '11px', padding: '6px 10px' }}
          >
            <Layers size={13} />
            <span>Orbits</span>
          </button>

          <button
            onClick={() => setShowSpacecraft(!showSpacecraft)}
            className={`btn ${showSpacecraft ? 'btn-active' : 'btn-secondary'}`}
            title="Toggle Spacecraft Probes"
            style={{ fontSize: '11px', padding: '6px 10px' }}
          >
            <span>Probes</span>
          </button>

          <button
            onClick={resetView}
            className="btn btn-secondary"
            title="Reset Observatory Camera"
            style={{ fontSize: '11px', padding: '6px 10px' }}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Subtle Target Acquisition Reticle (Bottom Left) */}
      {hudData && (
        <div
          className="glass-panel tech-corner"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '20px',
            padding: '16px 20px',
            borderRadius: 'var(--radius-sm)',
            zIndex: 10,
            maxWidth: '380px',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          {/* Target Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--status-live)',
                letterSpacing: '0.06em'
              }}>
                <Crosshair size={12} />
                <span>OBJECT ACQUIRED</span>
              </div>
            </div>

            <button
              onClick={() => {
                const body = bodiesRef.current.get(selectedBodyId || '');
                if (body?.craftData) {
                  onSelectObject(body.craftData);
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-cyan)',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 4px'
              }}
            >
              <span>Inspect</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
            {hudData.name}
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
            <div style={{ background: 'var(--surface-inset)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Distance to Earth
              </div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {formatDistanceKm(hudData.distEarthKm, true)}
              </div>
              <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>
                {kmToAu(hudData.distEarthKm).toFixed(3)} AU
              </div>
            </div>

            <div style={{ background: 'var(--surface-inset)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Radio Delay ($c$)
              </div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                {hudData.lightTimeStr}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                Speed of Light
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '10px',
            paddingTop: '6px',
            borderTop: '1px solid var(--border-hairline)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Scale: Visual logarithmic</span>
            <span>Coordinates: Standish J2000</span>
          </div>
        </div>
      )}

      {/* Floating Time Scrubber Bar (Bottom Right) */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '20px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={13} style={{ color: 'var(--accent-cyan)' }} />
          <span className="mono" style={{ fontSize: '12px', fontWeight: 600 }}>
            {simDate.toISOString().split('T')[0]}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setSimDate(new Date(simDate.getTime() - 86400000 * 7))}
            className="btn btn-secondary"
            style={{ padding: '4px 7px', fontSize: '10px' }}
            title="Rewind 7 days"
          >
            -7d
          </button>
          <button
            onClick={() => setSimDate(new Date())}
            className="btn btn-secondary"
            style={{ padding: '4px 7px', fontSize: '10px' }}
            title="Reset to current real time"
          >
            Now
          </button>
          <button
            onClick={() => setSimDate(new Date(simDate.getTime() + 86400000 * 7))}
            className="btn btn-secondary"
            style={{ padding: '4px 7px', fontSize: '10px' }}
            title="Advance 7 days"
          >
            +7d
          </button>
          <button
            onClick={() => setSimDate(new Date(simDate.getTime() + 86400000 * 30))}
            className="btn btn-secondary"
            style={{ padding: '4px 7px', fontSize: '10px' }}
            title="Advance 30 days"
          >
            +30d
          </button>
        </div>
      </div>
    </div>
  );
};
