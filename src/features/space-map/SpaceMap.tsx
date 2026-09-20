import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Orbit,
  Layers, 
  Clock, 
  RotateCcw, 
  ChevronRight,
  ChevronLeft,
  Crosshair,
  Search,
  Eye,
  Globe,
  AlertTriangle,
  Compass,
  Sliders,
  RefreshCw,
  Info,
  X,
  Sparkles,
  Maximize2,
  Play,
  Pause,
  Minimize2
} from 'lucide-react';
import { calculatePlanetEphemeris } from '../../services/calculations/kepler';
import { calculateAdityaL1Ephemeris } from '../../services/calculations/lagrange';
import { calculateVoyagerInterstellarEphemeris } from '../../services/calculations/spacecraftPosition';
import { CelestrakService, SatelliteTrackData } from '../../services/api/celestrakService';
import { SPACECRAFT_REGISTRY, resolveSpacecraftState } from '../../services/data/spacecraftCatalog';
import { resolveTrackingCapability } from '../../services/data/trackingCapability';
import type { InspectableObject, SpacecraftObject } from '../../types/space';
import { resolveInspectableObject, normalizeSpacecraftObject } from '../../services/data/objectResolver';
import { formatDistanceKm } from '../../utils/formatters';
import { calculateLightTimeSeconds, formatLightTime } from '../../services/calculations/physics';
import { 
  createRealisticEarthShaderMaterial, 
  createRealisticAtmosphereMesh, 
  createRealisticCloudMesh 
} from '../../components/space/earthRealistic';
import { getSpacecraft3DModel } from '../../components/space/spacecraftModelRegistry';
import { 
  createRealisticStarfield, 
  createEarthAtmosphericMeteorSystem 
} from '../../components/space/deepSpaceEnvironment';
import { 
  createScientificReticle, 
  createDirectionalOrbitLine 
} from '../../components/space/spacecraftVisuals';
import { 
  createRealisticSun, 
  createRealisticPlanet, 
  PLANET_VISUAL_CONFIGS 
} from '../../components/space/planetRealistic';
import { Spacecraft3DViewer } from '../../components/inspector/Spacecraft3DViewer';

interface SpaceMapProps {
  onSelectObject?: (obj: InspectableObject) => void;
  onInspectObject?: (obj: InspectableObject) => void;
  selectedObjectId?: string;
}

type ViewMode = 'SOLAR_SYSTEM' | 'EARTH_ORBIT';
type ScaleMode = 'EXPLORATION' | 'SCIENTIFIC';
type CameraComposition = 'ECLIPTIC_3_4' | 'WIDE_HELIOCENTRIC' | 'SUNRISE_HORIZON' | 'SATURN_RING_PLANE';

interface VisualBody {
  id: string;
  name: string;
  type: 'star' | 'planet' | 'moon' | 'spacecraft' | 'satellite';
  mesh: THREE.Object3D;
  planetMesh?: THREE.Mesh;
  cloudsMesh?: THREE.Mesh;
  position: THREE.Vector3;
  realKm: { x: number; y: number; z: number };
  radiusKm: number;
  orbitLine?: THREE.Line;
  color: string;
  craftData?: SpacecraftObject;
  satTrack?: SatelliteTrackData;
}

interface FlyToAnimation {
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  startLookAt: THREE.Vector3;
  targetLookAt: THREE.Vector3;
  startTime: number;
  durationMs: number;
}

// True astronomical orbital periods (in Earth days) for full 360° Keplerian sampling
const ORBITAL_PERIODS_DAYS: Record<string, number> = {
  mercury: 87.97,
  venus: 224.70,
  earth: 365.25,
  mars: 686.98,
  jupiter: 4332.59,  // ~11.86 Earth years
  saturn: 10759.22,  // ~29.46 Earth years
  uranus: 30685.40,  // ~84.0 Earth years
  neptune: 60189.00  // ~164.8 Earth years
};

// Authentic sidereal rotation rates (radians per animation frame)
const PLANET_ROTATION_SPEEDS: Record<string, number> = {
  mercury: 0.0004,
  venus: -0.0003, // Retrograde rotation
  earth: 0.0028,
  mars: 0.0027,
  jupiter: 0.0068, // Rapid rotation of gas giant
  saturn: 0.0064,
  uranus: -0.0042, // Retrograde & tilted on side
  neptune: 0.0045
};

/**
 * Computes visual distance in scene units from true heliocentric distance in AU
 */
function computeVisualDistance(rAU: number, mode: ScaleMode): number {
  if (mode === 'SCIENTIFIC') {
    return Math.max(0.1, rAU * 22.0);
  }
  // Exploration Scale: Continuous non-linear power-law compression
  // Preserves exact ordering, true heliocentric angles, and eccentricity variations
  return Math.max(4.8, 16.5 * Math.pow(Math.max(0.01, rAU), 0.52) + 4.5);
}

/**
 * Transforms heliocentric ecliptic J2000 coordinates (in AU) to Three.js scene coordinates
 */
function eclipticToSceneCoords(posAU: { x: number; y: number; z: number }, mode: ScaleMode): THREE.Vector3 {
  const rAU = Math.sqrt(posAU.x * posAU.x + posAU.y * posAU.y + posAU.z * posAU.z);
  const visualR = computeVisualDistance(rAU, mode);
  const factor = rAU > 0 ? visualR / rAU : 1.0;
  
  return new THREE.Vector3(
    posAU.x * factor,
    posAU.z * factor,
    posAU.y * factor
  );
}

