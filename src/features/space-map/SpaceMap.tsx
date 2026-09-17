import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
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
  Globe,
  AlertTriangle,
  Compass,
  Radio,
  Sliders,
  Check,
  RefreshCw,
  Info
} from 'lucide-react';
import { calculatePlanetEphemeris } from '../../services/calculations/kepler';
import { calculateAdityaL1Ephemeris } from '../../services/calculations/lagrange';
import { CelestrakService, SatelliteTrackData } from '../../services/api/celestrakService';
import { SPACECRAFT_REGISTRY, resolveSpacecraftState } from '../../services/data/spacecraftCatalog';
import type { InspectableObject, SpacecraftObject } from '../../types/space';
import { resolveInspectableObject, normalizeSpacecraftObject } from '../../services/data/objectResolver';
import { formatDistanceKm } from '../../utils/formatters';
import { calculateLightTimeSeconds, formatLightTime } from '../../services/calculations/physics';
import { StatusBadge } from '../../components/common/StatusBadge';
import { createSatelliteModel, createSelectionRing, createEarthAtmosphereGlow } from '../../components/models/satellite3D';
import { Spacecraft3DViewer } from '../../components/inspector/Spacecraft3DViewer';

interface SpaceMapProps {
  onSelectObject?: (obj: InspectableObject) => void;
  onInspectObject?: (obj: InspectableObject) => void;
  selectedObjectId?: string;
}

type ViewMode = 'SOLAR_SYSTEM' | 'EARTH_ORBIT';

interface VisualBody {
  id: string;
  name: string;
  type: 'star' | 'planet' | 'moon' | 'spacecraft' | 'satellite';
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  realKm: { x: number; y: number; z: number };
  radiusKm: number;
  orbitLine?: THREE.Line;
  color: string;
  craftData?: SpacecraftObject;
  satTrack?: SatelliteTrackData;
}

// Procedural Planet Textures (Cached so they are generated once)
let cachedSunTex: THREE.CanvasTexture | null = null;
let cachedEarthTex: THREE.CanvasTexture | null = null;
let cachedCloudsTex: THREE.CanvasTexture | null = null;
let cachedJupiterTex: THREE.CanvasTexture | null = null;

function getSunTexture(): THREE.CanvasTexture {
  if (cachedSunTex) return cachedSunTex;
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

  for (let i = 0; i < 300; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const r = 2 + Math.random() * 6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(180, 83, 9, 0.25)';
    ctx.fill();
  }

  cachedSunTex = new THREE.CanvasTexture(canvas);
  return cachedSunTex;
}

function getEarthTexture(): THREE.CanvasTexture {
  if (cachedEarthTex) return cachedEarthTex;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Ocean
  ctx.fillStyle = '#0f3a68';
  ctx.fillRect(0, 0, 1024, 512);

  // Continents
  ctx.fillStyle = '#1e3a1e';
  const drawLand = (x: number, y: number, w: number, h: number) => {
    ctx.beginPath();
    ctx.ellipse(x * 2, y * 2, w * 2, h * 2, Math.random() * 0.4, 0, Math.PI * 2);
    ctx.fill();
  };
  drawLand(280, 100, 70, 50);
  drawLand(260, 140, 45, 60);
  drawLand(320, 120, 50, 40);
  drawLand(120, 95, 45, 50);
  drawLand(150, 160, 35, 65);
  drawLand(390, 180, 30, 25);

  // Ice caps
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, 1024, 25);
  ctx.fillRect(0, 487, 1024, 25);

  cachedEarthTex = new THREE.CanvasTexture(canvas);
  return cachedEarthTex;
}

function getCloudsTexture(): THREE.CanvasTexture {
  if (cachedCloudsTex) return cachedCloudsTex;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 256);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 512;
    const y = 30 + Math.random() * 196;
    ctx.beginPath();
    ctx.ellipse(x, y, 20 + Math.random() * 45, 8 + Math.random() * 16, 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  cachedCloudsTex = new THREE.CanvasTexture(canvas);
  return cachedCloudsTex;
}

function getJupiterTexture(): THREE.CanvasTexture {
  if (cachedJupiterTex) return cachedJupiterTex;
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

  // Red Spot
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.ellipse(320, 165, 30, 16, 0.1, 0, Math.PI * 2);
  ctx.fill();

  cachedJupiterTex = new THREE.CanvasTexture(canvas);
  return cachedJupiterTex;
}

// Visual spacing: guarantees all planets are clearly outside the Sun and beautifully visible
function mapPlanetDistanceToVisual(planetId: string, rAU: number): number {
  // Base distances chosen for visual clarity while preserving astronomical order
  const scaleMap: Record<string, number> = {
    mercury: 12.0,
    venus: 17.5,
    earth: 24.0,
    mars: 31.0,
    jupiter: 44.0,
    saturn: 58.0,
    uranus: 72.0,
    neptune: 86.0
  };

  const base = scaleMap[planetId] || 25.0;
  // Apply subtle eccentricity modulation based on actual AU
  return base * (1 + (rAU - 1.0) * 0.04);
}

// Satellite distance mapping around Earth in Earth-Orbit mode
function mapSatelliteVisualRadius(altKm: number): number {
  const EARTH_VISUAL_R = 10.0;
  if (altKm < 2000) {
    // LEO (200km - 2000km): mapped between 11.5 and 14.5
    return EARTH_VISUAL_R + 1.4 + (Math.max(120, altKm) / 2000.0) * 3.0;
  }
  if (altKm < 35000) {
    // MEO (2000km - 35000km): mapped between 14.5 and 22.0
    return 14.5 + ((altKm - 2000.0) / 33000.0) * 7.5;
  }
  // GEO (~35786km): mapped ~22.5 to 24.5
  return 22.5 + Math.min(3.0, ((altKm - 35000.0) / 2000.0) * 1.5);
}

