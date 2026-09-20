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
  Info,
  X
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
import { 
  createRealisticEarthShaderMaterial, 
  createRealisticAtmosphereMesh, 
  createRealisticCloudMesh, 
  getRealisticEarthDayTexture 
} from '../../components/space/earthRealistic';
import { getSpacecraft3DModel } from '../../components/space/spacecraftModelRegistry';
import { 
  createMilkyWayDome, 
  createRealisticStarfield 
} from '../../components/space/deepSpaceEnvironment';
import { 
  createDetailedSatelliteModel, 
  createScientificReticle, 
  createDirectionalOrbitLine 
} from '../../components/space/spacecraftVisuals';
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
  const reticleRef = useRef<THREE.Group | null>(null);
  const distLineRef = useRef<THREE.Line | null>(null);
  const animIdRef = useRef<number>(0);

  // Lighting References for Dynamic Celestial Illuminance
  const sunPointLightRef = useRef<THREE.PointLight | null>(null);
  const sunDirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  // Sun corona animation refs
  const sunMidHaloRef = useRef<THREE.Mesh | null>(null);
  const sunOuterHaloRef = useRef<THREE.Mesh | null>(null);

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
      // Horizon-grazing perspective — low camera angle looking across the limb
      targetLookAt.current = new THREE.Vector3(-1.2, 0, 0);
      targetCamPos.current = new THREE.Vector3(18, 10, 28);
    } else {
      // Ecliptic-plane perspective — camera is at a shallow angle, not top-down
      targetLookAt.current = new THREE.Vector3(0, -2, 0);
      targetCamPos.current = new THREE.Vector3(18, 22, 72);
    }
  }, [viewMode]);

  const setCameraPreset = useCallback((preset: 'horizon' | 'polar' | 'equatorial' | 'default') => {
    if (viewMode === 'EARTH_ORBIT') {
      if (preset === 'horizon') {
        // True limb/horizon view — grazing the Earth's edge
        targetLookAt.current = new THREE.Vector3(0, 0, 0);
        targetCamPos.current = new THREE.Vector3(20, 4, 22);
      } else if (preset === 'polar') {
        targetLookAt.current = new THREE.Vector3(0, 0, 0);
        targetCamPos.current = new THREE.Vector3(0, 28, 2);
      } else if (preset === 'equatorial') {
        targetLookAt.current = new THREE.Vector3(0, 0, 0);
        targetCamPos.current = new THREE.Vector3(28, 2, 8);
      } else {
        targetLookAt.current = new THREE.Vector3(-1.2, 0, 0);
        targetCamPos.current = new THREE.Vector3(18, 10, 28);
      }
    } else {
      targetLookAt.current = new THREE.Vector3(0, -2, 0);
      targetCamPos.current = new THREE.Vector3(18, 22, 72);
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
    // Near-perfect space black — maximizes starfield contrast
    scene.background = new THREE.Color('#000204');
    sceneRef.current = scene;

    // FOV 55° — wider than 45° for immersive depth without distortion
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.05, 25000);
    // Cinematic entry: camera starts far above the ecliptic and sweeps down into a shallow horizon angle
    camera.position.set(40, 95, 185);
    cameraRef.current = camera;
    targetLookAt.current = new THREE.Vector3(0, -2, 0);
    targetCamPos.current = new THREE.Vector3(18, 22, 72);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;  // Slightly smoother drag
    controls.minDistance = 4;
    controls.maxDistance = 2500;
    controlsRef.current = controls;

    // 1. Milky Way Panoramic Celestial Dome
    const milkyWayDome = createMilkyWayDome();
    scene.add(milkyWayDome);

    // 2. Multi-Tier Deep Space Starfield (10,000+ stars with spectral classifications)
    const starfield = createRealisticStarfield();
    scene.add(starfield);

    // 3. Dynamic Multi-Source Illuminating System
    // Solar PointLight at (0, 0, 0) for Solar System View — increased intensity for dramatic planet shading
    const sunPointLight = new THREE.PointLight(0xfffaed, 4.5, 5000, 0.08);
    sunPointLight.position.set(0, 0, 0);
    scene.add(sunPointLight);
    sunPointLightRef.current = sunPointLight;

    // Directional Sunlight for Earth-Orbit Tracking View (aligned with terminator)
    const earthSunDir = new THREE.Vector3(1.2, 0.35, 0.85).normalize();
    const sunDirLight = new THREE.DirectionalLight(0xfffaed, 0.0);
    sunDirLight.position.copy(earthSunDir.clone().multiplyScalar(250));
    scene.add(sunDirLight);
    sunDirLightRef.current = sunDirLight;

    // Astronomical Ambient Illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // Secondary subtle fill headlight
    const headLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    headLight.position.set(0, 100, 100);
    scene.add(headLight);

    // Dynamic Distance Ranging Vector
    const distGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)]);
    const distMat = new THREE.LineDashedMaterial({ color: 0x38bdf8, dashSize: 2, gapSize: 1.5, transparent: true, opacity: 0.55 });
    const distanceLine = new THREE.Line(distGeo, distMat);
    distanceLine.visible = false;
    scene.add(distanceLine);
    distLineRef.current = distanceLine;

    // Scientific Target Acquisition Reticle
    const reticle = createScientificReticle(2.2);
    reticle.visible = false;
    scene.add(reticle);
    reticleRef.current = reticle;

    // Robust Resize Observer for Dynamic Viewport Sizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width || container.clientWidth || 300;
        const h = entry.contentRect.height || container.clientHeight || 300;
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

      // Animate solar corona layers — slow counter-rotating motion for living star feel
      if (sunMidHaloRef.current) {
        sunMidHaloRef.current.rotation.y += 0.0008;
        sunMidHaloRef.current.rotation.z += 0.0005;
      }
      if (sunOuterHaloRef.current) {
        sunOuterHaloRef.current.rotation.y -= 0.0005;
        sunOuterHaloRef.current.rotation.x += 0.0003;
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

      // Animate and billboard target acquisition reticle
      if (reticleRef.current && reticleRef.current.visible) {
        reticleRef.current.quaternion.copy(camera.quaternion);
        const arc = reticleRef.current.getObjectByName('InnerScanningArc');
        if (arc) arc.rotation.z += 0.02;
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
      // Configure lighting for Solar System View
      if (sunPointLightRef.current) sunPointLightRef.current.intensity = 4.5;
      if (sunDirLightRef.current) sunDirLightRef.current.intensity = 0.0;
      if (ambientLightRef.current) {
        ambientLightRef.current.color.setHex(0xffffff);
        ambientLightRef.current.intensity = 0.55;
      }

      // ----------------------------------------------------
      // SOLAR SYSTEM OVERVIEW (Sun + 8 Planets + Moon + L1)
      // ----------------------------------------------------
      const planetDefs = [
        { id: 'mercury', name: 'Mercury', color: '#94a3b8', radius: 1.1 },
        { id: 'venus', name: 'Venus', color: '#fde68a', radius: 1.8, hasAtmo: true, atmoColor: 0xfde68a, atmoOpacity: 0.14 },
        { id: 'earth', name: 'Earth', color: '#38bdf8', radius: 2.2, isEarth: true },
        { id: 'mars', name: 'Mars', color: '#ef4444', radius: 1.5, hasAtmo: true, atmoColor: 0xef4444, atmoOpacity: 0.10 },
        { id: 'jupiter', name: 'Jupiter', color: '#f59e0b', radius: 4.5, isJupiter: true },
        { id: 'saturn', name: 'Saturn', color: '#fef08a', radius: 3.8, hasRings: true },
        { id: 'uranus', name: 'Uranus', color: '#67e8f9', radius: 2.6 },
        { id: 'neptune', name: 'Neptune', color: '#6366f1', radius: 2.5, hasAtmo: true, atmoColor: 0x6366f1, atmoOpacity: 0.13 }
      ] as Array<{
        id: string; name: string; color: string; radius: number;
        isEarth?: boolean; isJupiter?: boolean; hasRings?: boolean;
        hasAtmo?: boolean; atmoColor?: number; atmoOpacity?: number;
      }>;

      // 1. Sun (Radiant self-illuminated star)
      const sunTex = getSunTexture();
      const sunGeo = new THREE.SphereGeometry(4.5, 36, 36);
      const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
      const sunMesh = new THREE.Mesh(sunGeo, sunMat);
      sunMesh.userData = { bodyId: 'sun' };

      // Multi-layer Coronal Photosphere & Atmospheric Glow (Photosphere + Inner Warm Corona + Outer Soft Atmospheric Halo)
      const innerHaloGeo = new THREE.SphereGeometry(5.2, 32, 32);
      const innerHaloMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.30,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
      });
      const innerHalo = new THREE.Mesh(innerHaloGeo, innerHaloMat);
      sunMesh.add(innerHalo);

      // Mid corona — stored in ref for animation
      const midHaloGeo = new THREE.SphereGeometry(7.2, 32, 32);
      const midHaloMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.17,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const midHalo = new THREE.Mesh(midHaloGeo, midHaloMat);
      sunMesh.add(midHalo);
      sunMidHaloRef.current = midHalo;

      // Outer extended corona — stored in ref for animation
      const outerHaloGeo = new THREE.SphereGeometry(10.8, 32, 32);
      const outerHaloMat = new THREE.MeshBasicMaterial({
        color: 0xd97706,
        transparent: true,
        opacity: 0.09,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const outerHalo = new THREE.Mesh(outerHaloGeo, outerHaloMat);
      sunMesh.add(outerHalo);
      sunOuterHaloRef.current = outerHalo;

      // Distant volumetric glow sprite (always faces camera — billboard)
      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = 128;
      glowCanvas.height = 128;
      const glowCtx = glowCanvas.getContext('2d')!;
      const glowGrad = glowCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      glowGrad.addColorStop(0, 'rgba(255, 253, 220, 0.95)');
      glowGrad.addColorStop(0.15, 'rgba(255, 240, 170, 0.70)');
      glowGrad.addColorStop(0.45, 'rgba(245, 158, 11, 0.28)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      glowCtx.fillStyle = glowGrad;
      glowCtx.fillRect(0, 0, 128, 128);
      const glowSpriteMat = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(glowCanvas),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.88
      });
      const glowSprite = new THREE.Sprite(glowSpriteMat);
      glowSprite.scale.set(38, 38, 1);
      sunMesh.add(glowSprite);

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
          const geo = new THREE.SphereGeometry(p.radius, 48, 48);

          if (p.isEarth) {
            const earthTex = getRealisticEarthDayTexture();
            mat = new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.50, metalness: 0.12 });
          } else if (p.isJupiter) {
            const jupTex = getJupiterTexture();
            mat = new THREE.MeshStandardMaterial({ map: jupTex, roughness: 0.65, metalness: 0.05 });
          } else {
            mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(p.color), roughness: 0.55, metalness: 0.06 });
          }

          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(posX, posY, posZ);
          mesh.userData = { bodyId: p.id };
          mesh.visible = showPlanets;

          // Earth Cloud Layer & Satellite Constellation Indicator
          if (p.isEarth) {
            const cloudsMesh = createRealisticCloudMesh(p.radius);
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

          // Atmospheric halo for planets that have one
          if (p.hasAtmo && p.atmoColor !== undefined && p.atmoOpacity !== undefined) {
            const atmoGeo = new THREE.SphereGeometry(p.radius * 1.08, 32, 32);
            const atmoMat = new THREE.MeshBasicMaterial({
              color: p.atmoColor,
              transparent: true,
              opacity: p.atmoOpacity,
              side: THREE.BackSide,
              blending: THREE.AdditiveBlending,
              depthWrite: false
            });
            const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
            mesh.add(atmoMesh);
          }

          // Saturn's iconic ring system
          if (p.hasRings) {
            const ringCanvas = document.createElement('canvas');
            ringCanvas.width = 256;
            ringCanvas.height = 1;
            const rCtx = ringCanvas.getContext('2d')!;
            const ringGrad = rCtx.createLinearGradient(0, 0, 256, 0);
            ringGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
            ringGrad.addColorStop(0.08, 'rgba(180, 150, 100, 0.18)');
            ringGrad.addColorStop(0.20, 'rgba(220, 200, 155, 0.72)');  // B-ring (brightest)
            ringGrad.addColorStop(0.35, 'rgba(200, 175, 130, 0.55)');  // A-ring
            ringGrad.addColorStop(0.50, 'rgba(160, 135, 95, 0.38)');
            ringGrad.addColorStop(0.65, 'rgba(130, 110, 75, 0.22)');
            ringGrad.addColorStop(0.82, 'rgba(100, 85, 60, 0.10)');
            ringGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
            rCtx.fillStyle = ringGrad;
            rCtx.fillRect(0, 0, 256, 1);
            const ringTex = new THREE.CanvasTexture(ringCanvas);
            // Inner radius = 1.25x planet radius, outer = 2.4x (B+A ring span)
            const ringGeo = new THREE.RingGeometry(p.radius * 1.25, p.radius * 2.4, 80);
            // Map the ring's UV so our gradient texture applies radially
            const ringPos = ringGeo.attributes.position;
            const ringUV = ringGeo.attributes.uv;
            for (let rv = 0; rv < ringPos.count; rv++) {
              const rx = ringPos.getX(rv);
              const rz = ringPos.getZ(rv);
              const ringR = Math.sqrt(rx * rx + rz * rz);
              const ringU = (ringR - p.radius * 1.25) / (p.radius * 2.4 - p.radius * 1.25);
              ringUV.setXY(rv, ringU, 0.5);
            }
            ringUV.needsUpdate = true;
            const ringMat = new THREE.MeshBasicMaterial({
              map: ringTex,
              side: THREE.DoubleSide,
              transparent: true,
              depthWrite: false,
              blending: THREE.NormalBlending
            });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            // Saturn's axial tilt ~26.7°
            ringMesh.rotation.x = Math.PI / 2 - 0.467;
            mesh.add(ringMesh);
          }

          // Keplerian Orbit Path
          let orbitLine: THREE.Line | undefined;
          if (showOrbits) {
            const orbitPts: THREE.Vector3[] = [];
            const samples = 128;  // Higher resolution for smoother ellipses
            for (let s = 0; s <= samples; s++) {
              const sampleDate = new Date(simDate.getTime() + (s / samples) * (p.id === 'mercury' ? 88 : p.id === 'earth' ? 365.25 : 687) * 86400000);
              const sEphem = calculatePlanetEphemeris(p.id, sampleDate);
              const srAU = Math.sqrt(sEphem.positionAU.x * sEphem.positionAU.x + sEphem.positionAU.y * sEphem.positionAU.y + sEphem.positionAU.z * sEphem.positionAU.z);
              const sVisDist = mapPlanetDistanceToVisual(p.id, srAU);
              const sFactor = srAU > 0 ? sVisDist / srAU : 1;
              orbitPts.push(new THREE.Vector3(sEphem.positionAU.x * sFactor, sEphem.positionAU.z * sFactor, sEphem.positionAU.y * sFactor));
            }
            const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
            // Subtler opacity so the scene feels less diagram-like
            const orbitMat = new THREE.LineBasicMaterial({ color: new THREE.Color(p.color), transparent: true, opacity: 0.22 });
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

          // Authentic Aditya-L1 Solar Observatory 3D model
          const l1Mesh = getSpacecraft3DModel('aditya-l1', { scale: 0.45, isMapMode: true });
          l1Mesh.position.copy(l1VisualPos);
          l1Mesh.lookAt(0, 0, 0); // Point optical instruments toward the Sun
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
      // Configure realistic directional lighting and dark cosmic ambient
      if (sunPointLightRef.current) sunPointLightRef.current.intensity = 0.0;
      if (sunDirLightRef.current) sunDirLightRef.current.intensity = 3.2;
      if (ambientLightRef.current) {
        ambientLightRef.current.color.setHex(0x0c1527);
        // Darker ambient makes night side of Earth more dramatic
        ambientLightRef.current.intensity = 0.18;
      }

      const EARTH_R = 10.0;
      const sunDir = new THREE.Vector3(1.2, 0.35, 0.85).normalize();

      // 1. Realistic Day/Night Earth Shader with city lights and specular ocean reflections
      const earthGeo = new THREE.SphereGeometry(EARTH_R, 64, 64);
      const earthMat = createRealisticEarthShaderMaterial(sunDir);
      const earthMesh = new THREE.Mesh(earthGeo, earthMat);
      earthMesh.userData = { bodyId: 'earth' };
      scene.add(earthMesh);

      // 2. Realistic Cloud Layer rotating slightly above surface
      const cloudsMesh = createRealisticCloudMesh(EARTH_R);
      earthMesh.add(cloudsMesh);
      cloudsMeshRef.current = cloudsMesh;

      // 3. Realistic Rayleigh Atmospheric Scattering Shell (Fresnel limb)
      const atmoGlow = createRealisticAtmosphereMesh(EARTH_R, sunDir);
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

            // Level 2: Spacecraft-Specific Authentic PBR 3D Model from Registry
            const satMesh = getSpacecraft3DModel(String(sat.noradId), {
              scale: isStation ? 0.38 : 0.28,
              isMapMode: true
            });
            satMesh.position.copy(satPos);
            satMesh.lookAt(0, 0, 0); // Nadir pointing towards Earth center
            satMesh.userData = { bodyId: `norad-${sat.noradId}`, noradId: sat.noradId };
            satMesh.visible = showSatellites;
            scene.add(satMesh);

            // Level 1: Scientific beacon marker
            const markerGeo = new THREE.SphereGeometry(0.18, 12, 12);
            const markerMat = new THREE.MeshBasicMaterial({ color: satColor });
            const markerMesh = new THREE.Mesh(markerGeo, markerMat);
            satMesh.add(markerMesh);

            // Directional orbit path with motion gradient
            let orbitLine: THREE.Line | undefined;
            if (showOrbits && sat.orbitPath.length > 2) {
              const pathPts = sat.orbitPath.map(pt => {
                const ptDistKm = Math.sqrt(pt.x * pt.x + pt.y * pt.y + pt.z * pt.z);
                const ptAltKm = Math.max(100, ptDistKm - 6371);
                const ptDir = new THREE.Vector3(pt.x, pt.z, pt.y).normalize();
                const ptVisR = mapSatelliteVisualRadius(ptAltKm);
                return ptDir.multiplyScalar(ptVisR);
              });
              orbitLine = createDirectionalOrbitLine(pathPts, satColor);
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
      if (body.id === 'earth') {
        targetLookAt.current = new THREE.Vector3(-1.2, 0, 0);
        targetCamPos.current = new THREE.Vector3(14, 11, 24);
      } else {
        targetLookAt.current = body.position.clone();
        // If already selected, zoom closer for inspection
        const zoomDist = selectedBodyId === id ? 1.8 : 3.8;
        const offset = body.position.clone().normalize().multiplyScalar(zoomDist).add(new THREE.Vector3(1.0, 1.0, 1.6));
        targetCamPos.current = body.position.clone().add(offset);
      }
    } else {
      const offset = body.id === 'sun'
        ? new THREE.Vector3(25, 18, 32)
        : new THREE.Vector3(12, 8, 16);
      targetLookAt.current = body.position.clone();
      targetCamPos.current = body.position.clone().add(offset);
    }
  }, [viewMode, selectedBodyId]);

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

  // Update HUD & Selection Reticle when selection changes
  useEffect(() => {
    const reticle = reticleRef.current;
    const distLine = distLineRef.current;

    // Dynamic Orbit Line Emphasis: Selected orbit prominent, other orbits quieter
    bodiesRef.current.forEach((body) => {
      if (body.orbitLine && body.orbitLine.material) {
        const mat = body.orbitLine.material as THREE.LineBasicMaterial;
        if (!selectedBodyId) {
          mat.opacity = 0.28;
        } else if (body.id === selectedBodyId) {
          mat.opacity = 0.88;
        } else {
          mat.opacity = 0.10;
        }
      }
    });

    if (selectedBodyId === 'voyager-1' || selectedBodyId === 'voyager-2') {
      setVoyagerNotice(true);
      if (reticle) reticle.visible = false;
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

    if (selected && reticle) {
      reticle.position.copy(selected.position);
      reticle.scale.set(selected.type === 'planet' ? 2.5 : 1.2, selected.type === 'planet' ? 2.5 : 1.2, 1);
      reticle.visible = true;
    } else if (reticle) {
      reticle.visible = false;
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
      minHeight: '400px',
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
        top: '12px',
        left: '12px',
        right: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
        zIndex: 20
      }}>
        {/* Sub-Header: Reference Frame & Source Provenance Metadata */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '2px'
        }}>
          <div style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-cyan)',
            letterSpacing: '0.04em',
            background: 'rgba(3, 7, 18, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            width: 'fit-content',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>{viewMode === 'EARTH_ORBIT' ? 'GEOCENTRIC REFERENCE (ECI TEME J2000)' : 'HELIOCENTRIC REFERENCE (ECLIPTIC J2000)'}</span>
            <span>•</span>
            <span>DATA: CALCULATED (CELESTRAK SGP4 & KEPLER)</span>
            <span>•</span>
            <span style={{ color: 'var(--text-muted)' }}>OBJECT MARKERS VISUALLY ENLARGED</span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '10px',
            color: 'var(--text-secondary)',
            background: 'rgba(3, 7, 18, 0.85)',
            border: '1px solid var(--border-hairline)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            pointerEvents: 'auto'
          }}>
            <Info size={11} style={{ color: 'var(--accent-cyan)' }} />
            <span>Click any object to acquire telemetry • Drag to rotate orbit • Scroll to zoom</span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {/* Left: View Mode Toggle, Quick Selectors, Search */}
          <div id="space-map-controls-panel" style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto', flexWrap: 'wrap' }}>
            {/* Mode Switcher */}
            <div className="glass-panel" style={{ display: 'flex', padding: '3px', borderRadius: 'var(--radius-xs)', gap: '3px', background: 'rgba(5, 12, 24, 0.88)' }}>
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
                  cursor: 'pointer',
                  background: viewMode === 'SOLAR_SYSTEM' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                  color: viewMode === 'SOLAR_SYSTEM' ? '#ffffff' : 'var(--text-secondary)',
                  border: viewMode === 'SOLAR_SYSTEM' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid transparent',
                  boxShadow: viewMode === 'SOLAR_SYSTEM' ? '0 0 12px rgba(56, 189, 248, 0.16)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Orbit size={13} style={{ color: viewMode === 'SOLAR_SYSTEM' ? 'var(--accent-cyan)' : 'inherit' }} />
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
                  cursor: 'pointer',
                  background: viewMode === 'EARTH_ORBIT' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                  color: viewMode === 'EARTH_ORBIT' ? '#ffffff' : 'var(--text-secondary)',
                  border: viewMode === 'EARTH_ORBIT' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid transparent',
                  boxShadow: viewMode === 'EARTH_ORBIT' ? '0 0 12px rgba(56, 189, 248, 0.16)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Globe size={13} style={{ color: viewMode === 'EARTH_ORBIT' ? 'var(--accent-cyan)' : 'inherit' }} />
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

          {/* Right: Camera Presets, Layer Toggles & Camera Reset */}
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

            {/* Camera Presets (Earth Orbit) */}
            {viewMode === 'EARTH_ORBIT' && (
              <div className="glass-panel" style={{ display: 'flex', padding: '2px', borderRadius: 'var(--radius-xs)', gap: '2px' }}>
                <button
                  onClick={() => setCameraPreset('default')}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '10px' }}
                  title="Cinematic Orbital Horizon"
                >
                  Orbital
                </button>
                <button
                  onClick={() => setCameraPreset('horizon')}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '10px' }}
                  title="Sunlit Limb View"
                >
                  Limb
                </button>
                <button
                  onClick={() => setCameraPreset('polar')}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '10px' }}
                  title="Polar View"
                >
                  Polar
                </button>
                <button
                  onClick={() => setCameraPreset('equatorial')}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '10px' }}
                  title="Equatorial View"
                >
                  Equator
                </button>
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

      {/* Voyager Ephemeris Notice - Compact Status Indicator */}
      {voyagerNotice && (
        <div
          className="glass-panel tech-corner"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '20px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            zIndex: 25,
            maxWidth: '320px',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            background: 'rgba(7, 17, 31, 0.94)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>
              <span style={{ fontSize: '7px' }}>●</span> POSITION DATA UNAVAILABLE
            </div>
            <button
              onClick={() => setVoyagerNotice(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              title="Close"
            >
              <X size={13} />
            </button>
          </div>

          <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
            Voyager 1 (Interstellar Probe)
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Ephemeris: Source Unavailable
          </div>

          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-hairline)'
          }}>
            <button
              onClick={() => setViewing3DViewer({ id: 'voyager-1', name: 'Voyager 1' })}
              className="btn btn-primary"
              style={{ flex: 1, fontSize: '11px', padding: '6px 10px' }}
            >
              <Eye size={13} />
              <span>3D Architecture</span>
            </button>
            <button
              onClick={() => setVoyagerNotice(false)}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '6px 10px' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Target Acquisition HUD Reticle (Bottom Left) */}
      {!voyagerNotice && hudData && (
        <div
          className="glass-panel tech-corner space-map-hud"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '16px',
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            zIndex: 15,
            width: '320px',
            maxWidth: 'calc(100vw - 32px)',
            animation: 'fadeIn 0.2s ease',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)'
          }}
        >
          {/* Header Row: Reticle indicator & Inspect Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-cyan)',
              letterSpacing: '0.06em',
              fontWeight: 700
            }}>
              <Crosshair size={12} className="radar-sweep" />
              <span>OBJECT ACQUIRED</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedBodyId) {
                    handleObjectSelection(selectedBodyId, true);
                  }
                }}
                type="button"
                className="btn btn-primary"
                style={{
                  padding: '3px 10px',
                  fontSize: '11px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderRadius: 'var(--radius-full)'
                }}
                aria-label={`Inspect ${hudData.name}`}
                title={`Open comprehensive telemetry inspector for ${hudData.name}`}
              >
                <span>Inspect</span>
                <ChevronRight size={12} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBodyId(null);
                  setHudData(null);
                  if (reticleRef.current) reticleRef.current.visible = false;
                  if (distLineRef.current) distLineRef.current.visible = false;
                }}
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '3px',
                  touchAction: 'manipulation'
                }}
                aria-label="Dismiss object HUD"
                title="Dismiss object selection"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Object Name & Category */}
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {hudData.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {hudData.catalogId && <span>{hudData.catalogId}</span>}
            {hudData.catalogId && hudData.orbitClass && <span>•</span>}
            {hudData.orbitClass && <span>{hudData.orbitClass}</span>}
          </div>

          {/* Compact Telemetry Metrics in a single horizontal strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-inset)',
            borderRadius: 'var(--radius-xs)',
            padding: '6px 10px',
            marginTop: '8px',
            fontSize: '11px'
          }}>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {hudData.altitudeKm !== undefined ? 'Altitude' : 'Dist to Earth'}
              </div>
              <div className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                {hudData.altitudeKm !== undefined 
                  ? `${Math.round(hudData.altitudeKm)} km`
                  : formatDistanceKm(hudData.distEarthKm, true)}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {hudData.velocityKmS !== undefined ? 'Orbital Speed' : 'Radio Delay ($c$)'}
              </div>
              <div className="mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '1px' }}>
                {hudData.velocityKmS !== undefined 
                  ? `${hudData.velocityKmS.toFixed(2)} km/s`
                  : hudData.lightTimeStr}
              </div>
            </div>
          </div>

          {/* Source Provenance */}
          <div style={{
            marginTop: '6px',
            paddingTop: '6px',
            borderTop: '1px solid var(--border-hairline)',
            fontSize: '9px',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>SRC: {hudData.source.substring(0, 22)}</span>
            <span style={{ color: 'var(--accent-cyan)' }}>SGP4 PROPAGATED</span>
          </div>
        </div>
      )}

      {/* Scientific Transparency Scale Disclaimer (Bottom Center) */}
      <div
        className="space-map-scale-disclaimer"
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(3, 5, 10, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '5px 14px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          pointerEvents: 'none',
          maxWidth: 'min(480px, calc(100vw - 32px))',
          zIndex: 15,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
        }}
      >
        <span style={{ color: 'var(--accent-cyan)' }}>ASTRONOMICAL SCALE NOTE:</span> Object markers are visually enlarged for exploration. Positions propagated from verified orbital data.
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

      <style>{`
        @media (max-width: 768px) {
          .space-map-scale-disclaimer {
            display: none !important;
          }
          .space-map-hud {
            bottom: 12px !important;
            left: 8px !important;
            right: 8px !important;
            width: auto !important;
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
};