// Satellite distance mapping around Earth in Earth-Orbit mode
function mapSatelliteVisualRadius(altKm: number): number {
  const EARTH_VISUAL_R = 10.0;
  if (altKm < 2000) {
    return EARTH_VISUAL_R + 1.4 + (Math.max(120, altKm) / 2000.0) * 3.0;
  }
  if (altKm < 35000) {
    return 14.5 + ((altKm - 2000.0) / 33000.0) * 7.5;
  }
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
  const [scaleMode, setScaleMode] = useState<ScaleMode>('EXPLORATION');
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
  const [hoveredBody, setHoveredBody] = useState<{ name: string; altKm?: number; x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [viewing3DViewer, setViewing3DViewer] = useState<{ id: string; name: string } | null>(null);

  // 1. Cinematic 0-9s Arrival Sequence State
  const [isArrivalActive, setIsArrivalActive] = useState<boolean>(() => {
    try {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) return false;
      const completed = localStorage.getItem('spacepulse_cinematic_arrival_completed');
      return completed !== 'true';
    } catch {
      return false;
    }
  });
  const [arrivalSeconds, setArrivalSeconds] = useState<number>(0);

  // 2. "Orbital View" Spacewalk Camera Mode State
  const [isOrbitalView, setIsOrbitalView] = useState<boolean>(false);

  // 3. 7-Step Spacepulse Space Tour State (1 to 7, 0 = inactive)
  const [tourStep, setTourStep] = useState<number>(0);
  const [tourPaused, setTourPaused] = useState<boolean>(false);

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
  const meteorSystemRef = useRef<ReturnType<typeof createEarthAtmosphericMeteorSystem> | null>(null);

  // Lighting References for Dynamic Celestial Illuminance
  const sunPointLightRef = useRef<THREE.PointLight | null>(null);
  const sunDirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  // Smooth Fly-To Camera Flight Reference
  const flyToAnimRef = useRef<FlyToAnimation | null>(null);
  const handleObjectSelectionRef = useRef<(objectId: string, shouldInspect?: boolean) => void>(() => {});

  // Synchronize selection from parent prop
  useEffect(() => {
    if (selectedObjectId) {
      setSelectedBodyId(selectedObjectId);
      const isEarthSat = ['iss', 'css-tiangong', 'hubble', 'astrosat', 'cartosat-3', 'eos-06', 'noaa-19', 'terra'].includes(selectedObjectId) || selectedObjectId.startsWith('norad-');
      if (isEarthSat) {
        setViewMode('EARTH_ORBIT');
      } else if (selectedObjectId !== 'moon' && !selectedObjectId.startsWith('chandrayaan')) {
        setViewMode('SOLAR_SYSTEM');
      }
    }
  }, [selectedObjectId]);

  // Smooth Fly-To Interpolator Function
  const flyToTarget = useCallback((targetPos: THREE.Vector3, targetLook: THREE.Vector3, durationMs: number = 1350) => {
    if (!cameraRef.current || !controlsRef.current) return;
    flyToAnimRef.current = {
      startPos: cameraRef.current.position.clone(),
      targetPos: targetPos.clone(),
      startLookAt: controlsRef.current.target.clone(),
      targetLookAt: targetLook.clone(),
      startTime: performance.now(),
      durationMs
    };
  }, []);

  // Preset Camera Compositions
  const applyCameraComposition = useCallback((comp: CameraComposition) => {
    if (!cameraRef.current) return;
    if (comp === 'ECLIPTIC_3_4') {
      // Carefully composed 3/4 diagonal depth: Sun slightly off-center, inner/outer depth
      flyToTarget(new THREE.Vector3(38, 28, 78), new THREE.Vector3(-4, -1, 3), 1300);
    } else if (comp === 'WIDE_HELIOCENTRIC') {
      // Full system overview with large negative space
      flyToTarget(new THREE.Vector3(12, 110, 240), new THREE.Vector3(0, -1, 0), 1400);
    } else if (comp === 'SUNRISE_HORIZON') {
      // Cinematic sunrise composition looking past Earth towards the radiant Sun
      const earth = bodiesRef.current.get('earth');
      if (earth) {
        const earthPos = earth.position;
        const camPos = earthPos.clone().add(new THREE.Vector3(8.5, 3.2, 11.0));
        flyToTarget(camPos, new THREE.Vector3(0, 0, 0), 1400);
      } else {
        flyToTarget(new THREE.Vector3(20, 6, 24), new THREE.Vector3(0, 0, 0), 1200);
      }
    } else if (comp === 'SATURN_RING_PLANE') {
      // Grazing shallow elevation across Saturn's ring system
      const saturn = bodiesRef.current.get('saturn');
      if (saturn) {
        const sPos = saturn.position;
        const camPos = sPos.clone().add(new THREE.Vector3(12.0, 3.8, 14.5));
        flyToTarget(camPos, sPos, 1400);
      }
    }
  }, [flyToTarget]);

  const resetView = useCallback(() => {
    if (viewMode === 'EARTH_ORBIT') {
      flyToTarget(new THREE.Vector3(18, 10, 28), new THREE.Vector3(-1.2, 0, 0), 1000);
    } else {
      if (scaleMode === 'SCIENTIFIC') {
        flyToTarget(new THREE.Vector3(60, 110, 260), new THREE.Vector3(0, -1, 0), 1100);
      } else {
        applyCameraComposition('ECLIPTIC_3_4');
      }
    }
  }, [viewMode, scaleMode, flyToTarget, applyCameraComposition]);

  // Focus on specific object with smooth ease-in-out flight
  const focusOnObject = useCallback((id: string) => {
    let body = bodiesRef.current.get(id);
    if (!body && id.startsWith('chandrayaan')) {
      body = bodiesRef.current.get('moon') || bodiesRef.current.get('earth');
    }
    if (!body || !cameraRef.current || !controlsRef.current) return;

    if (viewMode === 'EARTH_ORBIT') {
      if (body.id === 'earth') {
        flyToTarget(new THREE.Vector3(14, 11, 24), new THREE.Vector3(-1.2, 0, 0), 1200);
      } else if (body.id === 'moon' || body.id.startsWith('chandrayaan')) {
        const targetLook = body.position.clone();
        flyToTarget(body.position.clone().add(new THREE.Vector3(5.0, 3.0, 6.0)), targetLook, 1300);
      } else {
        const targetLook = body.position.clone();
        const zoomDist = selectedBodyId === id ? 1.8 : 3.8;
        const offset = body.position.clone().normalize().multiplyScalar(zoomDist).add(new THREE.Vector3(1.0, 1.0, 1.6));
        flyToTarget(body.position.clone().add(offset), targetLook, 1200);
      }
    } else {
      const targetLook = body.position.clone();
      let viewDist = 12.0;

      if (body.id === 'sun') {
        viewDist = 26.0;
      } else if (body.id === 'jupiter' || body.id === 'saturn') {
        viewDist = 16.0;
      } else if (body.id === 'uranus' || body.id === 'neptune') {
        viewDist = 12.0;
      } else if (body.id === 'earth' || body.id === 'venus') {
        viewDist = 9.0;
      } else if (body.id === 'mars' || body.id === 'mercury') {
        viewDist = 7.0;
      } else if (body.id === 'aditya-l1') {
        viewDist = 4.5;
      } else if (body.id === 'voyager-1' || body.id === 'voyager-2') {
        viewDist = 5.0;
      } else if (body.id === 'chandrayaan-1' || body.id.startsWith('chandrayaan')) {
        viewDist = 4.0;
      }

      // Compute camera offset along current viewing angle with slight upward elevation
      const currentDir = cameraRef.current.position.clone().sub(targetLook).normalize();
      if (currentDir.y < 0.25) currentDir.y = 0.35;
      currentDir.normalize();

      const targetCam = targetLook.clone().add(currentDir.multiplyScalar(viewDist));
      flyToTarget(targetCam, targetLook, 1300);
    }
  }, [viewMode, selectedBodyId, flyToTarget]);

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

  // Skip Cinematic Arrival
  const skipArrival = useCallback(() => {
    setIsArrivalActive(false);
    try {
      localStorage.setItem('spacepulse_cinematic_arrival_completed', 'true');
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    applyCameraComposition('ECLIPTIC_3_4');
  }, [applyCameraComposition]);

  // 7-Step Space Tour Transitions
  const handleTourStep = useCallback((step: number) => {
    setTourStep(step);
    if (step === 0) {
      resetView();
      return;
    }

    if (step === 1) {
      // Step 1: Entering deep space
      flyToTarget(new THREE.Vector3(0, 240, 580), new THREE.Vector3(0, 0, 0), 1600);
    } else if (step === 2) {
      // Step 2: Approaching the Solar System (Sun ignition)
      flyToTarget(new THREE.Vector3(38, 28, 78), new THREE.Vector3(-4, -1, 3), 1600);
    } else if (step === 3) {
      // Step 3: The inner worlds (Mercury, Venus, Earth, Mars)
      const earth = bodiesRef.current.get('earth');
      if (earth) {
        setSelectedBodyId('earth');
        handleObjectSelectionRef.current('earth', false);
        flyToTarget(earth.position.clone().add(new THREE.Vector3(6.5, 3.8, 8.5)), earth.position.clone(), 1600);
      }
    } else if (step === 4) {
      // Step 4: The outer worlds (Jupiter and Saturn's rings)
      const saturn = bodiesRef.current.get('saturn');
      if (saturn) {
        setSelectedBodyId('saturn');
        handleObjectSelectionRef.current('saturn', false);
        flyToTarget(saturn.position.clone().add(new THREE.Vector3(14.0, 4.5, 16.0)), saturn.position.clone(), 1700);
      }
    } else if (step === 5) {
      // Step 5: Beyond the giants (Uranus and Neptune)
      const neptune = bodiesRef.current.get('neptune');
      if (neptune) {
        setSelectedBodyId('neptune');
        handleObjectSelectionRef.current('neptune', false);
        flyToTarget(neptune.position.clone().add(new THREE.Vector3(12.0, 3.5, 14.0)), neptune.position.clone(), 1700);
      }
    } else if (step === 6) {
      // Step 6: Human exploration (Aditya-L1, satellites, human presence)
      const aditya = bodiesRef.current.get('aditya-l1');
      if (aditya) {
        setSelectedBodyId('aditya-l1');
        handleObjectSelectionRef.current('aditya-l1', false);
        flyToTarget(aditya.position.clone().add(new THREE.Vector3(4.5, 2.0, 5.5)), aditya.position.clone(), 1600);
      }
    } else if (step === 7) {
      // Step 7: Return to full observatory overview
      setSelectedBodyId(null);
      setHudData(null);
      applyCameraComposition('ECLIPTIC_3_4');
    }
  }, [flyToTarget, resetView, applyCameraComposition]);

  // Auto-advance tour if not paused
  useEffect(() => {
    if (tourStep === 0 || tourPaused) return;
    const timer = setTimeout(() => {
      if (tourStep < 7) {
        handleTourStep(tourStep + 1);
      } else {
        handleTourStep(0);
      }
    }, 6500);
    return () => clearTimeout(timer);
  }, [tourStep, tourPaused, handleTourStep]);

  // =========================================================================
  // 1. INITIALIZE THREE.JS SCENE & RENDERER (Runs Once)
  // =========================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

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

    const width = Math.max(container.clientWidth || 0, window.innerWidth || 800, 320);
    const height = Math.max(container.clientHeight || 0, (window.innerHeight ? window.innerHeight - 130 : 650), 400);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#000204');
    sceneRef.current = scene;

    // Perspective Camera: 50° FOV gives natural depth perception
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 35000);
    
    // Starting camera coordinates:
    // If arrival is active, start in deep black space; otherwise use cinematic 3/4 composition
    if (isArrivalActive) {
      camera.position.set(0, 320, 780);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(38, 28, 78);
      camera.lookAt(-4, -1, 3);
    }
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.30;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.5;
    controls.maxDistance = 5000;
    controls.target.set(-4, -1, 3);
    controlsRef.current = controls;

    // 4-Tier Deep Space Starfield with Volumetric Milky Way Band
    const starfield = createRealisticStarfield();
    scene.add(starfield);

    // Earth Upper-Atmosphere Meteor System
    const meteorSystem = createEarthAtmosphericMeteorSystem();
    scene.add(meteorSystem.group);
    meteorSystemRef.current = meteorSystem;

    // Dynamic Multi-Source Illuminating System
    const sunPointLight = new THREE.PointLight(0xfffaec, 4.2, 8000, 0.06);
    sunPointLight.position.set(0, 0, 0);
    scene.add(sunPointLight);
    sunPointLightRef.current = sunPointLight;

    const earthSunDir = new THREE.Vector3(1.2, 0.35, 0.85).normalize();
    const sunDirLight = new THREE.DirectionalLight(0xfffaec, 0.0);
    sunDirLight.position.copy(earthSunDir.clone().multiplyScalar(250));
    scene.add(sunDirLight);
    sunDirLightRef.current = sunDirLight;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.22);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // Distance Ranging Vector
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

    // Resize Observer
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

    // Raycaster for Hover & Click
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
          focusOnObject(bodyId);
          handleObjectSelectionRef.current(bodyId, false);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('click', onPointerClick);

    // Animation Loop
    let lastTime = performance.now();
    let arrivalElapsedSec = 0;

    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const deltaSec = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      // 1. Cinematic Arrival Sequence Progression
      if (isArrivalActive) {
        arrivalElapsedSec += deltaSec;
        setArrivalSeconds(arrivalElapsedSec);

        if (arrivalElapsedSec <= 2.0) {
          // 0-2s: Deep black space, camera holds
        } else if (arrivalElapsedSec <= 4.0) {
          // 2-4s: Slow forward drift
          camera.position.z -= deltaSec * 35;
        } else if (arrivalElapsedSec <= 6.0) {
          // 4-6s: Sun illuminates, camera sweeps down
          const t6 = (arrivalElapsedSec - 4.0) / 2.0;
          camera.position.y = THREE.MathUtils.lerp(320, 110, t6);
          camera.position.z = THREE.MathUtils.lerp(710, 220, t6);
          camera.lookAt(0, 0, 0);
        } else if (arrivalElapsedSec <= 9.0) {
          // 6-9s: Glides smoothly into normal 3/4 composition
          const t9 = (arrivalElapsedSec - 6.0) / 3.0;
          const ease = t9 < 0.5 ? 4 * t9 * t9 * t9 : 1 - Math.pow(-2 * t9 + 2, 3) / 2;
          camera.position.lerpVectors(new THREE.Vector3(25, 110, 220), new THREE.Vector3(38, 28, 78), ease);
          controls.target.lerpVectors(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-4, -1, 3), ease);
          controls.update();
        } else {
          // 9+s: Settle
          setIsArrivalActive(false);
          try {
            localStorage.setItem('spacepulse_cinematic_arrival_completed', 'true');
          } catch {}
          applyCameraComposition('ECLIPTIC_3_4');
        }
      }

      // 2. "Orbital View" Spacewalk Camera Drift Mode
      else if (isOrbitalView) {
        const t = now * 0.00018;
        const driftRadius = 135.0;
        camera.position.x = Math.cos(t) * driftRadius;
        camera.position.z = Math.sin(t) * driftRadius;
        camera.position.y = 28.0 + Math.sin(t * 1.5) * 14.0;
        controls.target.set(-2, -1, 2);
        controls.update();
      }

      // 3. Smooth Camera Fly-To Interpolation
      else if (flyToAnimRef.current) {
        const anim = flyToAnimRef.current;
        const elapsed = now - anim.startTime;
        const progress = Math.min(1.0, elapsed / anim.durationMs);

        const ease = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        camera.position.lerpVectors(anim.startPos, anim.targetPos, ease);
        controls.target.lerpVectors(anim.startLookAt, anim.targetLookAt, ease);
        controls.update();

        if (progress >= 1.0) {
          flyToAnimRef.current = null;
        }
      } else {
        controls.update();
      }

      // 4. Update Earth Atmospheric Meteors
      if (meteorSystemRef.current) {
        const earth = bodiesRef.current.get('earth');
        const earthPos = earth ? earth.position : new THREE.Vector3(0, 0, 0);
        meteorSystemRef.current.update(
          deltaSec, 
          earthPos, 
          viewMode === 'EARTH_ORBIT' || selectedBodyId === 'earth'
        );
      }

      // 5. Rotate Planets at Believable Speeds
      bodiesRef.current.forEach(body => {
        const speed = PLANET_ROTATION_SPEEDS[body.id] || 0.002;
        if (body.planetMesh) {
          body.planetMesh.rotation.y += speed;
        } else if (body.type === 'planet' || body.id === 'earth') {
          body.mesh.rotation.y += speed;
        }

        if (body.cloudsMesh) {
          body.cloudsMesh.rotation.y += speed + 0.0006;
        }

        if (body.type === 'satellite') {
          body.mesh.rotation.y += 0.004;
        }
      });

      // 6. Selection Reticle subtle rotation
      if (reticleRef.current && reticleRef.current.visible) {
        reticleRef.current.rotation.z += 0.008;
      }

      renderer.render(scene, camera);
    };

    animate();
    setIsInitializing(false);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('click', onPointerClick);
      if (meteorSystemRef.current) {
        meteorSystemRef.current.dispose();
      }
      renderer.dispose();
    };
  }, []);

  // =========================================================================
  // 2. BUILD BASE ASTRONOMICAL SCENE (Solar System or Earth Orbit)
  // =========================================================================
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    bodiesRef.current.forEach(body => {
      scene.remove(body.mesh);
      if (body.orbitLine) scene.remove(body.orbitLine);
    });
    bodiesRef.current.clear();

    if (viewMode === 'SOLAR_SYSTEM') {
      if (sunPointLightRef.current) sunPointLightRef.current.intensity = 4.2;
      if (sunDirLightRef.current) sunDirLightRef.current.intensity = 0.0;
      if (ambientLightRef.current) {
        ambientLightRef.current.color.setHex(0xffffff);
        ambientLightRef.current.intensity = 0.22;
      }

      // 1. Sun (Authentic Self-Illuminated Star)
      const sunSystem = createRealisticSun(4.5);
      scene.add(sunSystem.mesh);

      bodiesRef.current.set('sun', {
        id: 'sun',
        name: 'Sun (Sol)',
        type: 'star',
        mesh: sunSystem.mesh,
        position: new THREE.Vector3(0, 0, 0),
        realKm: { x: 0, y: 0, z: 0 },
        radiusKm: 696340,
        color: '#f59e0b'
      });

      // 2. All 8 Major Planets
      const planetKeys = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

      planetKeys.forEach(pId => {
        try {
          const config = PLANET_VISUAL_CONFIGS[pId];
          if (!config) return;

          const ephem = calculatePlanetEphemeris(pId, simDate);
          const scenePos = eclipticToSceneCoords(ephem.positionAU, scaleMode);

          const visualRadius = scaleMode === 'SCIENTIFIC'
            ? Math.max(0.4, config.baseRadius * 0.42)
            : config.baseRadius;

          const planetObj = createRealisticPlanet(pId, visualRadius);
          planetObj.group.position.copy(scenePos);
          planetObj.group.visible = showPlanets;
          scene.add(planetObj.group);

          // If Earth, add the Moon
          if (pId === 'earth') {
            const moonGeo = new THREE.SphereGeometry(visualRadius * 0.27, 24, 24);
            const moonMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.9 });
            const moonMesh = new THREE.Mesh(moonGeo, moonMat);
            moonMesh.position.set(visualRadius * 2.8, 0.4, visualRadius * 1.5);
            moonMesh.userData = { bodyId: 'moon' };
            planetObj.group.add(moonMesh);

            const satRingGeo = new THREE.RingGeometry(visualRadius * 1.25, visualRadius * 1.38, 36);
            const satRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.35 });
            const satRing = new THREE.Mesh(satRingGeo, satRingMat);
            satRing.rotation.x = Math.PI / 2.3;
            planetObj.group.add(satRing);

            cloudsMeshRef.current = planetObj.cloudsMesh || null;
          }

          // Keplerian Elliptical Orbit Path
          let orbitLine: THREE.Line | undefined;
          if (showOrbits) {
            const orbitPts: THREE.Vector3[] = [];
            const samples = 180;
            const periodDays = ORBITAL_PERIODS_DAYS[pId] || 365.25;
            const tStart = simDate.getTime();

            for (let s = 0; s <= samples; s++) {
              const sampleDate = new Date(tStart + (s / samples) * periodDays * 86400000);
              const sEphem = calculatePlanetEphemeris(pId, sampleDate);
              const ptScene = eclipticToSceneCoords(sEphem.positionAU, scaleMode);
              orbitPts.push(ptScene);
            }

            const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
            const orbitMat = new THREE.LineBasicMaterial({
              color: new THREE.Color(config.color),
              transparent: true,
              opacity: selectedBodyId === pId ? 0.85 : 0.20
            });
            orbitLine = new THREE.Line(orbitGeo, orbitMat);
            scene.add(orbitLine);
          }

          bodiesRef.current.set(pId, {
            id: pId,
            name: config.name,
            type: 'planet',
            mesh: planetObj.group,
            planetMesh: planetObj.planetMesh,
            cloudsMesh: planetObj.cloudsMesh,
            position: scenePos,
            realKm: ephem.positionKm,
            radiusKm: config.radiusKm,
            orbitLine,
            color: config.color
          });

        } catch (e) {
          console.error('Failed to calculate ephemeris for:', pId, e);
        }
      });

      // 3. Aditya-L1 Solar Observatory at Sun-Earth L1
      try {
        const l1 = calculateAdityaL1Ephemeris(simDate);
        const earthBody = bodiesRef.current.get('earth');
        if (earthBody) {
          const dirToSun = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), earthBody.position).normalize();
          const l1VisualOffset = scaleMode === 'SCIENTIFIC' ? 0.8 : 3.2;
          const l1VisualPos = earthBody.position.clone().add(dirToSun.multiplyScalar(l1VisualOffset));

          const l1Mesh = getSpacecraft3DModel('aditya-l1', { scale: 0.45, isMapMode: true });
          l1Mesh.position.copy(l1VisualPos);
          l1Mesh.lookAt(0, 0, 0);
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
          bodiesRef.current.set('aditya-l1', {
            id: 'aditya-l1',
            name: 'Aditya-L1',
            type: 'spacecraft',
            mesh: l1Mesh,
            position: l1VisualPos,
            realKm: l1.positionKm,
            radiusKm: 2,
            orbitLine: haloLine,
            color: '#38bdf8'
          });

          if (adityaDef) {
            resolveSpacecraftState(adityaDef, simDate).then(craftState => {
              const existing = bodiesRef.current.get('aditya-l1');
              if (existing) existing.craftData = craftState;
            });
          }
        }
      } catch (e) {
        console.error('Aditya-L1 error:', e);
      }

      // 4. Interstellar Spacecraft: Voyager 1 & Voyager 2
      const voyagerProbes: Array<'voyager-1' | 'voyager-2'> = ['voyager-1', 'voyager-2'];
      for (const vId of voyagerProbes) {
        try {
          const vPos = calculateVoyagerInterstellarEphemeris(vId, simDate, scaleMode);
          const vVisualPos = new THREE.Vector3(vPos.renderPosition.x, vPos.renderPosition.y, vPos.renderPosition.z);

          const vMesh = getSpacecraft3DModel(vId, { scale: 0.55, isMapMode: true });
          vMesh.position.copy(vVisualPos);
          // Point high-gain antenna dish back toward inner Solar System / Earth
          vMesh.lookAt(0, 0, 0);
          vMesh.userData = { bodyId: vId };
          vMesh.traverse(child => {
            child.userData.bodyId = vId;
          });
          vMesh.visible = showSpacecraft;
          scene.add(vMesh);

          // Asymptotic interstellar escape trajectory line
          let escapeLine: THREE.Line | undefined;
          if (showOrbits) {
            const linePts = [
              vVisualPos.clone().multiplyScalar(0.4),
              vVisualPos.clone()
            ];
            const escGeo = new THREE.BufferGeometry().setFromPoints(linePts);
            const escMat = new THREE.LineDashedMaterial({
              color: vId === 'voyager-1' ? 0xf59e0b : 0x10b981,
              dashSize: 3,
              gapSize: 2,
              transparent: true,
              opacity: 0.45
            });
            escapeLine = new THREE.Line(escGeo, escMat);
            escapeLine.computeLineDistances();
            scene.add(escapeLine);
          }

          const vDef = SPACECRAFT_REGISTRY.find(s => s.id === vId);
          const craftName = vDef ? vDef.name : vId === 'voyager-1' ? 'Voyager 1' : 'Voyager 2';

          bodiesRef.current.set(vId, {
            id: vId,
            name: craftName,
            type: 'spacecraft',
            mesh: vMesh,
            position: vVisualPos,
            realKm: { x: vPos.x, y: vPos.y, z: vPos.z },
            radiusKm: 4,
            orbitLine: escapeLine,
            color: vId === 'voyager-1' ? '#f59e0b' : '#10b981'
          });

          if (vDef) {
            resolveSpacecraftState(vDef, simDate).then(craftState => {
              const existing = bodiesRef.current.get(vId);
              if (existing) existing.craftData = craftState;
            });
          }
        } catch (err) {
          console.error(`Failed to place ${vId}:`, err);
        }
      }

      // 5. Chandrayaan-1 Historical Lunar Mission
      const ch1Def = SPACECRAFT_REGISTRY.find(s => s.id === 'chandrayaan-1');
      const earthBody = bodiesRef.current.get('earth');
      if (ch1Def && earthBody) {
        const visualRadius = scaleMode === 'SCIENTIFIC' ? 0.35 : 1.35;
        const moonSceneOffset = new THREE.Vector3(visualRadius * 2.8, 0.4, visualRadius * 1.5);
        const ch1Pos = earthBody.position.clone().add(moonSceneOffset);

        bodiesRef.current.set('chandrayaan-1', {
          id: 'chandrayaan-1',
          name: 'Chandrayaan-1',
          type: 'spacecraft',
          mesh: earthBody.mesh,
          position: ch1Pos,
          realKm: { x: earthBody.realKm.x + 384400, y: earthBody.realKm.y, z: earthBody.realKm.z },
          radiusKm: 2,
          color: '#f59e0b'
        });

        resolveSpacecraftState(ch1Def, simDate).then(craftState => {
          const existing = bodiesRef.current.get('chandrayaan-1');
          if (existing) existing.craftData = craftState;
        });
      }

    } else {
      // EARTH ORBIT TRACKING MODE
      if (sunPointLightRef.current) sunPointLightRef.current.intensity = 0.0;
      if (sunDirLightRef.current) sunDirLightRef.current.intensity = 3.2;
      if (ambientLightRef.current) {
        ambientLightRef.current.color.setHex(0x0c1527);
        ambientLightRef.current.intensity = 0.18;
      }

      const EARTH_R = 10.0;
      const sunDir = new THREE.Vector3(1.2, 0.35, 0.85).normalize();

      const earthGeo = new THREE.SphereGeometry(EARTH_R, 64, 64);
      const earthMat = createRealisticEarthShaderMaterial(sunDir);
      const earthMesh = new THREE.Mesh(earthGeo, earthMat);
      earthMesh.userData = { bodyId: 'earth' };
      scene.add(earthMesh);

      const cloudsMesh = createRealisticCloudMesh(EARTH_R);
      earthMesh.add(cloudsMesh);
      cloudsMeshRef.current = cloudsMesh;

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

      setIsFetchingSatellites(true);
      CelestrakService.getSupportedEarthSatellites(simDate)
        .then(satellites => {
          setIsFetchingSatellites(false);

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

            const satMesh = getSpacecraft3DModel(String(sat.noradId), {
              scale: isStation ? 0.38 : 0.28,
              isMapMode: true
            });
            satMesh.position.copy(satPos);
            satMesh.lookAt(0, 0, 0);
            satMesh.userData = { bodyId: `norad-${sat.noradId}`, noradId: sat.noradId };
            satMesh.visible = showSatellites;
            scene.add(satMesh);

            const markerGeo = new THREE.SphereGeometry(0.18, 12, 12);
            const markerMat = new THREE.MeshBasicMaterial({ color: satColor });
            const markerMesh = new THREE.Mesh(markerGeo, markerMat);
            satMesh.add(markerMesh);

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
            const craftId = craftDef ? craftDef.id : `norad-${sat.noradId}`;
            const trackingCap = resolveTrackingCapability(craftId, sat.name, {
              noradId: sat.noradId,
              isLiveGp: sat.isLiveGp,
              epochDate: sat.epochDate,
              epochStr: sat.epochStr,
              orbitClass: sat.orbitClass,
              timestamp: sat.telemetrySource.timestamp,
              hasValidState: true
            }, simDate);

            const craftObj: SpacecraftObject = {
              id: craftId,
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
              orbitalElements: {
                epoch: sat.epochStr,
                semiMajorAxisKm: sat.semiMajorAxisKm,
                inclinationDeg: sat.inclinationDeg,
                eccentricity: sat.eccentricity,
                periodMinutes: sat.periodMinutes,
                raanDeg: sat.raanDeg,
                argPericenterDeg: sat.argPericenterDeg,
                meanAnomalyDeg: sat.meanAnomalyDeg
              },
              telemetrySource: sat.telemetrySource,
              trackingCapability: trackingCap
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

  }, [viewMode, scaleMode, simDate, showPlanets, showOrbits, showSpacecraft, showSatellites]);

  // Update HUD & Selection Reticle when selection changes
  useEffect(() => {
    const reticle = reticleRef.current;
    const distLine = distLineRef.current;

    bodiesRef.current.forEach((body) => {
      if (body.orbitLine && body.orbitLine.material) {
        const mat = body.orbitLine.material as THREE.LineBasicMaterial;
        if (!selectedBodyId) {
          mat.opacity = 0.20;
        } else if (body.id === selectedBodyId) {
          mat.opacity = 0.85;
        } else {
          mat.opacity = 0.08;
        }
      }
    });

    const selected = selectedBodyId ? bodiesRef.current.get(selectedBodyId) : null;
    const earth = bodiesRef.current.get('earth');

    if (selected && reticle) {
      reticle.position.copy(selected.position);
      reticle.scale.set(selected.type === 'planet' ? 2.2 : 1.1, selected.type === 'planet' ? 2.2 : 1.1, 1);
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
      const distSunKm = selected.craftData?.distanceFromSunKm ||
        Math.sqrt(selected.realKm.x * selected.realKm.x + selected.realKm.y * selected.realKm.y + selected.realKm.z * selected.realKm.z);

      setHudData({
        name: selected.name,
        catalogId: selected.satTrack ? `NORAD ${selected.satTrack.noradId}` : undefined,
        distEarthKm,
        distSunKm,
        altitudeKm: selected.satTrack?.state?.altitudeKm,
        velocityKmS: selected.satTrack?.state?.velocityKmS || selected.craftData?.velocityKmS,
        lightTimeStr: formatLightTime(ltSec),
        type: selected.type,
        orbitClass: selected.satTrack?.orbitClass || selected.craftData?.orbitType || (selected.id.includes('voyager') ? 'Interstellar Trajectory' : undefined),
        status: selected.craftData?.telemetrySource.status || 'CALCULATED',
        source: selected.craftData?.telemetrySource.sourceName || (selected.id.includes('voyager') ? 'NASA JPL Deep Space Network / Interstellar Mission' : 'Astronomical Ephemeris Model')
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
        source: 'NASA JPL Standish Keplerian Model'
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
      { id: 'voyager-1', name: 'Voyager 1', type: 'spacecraft', category: 'Interstellar Probe (DSN)' },
      { id: 'voyager-2', name: 'Voyager 2', type: 'spacecraft', category: 'Interstellar Probe (DSN)' },
      { id: 'chandrayaan-1', name: 'Chandrayaan-1', type: 'spacecraft', category: 'Lunar Orbiter (Historical)' },
      { id: 'chandrayaan-2-orbiter', name: 'Chandrayaan-2 Orbiter', type: 'spacecraft', category: 'Lunar Orbiter' }
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

  // Fallback if WebGL is completely unsupported
  if (webGLFailed) {
    return (
      <div className="container" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '36px', maxWidth: '640px', margin: '0 auto' }}>
          <AlertTriangle size={36} style={{ color: 'var(--status-last)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>
            3D Visualization is unavailable on this device
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '12px' }}>
            Hardware WebGL acceleration could not be initialized in your browser context.
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

      {/* 1. Cinematic 0-9s Arrival Overlay & Skip Button */}
      {isArrivalActive && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 45,
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-cyan)',
            letterSpacing: '0.08em',
            background: 'rgba(5, 12, 24, 0.88)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)'
          }}>
            {arrivalSeconds < 3 ? 'INTERPLANETARY ARRIVAL // DEEP SPACE' :
             arrivalSeconds < 6 ? 'HELIOCENTRIC VECTOR // SOLAR IGNITION' :
             'STABILIZING OBSERVATORY PERSPECTIVE'}
          </div>

          <button
            onClick={skipArrival}
            className="btn btn-primary"
            style={{ fontSize: '11px', padding: '6px 14px', borderRadius: 'var(--radius-full)' }}
          >
            Skip Intro
          </button>
        </div>
      )}

      {/* 2. "Orbital View" Spacewalk Mode Active HUD Overlay */}
      {isOrbitalView && (
        <>
          {/* Subtle Spacecraft Observation Viewport Vignette Edge */}
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: 'inset 0 0 100px rgba(0, 5, 15, 0.85), inset 0 0 180px rgba(0, 2, 6, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.08)'
          }}>
            <div style={{
              position: 'absolute',
              bottom: '24px',
              left: '24px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'rgba(56, 189, 248, 0.65)',
              letterSpacing: '0.12em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Compass size={12} className="radar-sweep" />
              <span>SPACECRAFT OBSERVATION DECK // DRIFT MODE ACTIVE</span>
            </div>
          </div>

          {/* Floating Exit Orbital View Button */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 35,
            pointerEvents: 'auto'
          }}>
            <button
              onClick={() => {
                setIsOrbitalView(false);
                resetView();
              }}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8)'
              }}
            >
              <Minimize2 size={13} />
              <span>Exit Orbital View</span>
            </button>
          </div>
        </>
      )}

      {/* Top Scientific Control Toolbar (Hidden in Spacewalk Mode) */}
      {!isOrbitalView && (
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
          {/* Sub-Header: Reference Frame & Status */}
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
              background: 'rgba(3, 7, 18, 0.88)',
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
              <span>DATA: CALCULATED (NASA JPL J2000 & CELESTRAK SGP4)</span>
              <span>•</span>
              <span style={{ color: scaleMode === 'SCIENTIFIC' ? '#34d399' : 'var(--text-muted)' }}>
                {viewMode === 'EARTH_ORBIT' 
                  ? 'SATELLITE MARKERS ENLARGED'
                  : scaleMode === 'SCIENTIFIC' 
                    ? 'TRUE PROPORTIONAL SCALE (AU)' 
                    : 'EXPLORATION SCALE — COMPRESSED'}
              </span>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '10px',
              color: 'var(--text-secondary)',
              background: 'rgba(3, 7, 18, 0.88)',
              border: '1px solid var(--border-hairline)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              pointerEvents: 'auto'
            }}>
              <Info size={11} style={{ color: 'var(--accent-cyan)' }} />
              <span>Click planet to fly-to • Drag to orbit • Scroll to zoom</span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            {/* Left Controls */}
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

              {/* Scale Mode Switcher */}
              {viewMode === 'SOLAR_SYSTEM' && (
                <div className="glass-panel" style={{ display: 'flex', padding: '3px', borderRadius: 'var(--radius-xs)', gap: '3px', background: 'rgba(5, 12, 24, 0.88)' }}>
                  <button
                    onClick={() => setScaleMode('EXPLORATION')}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: scaleMode === 'EXPLORATION' ? 'rgba(56, 189, 248, 0.20)' : 'transparent',
                      color: scaleMode === 'EXPLORATION' ? '#ffffff' : 'var(--text-secondary)',
                      border: scaleMode === 'EXPLORATION' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="Compressed distances for human exploration"
                  >
                    <Sliders size={12} />
                    <span>Exploration</span>
                  </button>

                  <button
                    onClick={() => {
                      setScaleMode('SCIENTIFIC');
                      flyToTarget(new THREE.Vector3(60, 110, 260), new THREE.Vector3(0, -1, 0), 1200);
                    }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: scaleMode === 'SCIENTIFIC' ? 'rgba(52, 211, 153, 0.20)' : 'transparent',
                      color: scaleMode === 'SCIENTIFIC' ? '#ffffff' : 'var(--text-secondary)',
                      border: scaleMode === 'SCIENTIFIC' ? '1px solid rgba(52, 211, 153, 0.45)' : '1px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="True proportional distances (1 AU = 22 units)"
                  >
                    <Maximize2 size={12} />
                    <span>Scientific</span>
                  </button>
                </div>
              )}

              {/* Quick Selectors */}
              {viewMode === 'EARTH_ORBIT' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
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
                        style={{ fontSize: '11px', padding: '5px 9px' }}
                      >
                        {nameMap[satId] || satId}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  {['sun', 'earth', 'mars', 'jupiter', 'aditya-l1', 'voyager-1'].map(id => {
                    const isSel = selectedBodyId === id;
                    return (
                      <button
                        key={id}
                        onClick={() => {
                          focusOnObject(id);
                          handleObjectSelection(id, false);
                        }}
                        className={`btn ${isSel ? 'btn-active' : 'btn-secondary'}`}
                        style={{ fontSize: '11px', padding: '5px 9px' }}
                      >
                        {id === 'aditya-l1' ? 'Aditya-L1' : id === 'voyager-1' ? 'Voyager 1' : id.charAt(0).toUpperCase() + id.slice(1)}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(5, 12, 24, 0.88)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '5px 10px',
                  width: '190px'
                }}>
                  <Search size={13} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search object..."
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
                      padding: '4px',
                      background: 'rgba(5, 12, 24, 0.96)'
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

            {/* Right Controls: Compositions, Spacewalk, Tour, Layers, Reset */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto' }}>
              {/* Spacewalk / Orbital View Button */}
              {viewMode === 'SOLAR_SYSTEM' && (
                <button
                  onClick={() => setIsOrbitalView(true)}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 11px',
                    fontSize: '11px',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    background: 'rgba(56, 189, 248, 0.10)'
                  }}
                  title="Enter full-screen spacecraft observation drift through deep space"
                >
                  <Compass size={13} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Orbital View</span>
                </button>
              )}

              {/* 7-Step Tour Button */}
              {viewMode === 'SOLAR_SYSTEM' && (
                <button
                  onClick={() => handleTourStep(1)}
                  className="btn btn-secondary"
                  title="Experience the 7-Step Spacepulse Space Tour"
                  style={{ fontSize: '11px', padding: '6px 10px', gap: '5px' }}
                >
                  <Sparkles size={13} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Space Tour</span>
                </button>
              )}

              <button
                onClick={() => setShowOrbits(!showOrbits)}
                className={`btn ${showOrbits ? 'btn-active' : 'btn-secondary'}`}
                title="Toggle Keplerian Orbital Paths"
                style={{ fontSize: '11px', padding: '6px 10px' }}
              >
                <Layers size={13} />
                <span>Orbits</span>
              </button>

              <button
                onClick={resetView}
                className="btn btn-secondary"
                title="Reset Observatory Framing"
                style={{ fontSize: '11px', padding: '6px 10px' }}
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. 7-Step Spacepulse Space Tour Interactive Player Modal */}
      {tourStep > 0 && !isOrbitalView && (
        <div
          className="glass-panel tech-corner"
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '480px',
            maxWidth: 'calc(100vw - 32px)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-sm)',
            zIndex: 40,
            background: 'rgba(5, 12, 24, 0.95)',
            border: '1px solid rgba(56, 189, 248, 0.5)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8)',
            animation: 'fadeIn 0.25s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--accent-cyan)',
              letterSpacing: '0.08em'
            }}>
              <Compass size={13} className="radar-sweep" />
              <span>STEP {tourStep} OF 7 // {
                tourStep === 1 ? 'DEEP SPACE CANOPY' :
                tourStep === 2 ? 'HELIOCENTRIC ARCHITECTURE' :
                tourStep === 3 ? 'THE INNER WORLDS' :
                tourStep === 4 ? 'THE GAS GIANTS' :
                tourStep === 5 ? 'THE ICE GIANTS & BEYOND' :
                tourStep === 6 ? 'HUMAN SPACEFLIGHT PRESENCE' :
                'OBSERVATORY PERSPECTIVE'
              }</span>
            </div>

            <button
              onClick={() => handleTourStep(0)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              title="Exit Space Tour"
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
            {tourStep === 1 && 'Entering Deep Space'}
            {tourStep === 2 && 'Approaching the Solar System'}
            {tourStep === 3 && 'The Inner Planets'}
            {tourStep === 4 && 'The Gas Giants: Jupiter & Saturn'}
            {tourStep === 5 && 'Beyond the Giants: Uranus & Neptune'}
            {tourStep === 6 && 'Human Spaceflight & Telemetry'}
            {tourStep === 7 && 'Return to the Solar System'}
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 14px 0' }}>
            {tourStep === 1 && 'You are floating in deep interstellar void. Notice the four spatial depth tiers of stars with authentic astronomical B-V spectral temperatures and diffuse Milky Way band.'}
            {tourStep === 2 && 'The radiant Sun anchors the heliocentric system, casting inverse-square illumination that produces authentic day/night terminators on every planet.'}
            {tourStep === 3 && 'Gliding across the ecliptic: rocky cratered Mercury, sulfuric clouds on Venus, living Earth with rotating cloud formations and atmospheric limb, and iron-rich Mars.'}
            {tourStep === 4 && 'Passing Jupiter’s turbulent cloud bands and Great Red Spot, toward Saturn with its multi-band ring system (Cassini Division, Ring B, Ring A) tilted at 26.7°.'}
            {tourStep === 5 && 'Outer frontiers: pale cyan-aquamarine Uranus rotating sideways at 97.8° axial tilt, and deep cobalt-blue Neptune with high-altitude methane cloud streaks.'}
            {tourStep === 6 && 'Humanity’s presence in deep space: Aditya-L1 at the Sun-Earth L1 Lagrange point, Earth-orbiting stations, and long-range spacecraft exploration.'}
            {tourStep === 7 && 'The Solar System observatory is now under your control. Use the timeline to simulate orbital movement or switch between Exploration and Scientific scales.'}
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '10px',
            borderTop: '1px solid var(--border-hairline)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setTourPaused(!tourPaused)}
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title={tourPaused ? 'Resume auto-play' : 'Pause tour'}
              >
                {tourPaused ? <Play size={11} /> : <Pause size={11} />}
                <span>{tourPaused ? 'Play' : 'Pause'}</span>
              </button>

              <button
                onClick={() => handleTourStep(0)}
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '5px 10px' }}
              >
                Exit Tour
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              {tourStep > 1 && (
                <button
                  onClick={() => handleTourStep(tourStep - 1)}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ChevronLeft size={12} />
                  <span>Back</span>
                </button>
              )}

              {tourStep < 7 ? (
                <button
                  onClick={() => handleTourStep(tourStep + 1)}
                  className="btn btn-primary"
                  style={{ fontSize: '11px', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>Next</span>
                  <ChevronRight size={12} />
                </button>
              ) : (
                <button
                  onClick={() => handleTourStep(0)}
                  className="btn btn-primary"
                  style={{ fontSize: '11px', padding: '5px 16px' }}
                >
                  Finish Tour
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hover Tooltip */}
      {hoveredBody && !isOrbitalView && (
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

      {/* Target Acquisition HUD Reticle (Bottom Left) */}
      {!isOrbitalView && hudData && (
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

          <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {hudData.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {hudData.catalogId && <span>{hudData.catalogId}</span>}
            {hudData.catalogId && hudData.orbitClass && <span>•</span>}
            {hudData.orbitClass && <span>{hudData.orbitClass}</span>}
          </div>

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
            <span style={{ color: 'var(--accent-cyan)' }}>KEPLERIAN PROPAGATED</span>
          </div>
        </div>
      )}

      {/* Scientific Transparency Scale Disclaimer (Bottom Center) */}
      {!isOrbitalView && (
        <div
          className="space-map-scale-disclaimer"
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(3, 5, 10, 0.88)',
            backdropFilter: 'blur(8px)',
            padding: '5px 14px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            pointerEvents: 'none',
            maxWidth: 'min(580px, calc(100vw - 32px))',
            zIndex: 15,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
          }}
        >
          {scaleMode === 'SCIENTIFIC' ? (
            <span>
              <strong style={{ color: '#34d399' }}>SCIENTIFIC SCALE:</strong> True proportional interplanetary distances (1 AU = 22 scene units).
            </span>
          ) : (
            <span>
              <strong style={{ color: 'var(--accent-cyan)' }}>EXPLORATION SCALE — DISTANCES VISUALLY COMPRESSED:</strong> Continuous power-law mapping preserves exact Keplerian ordering and true angular positions.
            </span>
          )}
        </div>
      )}

      {/* Time Scrubber (Bottom Right) */}
      {!isOrbitalView && (
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
            gap: '10px',
            background: 'rgba(5, 12, 24, 0.92)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={13} style={{ color: 'var(--accent-cyan)' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>CALCULATED FOR</span>
              <span className="mono" style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
                {simDate.toISOString().split('T')[0]}
              </span>
            </div>
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
      )}

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