export const SpaceMap: React.FC<SpaceMapProps> = ({
  onSelectObject,
  onInspectObject,
  selectedObjectId
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // View Modes & Active State
  const [viewMode, setViewMode] = useState<ViewMode>('SOLAR_SYSTEM');
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(selectedObjectId || null);
  const [simDate, setSimDate] = useState<Date>(new Date());
  
  // Layer Toggles
  const [showPlanets, setShowPlanets] = useState<boolean>(true);
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [showSpacecraft, setShowSpacecraft] = useState<boolean>(true);
  const [showSatellites, setShowSatellites] = useState<boolean>(true);

  // Status & Telemetry
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [webGLFailed, setWebGLFailed] = useState<boolean>(false);
  const [isFetchingSatellites, setIsFetchingSatellites] = useState<boolean>(false);
  const [satelliteCount, setSatelliteCount] = useState<number>(0);
  const [hoveredBody, setHoveredBody] = useState<{ name: string; altKm?: number; x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [viewing3DViewer, setViewing3DViewer] = useState<{ id: string; name: string } | null>(null);
  const [voyagerNotice, setVoyagerNotice] = useState<boolean>(false);

  // HUD Telemetry State
  const [hudData, setHudData] = useState<{
    name: string;
    catalogId?: string;
    distEarthKm: number;
    distSunKm: number;
    altitudeKm?: number;
    velocityKmS?: number;
    lightTimeStr: string;
    type: string;
    orbitClass?: string;
    status: string;
    source: string;
    isUnavailable?: boolean;
  } | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bodiesRef = useRef<Map<string, VisualBody>>(new Map());
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const selectionRingRef = useRef<THREE.Mesh | null>(null);
  const distLineRef = useRef<THREE.Line | null>(null);
  const animIdRef = useRef<number>(0);

  const targetCamPos = useRef<THREE.Vector3 | null>(null);
  const targetLookAt = useRef<THREE.Vector3 | null>(null);
  const handleObjectSelectionRef = useRef<(objectId: string, shouldInspect?: boolean) => void>(() => {});

  // Synchronize selection from parent prop
  useEffect(() => {
    if (selectedObjectId && selectedObjectId !== selectedBodyId) {
      setSelectedBodyId(selectedObjectId);
      if (['iss', 'css-tiangong', 'hubble', 'astrosat', 'cartosat-3', 'eos-06', 'noaa-19', 'terra'].includes(selectedObjectId)) {
        setViewMode('EARTH_ORBIT');
      }
    }
  }, [selectedObjectId]);

  // Camera Framing Utility
  const frameCamera = useCallback((targetPos: THREE.Vector3, distance: number, lookAt = new THREE.Vector3(0, 0, 0)) => {
    if (!cameraRef.current || !controlsRef.current) return;
    targetLookAt.current = lookAt.clone();
    targetCamPos.current = targetPos.clone().add(new THREE.Vector3(0, distance * 0.45, distance * 0.75));
  }, []);

  const resetView = useCallback(() => {
    if (viewMode === 'EARTH_ORBIT') {
      targetLookAt.current = new THREE.Vector3(0, 0, 0);
      targetCamPos.current = new THREE.Vector3(0, 16, 32);
    } else {
      targetLookAt.current = new THREE.Vector3(0, 0, 0);
      targetCamPos.current = new THREE.Vector3(0, 75, 125);
    }
  }, [viewMode]);

  // =========================================================================
  // 1. INITIALIZE THREE.JS SCENE & RENDERER (Runs Once)
  // =========================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // WebGL Capability Check
    let hasWebGL = true;
    try {
      const testCanvas = document.createElement('canvas');
      hasWebGL = !!(window.WebGLRenderingContext && (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')));
    } catch {
      hasWebGL = false;
    }

    if (!hasWebGL) {
      setWebGLFailed(true);
      setIsInitializing(false);
      return;
    }

    // Initial safe dimensions
    const width = Math.max(container.clientWidth || 0, window.innerWidth || 800, 320);
    const height = Math.max(container.clientHeight || 0, (window.innerHeight ? window.innerHeight - 130 : 650), 400);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#03050a');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 12000);
    camera.position.set(0, 75, 125);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 4;
    controls.maxDistance = 1500;
    controlsRef.current = controls;

    // Multi-Light Illuminating System (Sun PointLight + Camera Headlight + Ambient)
    const sunLight = new THREE.PointLight(0xfffbeb, 3.8, 3000, 0.1);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const headLight = new THREE.DirectionalLight(0xffffff, 1.2);
    headLight.position.set(0, 100, 100);
    scene.add(headLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // Deep Space Starfield
    const starGeo = new THREE.BufferGeometry();
    const starCount = 3000;
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const dist = 3000 + Math.random() * 2000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      starPos[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = dist * Math.cos(phi);

      const tint = Math.random();
      if (tint < 0.2) {
        starColors[i * 3] = 0.65; starColors[i * 3 + 1] = 0.85; starColors[i * 3 + 2] = 1.0;
      } else if (tint < 0.35) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.85; starColors[i * 3 + 2] = 0.6;
      } else {
        starColors[i * 3] = 0.95; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 1.0;
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.5, vertexColors: true, transparent: true, opacity: 0.85 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Dynamic Distance Ranging Vector
    const distGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)]);
    const distMat = new THREE.LineDashedMaterial({ color: 0x38bdf8, dashSize: 2, gapSize: 1.5, transparent: true, opacity: 0.55 });
    const distanceLine = new THREE.Line(distGeo, distMat);
    distanceLine.visible = false;
    scene.add(distanceLine);
    distLineRef.current = distanceLine;

    // Selection Indicator Ring
    const selRing = createSelectionRing(1.8);
    selRing.visible = false;
    scene.add(selRing);
    selectionRingRef.current = selRing;

    // Robust Resize Observer for Dynamic Viewport Sizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(entry.contentRect.width, 320);
        const h = Math.max(entry.contentRect.height, 400);
        if (cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // Raycaster for Hover & Click Interactions
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes: THREE.Object3D[] = [];
      bodiesRef.current.forEach(b => meshes.push(b.mesh));

      const intersects = raycaster.intersectObjects(meshes, true);
      if (intersects.length > 0) {
        let hit: THREE.Object3D | null = intersects[0].object;
        while (hit && !hit.userData.bodyId && hit.parent) {
          hit = hit.parent;
        }
        if (hit && hit.userData.bodyId) {
          const body = bodiesRef.current.get(hit.userData.bodyId);
          if (body) {
            setHoveredBody({
              name: body.name,
              altKm: body.satTrack?.state?.altitudeKm,
              x: e.clientX,
              y: e.clientY
            });
            renderer.domElement.style.cursor = 'pointer';
            return;
          }
        }
      }
      setHoveredBody(null);
      renderer.domElement.style.cursor = 'default';
    };

    const onPointerClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes: THREE.Object3D[] = [];
      bodiesRef.current.forEach(b => meshes.push(b.mesh));

      const intersects = raycaster.intersectObjects(meshes, true);
      if (intersects.length > 0) {
        let hit: THREE.Object3D | null = intersects[0].object;
        while (hit && !hit.userData.bodyId && hit.parent) {
          hit = hit.parent;
        }
        if (hit && hit.userData.bodyId) {
          const bodyId = hit.userData.bodyId;

          // If user clicked Earth in Solar System view, smoothly enter Earth-Orbit view!
          if (bodyId === 'earth' && viewMode === 'SOLAR_SYSTEM') {
            setViewMode('EARTH_ORBIT');
            return;
          }

          focusOnObject(bodyId);
          handleObjectSelectionRef.current(bodyId, false);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('click', onPointerClick);

    // Animation Loop
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);

      // Rotate planet/earth meshes
      bodiesRef.current.forEach(body => {
        if (body.type === 'planet' || body.id === 'earth') {
          body.mesh.rotation.y += 0.002;
        }
        if (body.type === 'satellite') {
          body.mesh.rotation.y += 0.004;
        }
      });

      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += 0.003;
      }

      // Smooth camera interpolation
      if (targetCamPos.current && targetLookAt.current) {
        camera.position.lerp(targetCamPos.current, 0.06);
        controls.target.lerp(targetLookAt.current, 0.06);

        if (camera.position.distanceTo(targetCamPos.current) < 0.2) {
          targetCamPos.current = null;
          targetLookAt.current = null;
        }
      }

      // Rotate selection ring
      if (selectionRingRef.current && selectionRingRef.current.visible) {
        selectionRingRef.current.rotation.z += 0.015;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();
    setIsInitializing(false);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('click', onPointerClick);
      renderer.dispose();
      starGeo.dispose();
      starMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // =========================================================================
  // 2. BUILD BASE ASTRONOMICAL SCENE (Renders immediately without external APIs)
  // =========================================================================
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear previous dynamic bodies & orbit lines
    bodiesRef.current.forEach(body => {
      scene.remove(body.mesh);
      if (body.orbitLine) scene.remove(body.orbitLine);
    });
    bodiesRef.current.clear();

    if (viewMode === 'SOLAR_SYSTEM') {
      // ----------------------------------------------------
      // SOLAR SYSTEM OVERVIEW (Sun + 8 Planets + Moon + L1)
      // ----------------------------------------------------
      const planetDefs = [
        { id: 'mercury', name: 'Mercury', color: '#94a3b8', radius: 0.9 },
        { id: 'venus', name: 'Venus', color: '#fde68a', radius: 1.5 },
        { id: 'earth', name: 'Earth', color: '#38bdf8', radius: 1.8, isEarth: true },
        { id: 'mars', name: 'Mars', color: '#ef4444', radius: 1.2 },
        { id: 'jupiter', name: 'Jupiter', color: '#f59e0b', radius: 3.6, isJupiter: true },
        { id: 'saturn', name: 'Saturn', color: '#fef08a', radius: 3.0, hasRings: true },
        { id: 'uranus', name: 'Uranus', color: '#67e8f9', radius: 2.2 },
        { id: 'neptune', name: 'Neptune', color: '#6366f1', radius: 2.1 }
      ];

      // 1. Sun (Radiant self-illuminated star)
      const sunTex = getSunTexture();
      const sunGeo = new THREE.SphereGeometry(4.5, 36, 36);
      const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      sunMesh.userData = { bodyId: 'sun' };

      // Sun Corona Halo
      const haloGeo = new THREE.SphereGeometry(5.8, 32, 32);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      sunMesh.add(halo);
      scene.add(sunMesh);

      bodiesRef.current.set('sun', {
        id: 'sun',
        name: 'Sun (Sol)',
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
          const visualDist = mapPlanetDistanceToVisual(p.id, rAU);
          const factor = rAU > 0 ? visualDist / rAU : 1;

          const posX = ephem.positionAU.x * factor;
          const posZ = ephem.positionAU.y * factor;
          const posY = ephem.positionAU.z * factor;

          let mat: THREE.Material;
          const geo = new THREE.SphereGeometry(p.radius, 32, 32);

          if (p.isEarth) {
            const earthTex = getEarthTexture();
            mat = new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.5, metalness: 0.1 });
          } else if (p.isJupiter) {
            const jupTex = getJupiterTexture();
            mat = new THREE.MeshStandardMaterial({ map: jupTex, roughness: 0.7 });
          } else {
            mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(p.color), roughness: 0.65, metalness: 0.1 });
          }

          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(posX, posY, posZ);
          mesh.userData = { bodyId: p.id };
          mesh.visible = showPlanets;

          // Earth Cloud Layer & Satellite Constellation Indicator
          if (p.isEarth) {
            const cloudsTex = getCloudsTexture();
            const cloudGeo = new THREE.SphereGeometry(p.radius * 1.025, 32, 32);
            const cloudMat = new THREE.MeshStandardMaterial({
              map: cloudsTex,
              transparent: true,
              opacity: 0.75,
              blending: THREE.NormalBlending
            });
            const cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
            mesh.add(cloudsMesh);
            cloudsMeshRef.current = cloudsMesh;

            // Moon orbiting Earth at scaled distance
            const moonGeo = new THREE.SphereGeometry(0.5, 16, 16);
            const moonMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.8 });
            const moonMesh = new THREE.Mesh(moonGeo, moonMat);
            moonMesh.position.set(3.8, 0.5, 2.0);
            moonMesh.userData = { bodyId: 'moon' };
            mesh.add(moonMesh);

            // Satellite Constellation Ring Badge
            const satRingGeo = new THREE.RingGeometry(p.radius * 1.3, p.radius * 1.45, 32);
            const satRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
            const satRing = new THREE.Mesh(satRingGeo, satRingMat);
            satRing.rotation.x = Math.PI / 2.3;
            mesh.add(satRing);
          }

          // Keplerian Orbit Path
          let orbitLine: THREE.Line | undefined;
          if (showOrbits) {
            const orbitPts: THREE.Vector3[] = [];
            const samples = 96;
            for (let s = 0; s <= samples; s++) {
              const sampleDate = new Date(simDate.getTime() + (s / samples) * (p.id === 'mercury' ? 88 : p.id === 'earth' ? 365.25 : 687) * 86400000);
              const sEphem = calculatePlanetEphemeris(p.id, sampleDate);
              const srAU = Math.sqrt(sEphem.positionAU.x * sEphem.positionAU.x + sEphem.positionAU.y * sEphem.positionAU.y + sEphem.positionAU.z * sEphem.positionAU.z);
              const sVisDist = mapPlanetDistanceToVisual(p.id, srAU);
              const sFactor = srAU > 0 ? sVisDist / srAU : 1;
              orbitPts.push(new THREE.Vector3(sEphem.positionAU.x * sFactor, sEphem.positionAU.z * sFactor, sEphem.positionAU.y * sFactor));
            }
            const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
            const orbitMat = new THREE.LineBasicMaterial({ color: new THREE.Color(p.color), transparent: true, opacity: 0.28 });
            orbitLine = new THREE.Line(orbitGeo, orbitMat);
            scene.add(orbitLine);
          }

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
          console.error('Planet ephemeris error:', p.id, e);
        }
      });

      // 3. Aditya-L1 Solar Observatory at Sun-Earth L1
      try {
        const l1 = calculateAdityaL1Ephemeris(simDate);
        const earthBody = bodiesRef.current.get('earth');
        if (earthBody) {
          const dirToSun = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), earthBody.position).normalize();
          const l1VisualPos = earthBody.position.clone().add(dirToSun.multiplyScalar(3.2));

          const l1Geo = new THREE.OctahedronGeometry(0.55);
          const l1Mat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.6 });
          const l1Mesh = new THREE.Mesh(l1Geo, l1Mat);
          l1Mesh.position.copy(l1VisualPos);
          l1Mesh.userData = { bodyId: 'aditya-l1' };
          l1Mesh.visible = showSpacecraft;
          scene.add(l1Mesh);

          let haloLine: THREE.Line | undefined;
          if (showOrbits) {
            const haloPts: THREE.Vector3[] = [];
            for (let a = 0; a <= 32; a++) {
              const th = (a / 32) * Math.PI * 2;
              haloPts.push(l1VisualPos.clone().add(new THREE.Vector3(0.9 * Math.cos(th), 0.6 * Math.sin(th), 0)));
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
        console.error('Aditya-L1 error:', e);
      }

    } else {
      // ----------------------------------------------------
      // EARTH ORBIT TRACKING MODE (Earth Centered + Moon)
      // ----------------------------------------------------
      const EARTH_R = 10.0;

      // 1. Earth centered at (0, 0, 0)
      const earthTex = getEarthTexture();
      const earthGeo = new THREE.SphereGeometry(EARTH_R, 48, 48);
      const earthMat = new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.55, metalness: 0.1 });
      const earthMesh = new THREE.Mesh(earthGeo, earthMat);
      earthMesh.userData = { bodyId: 'earth' };
      scene.add(earthMesh);

      // Earth Cloud Layer
      const cloudsTex = getCloudsTexture();
      const cloudGeo = new THREE.SphereGeometry(EARTH_R * 1.025, 48, 48);
      const cloudMat = new THREE.MeshStandardMaterial({
        map: cloudsTex,
        transparent: true,
        opacity: 0.75,
        blending: THREE.NormalBlending
      });
      const cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
      earthMesh.add(cloudsMesh);
      cloudsMeshRef.current = cloudsMesh;

      // Atmosphere Rayleigh Rim Glow
      const atmoGlow = createEarthAtmosphereGlow(EARTH_R);
      earthMesh.add(atmoGlow);

      bodiesRef.current.set('earth', {
        id: 'earth',
        name: 'Earth',
        type: 'planet',
        mesh: earthMesh,
        position: new THREE.Vector3(0, 0, 0),
        realKm: { x: 0, y: 0, z: 0 },
        radiusKm: 6371,
        color: '#38bdf8'
      });

      // 2. Moon at scaled visual distance (~45 units)
      const moonDist = 45.0;
      const moonGeo = new THREE.SphereGeometry(1.6, 24, 24);
      const moonMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.9 });
      const moonMesh = new THREE.Mesh(moonGeo, moonMat);
      const moonAngle = (simDate.getTime() / (27.3 * 86400000)) * Math.PI * 2;
      const moonPos = new THREE.Vector3(Math.cos(moonAngle) * moonDist, Math.sin(moonAngle * 0.1) * 3.5, Math.sin(moonAngle) * moonDist);
      moonMesh.position.copy(moonPos);
      moonMesh.userData = { bodyId: 'moon' };
      scene.add(moonMesh);

      if (showOrbits) {
        const moonOrbitPts: THREE.Vector3[] = [];
        for (let m = 0; m <= 64; m++) {
          const ma = (m / 64) * Math.PI * 2;
          moonOrbitPts.push(new THREE.Vector3(Math.cos(ma) * moonDist, Math.sin(ma * 0.1) * 3.5, Math.sin(ma) * moonDist));
        }
        const mGeo = new THREE.BufferGeometry().setFromPoints(moonOrbitPts);
        const mMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.25 });
        const moonOrbitLine = new THREE.Line(mGeo, mMat);
        scene.add(moonOrbitLine);
      }

      bodiesRef.current.set('moon', {
        id: 'moon',
        name: 'Moon',
        type: 'moon',
        mesh: moonMesh,
        position: moonPos,
        realKm: { x: moonPos.x * 10000, y: moonPos.y * 10000, z: moonPos.z * 10000 },
        radiusKm: 1737,
        color: '#cfd8dc'
      });

      // 3. Asynchronously Load Real Satellites from CelesTrak
      setIsFetchingSatellites(true);
      CelestrakService.getSupportedEarthSatellites(simDate)
        .then(satellites => {
          setIsFetchingSatellites(false);
          setSatelliteCount(satellites.length);

          satellites.forEach(sat => {
            if (!sat.state) return;

            const eci = sat.state.positionEciKm;
            const altKm = sat.state.altitudeKm;

            const dirNorm = new THREE.Vector3(eci.x, eci.z, eci.y).normalize();
            const visualR = mapSatelliteVisualRadius(altKm);
            const satPos = dirNorm.clone().multiplyScalar(visualR);

            const orbitColors: Record<string, number> = {
              LEO: 0x38bdf8,
              SSO: 0x34d399,
              MEO: 0xfbbf24,
              GEO: 0xa855f7,
              HEO: 0xf43f5e
            };
            const satColor = orbitColors[sat.orbitClass] || 0x38bdf8;
            const isStation = sat.noradId === 25544 || sat.noradId === 48274;

            // Level 2: Satellite model
            const satMesh = createSatelliteModel(isStation ? 0.32 : 0.25, isStation);
            satMesh.position.copy(satPos);
            satMesh.lookAt(0, 0, 0);
            satMesh.userData = { bodyId: `norad-${sat.noradId}`, noradId: sat.noradId };
            satMesh.visible = showSatellites;
            scene.add(satMesh);

            // Level 1: Marker Diamond
            const markerGeo = new THREE.OctahedronGeometry(0.3);
            const markerMat = new THREE.MeshBasicMaterial({ color: satColor, transparent: true, opacity: 0.85 });
            const markerMesh = new THREE.Mesh(markerGeo, markerMat);
            satMesh.add(markerMesh);

            // Orbit path
            let orbitLine: THREE.Line | undefined;
            if (showOrbits && sat.orbitPath.length > 2) {
              const pathPts = sat.orbitPath.map(pt => {
                const ptDistKm = Math.sqrt(pt.x * pt.x + pt.y * pt.y + pt.z * pt.z);
                const ptAltKm = Math.max(100, ptDistKm - 6371);
                const ptDir = new THREE.Vector3(pt.x, pt.z, pt.y).normalize();
                const ptVisR = mapSatelliteVisualRadius(ptAltKm);
                return ptDir.multiplyScalar(ptVisR);
              });
              const oGeo = new THREE.BufferGeometry().setFromPoints(pathPts);
              const oMat = new THREE.LineBasicMaterial({ color: satColor, transparent: true, opacity: 0.38 });
              orbitLine = new THREE.Line(oGeo, oMat);
              scene.add(orbitLine);
            }

            const craftDef = SPACECRAFT_REGISTRY.find(s => s.noradId === sat.noradId);
            const craftObj: SpacecraftObject = {
              id: craftDef ? craftDef.id : `norad-${sat.noradId}`,
              name: sat.name,
              noradId: sat.noradId,
              agency: craftDef ? craftDef.agency : 'Commercial',
              mission: craftDef ? craftDef.mission : 'Earth Observation & Telemetry',
              launchDate: craftDef ? craftDef.launchDate : 'Verified Epoch',
              statusText: `Operational in ${sat.orbitClass} (${Math.round(sat.state.altitudeKm)} km)`,
              isOperational: true,
              orbitType: sat.orbitClass === 'SSO' ? 'Sun-Synchronous (SSO)' :
                         sat.orbitClass === 'GEO' ? 'Geostationary (GEO)' :
                         sat.orbitClass === 'MEO' ? 'Medium Earth Orbit (MEO)' :
                         'Low Earth Orbit (LEO)',
              coordinateFrame: 'Geocentric ECI (TEME / J2000)',
              description: craftDef ? craftDef.description : `Active Earth-orbiting satellite tracked by CelesTrak NORAD.`,
              significance: craftDef ? craftDef.significance : 'Continuous orbital telemetry for navigation, communications, and Earth observation.',
              scientificExplanation: `Orbits Earth at ${Math.round(sat.state.altitudeKm)} km altitude with ${sat.inclinationDeg.toFixed(1)}° inclination. Period: ${sat.periodMinutes.toFixed(1)} min.`,
              payloads: craftDef ? craftDef.payloads : ['Tracking Beacon', 'S-Band Transponder'],
              distanceFromEarthKm: sat.state.distanceFromEarthSurfaceKm,
              distanceFromSunKm: 149597870.7,
              velocityKmS: sat.state.velocityKmS,
              lightTimeToEarthSec: calculateLightTimeSeconds(sat.state.distanceFromEarthSurfaceKm),
              position: sat.state.positionEciKm,
              geodetic: {
                latitude: sat.state.latitudeDeg,
                longitude: sat.state.longitudeDeg,
                altitudeKm: sat.state.altitudeKm
              },
              telemetrySource: sat.telemetrySource
            };

            const bodyKey = craftDef ? craftDef.id : `norad-${sat.noradId}`;
            bodiesRef.current.set(bodyKey, {
              id: bodyKey,
              name: sat.name,
              type: 'satellite',
              mesh: satMesh,
              position: satPos,
              realKm: sat.state.positionEciKm,
              radiusKm: 0.1,
              orbitLine,
              color: `#${satColor.toString(16).padStart(6, '0')}`,
              craftData: craftObj,
              satTrack: sat
            });
          });
        })
        .catch(err => {
          console.error('Failed to retrieve satellites:', err);
          setIsFetchingSatellites(false);
        });
    }

  }, [viewMode, simDate, showPlanets, showOrbits, showSpacecraft, showSatellites]);

  // Focus on specific object
  const focusOnObject = useCallback((id: string) => {
    const body = bodiesRef.current.get(id);
    if (!body) return;

    if (viewMode === 'EARTH_ORBIT') {
      const offset = body.id === 'earth' 
        ? new THREE.Vector3(0, 16, 32)
        : body.position.clone().normalize().multiplyScalar(4).add(new THREE.Vector3(2, 2, 3));
      targetLookAt.current = body.position.clone();
      targetCamPos.current = body.position.clone().add(offset);
    } else {
      const offset = body.id === 'sun'
        ? new THREE.Vector3(25, 18, 32)
        : new THREE.Vector3(12, 8, 16);
      targetLookAt.current = body.position.clone();
      targetCamPos.current = body.position.clone().add(offset);
    }
  }, [viewMode]);

  // Unified object selection and inspection handler
  const handleObjectSelection = useCallback(async (objectId: string, shouldInspect: boolean = false) => {
    setSelectedBodyId(objectId);
    const body = bodiesRef.current.get(objectId);
    let resolved: InspectableObject | null = null;
    if (body?.craftData) {
      resolved = normalizeSpacecraftObject(body.craftData);
    } else {
      resolved = await resolveInspectableObject(objectId, simDate);
    }
    if (resolved) {
      if (shouldInspect && onInspectObject) {
        onInspectObject(resolved);
      } else if (onSelectObject) {
        onSelectObject(resolved);
      }
    }
  }, [simDate, onInspectObject, onSelectObject]);
  handleObjectSelectionRef.current = handleObjectSelection;

  // Update HUD & Selection Ring when selection changes
  useEffect(() => {
    const selRing = selectionRingRef.current;
    const distLine = distLineRef.current;

    if (selectedBodyId === 'voyager-1' || selectedBodyId === 'voyager-2') {
      setVoyagerNotice(true);
      if (selRing) selRing.visible = false;
      if (distLine) distLine.visible = false;

      setHudData({
        name: selectedBodyId === 'voyager-1' ? 'Voyager 1' : 'Voyager 2',
        distEarthKm: 0,
        distSunKm: 0,
        lightTimeStr: 'N/A',
        type: 'Deep Space Spacecraft',
        status: 'UNAVAILABLE',
        source: 'NASA JPL Deep Space Network',
        isUnavailable: true
      });
      return;
    } else {
      setVoyagerNotice(false);
    }

    const selected = selectedBodyId ? bodiesRef.current.get(selectedBodyId) : null;
    const earth = bodiesRef.current.get('earth');

    if (selected && selRing) {
      selRing.position.copy(selected.position);
      selRing.scale.set(selected.type === 'planet' ? 2.5 : 1.2, selected.type === 'planet' ? 2.5 : 1.2, 1);
      selRing.visible = true;
    } else if (selRing) {
      selRing.visible = false;
    }

    if (selected && earth && selected.id !== 'earth' && distLine) {
      distLine.geometry.setFromPoints([earth.position, selected.position]);
      distLine.computeLineDistances();
      distLine.visible = true;

      const dx = selected.realKm.x - earth.realKm.x;
      const dy = selected.realKm.y - earth.realKm.y;
      const dz = selected.realKm.z - earth.realKm.z;
      const distEarthKm = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const ltSec = calculateLightTimeSeconds(distEarthKm);

      setHudData({
        name: selected.name,
        catalogId: selected.satTrack ? `NORAD ${selected.satTrack.noradId}` : undefined,
        distEarthKm,
        distSunKm: 149597870.7,
        altitudeKm: selected.satTrack?.state?.altitudeKm,
        velocityKmS: selected.satTrack?.state?.velocityKmS || selected.craftData?.velocityKmS,
        lightTimeStr: formatLightTime(ltSec),
        type: selected.type,
        orbitClass: selected.satTrack?.orbitClass || selected.craftData?.orbitType,
        status: selected.craftData?.telemetrySource.status || 'CALCULATED',
        source: selected.craftData?.telemetrySource.sourceName || 'Astronomical Ephemeris Model'
      });
    } else if (selected && selected.id === 'earth') {
      if (distLine) distLine.visible = false;
      setHudData({
        name: 'Earth',
        distEarthKm: 0,
        distSunKm: 149597870.7,
        lightTimeStr: '0.0 ms',
        type: 'planet',
        status: 'CALCULATED',
        source: 'VSOP87 Planetary Ephemeris'
      });
    } else if (!selected) {
      if (distLine) distLine.visible = false;
      setHudData(null);
    }
  }, [selectedBodyId, viewMode, simDate]);

  // Search Objects Registry
  const searchableList = useMemo(() => {
    return [
      { id: 'sun', name: 'Sun (Sol)', type: 'star', category: 'Star' },
      { id: 'mercury', name: 'Mercury', type: 'planet', category: 'Planet' },
      { id: 'venus', name: 'Venus', type: 'planet', category: 'Planet' },
      { id: 'earth', name: 'Earth', type: 'planet', category: 'Planet' },
      { id: 'moon', name: 'Moon (Luna)', type: 'moon', category: 'Lunar Body' },
      { id: 'mars', name: 'Mars', type: 'planet', category: 'Planet' },
      { id: 'jupiter', name: 'Jupiter', type: 'planet', category: 'Planet' },
      { id: 'saturn', name: 'Saturn', type: 'planet', category: 'Planet' },
      { id: 'uranus', name: 'Uranus', type: 'planet', category: 'Planet' },
      { id: 'neptune', name: 'Neptune', type: 'planet', category: 'Planet' },
      { id: 'aditya-l1', name: 'Aditya-L1', type: 'spacecraft', category: 'Solar Observatory (L1)' },
      { id: 'iss', name: 'ISS (International Space Station)', type: 'satellite', category: 'Space Station (LEO)' },
      { id: 'css-tiangong', name: 'CSS Tiangong', type: 'satellite', category: 'Space Station (LEO)' },
      { id: 'hubble', name: 'Hubble Space Telescope', type: 'satellite', category: 'Observatory (LEO)' },
      { id: 'astrosat', name: 'Astrosat', type: 'satellite', category: 'Observatory (LEO)' },
      { id: 'cartosat-3', name: 'Cartosat-3', type: 'satellite', category: 'Earth Observation (SSO)' },
      { id: 'eos-06', name: 'EOS-06 (Oceansat-3)', type: 'satellite', category: 'Ocean Monitor (SSO)' },
      { id: 'noaa-19', name: 'NOAA-19 (POES)', type: 'satellite', category: 'Weather Satellite (SSO)' },
      { id: 'terra', name: 'Terra (EOS AM-1)', type: 'satellite', category: 'Earth Observing (SSO)' },
      { id: 'voyager-1', name: 'Voyager 1', type: 'spacecraft', category: 'Deep Space (No Ephemeris)' }
    ];
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchableList.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, searchableList]);

  const handleSearchResultSelect = (obj: typeof searchableList[0]) => {
    setSearchQuery('');
    setShowSearchDropdown(false);

    if (obj.id === 'voyager-1' || obj.id === 'voyager-2') {
      setSelectedBodyId(obj.id);
      setVoyagerNotice(true);
      handleObjectSelection(obj.id, false);
      return;
    }

    if (obj.type === 'satellite') {
      setSelectedBodyId(obj.id);
      if (viewMode !== 'EARTH_ORBIT') {
        setViewMode('EARTH_ORBIT');
        setTimeout(() => focusOnObject(obj.id), 250);
      } else {
        focusOnObject(obj.id);
      }
    } else {
      setSelectedBodyId(obj.id);
      if (viewMode === 'EARTH_ORBIT') {
        setViewMode('SOLAR_SYSTEM');
        setTimeout(() => focusOnObject(obj.id), 250);
      } else {
        focusOnObject(obj.id);
      }
    }

    handleObjectSelection(obj.id, false);
  };

  // Fallback if WebGL is completely unsupported on device
  if (webGLFailed) {
    return (
      <div className="container" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '36px', maxWidth: '640px', margin: '0 auto' }}>
          <AlertTriangle size={36} style={{ color: 'var(--status-last)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>
            3D Visualization is unavailable on this device
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '12px' }}>
            Hardware WebGL acceleration could not be initialized in your browser context. You can still inspect verified Keplerian ephemerides and CelesTrak orbital states via the Spacecraft Explorer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 'calc(100vh - 120px)',
      minHeight: '650px',
      overflow: 'hidden',
      display: 'block'
    }}>
      {/* 3D WebGL Canvas Mount Container */}
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
          outline: 'none',
          position: 'absolute',
          inset: 0,
          zIndex: 1
        }}
      />

      {/* Loading Overlay */}
      {isInitializing && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#03050a',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <RefreshCw size={24} className="radar-sweep" style={{ color: 'var(--accent-cyan)' }} />
          <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', letterSpacing: '0.08em' }}>
            INITIALIZING SPACE MAP // THREE.JS OBSERVATORY
          </div>
        </div>
      )}

      {/* Top Scientific Control Toolbar */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'none',
        zIndex: 20,
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Left: View Mode Toggle, Quick Selectors, Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto', flexWrap: 'wrap' }}>
          {/* Mode Switcher */}
          <div className="glass-panel" style={{ display: 'flex', padding: '3px', borderRadius: 'var(--radius-xs)', gap: '3px' }}>
            <button
              onClick={() => {
                setViewMode('SOLAR_SYSTEM');
                resetView();
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '11px',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'SOLAR_SYSTEM' ? 'var(--accent-cyan)' : 'transparent',
                color: viewMode === 'SOLAR_SYSTEM' ? '#000000' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Orbit size={13} />
              <span>Solar System</span>
            </button>

            <button
              onClick={() => {
                setViewMode('EARTH_ORBIT');
                resetView();
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '11px',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'EARTH_ORBIT' ? 'var(--accent-cyan)' : 'transparent',
                color: viewMode === 'EARTH_ORBIT' ? '#000000' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Globe size={13} />
              <span>Earth Orbit Tracking</span>
            </button>
          </div>

          {/* Mode-Specific Quick Selectors */}
          {viewMode === 'EARTH_ORBIT' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
              {['iss', 'css-tiangong', 'hubble', 'astrosat', 'cartosat-3', 'eos-06'].map(satId => {
                const isSel = selectedBodyId === satId;
                const nameMap: Record<string, string> = {
                  iss: 'ISS',
                  'css-tiangong': 'Tiangong',
                  hubble: 'Hubble',
                  astrosat: 'Astrosat',
                  'cartosat-3': 'Cartosat-3',
                  'eos-06': 'EOS-06'
                };
                return (
                  <button
                    key={satId}
                    onClick={() => {
                      focusOnObject(satId);
                      handleObjectSelection(satId, false);
                    }}
                    className={`btn ${isSel ? 'btn-active' : 'btn-secondary'}`}
                    style={{ fontSize: '11px', padding: '5px 10px' }}
                  >
                    {nameMap[satId] || satId}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
              {['sun', 'earth', 'mars', 'jupiter', 'aditya-l1', 'voyager-1'].map(id => {
                const isSel = selectedBodyId === id;
                return (
                  <button
                    key={id}
                    onClick={() => {
                      if (id === 'voyager-1') {
                        setVoyagerNotice(true);
                      } else {
                        focusOnObject(id);
                      }
                      handleObjectSelection(id, false);
                    }}
                    className={`btn ${isSel ? 'btn-active' : 'btn-secondary'}`}
                    style={{ fontSize: '11px', padding: '5px 10px' }}
                  >
                    {id === 'aditya-l1' ? 'Aditya-L1' : id === 'voyager-1' ? 'Voyager 1' : id.charAt(0).toUpperCase() + id.slice(1)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Interactive Search Bar */}
          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--surface-panel)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-xs)',
              padding: '5px 10px',
              width: '210px'
            }}>
              <Search size={13} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search satellite or planet..."
                value={searchQuery}
                onFocus={() => setShowSearchDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  width: '100%',
                  fontFamily: 'var(--font-sans)'
                }}
              />
            </div>

            {showSearchDropdown && searchResults.length > 0 && (
              <div
                className="glass-panel"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  borderRadius: 'var(--radius-xs)',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  zIndex: 50,
                  padding: '4px'
                }}
              >
                {searchResults.map(res => (
                  <div
                    key={res.id}
                    onClick={() => handleSearchResultSelect(res)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '3px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{res.name}</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{res.category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Layer Toggles & Camera Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto' }}>
          {viewMode === 'EARTH_ORBIT' && isFetchingSatellites && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              fontSize: '10px',
              color: 'var(--accent-cyan)'
            }}>
              <RefreshCw size={11} className="radar-sweep" />
              <span>RETRIEVING VERIFIED ORBITAL DATA</span>
            </div>
          )}

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
            onClick={resetView}
            className="btn btn-secondary"
            title="Reset Framing"
            style={{ fontSize: '11px', padding: '6px 10px' }}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredBody && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredBody.x + 14}px`,
            top: `${hoveredBody.y - 12}px`,
            background: 'rgba(3, 7, 18, 0.94)',
            border: '1px solid var(--accent-cyan)',
            borderRadius: '4px',
            padding: '4px 8px',
            pointerEvents: 'none',
            zIndex: 100,
            fontSize: '11px',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ fontWeight: 700 }}>{hoveredBody.name}</div>
          {hoveredBody.altKm !== undefined && (
            <div style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>
              Altitude: {Math.round(hoveredBody.altKm)} km (Calculated)
            </div>
          )}
        </div>
      )}

      {/* Voyager Ephemeris Transparency Notice */}
      {voyagerNotice && (
        <div
          className="glass-panel tech-corner"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '20px',
            padding: '16px 20px',
            borderRadius: 'var(--radius-sm)',
            zIndex: 25,
            maxWidth: '420px',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            background: 'rgba(7, 17, 31, 0.95)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '11px', fontWeight: 700 }}>
              <AlertTriangle size={15} />
              <span>POSITION DATA UNAVAILABLE</span>
            </div>
            <StatusBadge status="UNAVAILABLE" compact />
          </div>

          <div style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>
            Voyager 1 (Interstellar Probe)
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            EPHEMERIS: SOURCE UNAVAILABLE
          </div>

          <p style={{ fontSize: '12px', color: '#fef08a', lineHeight: 1.5, marginTop: '8px' }}>
            Reliable browser-accessible positional data is currently unavailable for this object. SpacePulse does not place spacecraft at arbitrary Solar System coordinates or fabricate fake positions.
          </p>

          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid var(--border-hairline)'
          }}>
            <button
              onClick={() => setViewing3DViewer({ id: 'voyager-1', name: 'Voyager 1' })}
              className="btn btn-primary"
              style={{ flex: 1, fontSize: '12px' }}
            >
              <Eye size={14} />
              <span>Inspect 3D Architecture</span>
            </button>
            <button
              onClick={() => setVoyagerNotice(false)}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Target Acquisition HUD Reticle (Bottom Left) */}
      {!voyagerNotice && hudData && (
        <div
          className="glass-panel tech-corner"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '20px',
            padding: '16px 20px',
            borderRadius: 'var(--radius-sm)',
            zIndex: 15,
            maxWidth: '390px',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-cyan)',
              letterSpacing: '0.06em',
              fontWeight: 600
            }}>
              <Crosshair size={12} />
              <span>OBJECT ACQUIRED</span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (selectedBodyId) {
                  handleObjectSelection(selectedBodyId, true);
                }
              }}
              type="button"
              className="inspect-action-btn"
              aria-label={`Inspect ${hudData.name}`}
              title={`Inspect ${hudData.name}`}
            >
              <span>Inspect</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
            {hudData.name}
          </div>
          {hudData.catalogId && (
            <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
              {hudData.catalogId} • {hudData.orbitClass}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
            <div style={{ background: 'var(--surface-inset)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {hudData.altitudeKm !== undefined ? 'Orbital Altitude' : 'Distance to Earth'}
              </div>
              <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {hudData.altitudeKm !== undefined 
                  ? `${Math.round(hudData.altitudeKm)} km`
                  : formatDistanceKm(hudData.distEarthKm, true)}
              </div>
              <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>
                {hudData.status}
              </div>
            </div>

            <div style={{ background: 'var(--surface-inset)', padding: '8px 10px', borderRadius: 'var(--radius-xs)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {hudData.velocityKmS !== undefined ? 'Orbital Speed' : 'Radio Delay ($c$)'}
              </div>
              <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                {hudData.velocityKmS !== undefined 
                  ? `${hudData.velocityKmS.toFixed(2)} km/s`
                  : hudData.lightTimeStr}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {hudData.velocityKmS !== undefined ? 'ECI velocity' : 'Speed of Light'}
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
            <span>Source: {hudData.source.substring(0, 24)}</span>
            <span>Status: {hudData.status}</span>
          </div>
        </div>
      )}

      {/* Scientific Transparency Scale Disclaimer (Bottom Center) */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(3, 5, 10, 0.75)',
          padding: '4px 14px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-hairline)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 15
        }}
      >
        Distances and object sizes are visually scaled for exploration. Scientific values are shown separately. Orbital positions are derived from available source data.
      </div>

      {/* Time Scrubber (Bottom Right) */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '20px',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          zIndex: 15,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={13} style={{ color: 'var(--accent-cyan)' }} />
          <span className="mono" style={{ fontSize: '11px', fontWeight: 600 }}>
            {simDate.toISOString().split('T')[0]}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setSimDate(new Date(simDate.getTime() - 86400000 * 7))}
            className="btn btn-secondary"
            style={{ padding: '3px 6px', fontSize: '10px' }}
            title="Rewind 7 days"
          >
            -7d
          </button>
          <button
            onClick={() => setSimDate(new Date())}
            className="btn btn-secondary"
            style={{ padding: '3px 6px', fontSize: '10px' }}
            title="Reset to current time"
          >
            Now
          </button>
          <button
            onClick={() => setSimDate(new Date(simDate.getTime() + 86400000 * 7))}
            className="btn btn-secondary"
            style={{ padding: '3px 6px', fontSize: '10px' }}
            title="Advance 7 days"
          >
            +7d
          </button>
        </div>
      </div>

      {/* 3D Spacecraft Architecture Viewer Modal */}
      {viewing3DViewer && (
        <Spacecraft3DViewer
          craftId={viewing3DViewer.id}
          craftName={viewing3DViewer.name}
          onClose={() => setViewing3DViewer(null)}
        />
      )}
    </div>
  );
};
